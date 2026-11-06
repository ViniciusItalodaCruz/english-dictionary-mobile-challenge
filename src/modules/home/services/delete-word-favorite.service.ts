import { useAuthStore } from "@/modules/authentication/stores";
import { api } from "@/shared/utils";

export async function deleteWordFavorite(word: string): Promise<void> {
  const { getValidAccessToken, session } = useAuthStore.getState();

  const accessToken = await getValidAccessToken();

  if (!accessToken || !session) {
    throw new Error("User is not authenticated.");
  }

  await api.delete("/favorites", {
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
