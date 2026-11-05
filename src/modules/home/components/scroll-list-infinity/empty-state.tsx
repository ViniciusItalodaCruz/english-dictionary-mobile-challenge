import { Text } from "react-native";

import { ErrorFeedback, Feedback, LoadingFeedback } from "./feedback";
import type { EmptyStateProps } from "./types";

export function EmptyState({
  isLoading,
  error,
  message,
  onRetry,
  loadingComponent,
  emptyComponent,
}: EmptyStateProps) {
  if (isLoading) {
    return loadingComponent ?? <LoadingFeedback />;
  }

  if (error) {
    return <ErrorFeedback message={error} onRetry={onRetry} />;
  }

  return (
    emptyComponent ?? (
      <Feedback>
        <Text className="text-center text-sm leading-5 text-slate-500">
          {message}
        </Text>
      </Feedback>
    )
  );
}
