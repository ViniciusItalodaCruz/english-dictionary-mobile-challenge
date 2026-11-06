import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { PropsWithChildren } from "react";

import { AUTHENTICATED_QUERY_SCOPE } from "@/modules/authentication/util/authenticated-query";
import {
  resetAuthStoreForTests,
  useAuthStore,
} from "@/modules/authentication/stores";
import { useWordNavigation } from "@/modules/details/hooks/use-word-navigation";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

const mockedParams = jest.mocked(useLocalSearchParams);
const mockedRouter = jest.mocked(useRouter);
const mockSetParams = jest.fn();

const wordListKey = ["word-list", { initialPage: 0, pageSize: 100 }] as const;

function historyKey(userId: string) {
  return [AUTHENTICATED_QUERY_SCOPE, userId, "word-history"] as const;
}

function favoritesKey(userId: string) {
  return [AUTHENTICATED_QUERY_SCOPE, userId, "word-favorites"] as const;
}

function authenticate(userId: string) {
  useAuthStore.setState({
    status: "authenticated",
    session: {
      accessToken: "token",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: userId,
        email: `${userId}@example.com`,
      },
    },
  });
}

function seedWords(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  pages: readonly (readonly string[])[],
) {
  queryClient.setQueryData(queryKey, {
    pageParams: pages.map((_, index) => index),
    pages: pages.map((words, index) => ({
      items: words.map((word) => ({ word })),
      page: index,
      hasNextPage: index === pages.length - 1,
      nextPage: index === pages.length - 1 ? index + 1 : null,
    })),
  });
}

describe("useWordNavigation", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthStoreForTests();
    authenticate("user-1");

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });

    mockedParams.mockReturnValue({
      word: "today",
      source: "word-list",
    });

    mockedRouter.mockReturnValue({
      setParams: mockSetParams,
    } as unknown as ReturnType<typeof useRouter>);

    seedWords(queryClient, wordListKey, [["hello", "today", "great"]]);
  });

  afterEach(async () => {
    await cleanup();
    queryClient.clear();
    resetAuthStoreForTests();
  });

  async function renderNavigation() {
    const rendered = await renderHook(() => useWordNavigation(), { wrapper });

    await waitFor(() => {
      expect(
        rendered.result.current.hasPrevious || rendered.result.current.hasNext,
      ).toBe(true);
    });

    return rendered;
  }

  it("opens the previous word from the loaded list", async () => {
    const { result } = await renderNavigation();

    expect(result.current.hasPrevious).toBe(true);

    await act(async () => {
      result.current.onPrevious();
    });

    expect(mockSetParams).toHaveBeenCalledWith({
      word: "hello",
      source: "word-list",
    });
  });

  it("opens the next word from the loaded list", async () => {
    const { result } = await renderNavigation();

    expect(result.current.hasNext).toBe(true);

    await act(async () => {
      result.current.onNext();
    });

    expect(mockSetParams).toHaveBeenCalledWith({
      word: "great",
      source: "word-list",
    });
  });

  it("disables previous on the first known word", async () => {
    mockedParams.mockReturnValue({
      word: "hello",
      source: "word-list",
    });

    const { result } = await renderNavigation();

    expect(result.current.hasPrevious).toBe(false);
    expect(result.current.hasNext).toBe(true);

    await act(async () => {
      result.current.onPrevious();
    });

    expect(mockSetParams).not.toHaveBeenCalled();
  });

  it("disables next on the last known word", async () => {
    mockedParams.mockReturnValue({
      word: "great",
      source: "word-list",
    });

    const { result } = await renderNavigation();

    expect(result.current.hasPrevious).toBe(true);
    expect(result.current.hasNext).toBe(false);

    await act(async () => {
      result.current.onNext();
    });

    expect(mockSetParams).not.toHaveBeenCalled();
  });

  it("disables both controls without a navigation source", async () => {
    mockedParams.mockReturnValue({ word: "today" });

    const { result } = await renderHook(() => useWordNavigation(), {
      wrapper,
    });

    expect(result.current.hasPrevious).toBe(false);
    expect(result.current.hasNext).toBe(false);

    await act(async () => {
      result.current.onPrevious();
      result.current.onNext();
    });

    expect(mockSetParams).not.toHaveBeenCalled();
  });

  it("follows the selected word inside the same list", async () => {
    const { result, rerender } = await renderNavigation();

    await act(async () => {
      result.current.onNext();
    });

    mockedParams.mockReturnValue({
      word: "great",
      source: "word-list",
    });

    await rerender(undefined);

    await waitFor(() => {
      expect(result.current.hasNext).toBe(false);
    });

    expect(result.current.hasPrevious).toBe(true);

    await act(async () => {
      result.current.onPrevious();
    });

    expect(mockSetParams).toHaveBeenLastCalledWith({
      word: "today",
      source: "word-list",
    });
  });

  it("preserves the loaded order instead of sorting the words", async () => {
    seedWords(queryClient, historyKey("user-1"), [["zulu", "alpha", "mango"]]);
    mockedParams.mockReturnValue({
      word: "alpha",
      source: "history",
    });

    const { result } = await renderNavigation();

    await act(async () => {
      result.current.onPrevious();
    });

    expect(mockSetParams).toHaveBeenCalledWith({
      word: "zulu",
      source: "history",
    });

    await act(async () => {
      result.current.onNext();
    });

    expect(mockSetParams).toHaveBeenLastCalledWith({
      word: "mango",
      source: "history",
    });
  });

  it("uses the word list order when opened from home", async () => {
    seedWords(queryClient, historyKey("user-1"), [["great", "hello", "today"]]);
    seedWords(queryClient, favoritesKey("user-1"), [
      ["today", "great", "hello"],
    ]);

    const { result } = await renderNavigation();

    await act(async () => {
      result.current.onNext();
    });

    expect(mockSetParams).toHaveBeenCalledWith({
      word: "great",
      source: "word-list",
    });
  });

  it("uses the history order when opened from history", async () => {
    seedWords(queryClient, historyKey("user-1"), [["great", "today", "hello"]]);
    mockedParams.mockReturnValue({
      word: "today",
      source: "history",
    });

    const { result } = await renderNavigation();

    await act(async () => {
      result.current.onPrevious();
    });

    expect(mockSetParams).toHaveBeenCalledWith({
      word: "great",
      source: "history",
    });
  });

  it("uses the favorites order when opened from favorites", async () => {
    seedWords(queryClient, favoritesKey("user-1"), [
      ["great", "today", "hello"],
    ]);
    mockedParams.mockReturnValue({
      word: "today",
      source: "favorites",
    });

    const { result } = await renderNavigation();

    await act(async () => {
      result.current.onNext();
    });

    expect(mockSetParams).toHaveBeenCalledWith({
      word: "hello",
      source: "favorites",
    });
  });

  it("keeps the original order when the cached list is refreshed", async () => {
    seedWords(queryClient, historyKey("user-1"), [["great", "today", "hello"]]);
    mockedParams.mockReturnValue({
      word: "today",
      source: "history",
    });

    const { result } = await renderNavigation();

    await act(async () => {
      seedWords(queryClient, historyKey("user-1"), [
        ["today", "hello", "great"],
      ]);
    });

    await act(async () => {
      result.current.onPrevious();
    });

    expect(mockSetParams).toHaveBeenCalledWith({
      word: "great",
      source: "history",
    });
  });

  it("does not expose a neighbor that has not been loaded yet", async () => {
    seedWords(queryClient, wordListKey, [["hello", "today"]]);
    mockedParams.mockReturnValue({
      word: "today",
      source: "word-list",
    });

    const { result } = await renderNavigation();

    expect(result.current.hasPrevious).toBe(true);
    expect(result.current.hasNext).toBe(false);
  });

  it("joins words that were already loaded on the next page", async () => {
    seedWords(queryClient, wordListKey, [["hello", "today"], ["great"]]);
    mockedParams.mockReturnValue({
      word: "today",
      source: "word-list",
    });

    const { result } = await renderNavigation();

    await act(async () => {
      result.current.onNext();
    });

    expect(mockSetParams).toHaveBeenCalledWith({
      word: "great",
      source: "word-list",
    });
  });

  it("ignores another user's history and favorites", async () => {
    seedWords(queryClient, historyKey("user-2"), [["aaa", "today", "zzz"]]);
    seedWords(queryClient, historyKey("user-1"), [["great", "today", "hello"]]);

    mockedParams.mockReturnValue({
      word: "today",
      source: "history",
    });

    const { result } = await renderNavigation();

    await act(async () => {
      result.current.onNext();
    });

    expect(mockSetParams).toHaveBeenCalledWith({
      word: "hello",
      source: "history",
    });
  });

  it("reads the updated list on a new visit", async () => {
    seedWords(queryClient, historyKey("user-1"), [["great", "today", "hello"]]);
    mockedParams.mockReturnValue({
      word: "today",
      source: "history",
    });

    const firstVisit = await renderNavigation();

    await act(async () => {
      firstVisit.result.current.onPrevious();
    });

    expect(mockSetParams).toHaveBeenCalledWith({
      word: "great",
      source: "history",
    });

    firstVisit.unmount();
    mockSetParams.mockClear();

    seedWords(queryClient, historyKey("user-1"), [["today", "hello", "great"]]);

    const secondVisit = await renderNavigation();

    expect(secondVisit.result.current.hasPrevious).toBe(false);

    await act(async () => {
      secondVisit.result.current.onNext();
    });

    expect(mockSetParams).toHaveBeenCalledWith({
      word: "hello",
      source: "history",
    });
  });
});
