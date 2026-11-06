import { SignOutButton } from "@/modules/authentication/components";
import {
  FavoritesList,
  HistoryList,
  WordList,
} from "@/modules/home/components";
import { Tabs } from "@/shared/components";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export enum TabsEnum {
  WordList = "word-list",
  History = "history",
  Favorites = "favorites",
}

export default function Index() {
  const [selectedTab, setSelectedTab] = useState<TabsEnum>(TabsEnum.WordList);

  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 px-1 bg-zinc-950"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center justify-end">
        <SignOutButton />
      </View>

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
          <WordList isCurrentTab={selectedTab === TabsEnum.WordList} />
        </Tabs.Content>

        <Tabs.Content
          className="flex-1"
          value={TabsEnum.History}
          title="History"
        >
          <HistoryList isCurrentTab={selectedTab === TabsEnum.History} />
        </Tabs.Content>

        <Tabs.Content
          className="flex-1"
          value={TabsEnum.Favorites}
          title="Favorites"
        >
          <FavoritesList isCurrentTab={selectedTab === TabsEnum.Favorites} />
        </Tabs.Content>
      </Tabs>
    </View>
  );
}
