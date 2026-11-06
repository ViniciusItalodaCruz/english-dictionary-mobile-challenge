import { useSaveWordHistory } from "@/modules/details/hooks";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function WordScreen() {
  const { word } = useLocalSearchParams<{ word: string }>();

  useSaveWordHistory(word);

  return (
    <View>
      <Text>User: {word ?? "No word"}</Text>
    </View>
  );
}
