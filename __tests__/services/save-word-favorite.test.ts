import { useAuthStore } from "@/modules/authentication/stores";
import { saveWordFavorite } from "@/modules/details/services";
import { api } from "@/shared/utils";

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

const mockedGetState = jest.mocked(useAuthStore.getState);
const mockedPost = jest.mocked(api.post);

const getValidAccessToken = jest.fn();

describe("saveWordFavorite", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getValidAccessToken.mockResolvedValue("access-token-123");

    mockedGetState.mockReturnValue({
      getValidAccessToken,
    } as unknown as ReturnType<typeof useAuthStore.getState>);

    mockedPost.mockResolvedValue({
      data: null,
      status: 204,
      statusText: "No Content",
      headers: {},
      config: {} as never,
    });
  });

  it("saves a favorite for the authenticated user", async () => {
    await saveWordFavorite("hello");

    expect(getValidAccessToken).toHaveBeenCalledTimes(1);

    expect(mockedPost).toHaveBeenCalledWith(
      "/favorites",
      {
        word: "hello",
      },
      {
        headers: {
          Authorization: "Bearer access-token-123",
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        params: {
          on_conflict: "user_id,word",
        },
      },
    );

    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it("sends only the word in the request body", async () => {
    await saveWordFavorite("world");

    expect(mockedPost).toHaveBeenCalledWith(
      "/favorites",
      { word: "world" },
      expect.any(Object),
    );

    const payload = mockedPost.mock.calls[0][1];

    expect(payload).toEqual({ word: "world" });
  });

  it("configures the request to ignore duplicate favorites", async () => {
    await saveWordFavorite("hello");

    expect(mockedPost).toHaveBeenCalledWith(
      "/favorites",
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          Prefer: "resolution=ignore-duplicates,return=minimal",
        }),
        params: {
          on_conflict: "user_id,word",
        },
      }),
    );
  });

  it("does not save when the access token is missing", async () => {
    getValidAccessToken.mockResolvedValue(null);

    await expect(saveWordFavorite("hello")).rejects.toThrow(
      "User is not authenticated.",
    );

    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("does not save when the access token is expired", async () => {
    getValidAccessToken.mockResolvedValue(null);

    await expect(saveWordFavorite("hello")).rejects.toThrow(
      "User is not authenticated.",
    );

    expect(getValidAccessToken).toHaveBeenCalledTimes(1);
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("propagates API errors", async () => {
    const error = new Error("Unable to save favorite");

    mockedPost.mockRejectedValue(error);

    await expect(saveWordFavorite("hello")).rejects.toBe(error);

    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it("propagates authentication errors", async () => {
    const error = new Error("Unable to validate session");

    getValidAccessToken.mockRejectedValue(error);

    await expect(saveWordFavorite("hello")).rejects.toBe(error);

    expect(mockedPost).not.toHaveBeenCalled();
  });
});
