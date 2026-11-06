import { useGetWordFavorites } from "../hooks";
import { CollectionList } from "./collection-list";

type FavoritesListProps = {
  isCurrentTab: boolean;
};

export function FavoritesList({ isCurrentTab }: Readonly<FavoritesListProps>) {
  const {
    favorites,
    isLoading,
    isLoadingMore,
    isError,
    hasNextPage,
    loadMore,
    retry,
  } = useGetWordFavorites(isCurrentTab);

  return (
    <CollectionList.Root
      listKey="favorites"
      items={favorites}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      hasNextPage={hasNextPage}
      error={isError ? "Unable to load favorites." : null}
      emptyMessage="No favorite words yet."
      onLoadMore={loadMore}
      onRetry={retry}
    />
  );
}
