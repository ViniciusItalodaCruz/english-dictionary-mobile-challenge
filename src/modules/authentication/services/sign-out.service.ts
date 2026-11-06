import { api } from "@/shared/utils";

export async function revokeRemoteSession(accessToken: string): Promise<void> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!url || accessToken.length === 0) return;

  await api.post(
    `${url}/auth/v1/logout`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 5_000,
    },
  );
}
