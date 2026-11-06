import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import type { PropsWithChildren } from "react";

import { useGetWordList } from "@/modules/home/hooks";
import { getWordList, type GetWordListOutput } from "@/modules/home/services";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@/modules/home/services", () => ({
  getWordList: jest.fn(),
}));

const mockedGetWordList = jest.mocked(getWordList);
const mockedSearchParams = jest.mocked(useLocalSearchParams);

type PageOverrides = Partial<GetWordListOutput>;

const createPage = (overrides: PageOverrides = {}): GetWordListOutput => ({
  items: [{ word: "hello" }],
  page: 0,
  pageSize: 100,
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

describe("useGetWordList", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetWordList.mockReset();
    mockedSearchParams.mockReturnValue({});

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
    const deferred = createDeferred<GetWordListOutput>();

    mockedGetWordList.mockReturnValueOnce(deferred.promise);

    const { result } = await renderHook(() => useGetWordList(), {
      wrapper,
    });

    expect(result.current.words).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.isError).toBe(false);

    await act(async () => {
      deferred.resolve(createPage());
      await deferred.promise;
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("uses default pagination parameters and returns word strings", async () => {
    mockedGetWordList.mockResolvedValueOnce(
      createPage({
        items: [{ word: "hello" }, { word: "world" }],
      }),
    );

    const { result } = await renderHook(() => useGetWordList(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.words).toEqual(["hello", "world"]);
    });

    expect(mockedGetWordList).toHaveBeenCalledWith({
      page: 0,
      pageSize: 100,
      signal: expect.any(AbortSignal),
    });

    expect(result.current.isEmpty).toBe(false);
    expect(result.current.hasNextPage).toBe(false);
  });

  it.each([
    {
      params: { page: "2", pageSize: "20" },
      expectedPage: 2,
      expectedPageSize: 20,
    },
    {
      params: {
        page: ["3", "4"],
        pageSize: ["10", "50"],
      },
      expectedPage: 3,
      expectedPageSize: 10,
    },
    {
      params: { page: "-1", pageSize: "101" },
      expectedPage: 0,
      expectedPageSize: 100,
    },
    {
      params: { page: "invalid", pageSize: "0" },
      expectedPage: 0,
      expectedPageSize: 100,
    },
  ])(
    "normalizes route parameters: $params",
    async ({ params, expectedPage, expectedPageSize }) => {
      mockedSearchParams.mockReturnValue(params);

      mockedGetWordList.mockResolvedValueOnce(
        createPage({
          page: expectedPage,
          pageSize: expectedPageSize,
        }),
      );

      const { result } = await renderHook(() => useGetWordList(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedGetWordList).toHaveBeenCalledWith({
        page: expectedPage,
        pageSize: expectedPageSize,
        signal: expect.any(AbortSignal),
      });
    },
  );

  it("appends the next page and stops when no pages remain", async () => {
    mockedGetWordList
      .mockResolvedValueOnce(
        createPage({
          items: [{ word: "apple" }],
          hasNextPage: true,
          nextPage: 1,
        }),
      )
      .mockResolvedValueOnce(
        createPage({
          items: [{ word: "book" }],
          page: 1,
        }),
      );

    const { result } = await renderHook(() => useGetWordList(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.words).toEqual(["apple", "book"]);
      expect(result.current.hasNextPage).toBe(false);
    });

    expect(mockedGetWordList).toHaveBeenNthCalledWith(2, {
      page: 1,
      pageSize: 100,
      signal: expect.any(AbortSignal),
    });

    await act(async () => {
      result.current.loadMore();
    });

    expect(mockedGetWordList).toHaveBeenCalledTimes(2);
  });

  it("prevents additional requests while loading the next page", async () => {
    const deferred = createDeferred<GetWordListOutput>();

    mockedGetWordList
      .mockResolvedValueOnce(
        createPage({
          hasNextPage: true,
          nextPage: 1,
        }),
      )
      .mockReturnValueOnce(deferred.promise);

    const { result } = await renderHook(() => useGetWordList(), {
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

    expect(mockedGetWordList).toHaveBeenCalledTimes(2);

    await act(async () => {
      deferred.resolve(
        createPage({
          page: 1,
          items: [{ word: "world" }],
        }),
      );

      await deferred.promise;
    });

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.words).toEqual(["hello", "world"]);
    });
  });

  it("exposes an empty state after a successful empty response", async () => {
    mockedGetWordList.mockResolvedValueOnce(createPage({ items: [] }));

    const { result } = await renderHook(() => useGetWordList(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isEmpty).toBe(true);
    });

    expect(result.current.words).toEqual([]);
    expect(result.current.isError).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("exposes an initial error and retries the first page", async () => {
    const error = new Error("Network Error");

    mockedGetWordList
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(createPage());

    const { result } = await renderHook(() => useGetWordList(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.isEmpty).toBe(false);

    await act(async () => {
      result.current.loadMore();
    });

    expect(mockedGetWordList).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(false);
      expect(result.current.words).toEqual(["hello"]);
    });

    expect(mockedGetWordList).toHaveBeenCalledTimes(2);
    expect(mockedGetWordList).toHaveBeenNthCalledWith(2, {
      page: 0,
      pageSize: 100,
      signal: expect.any(AbortSignal),
    });
  });

  it("preserves loaded words and retries only the failed next page", async () => {
    const error = new Error("Next page request failed");

    mockedGetWordList
      .mockResolvedValueOnce(
        createPage({
          items: [{ word: "apple" }],
          hasNextPage: true,
          nextPage: 1,
        }),
      )
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(
        createPage({
          items: [{ word: "book" }],
          page: 1,
        }),
      );

    const { result } = await renderHook(() => useGetWordList(), {
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

    expect(result.current.words).toEqual(["apple"]);
    expect(result.current.error).toBe(error);

    await act(async () => {
      result.current.loadMore();
    });

    expect(mockedGetWordList).toHaveBeenCalledTimes(2);

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.words).toEqual(["apple", "book"]);
      expect(result.current.isError).toBe(false);
    });

    expect(mockedGetWordList).toHaveBeenCalledTimes(3);
    expect(mockedGetWordList).toHaveBeenNthCalledWith(3, {
      page: 1,
      pageSize: 100,
      signal: expect.any(AbortSignal),
    });
  });

  it("fetches words when isCurrentTab is true", async () => {
    mockedGetWordList.mockResolvedValueOnce(createPage());

    const { result } = await renderHook(() => useGetWordList(true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.words).toEqual(["hello"]);
    });

    expect(mockedGetWordList).toHaveBeenCalledTimes(1);
  });

  it("does not fetch words when isCurrentTab is false", async () => {
    const { result } = await renderHook(() => useGetWordList(false), {
      wrapper,
    });

    expect(mockedGetWordList).not.toHaveBeenCalled();
    expect(result.current.words).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isEmpty).toBe(false);
  });

  it("fetches words when the tab becomes active", async () => {
    mockedGetWordList.mockResolvedValueOnce(createPage());

    const { result, rerender } = await renderHook(
      ({ isCurrentTab }: { isCurrentTab: boolean }) =>
        useGetWordList(isCurrentTab),
      {
        initialProps: { isCurrentTab: false },
        wrapper,
      },
    );

    expect(mockedGetWordList).not.toHaveBeenCalled();

    await rerender({ isCurrentTab: true });

    await waitFor(() => {
      expect(result.current.words).toEqual(["hello"]);
    });

    expect(mockedGetWordList).toHaveBeenCalledTimes(1);
  });

  it("does not refetch when the tab becomes inactive", async () => {
    mockedGetWordList.mockResolvedValueOnce(createPage());

    const { result, rerender } = await renderHook(
      ({ isCurrentTab }: { isCurrentTab: boolean }) =>
        useGetWordList(isCurrentTab),
      {
        initialProps: { isCurrentTab: true },
        wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.words).toEqual(["hello"]);
    });

    await rerender({ isCurrentTab: false });

    expect(mockedGetWordList).toHaveBeenCalledTimes(1);
    expect(result.current.words).toEqual(["hello"]);
  });

  it("preserves cached words when the tab becomes active again", async () => {
    mockedGetWordList.mockResolvedValue(createPage());

    const { result, rerender } = await renderHook(
      ({ isCurrentTab }: { isCurrentTab: boolean }) =>
        useGetWordList(isCurrentTab),
      {
        initialProps: { isCurrentTab: true },
        wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.words).toEqual(["hello"]);
    });

    await rerender({ isCurrentTab: false });

    expect(result.current.words).toEqual(["hello"]);

    await rerender({ isCurrentTab: true });

    expect(result.current.words).toEqual(["hello"]);

    await waitFor(() => {
      expect(mockedGetWordList).toHaveBeenCalledTimes(2);
    });
  });
});
