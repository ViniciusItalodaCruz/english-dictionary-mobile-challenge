import {
  DetailsContentState,
  DetailsHeader,
  DetailsNavigation,
  WordAudioPlayer,
  WordCard,
  WordMeanings,
} from "@/modules/details/components";
import { useDetailsScreen } from "@/modules/details/hooks";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WordScreen() {
  const {
    selectedWord,
    word,
    phonetic,
    audioUrl,
    meanings,
    isLoading,
    isError,
    isEmpty,
    isNotFound,
    showContent,
    retry,
    onClose,
    hasPrevious,
    hasNext,
    onPrevious,
    onNext,
  } = useDetailsScreen();

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <DetailsHeader word={selectedWord} onClose={onClose} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-4 pb-6"
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

            <WordAudioPlayer key={selectedWord} audioUrl={audioUrl} />

            <WordMeanings meanings={meanings} />
          </>
        ) : null}
      </ScrollView>

      <View className="px-4 pb-4 pt-2">
        <DetailsNavigation
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      </View>
    </SafeAreaView>
  );
}
