import { useAuthStore } from "@/modules/authentication/stores";
import { AUTHENTICATED_QUERY_SCOPE } from "@/modules/authentication/util/authenticated-query";
import { useGetWordFavorites } from "@/modules/home/hooks";
import {
    getWordFavorites,
    type GetWordFavoritesOutput,
} from "@/modules/home/services";
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

jest.mock("@/modules/home/services", () => ({
  getWordFavorites: jest.fn(),
}));

const mockedGetWordFavorites = jest.mocked(getWordFavorites);
const mockedUseAuthStore = jest.mocked(useAuthStore);

type PageOverrides = Partial<GetWordFavoritesOutput>;

const createPage = (overrides: PageOverrides = {}): GetWordFavoritesOutput => ({
  items: [
    {
      user_id: "user-123",
      word: "hello",
      created_at: "2026-11-06T10:00:00.000Z",
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

describe("useGetWordFavorites", () => {
  let queryClient: QueryClient;
  let userId: string | undefined;

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetWordFavorites.mockReset();

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

  it("exposes the initial loading state", async () => {
    const deferred = createDeferred<GetWordFavoritesOutput>();

    mockedGetWordFavorites.mockReturnValueOnce(deferred.promise);

    const { result } = await renderHook(() => useGetWordFavorites(true), {
      wrapper,
    });

    expect(result.current.favorites).toEqual([]);
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

  it("loads favorites when the tab is active", async () => {
    mockedGetWordFavorites.mockResolvedValueOnce(
      createPage({
        items: [
          {
            user_id: "user-123",
            word: "hello",
            created_at: "2026-11-06T10:00:00.000Z",
          },
          {
            user_id: "user-123",
            word: "world",
            created_at: "2026-11-06T11:00:00.000Z",
          },
        ],
      }),
    );

    const { result } = await renderHook(() => useGetWordFavorites(true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.favorites).toHaveLength(2);
    });

    expect(mockedGetWordFavorites).toHaveBeenCalledWith({
      page: 0,
      pageSize: 20,
      signal: expect.any(AbortSignal),
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.isEmpty).toBe(false);
  });

  it("does not fetch when the tab is inactive", async () => {
    const { result } = await renderHook(() => useGetWordFavorites(false), {
      wrapper,
    });

    expect(mockedGetWordFavorites).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isEmpty).toBe(false);
  });

  it("does not fetch when unauthenticated", async () => {
    userId = undefined;

    const { result } = await renderHook(() => useGetWordFavorites(true), {
      wrapper,
    });

    expect(mockedGetWordFavorites).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("fetches favorites when the tab becomes active", async () => {
    mockedGetWordFavorites.mockResolvedValueOnce(createPage());

    const { result, rerender } = await renderHook(
      ({ isCurrentTab }: { isCurrentTab: boolean }) =>
        useGetWordFavorites(isCurrentTab),
      {
        initialProps: { isCurrentTab: false },
        wrapper,
      },
    );

    expect(mockedGetWordFavorites).not.toHaveBeenCalled();

    await rerender({ isCurrentTab: true });

    await waitFor(() => {
      expect(result.current.favorites).toHaveLength(1);
    });

    expect(mockedGetWordFavorites).toHaveBeenCalledTimes(1);
  });

  it("preserves cached favorites when the tab is inactive", async () => {
    mockedGetWordFavorites.mockResolvedValueOnce(createPage());

    const { result, rerender } = await renderHook(
      ({ isCurrentTab }: { isCurrentTab: boolean }) =>
        useGetWordFavorites(isCurrentTab),
      {
        initialProps: { isCurrentTab: true },
        wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.favorites).toHaveLength(1);
    });

    await rerender({ isCurrentTab: false });

    expect(result.current.favorites).toHaveLength(1);
    expect(mockedGetWordFavorites).toHaveBeenCalledTimes(1);
  });

  it("appends the next page and stops at the end", async () => {
    mockedGetWordFavorites
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
              created_at: "2026-11-06T11:00:00.000Z",
            },
          ],
        }),
      );

    const { result } = await renderHook(() => useGetWordFavorites(true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.favorites).toHaveLength(2);
      expect(result.current.hasNextPage).toBe(false);
    });

    expect(mockedGetWordFavorites).toHaveBeenNthCalledWith(2, {
      page: 1,
      pageSize: 20,
      signal: expect.any(AbortSignal),
    });

    await act(async () => {
      result.current.loadMore();
    });

    expect(mockedGetWordFavorites).toHaveBeenCalledTimes(2);
  });

  it("prevents simultaneous pagination requests", async () => {
    const deferred = createDeferred<GetWordFavoritesOutput>();

    mockedGetWordFavorites
      .mockResolvedValueOnce(
        createPage({
          hasNextPage: true,
          nextPage: 1,
        }),
      )
      .mockReturnValueOnce(deferred.promise);

    const { result } = await renderHook(() => useGetWordFavorites(true), {
      wrapper,
    });

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

    expect(mockedGetWordFavorites).toHaveBeenCalledTimes(2);

    await act(async () => {
      deferred.resolve(createPage({ page: 1 }));
      await deferred.promise;
    });

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.favorites).toHaveLength(2);
    });
  });

  it("exposes an empty state", async () => {
    mockedGetWordFavorites.mockResolvedValueOnce(createPage({ items: [] }));

    const { result } = await renderHook(() => useGetWordFavorites(true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isEmpty).toBe(true);
    });

    expect(result.current.favorites).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it("handles an initial error and retries", async () => {
    const error = new Error("Network Error");

    mockedGetWordFavorites
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(createPage());

    const { result } = await renderHook(() => useGetWordFavorites(true), {
      wrapper,
    });

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
      expect(result.current.favorites).toHaveLength(1);
    });

    expect(mockedGetWordFavorites).toHaveBeenCalledTimes(2);
  });

  it("preserves favorites and retries a failed next page", async () => {
    const error = new Error("Pagination failed");

    mockedGetWordFavorites
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
              created_at: "2026-11-06T11:00:00.000Z",
            },
          ],
        }),
      );

    const { result } = await renderHook(() => useGetWordFavorites(true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.error).toBe(error);

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.favorites).toHaveLength(2);
      expect(result.current.isError).toBe(false);
    });

    expect(mockedGetWordFavorites).toHaveBeenCalledTimes(3);
    expect(mockedGetWordFavorites).toHaveBeenNthCalledWith(3, {
      page: 1,
      pageSize: 20,
      signal: expect.any(AbortSignal),
    });
  });

  it("isolates the query cache by user", async () => {
    mockedGetWordFavorites.mockResolvedValueOnce(createPage());

    const first = await renderHook(() => useGetWordFavorites(true), {
      wrapper,
    });

    await waitFor(() => {
      expect(first.result.current.favorites).toHaveLength(1);
    });

    expect(
      queryClient.getQueryData([
        AUTHENTICATED_QUERY_SCOPE,
        "user-123",
        "word-favorites",
      ]),
    ).toBeDefined();

    await first.unmount();

    userId = "user-456";

    mockedGetWordFavorites.mockResolvedValueOnce(
      createPage({
        items: [
          {
            user_id: "user-456",
            word: "apple",
            created_at: "2026-11-06T12:00:00.000Z",
          },
        ],
      }),
    );

    const second = await renderHook(() => useGetWordFavorites(true), {
      wrapper,
    });

    await waitFor(() => {
      expect(second.result.current.favorites[0]?.user_id).toBe("user-456");
    });

    expect(mockedGetWordFavorites).toHaveBeenCalledTimes(2);
  });
});
