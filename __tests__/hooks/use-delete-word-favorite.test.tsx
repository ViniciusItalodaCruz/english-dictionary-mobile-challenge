import { useAuthStore } from "@/modules/authentication/stores";
import { AUTHENTICATED_QUERY_SCOPE } from "@/modules/authentication/util/authenticated-query";
import { useDeleteWordFavorite } from "@/modules/home/hooks/use-delete-word-favorite";
import { deleteWordFavorite } from "@/modules/home/services";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    act,
    cleanup,
    renderHook,
    waitFor,
} from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

const mockGetState = jest.fn();

jest.mock("@/modules/authentication/stores", () => ({
  useAuthStore: Object.assign(jest.fn(), {
    getState: () => mockGetState(),
  }),
}));

jest.mock("@/modules/home/services", () => ({
  deleteWordFavorite: jest.fn(),
}));

const mockedDeleteWordFavorite = jest.mocked(deleteWordFavorite);
const mockedUseAuthStore = jest.mocked(useAuthStore);

const FAVORITES_QUERY_KEY = [
  AUTHENTICATED_QUERY_SCOPE,
  "user-123",
  "word-favorites",
] as const;

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;

  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

describe("useDeleteWordFavorite", () => {
  let queryClient: QueryClient;
  let userId: string | undefined;

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();

    userId = "user-123";

    mockedUseAuthStore.mockImplementation((selector) =>
      selector({
        status: userId ? "authenticated" : "unauthenticated",
        session: userId ? { user: { id: userId } } : null,
      } as ReturnType<typeof useAuthStore.getState>),
    );

    mockGetState.mockImplementation(() => ({
      status: userId ? "authenticated" : "unauthenticated",
      session: userId ? { user: { id: userId } } : null,
    }));

    mockedDeleteWordFavorite.mockResolvedValue(undefined);

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
        mutations: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });
  });

  afterEach(async () => {
    await cleanup();
    queryClient.clear();
  });

  it("deletes the selected favorite", async () => {
    const { result } = await renderHook(() => useDeleteWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeFavorite("hello");
    });

    await waitFor(() => {
      expect(mockedDeleteWordFavorite).toHaveBeenCalledWith("hello");
    });

    expect(mockedDeleteWordFavorite).toHaveBeenCalledTimes(1);
  });

  it("does not delete when unauthenticated", async () => {
    userId = undefined;

    const { result } = await renderHook(() => useDeleteWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeFavorite("hello");
    });

    expect(mockedDeleteWordFavorite).not.toHaveBeenCalled();
  });

  it("does not delete an empty word", async () => {
    const { result } = await renderHook(() => useDeleteWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeFavorite("");
    });

    expect(mockedDeleteWordFavorite).not.toHaveBeenCalled();
  });

  it("tracks the word being removed", async () => {
    const deferred = createDeferred<void>();

    mockedDeleteWordFavorite.mockReturnValueOnce(deferred.promise);

    const { result } = await renderHook(() => useDeleteWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeFavorite("hello");
    });

    expect(result.current.isRemovingWord("hello")).toBe(true);
    expect(result.current.isRemovingWord("world")).toBe(false);
    expect(result.current.removingWords).toContain("hello");

    await act(async () => {
      deferred.resolve(undefined);
      await deferred.promise;
    });

    await waitFor(() => {
      expect(result.current.isRemovingWord("hello")).toBe(false);
      expect(result.current.removingWords).toEqual([]);
    });
  });

  it("prevents duplicate deletions of the same word", async () => {
    const deferred = createDeferred<void>();

    mockedDeleteWordFavorite.mockReturnValueOnce(deferred.promise);

    const { result } = await renderHook(() => useDeleteWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeFavorite("hello");
      result.current.removeFavorite("hello");
    });

    expect(mockedDeleteWordFavorite).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve(undefined);
      await deferred.promise;
    });
  });

  it("allows removing different words concurrently", async () => {
    const first = createDeferred<void>();
    const second = createDeferred<void>();

    mockedDeleteWordFavorite
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { result } = await renderHook(() => useDeleteWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeFavorite("hello");
      result.current.removeFavorite("world");
    });

    expect(mockedDeleteWordFavorite).toHaveBeenCalledTimes(2);

    expect(result.current.isRemovingWord("hello")).toBe(true);
    expect(result.current.isRemovingWord("world")).toBe(true);

    await act(async () => {
      first.resolve(undefined);
      await first.promise;
    });

    await waitFor(() => {
      expect(result.current.isRemovingWord("hello")).toBe(false);
    });

    expect(result.current.isRemovingWord("world")).toBe(true);

    await act(async () => {
      second.resolve(undefined);
      await second.promise;
    });

    await waitFor(() => {
      expect(result.current.removingWords).toEqual([]);
    });
  });

  it("invalidates favorites after successful deletion", async () => {
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useDeleteWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeFavorite("hello");
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: FAVORITES_QUERY_KEY,
      });
    });
  });

  it("does not invalidate favorites when deletion fails", async () => {
    const error = new Error("Unable to delete favorite");

    mockedDeleteWordFavorite.mockRejectedValueOnce(error);

    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useDeleteWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeFavorite("hello");
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(result.current.isRemovingWord("hello")).toBe(false);
  });

  it("does not invalidate another user's favorites", async () => {
    const deferred = createDeferred<void>();

    mockedDeleteWordFavorite.mockReturnValueOnce(deferred.promise);

    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useDeleteWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeFavorite("hello");
    });

    userId = "user-456";

    await act(async () => {
      deferred.resolve(undefined);
      await deferred.promise;
    });

    await waitFor(() => {
      expect(result.current.isRemovingWord("hello")).toBe(false);
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("allows retrying a word after a failed deletion", async () => {
    mockedDeleteWordFavorite
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(undefined);

    const { result } = await renderHook(() => useDeleteWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeFavorite("hello");
    });

    await waitFor(() => {
      expect(result.current.isRemovingWord("hello")).toBe(false);
      expect(result.current.isError).toBe(true);
    });

    await act(async () => {
      result.current.removeFavorite("hello");
    });

    await waitFor(() => {
      expect(mockedDeleteWordFavorite).toHaveBeenCalledTimes(2);
      expect(result.current.isError).toBe(false);
    });
  });
});
