import { ErrorFeedback, LoadingFeedback } from "./feedback";
import type { FooterProps } from "./types";

export function Footer({
  hasWords,
  isLoading,
  isLoadingMore,
  error,
  onRetry,
  loadingComponent,
}: FooterProps) {
  if (!hasWords) {
    return null;
  }

  if (isLoading || isLoadingMore) {
    return loadingComponent ?? <LoadingFeedback />;
  }

  if (error) {
    return <ErrorFeedback message={error} onRetry={onRetry} />;
  }

  return null;
}
