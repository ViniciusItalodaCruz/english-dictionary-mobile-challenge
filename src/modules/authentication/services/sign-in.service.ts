import { api } from "@/shared/utils";

export type SignInOutput = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  user: {
    id: string;
    email: string;
  };
};

export async function signIn(
  email: string,
  password: string,
): Promise<SignInOutput> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!url) {
    throw new Error("Supabase URL is not configured.");
  }

  const { data } = await api.post<SignInOutput>(
    `${url}/auth/v1/token?grant_type=password`,
    { email, password },
  );

  return data;
}
