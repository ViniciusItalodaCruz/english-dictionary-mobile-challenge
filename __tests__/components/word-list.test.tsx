import { TabsEnum } from "@/app/(app)";
import { WordList } from "@/modules/home/components/word-list";
import { useGetWordList } from "@/modules/home/hooks";
import { cleanup, render } from "@testing-library/react-native";

jest.mock("@/app/(app)", () => ({
  TabsEnum: {
    WordList: "word-list",
  },
}));

jest.mock("@/modules/home/hooks", () => ({
  useGetWordList: jest.fn(),
}));

jest.mock("@/modules/home/components/scroll-list-infinity", () => ({
  ScrollListInfinity: jest.fn(() => null),
}));

const mockedUseGetWordList = jest.mocked(useGetWordList);

const mockedScrollListInfinity = jest.mocked(
  jest.requireMock("@/modules/home/components/scroll-list-infinity")
    .ScrollListInfinity,
);

const loadMore = jest.fn();
const retry = jest.fn();

type WordListState = ReturnType<typeof useGetWordList>;

const createWordListState = (
  overrides: Partial<WordListState> = {},
): WordListState => ({
  words: ["hello", "world"],
  error: null,
  isLoading: false,
  isLoadingMore: false,
  isError: false,
  isEmpty: false,
  hasNextPage: true,
  loadMore,
  retry,
  ...overrides,
});

const getListProps = () => mockedScrollListInfinity.mock.calls[0][0];

describe("WordList", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseGetWordList.mockReturnValue(createWordListState());
  });

  afterEach(async () => {
    await cleanup();
  });

  it("passes the active tab state to the hook", async () => {
    await render(<WordList isCurrentTab />);

    expect(mockedUseGetWordList).toHaveBeenCalledWith(true);
  });

  it("passes the inactive tab state to the hook", async () => {
    await render(<WordList isCurrentTab={false} />);

    expect(mockedUseGetWordList).toHaveBeenCalledWith(false);
  });

  it("renders the initial loading state", async () => {
    mockedUseGetWordList.mockReturnValue(
      createWordListState({ isLoading: true }),
    );

    const screen = await render(<WordList isCurrentTab />);

    expect(screen.getByLabelText("Loading words")).toBeTruthy();
    expect(mockedScrollListInfinity).not.toHaveBeenCalled();
  });

  it("passes words and pagination to ScrollListInfinity", async () => {
    await render(<WordList isCurrentTab />);

    expect(getListProps()).toEqual(
      expect.objectContaining({
        listKey: TabsEnum.WordList,
        words: ["hello", "world"],
        itemClassName: "min-h-28",
        itemTextClassName: "font-semibold",
        hasNextPage: true,
        isLoadingMore: false,
        onLoadMore: loadMore,
        onRetry: retry,
      }),
    );
  });

  it("passes the loading more state", async () => {
    mockedUseGetWordList.mockReturnValue(
      createWordListState({ isLoadingMore: true }),
    );

    await render(<WordList isCurrentTab />);

    expect(getListProps().isLoadingMore).toBe(true);
  });

  it("passes the error state", async () => {
    mockedUseGetWordList.mockReturnValue(
      createWordListState({ isError: true }),
    );

    await render(<WordList isCurrentTab />);

    expect(getListProps().error).toBe("Unable to load words.");
  });

  it("does not pass an error when the request succeeds", async () => {
    await render(<WordList isCurrentTab />);

    expect(getListProps().error).toBeNull();
  });

  it("provides the empty state message", async () => {
    mockedUseGetWordList.mockReturnValue(
      createWordListState({
        words: [],
        isEmpty: true,
      }),
    );

    await render(<WordList isCurrentTab />);

    const { emptyComponent } = getListProps();

    expect(emptyComponent.props.children).toBe("No words found.");
  });

  it("renders a large loading indicator", async () => {
    mockedUseGetWordList.mockReturnValue(
      createWordListState({ isLoading: true }),
    );

    const screen = await render(<WordList isCurrentTab />);

    const indicator = screen.getByLabelText("Loading words");

    expect(indicator).toBeTruthy();
  });
});
