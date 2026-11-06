import { revokeRemoteSession } from "@/modules/authentication/services";
import { api } from "@/shared/utils";

jest.mock("@/shared/utils", () => ({
  api: {
    post: jest.fn(),
  },
}));

const mockedPost = jest.mocked(api.post);

describe("revokeRemoteSession", () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  });

  it("revokes the current Supabase session with the access token", async () => {
    mockedPost.mockResolvedValueOnce({ data: {} });

    await revokeRemoteSession("access-token");

    expect(mockedPost).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/logout",
      {},
      {
        headers: {
          Authorization: "Bearer access-token",
        },
        timeout: 5_000,
      },
    );
  });

  it("does not call Supabase when the access token is empty", async () => {
    await revokeRemoteSession("");

    expect(mockedPost).not.toHaveBeenCalled();
  });
});