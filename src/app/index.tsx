import { ScrollListInfinity } from "@/modules/home/components";
import { Tabs } from "@/shared/components";
import { useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

enum TabsEnum {
  WordList = "word-list",
  History = "history",
  Favorites = "favorites",
}

export default function Index() {
  const [selectedTab, setSelectedTab] = useState<TabsEnum>(TabsEnum.WordList);

  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 px-1"
      style={{
        paddingTop: insets.top,
      }}
    >
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
          <ScrollListInfinity
            listKey={selectedTab}
            words={[]}
            itemClassName="min-h-28"
            itemTextClassName="font-semibold"
          />
        </Tabs.Content>

        <Tabs.Content value={TabsEnum.History} title="History">
          {/* <ScrollListInfinity /> */}
          <Text>History</Text>
        </Tabs.Content>

        <Tabs.Content value={TabsEnum.Favorites} title="Favorites">
          {/* <ScrollListInfinity /> */}
          <Text>Favorites</Text>
        </Tabs.Content>
      </Tabs>
    </View>
  );
}
