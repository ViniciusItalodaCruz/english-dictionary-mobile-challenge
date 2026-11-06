import { useAuthStore } from "@/modules/authentication/stores";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import {
  getAdjacentWords,
  isWordNavigationSource,
  readCachedNavigationWords,
  readRouteParam,
  shouldKeepNavigationSnapshot,
  type WordNavigationSource,
} from "../utils/word-navigation";

type NavigationSnapshot = {
  source: WordNavigationSource;
  userId: string | undefined;
  words: readonly string[];
};

export function useWordNavigation() {
  const params = useLocalSearchParams<{
    word?: string | string[];
    source?: string | string[];
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) =>
    state.status === "authenticated" ? state.session?.user.id : undefined,
  );

  const word = readRouteParam(params.word);
  const sourceParam = readRouteParam(params.source);
  const source = isWordNavigationSource(sourceParam) ? sourceParam : null;

  const [words, setWords] = useState<readonly string[]>([]);
  const snapshotRef = useRef<NavigationSnapshot | null>(null);

  useEffect(() => {
    if (!source) {
      snapshotRef.current = null;
      setWords([]);
      return;
    }

    const syncWords = (): void => {
      const cachedWords = readCachedNavigationWords(
        queryClient,
        source,
        userId,
        word,
      );
      const snapshot = snapshotRef.current;

      if (shouldKeepNavigationSnapshot(snapshot, source, userId, word)) {
        return;
      }

      if (cachedWords.length === 0) {
        if (snapshot?.source !== source || snapshot.userId !== userId) {
          snapshotRef.current = { source, userId, words: [] };
          setWords([]);
        }

        return;
      }

      snapshotRef.current = { source, userId, words: cachedWords };
      setWords(cachedWords);
    };

    syncWords();

    return queryClient.getQueryCache().subscribe(syncWords);
  }, [queryClient, source, userId, word]);

  const { previousWord, nextWord } = getAdjacentWords(words, word);

  const openWord = (nextWordToOpen: string | null): void => {
    if (!source || !nextWordToOpen) {
      return;
    }

    router.setParams({
      word: nextWordToOpen,
      source,
    });
  };

  return {
    hasPrevious: previousWord !== null,
    hasNext: nextWord !== null,
    onPrevious: () => {
      openWord(previousWord);
    },
    onNext: () => {
      openWord(nextWord);
    },
  };
}
