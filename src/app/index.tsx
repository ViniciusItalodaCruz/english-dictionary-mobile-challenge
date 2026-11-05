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

        <Tabs.Content value={TabsEnum.WordList} title="Word list">
          <Text>List of words</Text>
        </Tabs.Content>

        <Tabs.Content value={TabsEnum.History} title="History">
          <Text>List of words you have learned</Text>
        </Tabs.Content>

        <Tabs.Content value={TabsEnum.Favorites} title="Favorites">
          <Text>List of your favorite words</Text>
        </Tabs.Content>
      </Tabs>
    </View>
  );
}
