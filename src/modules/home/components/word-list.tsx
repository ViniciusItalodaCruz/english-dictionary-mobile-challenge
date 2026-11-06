import { TabsEnum } from "@/app/(app)";
import { ActivityIndicator, Text, View } from "react-native";
import { useGetWordList } from "../hooks";
import { ScrollListInfinity } from "./scroll-list-infinity";

interface WordListProps {
  isCurrentTab: boolean;
}

export function WordList({ isCurrentTab }: Readonly<WordListProps>) {
  const {
    words,
    isLoading,
    isLoadingMore,
    isError,
    hasNextPage,
    loadMore,
    retry,
  } = useGetWordList(isCurrentTab);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator
          size="large"
          color="#a1a1aa"
          accessibilityLabel="Loading words"
        />
      </View>
    );
  }

  return (
    <ScrollListInfinity
      listKey={TabsEnum.WordList}
      words={words}
      itemClassName="min-h-28"
      itemTextClassName="font-semibold"
      hasNextPage={hasNextPage}
      isLoadingMore={isLoadingMore}
      error={isError ? "Unable to load words." : null}
      onLoadMore={loadMore}
      onRetry={retry}
      emptyComponent={
        <Text className="py-6 text-center text-zinc-400">No words found.</Text>
      }
    />
  );
}
