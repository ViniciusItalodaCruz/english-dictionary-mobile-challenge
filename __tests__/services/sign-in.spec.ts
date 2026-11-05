import type { AxiosResponse } from "axios";

import { signIn, type SignInOutput } from "@/modules/authentication/services";
import { api } from "@/shared/utils";

jest.mock("@/shared/utils", () => ({
  api: {
    post: jest.fn(),
  },
}));

const mockedPost = jest.mocked(api.post);

describe("signIn", () => {
  const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  const email = "reader.one@example.com";
  const password = "test-password";

  const response: SignInOutput = {
    access_token: "access-token",
    refresh_token: "refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: 1730000000,
    user: {
      id: "user-id",
      email,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  });

  afterAll(() => {
    if (originalUrl === undefined) {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    } else {
      process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    }
  });

  it("should send credentials to the Supabase Auth endpoint", async () => {
    mockedPost.mockResolvedValueOnce({
      data: response,
    } as AxiosResponse<SignInOutput>);

    await signIn(email, password);

    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(mockedPost).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/token?grant_type=password",
      {
        email,
        password,
      },
    );
  });

  it("should return authentication data", async () => {
    mockedPost.mockResolvedValueOnce({
      data: response,
    } as AxiosResponse<SignInOutput>);

    const result = await signIn(email, password);

    expect(result).toEqual(response);
  });

  it("should propagate authentication errors", async () => {
    const error = new Error("Invalid login credentials");

    mockedPost.mockRejectedValueOnce(error);

    await expect(signIn(email, password)).rejects.toBe(error);
  });

  it("should throw when the Supabase URL is missing", async () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;

    await expect(signIn(email, password)).rejects.toThrow(
      "Supabase URL is not configured.",
    );

    expect(mockedPost).not.toHaveBeenCalled();
  });
});
