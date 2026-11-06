import {
  DetailsContentState,
  DetailsHeader,
  WordCard,
  WordMeanings,
} from "@/modules/details/components";
import { useDetailsScreen } from "@/modules/details/hooks";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WordScreen() {
  const {
    selectedWord,
    word,
    phonetic,
    meanings,
    isLoading,
    isError,
    isEmpty,
    isNotFound,
    showContent,
    retry,
    onClose,
  } = useDetailsScreen();

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <DetailsHeader word={selectedWord} onClose={onClose} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <DetailsContentState
          isLoading={isLoading}
          isError={isError}
          isEmpty={isEmpty}
          isNotFound={isNotFound}
          onRetry={retry}
        />

        {showContent ? (
          <>
            <WordCard word={word} phonetic={phonetic} />

            <WordMeanings meanings={meanings} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
