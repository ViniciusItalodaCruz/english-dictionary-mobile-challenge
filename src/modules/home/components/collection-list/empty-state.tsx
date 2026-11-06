import { ActivityIndicator, Pressable, Text, View } from "react-native";

type EmptyStateProps = {
  isLoading: boolean;
  error: string | null;
  message: string;
  onRetry?: () => void;
};

export function EmptyState({
  isLoading,
  error,
  message,
  onRetry,
}: Readonly<EmptyStateProps>) {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator
          size="large"
          color="#a1a1aa"
          accessibilityLabel="Loading words"
        />
      </View>
    );
  }

  return (
    <View className="items-center justify-center px-4 py-12">
      <Text
        accessibilityRole={error ? "alert" : undefined}
        className="text-center text-sm text-zinc-400"
      >
        {error ?? message}
      </Text>

      {error && onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className="mt-4 rounded-md bg-zinc-800 px-4 py-3"
        >
          <Text className="font-medium text-neutral-50">Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
