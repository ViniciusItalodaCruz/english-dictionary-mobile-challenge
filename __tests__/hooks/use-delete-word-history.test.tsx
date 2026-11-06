import { useAuthStore } from "@/modules/authentication/stores";
import { AUTHENTICATED_QUERY_SCOPE } from "@/modules/authentication/util/authenticated-query";
import { useDeleteWordHistory } from "@/modules/home/hooks";
import { deleteWordHistory } from "@/modules/home/services";
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
  deleteWordHistory: jest.fn(),
}));

const mockedDeleteWordHistory = jest.mocked(deleteWordHistory);
const mockedUseAuthStore = jest.mocked(useAuthStore);

const HISTORY_QUERY_KEY = [
  AUTHENTICATED_QUERY_SCOPE,
  "user-123",
  "word-history",
] as const;

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;

  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

describe("useDeleteWordHistory", () => {
  let queryClient: QueryClient;
  let userId: string | undefined;
  let consoleErrorSpy: jest.SpyInstance;

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockedDeleteWordHistory.mockReset();

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

    mockedDeleteWordHistory.mockResolvedValue(undefined);

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

    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await cleanup();
    queryClient.clear();
    consoleErrorSpy.mockRestore();
  });

  it("deletes the selected word", async () => {
    const { result } = await renderHook(() => useDeleteWordHistory(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeWord("hello");
    });

    await waitFor(() => {
      expect(mockedDeleteWordHistory).toHaveBeenCalledWith("hello");
    });

    expect(mockedDeleteWordHistory).toHaveBeenCalledTimes(1);
  });

  it("does not delete when unauthenticated", async () => {
    userId = undefined;

    const { result } = await renderHook(() => useDeleteWordHistory(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeWord("hello");
    });

    expect(mockedDeleteWordHistory).not.toHaveBeenCalled();
  });

  it("tracks the word being removed", async () => {
    const deferred = createDeferred<void>();

    mockedDeleteWordHistory.mockReturnValueOnce(deferred.promise);

    const { result } = await renderHook(() => useDeleteWordHistory(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeWord("hello");
    });

    expect(result.current.isRemovingWord("hello")).toBe(true);
    expect(result.current.isRemovingWord("world")).toBe(false);

    await act(async () => {
      deferred.resolve(undefined);
      await deferred.promise;
    });

    await waitFor(() => {
      expect(result.current.isRemovingWord("hello")).toBe(false);
    });
  });

  it("prevents duplicate removals", async () => {
    const deferred = createDeferred<void>();

    mockedDeleteWordHistory.mockReturnValueOnce(deferred.promise);

    const { result } = await renderHook(() => useDeleteWordHistory(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeWord("hello");
    });

    await act(async () => {
      result.current.removeWord("hello");
    });

    expect(mockedDeleteWordHistory).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve(undefined);
      await deferred.promise;
    });
  });

  it("invalidates history after successful deletion", async () => {
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useDeleteWordHistory(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeWord("hello");
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: HISTORY_QUERY_KEY,
      });
    });
  });

  it("handles API errors and restores the remove action", async () => {
    const error = new Error("Unable to delete history");

    mockedDeleteWordHistory.mockRejectedValueOnce(error);

    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useDeleteWordHistory(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeWord("hello");
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.isRemovingWord("hello")).toBe(false);
    });

    expect(result.current.error).toBe(error);
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to delete word history:",
      error,
    );
  });

  it("does not invalidate another user's history", async () => {
    const deferred = createDeferred<void>();

    mockedDeleteWordHistory.mockReturnValueOnce(deferred.promise);

    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useDeleteWordHistory(), {
      wrapper,
    });

    await act(async () => {
      result.current.removeWord("hello");
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
});
