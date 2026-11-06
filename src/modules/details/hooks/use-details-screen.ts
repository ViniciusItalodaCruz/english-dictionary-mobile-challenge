import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";

import { useSaveWordHistory } from "./use-save-word-history";
import { useWordDetails } from "./use-word-details";

export function useDetailsScreen() {
  const { word } = useLocalSearchParams<{ word: string }>();
  const router = useRouter();

  useSaveWordHistory(word);

  const details = useWordDetails(word ?? "");

  const onClose = useCallback((): void => {
    router.back();
  }, [router]);

  const showContent =
    !details.isLoading && !details.isError && !details.isEmpty && Boolean(word);

  return {
    ...details,
    selectedWord: word ?? "",
    showContent,
    onClose,
  };
}
