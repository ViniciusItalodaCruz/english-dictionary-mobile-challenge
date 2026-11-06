import { useAuthStore } from "@/modules/authentication/stores";
import { api } from "@/shared/utils";

import { saveWordHistory } from "@/modules/details/services";

jest.mock("@/modules/authentication/stores", () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

jest.mock("@/shared/utils", () => ({
  api: {
    post: jest.fn(),
  },
}));

const mockGetState = jest.mocked(useAuthStore.getState);
const mockPost = jest.mocked(api.post);

describe("saveWordHistory", () => {
  const userId = "user-123";
  const accessToken = "access-token-123";

  const getValidAccessToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    getValidAccessToken.mockResolvedValue(accessToken);

    mockGetState.mockReturnValue({
      session: {
        user: { id: userId },
      },
      getValidAccessToken,
    } as unknown as ReturnType<typeof useAuthStore.getState>);

    mockPost.mockResolvedValue({
      data: null,
      status: 204,
      statusText: "No Content",
      headers: {},
      config: {} as never,
    });
  });

  it("saves a word associated with the authenticated user", async () => {
    await saveWordHistory("hello");

    expect(mockPost).toHaveBeenCalledWith(
      "/word_history",
      {
        user_id: userId,
        word: "hello",
        last_viewed_at: expect.any(String),
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        params: {
          on_conflict: "user_id,word",
        },
      },
    );

    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it("sends a valid ISO timestamp", async () => {
    await saveWordHistory("hello");

    const payload = mockPost.mock.calls[0][1] as {
      last_viewed_at: string;
    };

    expect(new Date(payload.last_viewed_at).toISOString()).toBe(
      payload.last_viewed_at,
    );
  });

  it("updates an existing word using upsert", async () => {
    await saveWordHistory("hello");

    expect(mockPost).toHaveBeenCalledWith(
      "/word_history",
      expect.objectContaining({
        user_id: userId,
        word: "hello",
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Prefer: "resolution=merge-duplicates,return=minimal",
        }),
        params: {
          on_conflict: "user_id,word",
        },
      }),
    );
  });

  it("does not save when the access token is missing", async () => {
    getValidAccessToken.mockResolvedValue(null);

    await expect(saveWordHistory("hello")).rejects.toThrow(
      "User is not authenticated.",
    );

    expect(mockPost).not.toHaveBeenCalled();
  });

  it("does not save when the session is missing", async () => {
    mockGetState.mockReturnValue({
      session: null,
      getValidAccessToken,
    } as unknown as ReturnType<typeof useAuthStore.getState>);

    await expect(saveWordHistory("hello")).rejects.toThrow(
      "User is not authenticated.",
    );

    expect(mockPost).not.toHaveBeenCalled();
  });

  it("propagates errors from the API", async () => {
    const error = new Error("Supabase request failed");

    mockPost.mockRejectedValue(error);

    await expect(saveWordHistory("hello")).rejects.toBe(error);

    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
