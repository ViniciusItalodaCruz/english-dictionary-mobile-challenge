import { AUTHENTICATED_QUERY_SCOPE } from "@/modules/authentication/util/authenticated-query";
import type { QueryClient } from "@tanstack/react-query";

export const WORD_NAVIGATION_SOURCES = [
  "word-list",
  "history",
  "favorites",
] as const;

export type WordNavigationSource = (typeof WORD_NAVIGATION_SOURCES)[number];

type NavigationSnapshot = {
  source: WordNavigationSource;
  userId: string | undefined;
  words: readonly string[];
};

export function readRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
}

export function isWordNavigationSource(
  value: string,
): value is WordNavigationSource {
  return WORD_NAVIGATION_SOURCES.some((source) => source === value);
}

export function sameWord(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readWord(value: unknown): string | null {
  if (!isRecord(value) || typeof value.word !== "string") {
    return null;
  }

  const word = value.word.trim();

  return word || null;
}

function flattenCachedWords(data: unknown): string[] {
  if (!isRecord(data) || !Array.isArray(data.pages)) {
    return [];
  }

  return data.pages.flatMap((page) => {
    if (!isRecord(page) || !Array.isArray(page.items)) {
      return [];
    }

    return page.items.flatMap((item) => {
      const word = readWord(item);

      return word ? [word] : [];
    });
  });
}

function navigationQueryKey(
  source: WordNavigationSource,
  userId: string | undefined,
): readonly unknown[] | null {
  if (source === "word-list") {
    return ["word-list"];
  }

  if (!userId) {
    return null;
  }

  if (source === "history") {
    return [AUTHENTICATED_QUERY_SCOPE, userId, "word-history"];
  }

  return [AUTHENTICATED_QUERY_SCOPE, userId, "word-favorites"];
}

export function readCachedNavigationWords(
  queryClient: QueryClient,
  source: WordNavigationSource,
  userId: string | undefined,
  currentWord: string,
): string[] {
  const queryKey = navigationQueryKey(source, userId);

  if (!queryKey || !currentWord.trim()) {
    return [];
  }

  const lists = queryClient
    .getQueryCache()
    .findAll({ queryKey })
    .map((query) => flattenCachedWords(query.state.data))
    .filter((words) => words.some((word) => sameWord(word, currentWord)));

  if (lists.length === 0) {
    return [];
  }

  return lists.reduce((selected, words) =>
    words.length > selected.length ? words : selected,
  );
}

export function getAdjacentWords(
  words: readonly string[],
  currentWord: string,
): { previousWord: string | null; nextWord: string | null } {
  const index = words.findIndex((word) => sameWord(word, currentWord));

  if (index < 0) {
    return { previousWord: null, nextWord: null };
  }

  return {
    previousWord: index > 0 ? words[index - 1] : null,
    nextWord: index < words.length - 1 ? words[index + 1] : null,
  };
}

export function shouldKeepNavigationSnapshot(
  snapshot: NavigationSnapshot | null,
  source: WordNavigationSource,
  userId: string | undefined,
  currentWord: string,
): boolean {
  if (!snapshot || snapshot.source !== source || snapshot.userId !== userId) {
    return false;
  }

  return snapshot.words.some((word) => sameWord(word, currentWord));
}
