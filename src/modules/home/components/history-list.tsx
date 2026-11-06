import { CollectionList } from "@/modules/home/components";

import { useDeleteWordHistory, useGetWordHistory } from "../hooks";

export function HistoryList() {
  const {
    history,
    isLoading,
    isLoadingMore,
    isError,
    hasNextPage,
    loadMore,
    retry,
  } = useGetWordHistory();

  const { removeWord, isRemovingWord } = useDeleteWordHistory();

  return (
    <CollectionList.Root
      listKey="history"
      items={history}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      hasNextPage={hasNextPage}
      error={isError ? "Unable to load history." : null}
      emptyMessage="No words in your history."
      onLoadMore={loadMore}
      onRetry={retry}
      onRemove={removeWord}
      isRemovingWord={isRemovingWord}
    />
  );
}
