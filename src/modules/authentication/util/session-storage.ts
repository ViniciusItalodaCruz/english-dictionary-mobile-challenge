import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import type { AuthSession } from "./auth-session";

const SESSION_KEY = "dictionary.auth.session";
const LEGACY_ACCESS_KEY = "dictionary.auth.access";
const LEGACY_REFRESH_KEY = "dictionary.auth.refresh";
const LEGACY_META_KEY = "dictionary.auth.meta";
const INSTALL_ID_KEY = "dictionary.auth.install-id";

const SECURE_STORE_OPTIONS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
} as const;

export class SessionStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionStorageError";
  }
}

let generation = 0;
let queue: Promise<void> = Promise.resolve();

export function getSessionGeneration(): number {
  return generation;
}

export function bumpSessionGeneration(): number {
  generation += 1;
  return generation;
}

export function resetSessionStorageForTests(): void {
  generation = 0;
  queue = Promise.resolve();
}

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation, operation);

  queue = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function readProperty(value: object, key: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(value, key)) return undefined;

  return Reflect.get(value, key);
}

function hasRefreshToken(value: object): boolean {
  return (
    Object.prototype.hasOwnProperty.call(value, "refreshToken") ||
    Object.prototype.hasOwnProperty.call(value, "refresh_token")
  );
}

async function assertAvailable(): Promise<void> {
  const available = await SecureStore.isAvailableAsync();

  if (!available) {
    throw new SessionStorageError(
      "Secure storage is not available on this device.",
    );
  }
}

async function deleteItems(keys: readonly string[]): Promise<void> {
  const results = await Promise.allSettled(
    keys.map((key) => SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS)),
  );

  const failure = results.find((result) => result.status === "rejected");

  if (failure?.status === "rejected") {
    throw failure.reason;
  }
}

async function deleteLegacy(): Promise<void> {
  await deleteItems([LEGACY_ACCESS_KEY, LEGACY_REFRESH_KEY, LEGACY_META_KEY]);
}

async function deleteAll(): Promise<void> {
  await deleteItems([
    SESSION_KEY,
    LEGACY_ACCESS_KEY,
    LEGACY_REFRESH_KEY,
    LEGACY_META_KEY,
  ]);
}

async function readInstallId(): Promise<string | null> {
  const value = await AsyncStorage.getItem(INSTALL_ID_KEY);

  if (!isNonEmptyString(value)) return null;

  return value;
}

async function ensureInstallId(): Promise<string> {
  const existing = await readInstallId();

  if (existing) return existing;

  const created = createId();

  await AsyncStorage.setItem(INSTALL_ID_KEY, created);

  const confirmed = await readInstallId();

  if (confirmed) return confirmed;

  throw new SessionStorageError("Unable to persist the install identifier.");
}

function assertStorableSession(session: AuthSession): void {
  if (
    hasRefreshToken(session) ||
    !isNonEmptyString(session.accessToken) ||
    !Number.isFinite(session.expiresAt) ||
    session.expiresAt <= 0 ||
    !isNonEmptyString(session.user?.id) ||
    !isNonEmptyString(session.user?.email)
  ) {
    throw new SessionStorageError("Refusing to store an invalid session.");
  }
}

function parseStoredSession(
  raw: string,
  installId: string | null,
): AuthSession | null {
  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed) || hasRefreshToken(parsed)) return null;

    const storedInstallId = readProperty(parsed, "installId");
    const accessToken = readProperty(parsed, "accessToken");
    const expiresAt = readProperty(parsed, "expiresAt");
    const user = readProperty(parsed, "user");

    if (!isNonEmptyString(installId) || storedInstallId !== installId) {
      return null;
    }

    if (!isNonEmptyString(accessToken)) return null;

    if (
      typeof expiresAt !== "number" ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= 0
    ) {
      return null;
    }

    if (!isRecord(user)) return null;

    const userId = readProperty(user, "id");
    const email = readProperty(user, "email");

    if (!isNonEmptyString(userId) || !isNonEmptyString(email)) return null;

    return {
      accessToken,
      expiresAt,
      user: {
        id: userId,
        email,
      },
    };
  } catch {
    return null;
  }
}

async function discardStoredSession(): Promise<null> {
  await deleteAll();
  return null;
}

export async function saveSession(
  session: AuthSession,
  expectedGeneration: number,
): Promise<boolean> {
  assertStorableSession(session);

  return enqueue(async () => {
    if (expectedGeneration !== generation) return false;

    await assertAvailable();

    const installId = await ensureInstallId();

    if (expectedGeneration !== generation) return false;

    const payload = JSON.stringify({
      installId,
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    });

    try {
      await SecureStore.setItemAsync(
        SESSION_KEY,
        payload,
        SECURE_STORE_OPTIONS,
      );

      if (expectedGeneration !== generation) {
        await deleteAll();
        return false;
      }

      await deleteLegacy();

      if (expectedGeneration !== generation) {
        await deleteAll();
        return false;
      }

      return true;
    } catch (error) {
      await deleteAll().catch(() => undefined);
      throw error;
    }
  });
}

export async function getSession(): Promise<AuthSession | null> {
  return enqueue(async () => {
    await assertAvailable();

    const [sessionRaw, accessRaw, refreshRaw, metaRaw, installId] =
      await Promise.all([
        SecureStore.getItemAsync(SESSION_KEY, SECURE_STORE_OPTIONS),
        SecureStore.getItemAsync(LEGACY_ACCESS_KEY, SECURE_STORE_OPTIONS),
        SecureStore.getItemAsync(LEGACY_REFRESH_KEY, SECURE_STORE_OPTIONS),
        SecureStore.getItemAsync(LEGACY_META_KEY, SECURE_STORE_OPTIONS),
        readInstallId(),
      ]);

    const hasLegacy = Boolean(accessRaw || refreshRaw || metaRaw);

    if (!sessionRaw && !hasLegacy) return null;

    if (!sessionRaw) {
      return discardStoredSession();
    }

    const session = parseStoredSession(sessionRaw, installId);

    if (!session) {
      return discardStoredSession();
    }

    if (hasLegacy) {
      await deleteLegacy().catch(() => undefined);
    }

    return session;
  });
}

export async function clearSession(expectedGeneration?: number): Promise<void> {
  return enqueue(async () => {
    if (expectedGeneration !== undefined && expectedGeneration !== generation) {
      return;
    }

    await assertAvailable();
    await deleteAll();
  });
}
