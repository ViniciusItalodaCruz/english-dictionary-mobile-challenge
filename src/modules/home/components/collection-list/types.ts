import type { ReactNode } from "react";

export type CollectionItem = {
  word: string;
};

export type CollectionItemProps = {
  word: string;
  source?: string;
  onRemove?: (word: string) => void;
  isRemoving?: boolean;
  className?: string;
};

export type CollectionListProps = {
  items: CollectionItem[];
  listKey: string;
  onLoadMore?: () => void;
  onRetry?: () => void;
  onRemove?: (word: string) => void;
  isRemovingWord?: (word: string) => boolean;
  hasNextPage?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  error?: string | null;
  emptyMessage?: string;
  className?: string;
  renderItem?: (props: CollectionItemProps) => ReactNode;
};
