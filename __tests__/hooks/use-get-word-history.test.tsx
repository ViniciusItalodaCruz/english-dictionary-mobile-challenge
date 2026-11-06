import { useAuthStore } from "@/modules/authentication/stores";
import { AUTHENTICATED_QUERY_SCOPE } from "@/modules/authentication/util/authenticated-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { useGetWordHistory } from "@/modules/home/hooks";
import {
  getWordHistory,
  type GetWordHistoryOutput,
} from "@/modules/home/services";

jest.mock("@/modules/authentication/stores", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("@/modules/home/services", () => ({
  getWordHistory: jest.fn(),
}));

const mockedGetWordHistory = jest.mocked(getWordHistory);
const mockedUseAuthStore = jest.mocked(useAuthStore);

type PageOverrides = Partial<GetWordHistoryOutput>;

const createPage = (overrides: PageOverrides = {}): GetWordHistoryOutput => ({
  items: [
    {
      user_id: "user-123",
      word: "hello",
      last_viewed_at: "2026-11-06T10:00:00.000Z",
    },
  ],
  page: 0,
  pageSize: 20,
  hasNextPage: false,
  nextPage: null,
  ...overrides,
});

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;

  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

describe("useGetWordHistory", () => {
  let queryClient: QueryClient;
  let userId: string | undefined;

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetWordHistory.mockReset();

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
      },
    });
  });

  afterEach(async () => {
    await cleanup();
    queryClient.clear();
  });

  it("exposes the initial loading state", async () => {
    const deferred = createDeferred<GetWordHistoryOutput>();

    mockedGetWordHistory.mockReturnValueOnce(deferred.promise);

    const { result } = await renderHook(() => useGetWordHistory(), { wrapper });

    expect(result.current.history).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isEmpty).toBe(false);

    await act(async () => {
      deferred.resolve(createPage());
      await deferred.promise;
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("loads history for the authenticated user", async () => {
    mockedGetWordHistory.mockResolvedValueOnce(
      createPage({
        items: [
          {
            user_id: "user-123",
            word: "hello",
            last_viewed_at: "2026-11-06T10:00:00.000Z",
          },
          {
            user_id: "user-123",
            word: "world",
            last_viewed_at: "2026-11-06T11:00:00.000Z",
          },
        ],
      }),
    );

    const { result } = await renderHook(() => useGetWordHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.history).toHaveLength(2);
    });

    expect(mockedGetWordHistory).toHaveBeenCalledWith({
      page: 0,
      pageSize: 20,
      signal: expect.any(AbortSignal),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isEmpty).toBe(false);
  });

  it("does not fetch history without an authenticated user", async () => {
    userId = undefined;

    const { result } = await renderHook(() => useGetWordHistory(), { wrapper });

    expect(mockedGetWordHistory).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("exposes an empty state", async () => {
    mockedGetWordHistory.mockResolvedValueOnce(createPage({ items: [] }));

    const { result } = await renderHook(() => useGetWordHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.isEmpty).toBe(true);
    });

    expect(result.current.history).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it("appends the next page and stops when no pages remain", async () => {
    mockedGetWordHistory
      .mockResolvedValueOnce(
        createPage({
          hasNextPage: true,
          nextPage: 1,
        }),
      )
      .mockResolvedValueOnce(
        createPage({
          page: 1,
          items: [
            {
              user_id: "user-123",
              word: "world",
              last_viewed_at: "2026-11-06T11:00:00.000Z",
            },
          ],
        }),
      );

    const { result } = await renderHook(() => useGetWordHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.history).toHaveLength(2);
      expect(result.current.hasNextPage).toBe(false);
    });

    expect(mockedGetWordHistory).toHaveBeenNthCalledWith(2, {
      page: 1,
      pageSize: 20,
      signal: expect.any(AbortSignal),
    });

    await act(async () => {
      result.current.loadMore();
    });

    expect(mockedGetWordHistory).toHaveBeenCalledTimes(2);
  });

  it("prevents simultaneous pagination requests", async () => {
    const deferred = createDeferred<GetWordHistoryOutput>();

    mockedGetWordHistory
      .mockResolvedValueOnce(
        createPage({
          hasNextPage: true,
          nextPage: 1,
        }),
      )
      .mockReturnValueOnce(deferred.promise);

    const { result } = await renderHook(() => useGetWordHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(true);
    });

    await act(async () => {
      result.current.loadMore();
      result.current.retry();
    });

    expect(mockedGetWordHistory).toHaveBeenCalledTimes(2);

    await act(async () => {
      deferred.resolve(createPage({ page: 1 }));
      await deferred.promise;
    });

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.history).toHaveLength(2);
    });
  });

  it("handles an initial request error and retries", async () => {
    const error = new Error("Network Error");

    mockedGetWordHistory
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(createPage());

    const { result } = await renderHook(() => useGetWordHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.isEmpty).toBe(false);

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(false);
      expect(result.current.history).toHaveLength(1);
    });

    expect(mockedGetWordHistory).toHaveBeenCalledTimes(2);
  });

  it("preserves history and retries a failed next page", async () => {
    const error = new Error("Next page request failed");

    mockedGetWordHistory
      .mockResolvedValueOnce(
        createPage({
          hasNextPage: true,
          nextPage: 1,
        }),
      )
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(
        createPage({
          page: 1,
          items: [
            {
              user_id: "user-123",
              word: "world",
              last_viewed_at: "2026-11-06T11:00:00.000Z",
            },
          ],
        }),
      );

    const { result } = await renderHook(() => useGetWordHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.error).toBe(error);

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.history).toHaveLength(2);
      expect(result.current.isError).toBe(false);
    });

    expect(mockedGetWordHistory).toHaveBeenCalledTimes(3);
    expect(mockedGetWordHistory).toHaveBeenNthCalledWith(3, {
      page: 1,
      pageSize: 20,
      signal: expect.any(AbortSignal),
    });
  });

  it("uses separate query keys for different users", async () => {
    mockedGetWordHistory.mockResolvedValueOnce(createPage());

    const first = await renderHook(() => useGetWordHistory(), { wrapper });

    await waitFor(() => {
      expect(first.result.current.history).toHaveLength(1);
    });

    const firstKey = [AUTHENTICATED_QUERY_SCOPE, "user-123", "word-history"];

    expect(queryClient.getQueryData(firstKey)).toBeDefined();

    await first.unmount();

    userId = "user-456";

    mockedGetWordHistory.mockResolvedValueOnce(
      createPage({
        items: [
          {
            user_id: "user-456",
            word: "different-word",
            last_viewed_at: "2026-11-06T12:00:00.000Z",
          },
        ],
      }),
    );

    const second = await renderHook(() => useGetWordHistory(), { wrapper });

    await waitFor(() => {
      expect(second.result.current.history[0]?.user_id).toBe("user-456");
    });

    expect(mockedGetWordHistory).toHaveBeenCalledTimes(2);

    expect(
      queryClient.getQueryData([
        AUTHENTICATED_QUERY_SCOPE,
        "user-456",
        "word-history",
      ]),
    ).toBeDefined();
  });

  it("fetches history when isCurrentTab is true", async () => {
    mockedGetWordHistory.mockResolvedValueOnce(createPage());

    const { result } = await renderHook(() => useGetWordHistory(true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.history).toHaveLength(1);
    });

    expect(mockedGetWordHistory).toHaveBeenCalledTimes(1);
  });

  it("does not fetch history when isCurrentTab is false", async () => {
    const { result } = await renderHook(() => useGetWordHistory(false), {
      wrapper,
    });

    expect(mockedGetWordHistory).not.toHaveBeenCalled();
    expect(result.current.history).toEqual([]);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("fetches history when the tab becomes active", async () => {
    mockedGetWordHistory.mockResolvedValueOnce(createPage());

    const { result, rerender } = await renderHook(
      ({ isCurrentTab }: { isCurrentTab: boolean }) =>
        useGetWordHistory(isCurrentTab),
      {
        initialProps: { isCurrentTab: false },
        wrapper,
      },
    );

    expect(mockedGetWordHistory).not.toHaveBeenCalled();

    await rerender({ isCurrentTab: true });

    await waitFor(() => {
      expect(result.current.history).toHaveLength(1);
    });

    expect(mockedGetWordHistory).toHaveBeenCalledTimes(1);
  });

  it("does not refetch when the tab becomes inactive", async () => {
    mockedGetWordHistory.mockResolvedValueOnce(createPage());

    const { result, rerender } = await renderHook(
      ({ isCurrentTab }: { isCurrentTab: boolean }) =>
        useGetWordHistory(isCurrentTab),
      {
        initialProps: { isCurrentTab: true },
        wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.history).toHaveLength(1);
    });

    await rerender({ isCurrentTab: false });

    expect(mockedGetWordHistory).toHaveBeenCalledTimes(1);
    expect(result.current.history).toHaveLength(1);
  });

  it("preserves cached history when the tab becomes active again", async () => {
    mockedGetWordHistory.mockResolvedValue(createPage());

    const { result, rerender } = await renderHook(
      ({ isCurrentTab }: { isCurrentTab: boolean }) =>
        useGetWordHistory(isCurrentTab),
      {
        initialProps: { isCurrentTab: true },
        wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.history).toHaveLength(1);
    });

    await rerender({ isCurrentTab: false });

    expect(result.current.history).toHaveLength(1);

    await rerender({ isCurrentTab: true });

    expect(result.current.history).toHaveLength(1);

    await waitFor(() => {
      expect(mockedGetWordHistory).toHaveBeenCalledTimes(2);
    });
  });
});
