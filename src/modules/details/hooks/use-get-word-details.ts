import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { getWordDetails } from "../services";

export function useGetWordDetails(word: string) {
  const normalizedWord = word.trim().toLowerCase();

  const { data, error, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ["word-details", normalizedWord] as const,

    enabled: Boolean(normalizedWord),

    queryFn: ({ signal }) => getWordDetails(normalizedWord, signal),
  });

  const retry = useCallback((): void => {
    if (!normalizedWord || isFetching) return;

    void refetch();
  }, [normalizedWord, isFetching, refetch]);

  return {
    wordDetails: data ?? [],
    error,
    isLoading: Boolean(normalizedWord) && isPending,
    isError,
    isEmpty:
      Boolean(normalizedWord) &&
      !isPending &&
      !isError &&
      (data?.length ?? 0) === 0,
    retry,
  };
}
