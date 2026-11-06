import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function User() {
  const { word } = useLocalSearchParams();

  return (
    <View>
      <Text>User: {word ?? "No word"}</Text>
    </View>
  );
}
