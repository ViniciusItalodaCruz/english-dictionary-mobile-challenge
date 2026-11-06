import { FavoriteButton } from "@/modules/details/components";
import { useSaveWordHistory } from "@/modules/details/hooks";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function WordScreen() {
  const { word } = useLocalSearchParams<{ word: string }>();

  useSaveWordHistory(word);

  return (
    <View className="flex-1 gap-6 bg-zinc-950 p-4">
      <Text className="text-xl font-semibold text-neutral-50">
        {word ?? "No word"}
      </Text>

      {word ? <FavoriteButton word={word} /> : null}
    </View>
  );
}
