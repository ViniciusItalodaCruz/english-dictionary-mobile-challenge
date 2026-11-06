import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import { useAuthStore } from "../stores";

const REQUEST_TIMEOUT_MS = 15_000;

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class ExternalCredentialTargetError extends Error {
  constructor() {
    super("Refusing to send credentials to an external endpoint.");
    this.name = "ExternalCredentialTargetError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readSupabaseOrigin(): string | null {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) return null;

  try {
    return new URL(supabaseUrl).origin;
  } catch {
    return null;
  }
}

export function isSupabaseRequest(config: InternalAxiosRequestConfig): boolean {
  const origin = readSupabaseOrigin();

  if (!origin) return false;

  const rawUrl = config.url ?? "";

  try {
    const resolved = /^https?:\/\//i.test(rawUrl)
      ? new URL(rawUrl)
      : config.baseURL
        ? new URL(rawUrl, config.baseURL)
        : null;

    return resolved?.origin === origin;
  } catch {
    return false;
  }
}

function removeAuthorization(config: InternalAxiosRequestConfig): void {
  config.headers.delete("Authorization");
}

function setAuthorization(
  config: InternalAxiosRequestConfig,
  accessToken: string,
): void {
  config.headers.set("Authorization", `Bearer ${accessToken}`);
}

function isRequestConfig(value: unknown): value is InternalAxiosRequestConfig {
  if (typeof value !== "object" || value === null || !("headers" in value)) {
    return false;
  }

  const headers = Reflect.get(value, "headers");

  return (
    typeof headers === "object" &&
    headers !== null &&
    "set" in headers &&
    "delete" in headers
  );
}

export async function authorizeRequest(
  config: InternalAxiosRequestConfig,
): Promise<InternalAxiosRequestConfig> {
  if (!isSupabaseRequest(config)) {
    removeAuthorization(config);
    throw new ExternalCredentialTargetError();
  }

  const accessToken = await useAuthStore.getState().getValidAccessToken();

  if (!accessToken) {
    removeAuthorization(config);
    throw new AuthenticationRequiredError();
  }

  setAuthorization(config, accessToken);
  return config;
}

function isUnauthorized(
  error: unknown,
): error is {
  config?: InternalAxiosRequestConfig;
  response: { status: number };
} {
  if (!isRecord(error) || !isRecord(error.response)) return false;

  if (error.response.status !== 401) return false;

  if (error.config === undefined) return true;

  return isRequestConfig(error.config);
}

function isSupabaseAuthFailure(
  error: unknown,
): error is {
  config: InternalAxiosRequestConfig;
  response: { status: number };
} {
  if (!isUnauthorized(error) || !error.config) return false;

  return isSupabaseRequest(error.config);
}

export async function handleUnauthorized(error: unknown): Promise<never> {
  if (isSupabaseAuthFailure(error)) {
    await useAuthStore.getState().signOut();
  }

  throw error;
}

export function createAuthenticatedApi(): AxiosInstance {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Configuration missing. Supabase URL and publishable key are required.",
    );
  }

  const client = axios.create({
    baseURL: `${url}/rest/v1`,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      apikey: key,
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use((config) => authorizeRequest(config));
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => handleUnauthorized(error),
  );

  return client;
}

let authenticatedClient: AxiosInstance | undefined;

export function getAuthenticatedApi(): AxiosInstance {
  authenticatedClient ??= createAuthenticatedApi();
  return authenticatedClient;
}
