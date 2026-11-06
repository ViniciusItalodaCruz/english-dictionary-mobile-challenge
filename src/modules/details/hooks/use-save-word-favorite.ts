import { useAuthStore } from "@/modules/authentication/stores";
import { AUTHENTICATED_QUERY_SCOPE } from "@/modules/authentication/util/authenticated-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { saveWordFavorite } from "../services";

type SaveWordFavoriteInput = {
  word: string;
  userId: string;
};

export function useSaveWordFavorite() {
  const queryClient = useQueryClient();

  const userId = useAuthStore((state) =>
    state.status === "authenticated" ? state.session?.user.id : undefined,
  );

  const { mutate, isPending, isError, error } = useMutation({
    mutationKey: [AUTHENTICATED_QUERY_SCOPE, "save-word-favorite"],

    mutationFn: ({ word }: SaveWordFavoriteInput) => saveWordFavorite(word),

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

    onError: (mutationError: Error) => {
      console.error("Failed to save word favorite:", mutationError);
    },
  });

  const addFavorite = useCallback(
    (word: string): void => {
      if (!userId || !word || isPending) return;

      mutate({ word, userId });
    },
    [userId, isPending, mutate],
  );

  return {
    addFavorite,
    isSaving: isPending,
    isError,
    error,
  };
}
