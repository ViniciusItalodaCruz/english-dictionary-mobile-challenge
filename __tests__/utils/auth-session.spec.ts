import {
  InvalidAuthResponseError,
  isSessionExpired,
  mapAuthResponse,
  type AuthSession,
} from "@/modules/authentication/util/auth-session";

const user = {
  id: "user-1",
  email: "user@example.com",
};

const createSession = (expiresAt: number): AuthSession => ({
  accessToken: "access-token",
  expiresAt,
  user,
});

describe("isSessionExpired", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("is expired when the current time reaches the deadline", () => {
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    expect(isSessionExpired(createSession(1_700_000_000))).toBe(true);
  });

  it("is expired after the deadline", () => {
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_060_000);

    expect(isSessionExpired(createSession(1_700_000_000))).toBe(true);
  });

  it("is valid before the deadline", () => {
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    expect(isSessionExpired(createSession(1_700_000_030))).toBe(false);
  });
});

describe("mapAuthResponse", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("builds a session from expires_at and drops the refresh token", () => {
    const session = mapAuthResponse({
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_at: 1_730_000_000,
      user,
    });

    expect(session).toEqual({
      accessToken: "access-token",
      expiresAt: 1_730_000_000,
      user,
    });
    expect(session).not.toHaveProperty("refreshToken");
  });

  it("accepts a payload that does not include a refresh token", () => {
    const session = mapAuthResponse({
      access_token: "access-token",
      expires_at: 1_730_000_000,
      user,
    });

    expect(session.accessToken).toBe("access-token");
    expect(session).not.toHaveProperty("refreshToken");
  });

  it("converts an expires_at value sent in milliseconds", () => {
    const session = mapAuthResponse({
      access_token: "access-token",
      expires_at: 1_730_000_000_000,
      user,
    });

    expect(session.expiresAt).toBe(1_730_000_000);
  });

  it("calculates expiration from expires_in when expires_at is missing", () => {
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    const session = mapAuthResponse({
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
      user,
    });

    expect(session.expiresAt).toBe(1_700_003_600);
  });

  it("rejects a payload without the fields required for a session", () => {
    expect(() => mapAuthResponse({})).toThrow(InvalidAuthResponseError);
    expect(() =>
      mapAuthResponse({
        refresh_token: "refresh-token",
        user,
      }),
    ).toThrow(InvalidAuthResponseError);
  });
});
