export type AuthUser = {
  id: string;
  email: string;
};

export type AuthSession = {
  accessToken: string;
  expiresAt: number;
  user: AuthUser;
};

export class InvalidAuthResponseError extends Error {
  constructor() {
    super("Authentication response is invalid.");
    this.name = "InvalidAuthResponseError";
  }
}

export function isSessionExpired(session: AuthSession): boolean {
  return Date.now() >= session.expiresAt * 1000;
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

function readFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;

  return value;
}

function normalizeExpiresAt(
  expiresAt: number | null,
  expiresIn: number | null,
): number {
  if (expiresAt !== null && expiresAt > 10_000_000_000) {
    return Math.floor(expiresAt / 1000);
  }

  if (expiresAt !== null && expiresAt > 0) {
    return Math.floor(expiresAt);
  }

  if (expiresIn !== null && expiresIn > 0) {
    return Math.floor(Date.now() / 1000) + Math.floor(expiresIn);
  }

  throw new InvalidAuthResponseError();
}

export function mapAuthResponse(output: unknown): AuthSession {
  if (!isRecord(output)) {
    throw new InvalidAuthResponseError();
  }

  const accessToken = readProperty(output, "access_token");
  const user = readProperty(output, "user");

  if (!isNonEmptyString(accessToken) || !isRecord(user)) {
    throw new InvalidAuthResponseError();
  }

  const userId = readProperty(user, "id");
  const email = readProperty(user, "email");

  if (!isNonEmptyString(userId) || !isNonEmptyString(email)) {
    throw new InvalidAuthResponseError();
  }

  return {
    accessToken,
    expiresAt: normalizeExpiresAt(
      readFiniteNumber(readProperty(output, "expires_at")),
      readFiniteNumber(readProperty(output, "expires_in")),
    ),
    user: {
      id: userId,
      email,
    },
  };
}
