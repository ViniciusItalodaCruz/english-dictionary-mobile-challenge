import { useMemo } from "react";

import { useGetWordDetails } from "./use-get-word-details";

export function useWordDetails(word: string) {
  const { wordDetails, isLoading, isError, isEmpty, error, retry } =
    useGetWordDetails(word);

  const entry = wordDetails[0];

  const phonetic = useMemo(
    () =>
      entry?.phonetic ||
      entry?.phonetics?.find((item) => item.text)?.text ||
      "",
    [entry],
  );

  const meanings = useMemo(
    () => wordDetails.flatMap((item) => item.meanings ?? []),
    [wordDetails],
  );

  const isNotFound =
    isError &&
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    (error as { response?: { status?: number } }).response?.status === 404;

  return {
    word: entry?.word ?? word,
    phonetic,
    meanings,
    isLoading,
    isError,
    isEmpty,
    isNotFound,
    retry,
  };
}
