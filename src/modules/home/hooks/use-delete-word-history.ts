import { useAuthStore } from "@/modules/authentication/stores";
import { AUTHENTICATED_QUERY_SCOPE } from "@/modules/authentication/util/authenticated-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { deleteWordHistory } from "../services";

type DeleteWordHistoryInput = {
  word: string;
  userId: string;
};

export function useDeleteWordHistory() {
  const queryClient = useQueryClient();
  const [removingWords, setRemovingWords] = useState<string[]>([]);

  const userId = useAuthStore((state) =>
    state.status === "authenticated" ? state.session?.user.id : undefined,
  );

  const { mutate, isError, error } = useMutation({
    mutationKey: [AUTHENTICATED_QUERY_SCOPE, "delete-word-history"],

    mutationFn: ({ word }: DeleteWordHistoryInput) => deleteWordHistory(word),

    retry: false,

    onSuccess: async (_, { userId: mutationUserId }) => {
      const { status, session } = useAuthStore.getState();

      if (status !== "authenticated" || session?.user.id !== mutationUserId) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: [AUTHENTICATED_QUERY_SCOPE, mutationUserId, "word-history"],
      });
    },

    onError: (mutationError: Error) => {
      console.error("Failed to delete word history:", mutationError);
    },

    onSettled: (_, __, variables) => {
      setRemovingWords((current) =>
        current.filter((word) => word !== variables.word),
      );
    },
  });

  const removeWord = useCallback(
    (word: string): void => {
      if (!userId || removingWords.includes(word)) return;

      setRemovingWords((current) => [...current, word]);
      mutate({ word, userId });
    },
    [userId, removingWords, mutate],
  );

  const isRemovingWord = useCallback(
    (word: string): boolean => removingWords.includes(word),
    [removingWords],
  );

  return {
    removeWord,
    isRemovingWord,
    isError,
    error,
  };
}
