import { useAuthStore } from "@/modules/authentication/stores";
import { api } from "@/shared/utils";

export async function deleteWordHistory(word: string): Promise<void> {
  const { session, getValidAccessToken } = useAuthStore.getState();

  const accessToken = await getValidAccessToken();

  if (!accessToken || !session) {
    throw new Error("User is not authenticated.");
  }

  await api.delete("/word_history", {
    params: {
      user_id: `eq.${session.user.id}`,
      word: `eq.${word}`,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: "return=minimal",
    },
  });
}
