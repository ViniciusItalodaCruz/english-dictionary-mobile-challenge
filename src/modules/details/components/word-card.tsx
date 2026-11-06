import { Text, View } from "react-native";

interface WordCardProps {
  word: string;
  phonetic?: string;
}

export function WordCard({ word, phonetic }: Readonly<WordCardProps>) {
  return (
    <View className="min-h-40 items-center justify-center gap-3 bg-zinc-800 px-4 py-10">
      <Text
        accessibilityRole="header"
        className="text-center text-3xl font-semibold text-neutral-50"
      >
        {word}
      </Text>

      {phonetic ? (
        <Text className="text-center text-lg text-zinc-300">{phonetic}</Text>
      ) : null}
    </View>
  );
}
