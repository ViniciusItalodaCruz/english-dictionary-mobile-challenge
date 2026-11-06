import { waitFor } from "@testing-library/react-native";

import type { AuthSession } from "@/modules/authentication/util/auth-session";
import {
  bumpSessionGeneration,
  clearSession,
  getSession,
  resetSessionStorageForTests,
  saveSession,
} from "@/modules/authentication/util/session-storage";

const SESSION_KEY = "dictionary.auth.session";
const LEGACY_ACCESS_KEY = "dictionary.auth.access";
const LEGACY_REFRESH_KEY = "dictionary.auth.refresh";
const LEGACY_META_KEY = "dictionary.auth.meta";
const INSTALL_ID_KEY = "dictionary.auth.install-id";

const mockSecureMemory = new Map<string, string>();
const mockInstallMemory = new Map<string, string>();

const mockIsAvailableAsync = jest.fn(async (): Promise<boolean> => true);

const mockGetItemAsync = jest.fn(async (...args: unknown[]) => {
  const [key] = args;

  if (typeof key !== "string") return null;

  return mockSecureMemory.get(key) ?? null;
});

const mockSetItemAsync = jest.fn(async (...args: unknown[]) => {
  const [key, value] = args;

  if (typeof key !== "string" || typeof value !== "string") return;

  mockSecureMemory.set(key, value);
});

const mockDeleteItemAsync = jest.fn(async (...args: unknown[]) => {
  const [key] = args;

  if (typeof key !== "string") return;

  mockSecureMemory.delete(key);
});

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 2,
  isAvailableAsync: () => mockIsAvailableAsync(),
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
  setItemAsync: (...args: unknown[]) => mockSetItemAsync(...args),
  deleteItemAsync: (...args: unknown[]) => mockDeleteItemAsync(...args),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (key: string) =>
      Promise.resolve(mockInstallMemory.get(key) ?? null),
    setItem: (key: string, value: string) => {
      mockInstallMemory.set(key, value);
      return Promise.resolve();
    },
  },
}));

const expiresAt = Math.floor(Date.now() / 1000) + 3600;

const createSession = (overrides: Partial<AuthSession> = {}): AuthSession => ({
  accessToken: "access-token",
  expiresAt,
  user: {
    id: "user-1",
    email: "user@example.com",
  },
  ...overrides,
});

describe("session storage", () => {
  beforeEach(() => {
    mockSecureMemory.clear();
    mockInstallMemory.clear();
    resetSessionStorageForTests();

    mockIsAvailableAsync.mockReset();
    mockIsAvailableAsync.mockResolvedValue(true);

    mockGetItemAsync.mockReset();
    mockGetItemAsync.mockImplementation(async (...args: unknown[]) => {
      const [key] = args;

      if (typeof key !== "string") return null;

      return mockSecureMemory.get(key) ?? null;
    });

    mockSetItemAsync.mockReset();
    mockSetItemAsync.mockImplementation(async (...args: unknown[]) => {
      const [key, value] = args;

      if (typeof key !== "string" || typeof value !== "string") return;

      mockSecureMemory.set(key, value);
    });

    mockDeleteItemAsync.mockReset();
    mockDeleteItemAsync.mockImplementation(async (...args: unknown[]) => {
      const [key] = args;

      if (typeof key !== "string") return;

      mockSecureMemory.delete(key);
    });
  });

  it("saves and restores a session", async () => {
    const session = createSession();
    const generation = bumpSessionGeneration();

    await expect(saveSession(session, generation)).resolves.toBe(true);
    await expect(getSession()).resolves.toEqual(session);

    expect(mockSetItemAsync).toHaveBeenCalledWith(
      SESSION_KEY,
      expect.any(String),
      {
        keychainAccessible: 2,
      },
    );

    const stored = [...mockSecureMemory.values()].join(" ");

    expect(stored).toContain(session.accessToken);
    expect(stored).not.toContain("refresh");
    expect(stored).not.toContain("password");
  });

  it("removes the stored session", async () => {
    const generation = bumpSessionGeneration();

    await saveSession(createSession(), generation);
    await clearSession();

    await expect(getSession()).resolves.toBeNull();
    expect(mockSecureMemory.size).toBe(0);
  });

  it("returns null when no session is stored", async () => {
    await expect(getSession()).resolves.toBeNull();
    expect(mockDeleteItemAsync).not.toHaveBeenCalled();
  });

  it("discards invalid JSON", async () => {
    mockSecureMemory.set(SESSION_KEY, "{");

    await expect(getSession()).resolves.toBeNull();
    expect(mockSecureMemory.size).toBe(0);
  });

  it("discards a session with an invalid structure", async () => {
    const generation = bumpSessionGeneration();

    await saveSession(createSession(), generation);

    const installId = mockInstallMemory.get(INSTALL_ID_KEY);

    mockSecureMemory.set(
      SESSION_KEY,
      JSON.stringify({
        installId,
        accessToken: "access-token",
        expiresAt,
        user: {
          id: "",
          email: "user@example.com",
        },
      }),
    );

    await expect(getSession()).resolves.toBeNull();
    expect(mockSecureMemory.size).toBe(0);
  });

  it("discards a legacy session that stores a refresh token", async () => {
    mockSecureMemory.set(
      LEGACY_ACCESS_KEY,
      JSON.stringify({ writeId: "write-1", token: "access-token" }),
    );
    mockSecureMemory.set(
      LEGACY_REFRESH_KEY,
      JSON.stringify({ writeId: "write-1", token: "refresh-token" }),
    );
    mockSecureMemory.set(
      LEGACY_META_KEY,
      JSON.stringify({
        writeId: "write-1",
        generation: 1,
        expiresAt,
        installId: "install-1",
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      }),
    );

    await expect(getSession()).resolves.toBeNull();
    expect(mockSecureMemory.size).toBe(0);
  });

  it("discards a stored payload that still contains a refresh token", async () => {
    mockInstallMemory.set(INSTALL_ID_KEY, "install-1");
    mockSecureMemory.set(
      SESSION_KEY,
      JSON.stringify({
        installId: "install-1",
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt,
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      }),
    );

    await expect(getSession()).resolves.toBeNull();
    expect(mockSecureMemory.has(SESSION_KEY)).toBe(false);
    expect(mockSecureMemory.size).toBe(0);
  });

  it("throws when secure storage is unavailable", async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    await expect(
      saveSession(createSession(), bumpSessionGeneration()),
    ).rejects.toThrow("Secure storage is not available on this device.");
  });

  it("throws and rolls back when storage fails", async () => {
    mockSetItemAsync.mockRejectedValueOnce(new Error("disk full"));

    await expect(
      saveSession(createSession(), bumpSessionGeneration()),
    ).rejects.toThrow("disk full");

    await expect(getSession()).resolves.toBeNull();
    expect(mockSecureMemory.size).toBe(0);
  });

  it("does not let a stale generation overwrite the stored session", async () => {
    const staleGeneration = bumpSessionGeneration();

    bumpSessionGeneration();

    await expect(saveSession(createSession(), staleGeneration)).resolves.toBe(
      false,
    );
    expect(mockSetItemAsync).not.toHaveBeenCalled();
    await expect(getSession()).resolves.toBeNull();
  });

  it("does not clear a newer session for an older generation", async () => {
    const staleGeneration = bumpSessionGeneration();
    const currentGeneration = bumpSessionGeneration();

    await saveSession(
      createSession({ accessToken: "newer-access" }),
      currentGeneration,
    );
    await clearSession(staleGeneration);

    await expect(getSession()).resolves.toEqual(
      createSession({ accessToken: "newer-access" }),
    );
  });

  it("rolls back a write that becomes stale while it is in progress", async () => {
    let releaseFirstWrite: (() => void) | undefined;
    let writes = 0;

    mockSetItemAsync.mockImplementation(async (...args: unknown[]) => {
      writes += 1;
      const [key, value] = args;

      if (writes === 1) {
        await new Promise<void>((resolve) => {
          releaseFirstWrite = resolve;
        });
      }

      if (typeof key === "string" && typeof value === "string") {
        mockSecureMemory.set(key, value);
      }
    });

    const generation = bumpSessionGeneration();
    const pending = saveSession(
      createSession({ accessToken: "stale-access" }),
      generation,
    );

    await waitFor(() => expect(writes).toBe(1));

    bumpSessionGeneration();
    releaseFirstWrite?.();

    await expect(pending).resolves.toBe(false);
    await expect(getSession()).resolves.toBeNull();
  });

  it("keeps the last session when writes are serialized", async () => {
    const generation = bumpSessionGeneration();
    const first = createSession({ accessToken: "first-access" });
    const second = createSession({ accessToken: "second-access" });

    await Promise.all([
      saveSession(first, generation),
      saveSession(second, generation),
    ]);

    await expect(getSession()).resolves.toEqual(second);
  });

  it("drops a keychain session that survives reinstall", async () => {
    await saveSession(createSession(), bumpSessionGeneration());

    mockInstallMemory.clear();

    await expect(getSession()).resolves.toBeNull();
    expect(mockSecureMemory.size).toBe(0);
  });
});
