import { Text, View } from "react-native";

import { WordMeaningItem } from "./word-meaning-item";

interface WordMeaning {
  partOfSpeech: string;
  definitions: {
    definition: string;
    example?: string;
  }[];
}

interface WordMeaningsProps {
  meanings: WordMeaning[];
}

export function WordMeanings({ meanings }: Readonly<WordMeaningsProps>) {
  return (
    <View className="gap-5">
      <Text className="text-2xl font-bold text-neutral-50">Meanings</Text>

      {meanings.length === 0 ? (
        <Text className="text-sm text-neutral-400">
          No definitions available.
        </Text>
      ) : (
        meanings.map((meaning, index) => (
          <WordMeaningItem
            key={`${meaning.partOfSpeech}-${index}`}
            partOfSpeech={meaning.partOfSpeech}
            definitions={meaning.definitions}
          />
        ))
      )}
    </View>
  );
}
