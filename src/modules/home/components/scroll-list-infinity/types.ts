import type { ReactElement, ReactNode } from "react";

export type WordItemProps = Readonly<{
  word: string;
  className?: string;
  textClassName?: string;
}>;

export type ScrollListInfinityProps = Readonly<{
  words: readonly string[];
  listKey: string;
  onLoadMore?: () => void;
  onRetry?: () => void;
  hasNextPage?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  error?: string | null;
  emptyMessage?: string;
  className?: string;
  itemClassName?: string;
  itemTextClassName?: string;
  renderItem?: (props: WordItemProps) => ReactElement;
  loadingComponent?: ReactElement;
  emptyComponent?: ReactElement;
}>;

export type FeedbackProps = Readonly<{
  children: ReactNode;
}>;

export type ErrorFeedbackProps = Readonly<{
  message: string;
  onRetry?: () => void;
}>;

export type EmptyStateProps = Readonly<{
  isLoading: boolean;
  error?: string | null;
  message: string;
  onRetry?: () => void;
  loadingComponent?: ReactElement;
  emptyComponent?: ReactElement;
}>;

export type FooterProps = Readonly<{
  hasWords: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error?: string | null;
  onRetry?: () => void;
  loadingComponent?: ReactElement;
}>;
