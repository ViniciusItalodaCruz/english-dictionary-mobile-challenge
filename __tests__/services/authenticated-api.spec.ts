import axios, { type InternalAxiosRequestConfig } from "axios";

import {
  AuthenticationRequiredError,
  authorizeRequest,
  createAuthenticatedApi,
  ExternalCredentialTargetError,
  handleUnauthorized,
} from "@/modules/authentication/services/authenticated-api.service";

const mockGetState = jest.fn();
const mockRequest = jest.fn();
const mockRequestUse = jest.fn();
const mockResponseUse = jest.fn();
const mockClient = {
  defaults: {
    headers: {} as Record<string, string>,
  },
  interceptors: {
    request: {
      use: (...args: unknown[]) => mockRequestUse(...args),
      eject: jest.fn(),
    },
    response: {
      use: (...args: unknown[]) => mockResponseUse(...args),
      eject: jest.fn(),
    },
  },
  request: (...args: unknown[]) => mockRequest(...args),
};

jest.mock("axios", () => {
  const actual = jest.requireActual<typeof import("axios")>("axios");

  return {
    __esModule: true,
    default: Object.assign(
      function axiosMock() {
        return undefined;
      },
      actual.default,
      {
        create: jest.fn(() => mockClient),
      },
    ),
  };
});

jest.mock("@/modules/authentication/stores", () => ({
  useAuthStore: {
    getState: () => mockGetState(),
  },
}));

const SUPABASE_URL = "https://example.supabase.co";

const createConfig = (
  url: string,
  baseURL = `${SUPABASE_URL}/rest/v1`,
): InternalAxiosRequestConfig => ({
  url,
  baseURL,
  headers: new axios.AxiosHeaders({
    apikey: "sb_publishable_test",
  }),
});

const readAuthorization = (config: InternalAxiosRequestConfig): unknown =>
  config.headers.get("Authorization");

describe("authenticated api", () => {
  beforeEach(() => {
    mockGetState.mockReset();
    mockRequest.mockReset();
    mockRequestUse.mockClear();
    mockResponseUse.mockClear();
    mockClient.defaults.headers = {};
    process.env.EXPO_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  });

  it("creates a Supabase client that keeps the publishable key and has no default access token", () => {
    const axios = jest.requireMock("axios") as {
      default: { create: jest.Mock };
    };

    axios.default.create.mockClear();

    createAuthenticatedApi();

    expect(axios.default.create).toHaveBeenCalledWith({
      baseURL: `${SUPABASE_URL}/rest/v1`,
      timeout: 15_000,
      headers: {
        apikey: "sb_publishable_test",
        "Content-Type": "application/json",
      },
    });
    expect(mockClient.defaults.headers.Authorization).toBeUndefined();
    expect(mockRequestUse).toHaveBeenCalled();
    expect(mockResponseUse).toHaveBeenCalled();
  });

  it("adds the current bearer token and keeps the publishable key", async () => {
    mockGetState.mockReturnValue({
      getValidAccessToken: jest.fn().mockResolvedValue("fresh-access"),
    });

    const config = createConfig("/favorites");
    const next = await authorizeRequest(config);

    expect(readAuthorization(next)).toBe("Bearer fresh-access");
    expect(next.headers.get("apikey")).toBe("sb_publishable_test");
    expect(mockClient.defaults.headers.Authorization).toBeUndefined();
  });

  it("waits for a refreshed token before sending concurrent requests", async () => {
    let resolveToken: ((token: string) => void) | undefined;
    const token = new Promise<string>((resolve) => {
      resolveToken = resolve;
    });

    mockGetState.mockReturnValue({
      getValidAccessToken: jest.fn(() => token),
    });

    const first = authorizeRequest(createConfig("/favorites"));
    const second = authorizeRequest(createConfig("/history"));

    resolveToken?.("updated-access");

    const [firstConfig, secondConfig] = await Promise.all([first, second]);

    expect(readAuthorization(firstConfig)).toBe("Bearer updated-access");
    expect(readAuthorization(secondConfig)).toBe("Bearer updated-access");
  });

  it("rejects a request when the token is missing or expired", async () => {
    const getValidAccessToken = jest.fn().mockResolvedValue(null);

    mockGetState.mockReturnValue({ getValidAccessToken });

    const config = createConfig("/favorites");

    await expect(authorizeRequest(config)).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    );
    expect(readAuthorization(config)).toBeUndefined();
    expect(getValidAccessToken).toHaveBeenCalledTimes(1);
  });

  it("does not send an access token to an external endpoint", async () => {
    const getValidAccessToken = jest.fn().mockResolvedValue("secret-token");

    mockGetState.mockReturnValue({ getValidAccessToken });

    const config = createConfig("https://evil.example/collect");

    await expect(authorizeRequest(config)).rejects.toBeInstanceOf(
      ExternalCredentialTargetError,
    );
    expect(readAuthorization(config)).toBeUndefined();
    expect(getValidAccessToken).not.toHaveBeenCalled();
  });

  it("ends the Supabase session on HTTP 401 and does not retry the request", async () => {
    const signOut = jest.fn().mockResolvedValue(undefined);

    mockGetState.mockReturnValue({ signOut });

    const error = {
      response: { status: 401 },
      config: createConfig("/favorites"),
    };

    await expect(handleUnauthorized(error)).rejects.toBe(error);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("does not end the session when an external request returns HTTP 401", async () => {
    const signOut = jest.fn().mockResolvedValue(undefined);

    mockGetState.mockReturnValue({ signOut });

    const error = {
      response: { status: 401 },
      config: createConfig(
        "https://api.dictionaryapi.dev/api/v2/entries/en/hello",
        "https://api.dictionaryapi.dev",
      ),
    };

    await expect(handleUnauthorized(error)).rejects.toBe(error);
    expect(signOut).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
  });
});
