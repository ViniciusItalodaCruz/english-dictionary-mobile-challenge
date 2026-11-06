import { QUERY_CLIENT } from "@/shared/utils/query";
import { act, waitFor } from "@testing-library/react-native";

import type { SignInOutput } from "@/modules/authentication/services/sign-in.service";
import {
  resetAuthStoreForTests,
  useAuthStore,
} from "@/modules/authentication/stores";
import {
  authenticatedQueryKey,
  type AuthSession,
} from "@/modules/authentication/util";

const mockGeneration = { value: 0 };

const mockSaveSession = jest.fn<Promise<boolean>, [unknown, unknown]>(
  async () => true,
);
const mockGetSession = jest.fn<Promise<AuthSession | null>, []>(
  async () => null,
);
const mockClearSession = jest.fn<Promise<void>, [unknown?]>(
  async () => undefined,
);
const mockBumpSessionGeneration = jest.fn(() => {
  mockGeneration.value += 1;
  return mockGeneration.value;
});
const mockGetSessionGeneration = jest.fn(() => mockGeneration.value);
const mockRevokeRemoteSession = jest.fn<Promise<void>, [unknown]>(
  async () => undefined,
);

jest.mock("@/modules/authentication/util/session-storage", () => ({
  saveSession: (session: unknown, generation: unknown) =>
    mockSaveSession(session, generation),
  getSession: () => mockGetSession(),
  clearSession: (generation?: unknown) => mockClearSession(generation),
  bumpSessionGeneration: () => mockBumpSessionGeneration(),
  getSessionGeneration: () => mockGetSessionGeneration(),
}));

jest.mock("@/modules/authentication/services/sign-out.service", () => ({
  revokeRemoteSession: (accessToken: unknown) =>
    mockRevokeRemoteSession(accessToken),
}));

const futureExpiresAt = (): number => Math.floor(Date.now() / 1000) + 3600;

const expiredExpiresAt = (): number => Math.floor(Date.now() / 1000) - 60;

const createOutput = (overrides: Partial<SignInOutput> = {}): SignInOutput => ({
  access_token: "access-token",
  refresh_token: "refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: futureExpiresAt(),
  user: {
    id: "user-1",
    email: "user@example.com",
  },
  ...overrides,
});

const createSession = (overrides: Partial<AuthSession> = {}): AuthSession => ({
  accessToken: "access-token",
  expiresAt: futureExpiresAt(),
  user: {
    id: "user-1",
    email: "user@example.com",
  },
  ...overrides,
});

describe("useAuthStore", () => {
  beforeEach(() => {
    mockGeneration.value = 0;
    mockSaveSession.mockReset();
    mockSaveSession.mockResolvedValue(true);
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue(null);
    mockClearSession.mockReset();
    mockClearSession.mockResolvedValue(undefined);
    mockBumpSessionGeneration.mockClear();
    mockGetSessionGeneration.mockClear();
    mockRevokeRemoteSession.mockReset();
    mockRevokeRemoteSession.mockResolvedValue(undefined);
    resetAuthStoreForTests();
    QUERY_CLIENT.clear();
  });

  it("starts loading without a session", () => {
    expect(useAuthStore.getState().status).toBe("loading");
    expect(useAuthStore.getState().session).toBeNull();
  });

  it("restores a valid stored session", async () => {
    const session = createSession();

    mockGetSession.mockResolvedValue(session);

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().session).toEqual(session);
    expect(mockClearSession).not.toHaveBeenCalled();
  });

  it("stays signed out when no session is stored", async () => {
    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().session).toBeNull();
  });

  it("removes an expired stored session", async () => {
    mockGetSession.mockResolvedValue(
      createSession({ expiresAt: expiredExpiresAt() }),
    );

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().session).toBeNull();
    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it("persists a successful sign-in before authenticating", async () => {
    const output = createOutput({
      access_token: "saved-access",
      expires_at: 1_730_000_000,
    });

    await useAuthStore.getState().completeSignIn(output);

    expect(mockSaveSession).toHaveBeenCalledWith(
      {
        accessToken: "saved-access",
        expiresAt: 1_730_000_000,
        user: output.user,
      },
      1,
    );
    expect(mockSaveSession.mock.calls[0]?.[0]).not.toHaveProperty(
      "refreshToken",
    );
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().session).toEqual({
      accessToken: "saved-access",
      expiresAt: 1_730_000_000,
      user: output.user,
    });
  });

  it("does not authenticate when the response is invalid", async () => {
    await expect(
      useAuthStore.getState().completeSignIn({} as SignInOutput),
    ).rejects.toThrow("Authentication response is invalid.");

    expect(mockSaveSession).not.toHaveBeenCalled();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().status).not.toBe("authenticated");
  });

  it("does not authenticate when persistence fails", async () => {
    mockSaveSession.mockRejectedValueOnce(new Error("disk full"));

    await expect(
      useAuthStore.getState().completeSignIn(createOutput()),
    ).rejects.toThrow("Unable to persist the session.");

    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().session).toBeNull();
  });

  it("does not authenticate when persistence reports that it did not save", async () => {
    mockSaveSession.mockResolvedValueOnce(false);

    await expect(
      useAuthStore.getState().completeSignIn(createOutput()),
    ).rejects.toThrow("Unable to persist the session.");

    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().session).toBeNull();
  });

  it("returns the access token while the session is valid", async () => {
    const session = createSession({
      expiresAt: Math.floor(Date.now() / 1000) + 30,
    });

    useAuthStore.setState({
      status: "authenticated",
      session,
    });

    await expect(useAuthStore.getState().getValidAccessToken()).resolves.toBe(
      session.accessToken,
    );
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(mockClearSession).not.toHaveBeenCalled();
  });

  it("ends the session when the access token is expired", async () => {
    const session = createSession({ expiresAt: expiredExpiresAt() });

    useAuthStore.setState({
      status: "authenticated",
      session,
    });

    await expect(
      useAuthStore.getState().getValidAccessToken(),
    ).resolves.toBeNull();

    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().session).toBeNull();
    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });

  it("signs out and clears the previous user's cache", async () => {
    const session = createSession();

    useAuthStore.setState({
      status: "authenticated",
      session,
    });
    QUERY_CLIENT.setQueryData(
      authenticatedQueryKey(session.user.id, "favorites"),
      ["alpha"],
    );
    QUERY_CLIENT.setQueryData(["words"], ["public"]);

    await useAuthStore.getState().signOut();

    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().session).toBeNull();
    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockRevokeRemoteSession).toHaveBeenCalledWith(session.accessToken);
    expect(
      QUERY_CLIENT.getQueryData(
        authenticatedQueryKey(session.user.id, "favorites"),
      ),
    ).toBeUndefined();
    expect(QUERY_CLIENT.getQueryData(["words"])).toEqual(["public"]);

    QUERY_CLIENT.setQueryData(
      authenticatedQueryKey(session.user.id, "favorites"),
      ["late"],
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      QUERY_CLIENT.getQueryData(
        authenticatedQueryKey(session.user.id, "favorites"),
      ),
    ).toBeUndefined();
  });

  it("isolates private cache entries when the signed-in user changes", async () => {
    QUERY_CLIENT.setQueryData(authenticatedQueryKey("user-a", "favorites"), [
      "alpha",
    ]);
    QUERY_CLIENT.setQueryData(["words"], ["public"]);

    await useAuthStore.getState().completeSignIn(
      createOutput({
        access_token: "access-b",
        user: {
          id: "user-b",
          email: "b@example.com",
        },
      }),
    );

    expect(
      QUERY_CLIENT.getQueryData(authenticatedQueryKey("user-a", "favorites")),
    ).toBeUndefined();
    expect(QUERY_CLIENT.getQueryData(["words"])).toEqual(["public"]);
    expect(useAuthStore.getState().session?.user.id).toBe("user-b");
  });

  it("does not restore a session when sign-out happens during initialization", async () => {
    let resolveGet: ((value: AuthSession | null) => void) | undefined;

    mockGetSession.mockReturnValue(
      new Promise<AuthSession | null>((resolve) => {
        resolveGet = resolve;
      }),
    );

    const pending = useAuthStore.getState().initialize();

    await useAuthStore.getState().signOut();

    resolveGet?.(createSession());

    await pending;

    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().session).toBeNull();
  });

  it("does not apply an older sign-in after the user changes", async () => {
    let releaseSave: (() => void) | undefined;
    let saves = 0;

    mockSaveSession.mockImplementation(async () => {
      saves += 1;

      if (saves === 1) {
        await new Promise<void>((resolve) => {
          releaseSave = resolve;
        });
      }

      return true;
    });

    const first = useAuthStore.getState().completeSignIn(
      createOutput({
        access_token: "access-a",
        user: {
          id: "user-a",
          email: "a@example.com",
        },
      }),
    );

    await waitFor(() => expect(saves).toBe(1));

    const second = useAuthStore.getState().completeSignIn(
      createOutput({
        access_token: "access-b",
        user: {
          id: "user-b",
          email: "b@example.com",
        },
      }),
    );

    await waitFor(() => expect(saves).toBe(2));
    releaseSave?.();

    await Promise.all([first, second]);

    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().session?.user.id).toBe("user-b");
    expect(useAuthStore.getState().session?.accessToken).toBe("access-b");
    expect(mockSaveSession).toHaveBeenCalledTimes(2);
  });

  it("runs initialization once while the first restore is in flight", async () => {
    let resolveGet: ((value: AuthSession | null) => void) | undefined;

    mockGetSession.mockReturnValue(
      new Promise<AuthSession | null>((resolve) => {
        resolveGet = resolve;
      }),
    );

    const first = useAuthStore.getState().initialize();
    const second = useAuthStore.getState().initialize();

    expect(mockGetSession).toHaveBeenCalledTimes(1);

    resolveGet?.(null);

    await Promise.all([first, second]);

    expect(useAuthStore.getState().status).toBe("unauthenticated");
  });

  it("ignores a stored session when a new sign-in finishes first", async () => {
    let resolveGet: ((value: AuthSession | null) => void) | undefined;

    mockGetSession.mockReturnValue(
      new Promise<AuthSession | null>((resolve) => {
        resolveGet = resolve;
      }),
    );

    const pending = useAuthStore.getState().initialize();

    await useAuthStore.getState().completeSignIn(
      createOutput({
        access_token: "new-access",
        user: {
          id: "user-b",
          email: "b@example.com",
        },
      }),
    );

    resolveGet?.(
      createSession({
        accessToken: "old-access",
        user: {
          id: "user-a",
          email: "a@example.com",
        },
      }),
    );

    await pending;

    expect(useAuthStore.getState().session?.user.id).toBe("user-b");
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("returns null when there is no authenticated session", async () => {
    useAuthStore.setState({
      status: "unauthenticated",
      session: null,
    });

    await expect(
      useAuthStore.getState().getValidAccessToken(),
    ).resolves.toBeNull();
    expect(mockClearSession).not.toHaveBeenCalled();
  });
});
