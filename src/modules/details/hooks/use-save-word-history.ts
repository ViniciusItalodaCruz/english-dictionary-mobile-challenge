import { useAuthStore } from "@/modules/authentication/stores";
import { AUTHENTICATED_QUERY_SCOPE } from "@/modules/authentication/util/authenticated-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { saveWordHistory } from "../services";

type SaveWordHistoryInput = {
  word: string;
  userId: string;
};

export function useSaveWordHistory(word?: string): void {
  const queryClient = useQueryClient();

  const userId = useAuthStore((state) =>
    state.status === "authenticated" ? state.session?.user.id : undefined,
  );

  const { mutate } = useMutation({
    mutationKey: [AUTHENTICATED_QUERY_SCOPE, "save-word-history"],

    mutationFn: ({ word }: SaveWordHistoryInput) => saveWordHistory(word),

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

    onError: (error: Error) => {
      console.error("Failed to save word history:", error);
    },
  });

  useEffect(() => {
    if (!word || !userId) return;

    mutate({ word, userId });
  }, [word, userId, mutate]);
}
