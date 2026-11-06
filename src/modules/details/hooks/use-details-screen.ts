import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";

import { useSaveWordHistory } from "./use-save-word-history";
import { useWordDetails } from "./use-word-details";
import { useWordNavigation } from "./use-word-navigation";

export function useDetailsScreen() {
  const { word } = useLocalSearchParams<{ word?: string | string[] }>();
  const router = useRouter();
  const selectedWord = Array.isArray(word) ? (word[0] ?? "") : (word ?? "");

  useSaveWordHistory(selectedWord || undefined);

  const details = useWordDetails(selectedWord);
  const navigation = useWordNavigation();

  const onClose = useCallback((): void => {
    router.back();
  }, [router]);

  const showContent =
    !details.isLoading &&
    !details.isError &&
    !details.isEmpty &&
    Boolean(selectedWord);

  return {
    ...details,
    selectedWord,
    showContent,
    onClose,
    hasPrevious: navigation.hasPrevious,
    hasNext: navigation.hasNext,
    onPrevious: navigation.onPrevious,
    onNext: navigation.onNext,
  };
}
