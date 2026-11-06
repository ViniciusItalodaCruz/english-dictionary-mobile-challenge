import { QUERY_CLIENT } from "@/shared/utils/query";
import { create } from "zustand";

import type { SignInOutput } from "../services/sign-in.service";
import { revokeRemoteSession } from "../services/sign-out.service";
import {
  isSessionExpired,
  mapAuthResponse,
  type AuthSession,
} from "../util/auth-session";
import {
  AUTHENTICATED_QUERY_SCOPE,
  clearAuthenticatedQueryCache,
} from "../util/authenticated-query";
import {
  bumpSessionGeneration,
  clearSession,
  getSession,
  getSessionGeneration,
  saveSession,
} from "../util/session-storage";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthState = {
  session: AuthSession | null;
  status: AuthStatus;
  initialize: () => Promise<void>;
  completeSignIn: (response: SignInOutput) => Promise<void>;
  getValidAccessToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

type SetAuthState = (
  partial: Partial<AuthState> | ((state: AuthState) => Partial<AuthState>),
) => void;

export class SessionPersistenceError extends Error {
  constructor() {
    super("Unable to persist the session.");
    this.name = "SessionPersistenceError";
  }
}

let initializeInFlight: Promise<void> | null = null;
let cacheGuardRegistered = false;

async function clearStoredSession(expectedGeneration: number): Promise<void> {
  try {
    await clearSession(expectedGeneration);
  } catch {
    try {
      await clearSession(expectedGeneration);
    } catch {
      console.error("Failed to clear session");
    }
  }
}

async function endSession(
  set: SetAuthState,
  accessToken: string | null,
): Promise<void> {
  const generation = bumpSessionGeneration();

  set({ session: null, status: "unauthenticated" });

  try {
    await clearAuthenticatedQueryCache();
  } catch {
    QUERY_CLIENT.removeQueries({
      queryKey: [AUTHENTICATED_QUERY_SCOPE],
    });
  }

  await clearStoredSession(generation);

  if (!accessToken) return;

  try {
    await revokeRemoteSession(accessToken);
  } catch {
    console.error("Failed to revoke remote session");
  }
}

async function restoreSession(set: SetAuthState): Promise<void> {
  const generation = getSessionGeneration();

  set({ status: "loading", session: null });

  try {
    const stored = await getSession();

    if (getSessionGeneration() !== generation) return;

    if (!stored) {
      set({ status: "unauthenticated", session: null });
      return;
    }

    if (isSessionExpired(stored)) {
      await endSession(set, stored.accessToken);
      return;
    }

    if (getSessionGeneration() !== generation) return;

    set({ session: stored, status: "authenticated" });
  } catch {
    if (getSessionGeneration() !== generation) return;

    set({ session: null, status: "unauthenticated" });
  }
}

function registerAuthenticatedCacheGuard(): void {
  if (cacheGuardRegistered) return;

  cacheGuardRegistered = true;

  QUERY_CLIENT.getQueryCache().subscribe((event) => {
    if (event.type !== "added" && event.type !== "updated") return;

    const [scope, userId] = event.query.queryKey;

    if (scope !== AUTHENTICATED_QUERY_SCOPE || typeof userId !== "string") {
      return;
    }

    const queryKey = event.query.queryKey;

    queueMicrotask(() => {
      const state = useAuthStore.getState();
      const ownerId =
        state.status === "authenticated" ? state.session?.user.id : null;

      if (ownerId === userId) return;

      QUERY_CLIENT.removeQueries({ queryKey, exact: true });
    });
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  status: "loading",

  initialize: () => {
    if (!initializeInFlight) {
      initializeInFlight = restoreSession(set).finally(() => {
        initializeInFlight = null;
      });
    }

    return initializeInFlight;
  },

  completeSignIn: async (response: SignInOutput) => {
    const nextSession = mapAuthResponse(response);
    const generation = bumpSessionGeneration();

    await clearAuthenticatedQueryCache();

    let saved = false;

    try {
      saved = await saveSession(nextSession, generation);
    } catch {
      if (getSessionGeneration() !== generation) return;

      set({ session: null, status: "unauthenticated" });
      throw new SessionPersistenceError();
    }

    if (getSessionGeneration() !== generation) return;

    if (!saved) {
      set({ session: null, status: "unauthenticated" });
      throw new SessionPersistenceError();
    }

    set({ session: nextSession, status: "authenticated" });
  },

  getValidAccessToken: async () => {
    const { status, session } = get();

    if (status !== "authenticated" || !session) return null;

    if (!isSessionExpired(session)) return session.accessToken;

    await endSession(set, session.accessToken);
    return null;
  },

  signOut: async () => {
    const accessToken = get().session?.accessToken ?? null;

    await endSession(set, accessToken);
  },
}));

registerAuthenticatedCacheGuard();

export function resetAuthStoreForTests(): void {
  initializeInFlight = null;
  useAuthStore.setState({
    session: null,
    status: "loading",
  });
}
