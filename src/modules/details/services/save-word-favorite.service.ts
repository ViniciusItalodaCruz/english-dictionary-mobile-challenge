import { useAuthStore } from "@/modules/authentication/stores";
import { api } from "@/shared/utils";

export async function saveWordFavorite(word: string): Promise<void> {
  const { getValidAccessToken } = useAuthStore.getState();

  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error("User is not authenticated.");
  }

  await api.post(
    "/favorites",
    { word },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      params: {
        on_conflict: "user_id,word",
      },
    },
  );
}
