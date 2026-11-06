import { Text, View } from "react-native";

interface WordCardProps {
  word: string;
  phonetic?: string;
}

export function WordCard({ word, phonetic }: Readonly<WordCardProps>) {
  return (
    <View className="min-h-40 items-center justify-center gap-4 border border-zinc-700 bg-zinc-700 px-4 py-8">
      <Text className="text-center text-xl font-medium text-zinc-950">
        {word}
      </Text>

      {phonetic ? (
        <Text className="text-center text-lg text-neutral-50">{phonetic}</Text>
      ) : null}
    </View>
  );
}
