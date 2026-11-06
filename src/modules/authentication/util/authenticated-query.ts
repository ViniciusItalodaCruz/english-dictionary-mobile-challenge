import { QUERY_CLIENT } from "@/shared/utils/query";

export const AUTHENTICATED_QUERY_SCOPE = "user";

export function authenticatedQueryKey(
  userId: string,
  ...parts: readonly unknown[]
): readonly [typeof AUTHENTICATED_QUERY_SCOPE, string, ...unknown[]] {
  return [AUTHENTICATED_QUERY_SCOPE, userId, ...parts];
}

export async function clearAuthenticatedQueryCache(): Promise<void> {
  await QUERY_CLIENT.cancelQueries({
    queryKey: [AUTHENTICATED_QUERY_SCOPE],
  });
  QUERY_CLIENT.removeQueries({
    queryKey: [AUTHENTICATED_QUERY_SCOPE],
  });
}
