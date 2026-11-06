import { useAuthStore } from "@/modules/authentication/stores";
import { AUTHENTICATED_QUERY_SCOPE } from "@/modules/authentication/util/authenticated-query";
import { useQuery } from "@tanstack/react-query";

import { getWordFavoriteStatus } from "../services";

export function useWordFavoriteStatus(word: string) {
  const userId = useAuthStore((state) =>
    state.status === "authenticated" ? state.session?.user.id : undefined,
  );

  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: [
      AUTHENTICATED_QUERY_SCOPE,
      userId,
      "word-favorites",
      word,
    ] as const,

    enabled: Boolean(userId && word.trim()),

    queryFn: ({ signal }) => getWordFavoriteStatus(word, signal),
  });

  return {
    isFavorite: data ?? false,
    isLoading: Boolean(userId && word.trim()) && isPending,
    isFetching,
    isError,
    error,
    retry: refetch,
  };
}
