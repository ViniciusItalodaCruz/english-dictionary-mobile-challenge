import { useAuthStore } from "@/modules/authentication/stores";
import { api } from "@/shared/utils";

export async function getWordFavoriteStatus(
  word: string,
  signal?: AbortSignal,
): Promise<boolean> {
  const { session, getValidAccessToken } = useAuthStore.getState();

  if (!session) {
    throw new Error("User is not authenticated.");
  }

  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error("User is not authenticated.");
  }

  const { data } = await api.get<{ word: string }[]>("/favorites", {
    params: {
      select: "word",
      user_id: `eq.${session.user.id}`,
      word: `eq.${word}`,
      limit: 1,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  return data.length > 0;
}
