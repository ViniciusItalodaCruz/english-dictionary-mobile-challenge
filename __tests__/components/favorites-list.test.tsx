import { CollectionList } from "@/modules/home/components/collection-list";
import { FavoritesList } from "@/modules/home/components/favorites-list";
import {
    useDeleteWordFavorite,
    useGetWordFavorites,
} from "@/modules/home/hooks";
import { cleanup, render } from "@testing-library/react-native";

jest.mock("@/modules/home/hooks", () => ({
  useGetWordFavorites: jest.fn(),
}));

jest.mock("@/modules/home/hooks", () => ({
  useGetWordFavorites: jest.fn(),
  useDeleteWordFavorite: jest.fn(),
}));

jest.mock("@/modules/home/components/collection-list", () => ({
  CollectionList: {
    Root: jest.fn(() => null),
  },
}));

const mockedUseGetWordFavorites = jest.mocked(useGetWordFavorites);
const mockedCollectionRoot = jest.mocked(CollectionList.Root);
const mockedUseDeleteWordFavorite = jest.mocked(useDeleteWordFavorite);

const removeFavorite = jest.fn();
const isRemovingWord = jest.fn((word: string) => word === "hello");

const favorites = [
  {
    user_id: "user-123",
    word: "hello",
    created_at: "2026-11-06T10:00:00.000Z",
  },
];

const loadMore = jest.fn();
const retry = jest.fn();

type FavoritesState = ReturnType<typeof useGetWordFavorites>;

const createFavoritesState = (
  overrides: Partial<FavoritesState> = {},
): FavoritesState => ({
  favorites,
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

const getCollectionProps = () => mockedCollectionRoot.mock.calls[0][0];

describe("FavoritesList", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseGetWordFavorites.mockReturnValue(createFavoritesState());
    mockedUseDeleteWordFavorite.mockReturnValue({
      removeFavorite,
      isRemovingWord,
      removingWords: [],
      isError: false,
      error: null,
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  it("passes the active tab state to the hook", async () => {
    await render(<FavoritesList isCurrentTab />);

    expect(mockedUseGetWordFavorites).toHaveBeenCalledWith(true);
  });

  it("passes the inactive tab state to the hook", async () => {
    await render(<FavoritesList isCurrentTab={false} />);

    expect(mockedUseGetWordFavorites).toHaveBeenCalledWith(false);
  });

  it("passes favorites and pagination to CollectionList", async () => {
    await render(<FavoritesList isCurrentTab />);

    expect(getCollectionProps()).toEqual(
      expect.objectContaining({
        listKey: "favorites",
        items: favorites,
        hasNextPage: true,
        isLoading: false,
        isLoadingMore: false,
        onLoadMore: loadMore,
        onRetry: retry,
      }),
    );
  });

  it("passes the initial loading state", async () => {
    mockedUseGetWordFavorites.mockReturnValue(
      createFavoritesState({ isLoading: true }),
    );

    await render(<FavoritesList isCurrentTab />);

    expect(getCollectionProps().isLoading).toBe(true);
  });

  it("passes the pagination loading state", async () => {
    mockedUseGetWordFavorites.mockReturnValue(
      createFavoritesState({ isLoadingMore: true }),
    );

    await render(<FavoritesList isCurrentTab />);

    expect(getCollectionProps().isLoadingMore).toBe(true);
  });

  it("passes the error state", async () => {
    mockedUseGetWordFavorites.mockReturnValue(
      createFavoritesState({ isError: true }),
    );

    await render(<FavoritesList isCurrentTab />);

    expect(getCollectionProps().error).toBe("Unable to load favorites.");
  });

  it("does not pass an error after a successful request", async () => {
    await render(<FavoritesList isCurrentTab />);

    expect(getCollectionProps().error).toBeNull();
  });

  it("provides the empty state message", async () => {
    mockedUseGetWordFavorites.mockReturnValue(
      createFavoritesState({
        favorites: [],
        isEmpty: true,
        hasNextPage: false,
      }),
    );

    await render(<FavoritesList isCurrentTab />);

    expect(getCollectionProps().items).toEqual([]);
    expect(getCollectionProps().emptyMessage).toBe("No favorite words yet.");
  });

  it("passes the removal callback to CollectionList", async () => {
    await render(<FavoritesList isCurrentTab />);

    expect(getCollectionProps().onRemove).toBe(removeFavorite);
  });

  it("passes the per-word removal state to CollectionList", async () => {
    await render(<FavoritesList isCurrentTab />);

    expect(getCollectionProps().isRemovingWord).toBe(isRemovingWord);

    expect(getCollectionProps()?.isRemovingWord?.("hello")).toBe(true);
    expect(getCollectionProps()?.isRemovingWord?.("world")).toBe(false);
  });

  it("keeps the removal action available when pagination ends", async () => {
    mockedUseGetWordFavorites.mockReturnValue(
      createFavoritesState({
        hasNextPage: false,
      }),
    );

    await render(<FavoritesList isCurrentTab />);

    expect(getCollectionProps().hasNextPage).toBe(false);
    expect(getCollectionProps().onRemove).toBe(removeFavorite);
  });

  it("preserves listing retry independently of favorite removal", async () => {
    await render(<FavoritesList isCurrentTab />);

    expect(getCollectionProps().onRetry).toBe(retry);
    expect(getCollectionProps().onRemove).toBe(removeFavorite);
  });
});
