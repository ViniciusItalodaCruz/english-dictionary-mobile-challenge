import { CollectionList } from "@/modules/home/components";

import { useGetWordHistory } from "../hooks";

interface HistoryListProps {
  isCurrentTab: boolean;
}

export function HistoryList({ isCurrentTab }: Readonly<HistoryListProps>) {
  const {
    history,
    isLoading,
    isLoadingMore,
    isError,
    hasNextPage,
    loadMore,
    retry,
  } = useGetWordHistory(isCurrentTab);

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
    />
  );
}
