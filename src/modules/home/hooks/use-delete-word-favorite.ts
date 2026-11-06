import { useAuthStore } from "@/modules/authentication/stores";
import { AUTHENTICATED_QUERY_SCOPE } from "@/modules/authentication/util/authenticated-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { deleteWordFavorite } from "../services";

type DeleteWordFavoriteInput = {
  word: string;
  userId: string;
};

export function useDeleteWordFavorite() {
  const queryClient = useQueryClient();

  const [removingWords, setRemovingWords] = useState<string[]>([]);
  const pendingWords = useRef(new Set<string>());

  const userId = useAuthStore((state) =>
    state.status === "authenticated" ? state.session?.user.id : undefined,
  );

  const { mutate, isError, error } = useMutation({
    mutationKey: [AUTHENTICATED_QUERY_SCOPE, "delete-word-favorite"],

    mutationFn: ({ word }: DeleteWordFavoriteInput) => deleteWordFavorite(word),

    retry: false,

    onSuccess: async (_, { userId: mutationUserId }) => {
      const { status, session } = useAuthStore.getState();

      if (status !== "authenticated" || session?.user.id !== mutationUserId) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: [AUTHENTICATED_QUERY_SCOPE, mutationUserId, "word-favorites"],
      });
    },

    onSettled: (_, __, { word }) => {
      pendingWords.current.delete(word);

      setRemovingWords((current) => current.filter((item) => item !== word));
    },
  });

  const removeFavorite = useCallback(
    (word: string): void => {
      if (!userId || !word || pendingWords.current.has(word)) {
        return;
      }

      pendingWords.current.add(word);

      setRemovingWords((current) => [...current, word]);

      mutate({ word, userId });
    },
    [userId, mutate],
  );

  const isRemovingWord = useCallback(
    (word: string): boolean => removingWords.includes(word),
    [removingWords],
  );

  return {
    removeFavorite,
    isRemovingWord,
    removingWords,
    isError,
    error,
  };
}
