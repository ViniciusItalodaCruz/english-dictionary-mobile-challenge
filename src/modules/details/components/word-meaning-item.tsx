import { Text, View } from "react-native";

interface WordDefinition {
  definition: string;
  example?: string;
}

interface WordMeaningItemProps {
  partOfSpeech: string;
  definitions: WordDefinition[];
}

export function WordMeaningItem({
  partOfSpeech,
  definitions,
}: Readonly<WordMeaningItemProps>) {
  return (
    <View className="gap-3">
      <Text className="text-base font-semibold text-neutral-200">
        {partOfSpeech}
      </Text>

      {definitions.map((item, index) => (
        <View key={index} className="gap-2">
          <Text className="text-sm leading-6 text-neutral-300">
            {item.definition}
          </Text>

          {item.example ? (
            <Text className="text-sm italic leading-5 text-neutral-400">
              "{item.example}"
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
