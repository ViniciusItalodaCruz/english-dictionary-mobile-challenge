import { CollectionList } from "@/modules/home/components/collection-list";
import { HistoryList } from "@/modules/home/components/history-list";
import { useDeleteWordHistory, useGetWordHistory } from "@/modules/home/hooks";
import { cleanup, render } from "@testing-library/react-native";

jest.mock("@/modules/home/hooks", () => ({
  useGetWordHistory: jest.fn(),
  useDeleteWordHistory: jest.fn(),
}));

jest.mock("@/modules/home/components/collection-list", () => ({
  CollectionList: {
    Root: jest.fn(() => null),
  },
}));

const mockedUseGetWordHistory = jest.mocked(useGetWordHistory);
const mockedUseDeleteWordHistory = jest.mocked(useDeleteWordHistory);
const mockedCollectionRoot = jest.mocked(CollectionList.Root);

const history = [
  {
    user_id: "user-123",
    word: "hello",
    last_viewed_at: "2026-11-06T10:00:00.000Z",
  },
];

const loadMore = jest.fn();
const retry = jest.fn();
const removeWord = jest.fn();
const isRemovingWord = jest.fn(() => false);

function mockHooks() {
  mockedUseGetWordHistory.mockReturnValue({
    history,
    error: null,
    isLoading: false,
    isLoadingMore: false,
    isError: false,
    isEmpty: false,
    hasNextPage: true,
    loadMore,
    retry,
  });

  mockedUseDeleteWordHistory.mockReturnValue({
    removeWord,
    isRemovingWord,
    isError: false,
    error: null,
  });
}

describe("HistoryList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHooks();
  });

  afterEach(async () => {
    await cleanup();
  });

  it("passes history and pagination to CollectionList", async () => {
    await render(<HistoryList />);

    expect(mockedCollectionRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        listKey: "history",
        items: history,
        hasNextPage: true,
        isLoading: false,
        isLoadingMore: false,
        onLoadMore: loadMore,
        onRetry: retry,
      }),
      undefined,
    );
  });

  it("passes the remove action to CollectionList", async () => {
    await render(<HistoryList />);

    expect(mockedCollectionRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        onRemove: removeWord,
        isRemovingWord,
      }),
      undefined,
    );
  });

  it("passes the loading state", async () => {
    mockedUseGetWordHistory.mockReturnValue({
      ...mockedUseGetWordHistory(),
      isLoading: true,
    });

    await render(<HistoryList />);

    expect(mockedCollectionRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        isLoading: true,
      }),
      undefined,
    );
  });

  it("passes the error state", async () => {
    mockedUseGetWordHistory.mockReturnValue({
      ...mockedUseGetWordHistory(),
      isError: true,
    });

    await render(<HistoryList />);

    expect(mockedCollectionRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Unable to load history.",
      }),
      undefined,
    );
  });

  it("provides the empty state message", async () => {
    await render(<HistoryList />);

    expect(mockedCollectionRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        emptyMessage: "No words in your history.",
      }),
      undefined,
    );
  });
});
