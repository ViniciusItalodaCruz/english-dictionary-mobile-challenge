import { ScrollListInfinity } from "@/modules/home/components";
import { useGetWordList } from "@/modules/home/hooks";
import { Tabs } from "@/shared/components";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

enum TabsEnum {
  WordList = "word-list",
  History = "history",
  Favorites = "favorites",
}

export default function Index() {
  const [selectedTab, setSelectedTab] = useState<TabsEnum>(TabsEnum.WordList);

  const insets = useSafeAreaInsets();

  const {
    words,
    isLoading,
    isLoadingMore,
    isError,
    hasNextPage,
    loadMore,
    retry,
  } = useGetWordList();

  return (
    <View className="flex-1 px-1" style={{ paddingTop: insets.top }}>
      <Tabs
        className="flex-1"
        value={selectedTab}
        onValueChange={(value) => setSelectedTab(value as TabsEnum)}
      >
        <Tabs.List>
          <Tabs.Trigger value={TabsEnum.WordList}>
            <Tabs.Item>Word list</Tabs.Item>
          </Tabs.Trigger>

          <Tabs.Trigger value={TabsEnum.History}>
            <Tabs.Item>History</Tabs.Item>
          </Tabs.Trigger>

          <Tabs.Trigger value={TabsEnum.Favorites}>
            <Tabs.Item>Favorites</Tabs.Item>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content
          className="flex-1"
          value={TabsEnum.WordList}
          title="Word list"
        >
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator
                size="large"
                accessibilityLabel="Loading words"
              />
            </View>
          ) : (
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
                <Text className="py-6 text-center">No words found.</Text>
              }
            />
          )}
        </Tabs.Content>

        <Tabs.Content
          className="flex-1"
          value={TabsEnum.History}
          title="History"
        >
          <Text>History</Text>
        </Tabs.Content>

        <Tabs.Content
          className="flex-1"
          value={TabsEnum.Favorites}
          title="Favorites"
        >
          <Text>Favorites</Text>
        </Tabs.Content>
      </Tabs>
    </View>
  );
}
