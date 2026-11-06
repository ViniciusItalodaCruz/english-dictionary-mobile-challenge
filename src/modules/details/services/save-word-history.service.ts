import { useAuthStore } from "@/modules/authentication/stores";
import { api } from "@/shared/utils";

export async function saveWordHistory(word: string): Promise<void> {
  const { session, getValidAccessToken } = useAuthStore.getState();

  const accessToken = await getValidAccessToken();

  if (!accessToken || !session) {
    throw new Error("User is not authenticated.");
  }

  await api.post(
    "/word_history",
    {
      user_id: session.user.id,
      word,
      last_viewed_at: new Date().toISOString(),
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      params: {
        on_conflict: "user_id,word",
      },
    },
  );
}
