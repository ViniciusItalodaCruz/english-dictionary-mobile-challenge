import { useAuthStore } from "@/modules/authentication/stores";
import { AUTHENTICATED_QUERY_SCOPE } from "@/modules/authentication/util/authenticated-query";
import { useWordFavoriteStatus } from "@/modules/details/hooks";
import { getWordFavoriteStatus } from "@/modules/details/services";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    act,
    cleanup,
    renderHook,
    waitFor,
} from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

jest.mock("@/modules/authentication/stores", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("@/modules/details/services", () => ({
  getWordFavoriteStatus: jest.fn(),
}));

const mockedUseAuthStore = jest.mocked(useAuthStore);
const mockedGetWordFavoriteStatus = jest.mocked(getWordFavoriteStatus);

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;

  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

describe("useWordFavoriteStatus", () => {
  let queryClient: QueryClient;
  let userId: string | undefined;

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetWordFavoriteStatus.mockReset();

    userId = "user-123";

    mockedUseAuthStore.mockImplementation((selector) =>
      selector({
        status: userId ? "authenticated" : "unauthenticated",
        session: userId ? { user: { id: userId } } : null,
      } as ReturnType<typeof useAuthStore.getState>),
    );

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

  it("fetches the status of a favorited word", async () => {
    mockedGetWordFavoriteStatus.mockResolvedValueOnce(true);

    const { result } = await renderHook(() => useWordFavoriteStatus("hello"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isFavorite).toBe(true);
    });

    expect(mockedGetWordFavoriteStatus).toHaveBeenCalledWith(
      "hello",
      expect.any(AbortSignal),
    );

    expect(result.current.isLoading).toBe(false);
  });

  it("returns false when the word is not favorited", async () => {
    mockedGetWordFavoriteStatus.mockResolvedValueOnce(false);

    const { result } = await renderHook(() => useWordFavoriteStatus("hello"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isFavorite).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("exposes loading while checking the status", async () => {
    const deferred = createDeferred<boolean>();

    mockedGetWordFavoriteStatus.mockReturnValueOnce(deferred.promise);

    const { result } = await renderHook(() => useWordFavoriteStatus("hello"), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      deferred.resolve(true);
      await deferred.promise;
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFavorite).toBe(true);
    });
  });

  it("does not fetch when unauthenticated", async () => {
    userId = undefined;

    const { result } = await renderHook(() => useWordFavoriteStatus("hello"), {
      wrapper,
    });

    expect(mockedGetWordFavoriteStatus).not.toHaveBeenCalled();
    expect(result.current.isFavorite).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it.each(["", "   "])("does not fetch an invalid word: %s", async (word) => {
    const { result } = await renderHook(() => useWordFavoriteStatus(word), {
      wrapper,
    });

    expect(mockedGetWordFavoriteStatus).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("updates the query when the selected word changes", async () => {
    mockedGetWordFavoriteStatus
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const { result, rerender } = await renderHook(
      ({ word }: { word: string }) => useWordFavoriteStatus(word),
      {
        initialProps: { word: "hello" },
        wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.isFavorite).toBe(true);
    });

    await rerender({ word: "world" });

    await waitFor(() => {
      expect(mockedGetWordFavoriteStatus).toHaveBeenCalledTimes(2);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFavorite).toBe(false);
    });

    expect(mockedGetWordFavoriteStatus).toHaveBeenNthCalledWith(
      2,
      "world",
      expect.any(AbortSignal),
    );
  });

  it("rechecks status when the favorites cache is invalidated", async () => {
    mockedGetWordFavoriteStatus
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const { result } = await renderHook(() => useWordFavoriteStatus("hello"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFavorite).toBe(false);
    });

    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: [AUTHENTICATED_QUERY_SCOPE, "user-123", "word-favorites"],
      });
    });

    await waitFor(() => {
      expect(result.current.isFavorite).toBe(true);
    });

    expect(mockedGetWordFavoriteStatus).toHaveBeenCalledTimes(2);
  });

  it("handles API errors and supports retry", async () => {
    const error = new Error("Unable to check favorite");

    mockedGetWordFavoriteStatus
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(true);

    const { result } = await renderHook(() => useWordFavoriteStatus("hello"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.isFavorite).toBe(false);

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(false);
      expect(result.current.isFavorite).toBe(true);
    });
  });

  it("isolates favorite status cache by user", async () => {
    mockedGetWordFavoriteStatus.mockResolvedValueOnce(true);

    const first = await renderHook(() => useWordFavoriteStatus("hello"), {
      wrapper,
    });

    await waitFor(() => {
      expect(first.result.current.isFavorite).toBe(true);
    });

    expect(
      queryClient.getQueryData([
        AUTHENTICATED_QUERY_SCOPE,
        "user-123",
        "word-favorites",
        "hello",
      ]),
    ).toBe(true);

    await first.unmount();

    userId = "user-456";

    mockedGetWordFavoriteStatus.mockResolvedValueOnce(false);

    const second = await renderHook(() => useWordFavoriteStatus("hello"), {
      wrapper,
    });

    await waitFor(() => {
      expect(second.result.current.isLoading).toBe(false);
    });

    expect(second.result.current.isFavorite).toBe(false);

    expect(
      queryClient.getQueryData([
        AUTHENTICATED_QUERY_SCOPE,
        "user-456",
        "word-favorites",
        "hello",
      ]),
    ).toBe(false);

    expect(mockedGetWordFavoriteStatus).toHaveBeenCalledTimes(2);
  });
});
