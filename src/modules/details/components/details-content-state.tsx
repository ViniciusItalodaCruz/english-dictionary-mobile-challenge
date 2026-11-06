import { ActivityIndicator, Pressable, Text, View } from "react-native";

interface DetailsContentStateProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  isNotFound: boolean;
  onRetry: () => void;
}

export function DetailsContentState({
  isLoading,
  isError,
  isEmpty,
  isNotFound,
  onRetry,
}: Readonly<DetailsContentStateProps>) {
  if (isLoading) {
    return (
      <View
        testID="word-details-loading"
        className="flex-1 items-center justify-center py-20"
      >
        <ActivityIndicator
          size="large"
          color="#f5f5f5"
          accessibilityLabel="Loading word details"
        />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-4 py-20">
        <Text
          accessibilityRole="alert"
          className="text-center text-base text-neutral-50"
        >
          {isNotFound ? "Word not found." : "Unable to load word details."}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry loading word details"
          onPress={onRetry}
          className="rounded-md border border-zinc-600 px-6 py-3"
        >
          <Text className="font-medium text-neutral-50">Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View className="flex-1 items-center justify-center py-20">
        <Text className="text-center text-base text-neutral-400">
          No definitions available.
        </Text>
      </View>
    );
  }

  return null;
}
