import { ActivityIndicator, Pressable, Text, View } from "react-native";

type FooterProps = {
  isLoadingMore: boolean;
  error: string | null;
  onRetry?: () => void;
};

export function Footer({
  isLoadingMore,
  error,
  onRetry,
}: Readonly<FooterProps>) {
  if (isLoadingMore) {
    return (
      <View className="items-center py-6">
        <ActivityIndicator
          color="#a1a1aa"
          accessibilityLabel="Loading more words"
        />
      </View>
    );
  }

  if (!error) return null;

  return (
    <View className="items-center gap-3 py-6">
      <Text accessibilityRole="alert" className="text-zinc-400">
        {error}
      </Text>

      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className="rounded-md bg-zinc-800 px-4 py-3"
        >
          <Text className="font-medium text-neutral-50">Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
