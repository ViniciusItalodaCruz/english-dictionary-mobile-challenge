import { useAuthStore } from "@/modules/authentication/stores";
import { getWordFavoriteStatus } from "@/modules/details/services";
import { api } from "@/shared/utils";

jest.mock("@/modules/authentication/stores", () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

jest.mock("@/shared/utils", () => ({
  api: {
    get: jest.fn(),
  },
}));

const mockedGetState = jest.mocked(useAuthStore.getState);
const mockedGet = jest.mocked(api.get);

const getValidAccessToken = jest.fn();

describe("getWordFavoriteStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getValidAccessToken.mockResolvedValue("access-token-123");

    mockedGetState.mockReturnValue({
      session: {
        user: { id: "user-123" },
      },
      getValidAccessToken,
    } as unknown as ReturnType<typeof useAuthStore.getState>);

    mockedGet.mockResolvedValue({ data: [] });
  });

  it("returns true when the word is favorited", async () => {
    mockedGet.mockResolvedValueOnce({
      data: [{ word: "hello" }],
    });

    const result = await getWordFavoriteStatus("hello");

    expect(result).toBe(true);

    expect(mockedGet).toHaveBeenCalledWith("/favorites", {
      params: {
        select: "word",
        user_id: "eq.user-123",
        word: "eq.hello",
        limit: 1,
      },
      headers: {
        Authorization: "Bearer access-token-123",
      },
      signal: undefined,
    });
  });

  it("returns false when the word is not favorited", async () => {
    const result = await getWordFavoriteStatus("hello");

    expect(result).toBe(false);
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it("queries the exact selected word", async () => {
    await getWordFavoriteStatus("world");

    expect(mockedGet).toHaveBeenCalledWith(
      "/favorites",
      expect.objectContaining({
        params: expect.objectContaining({
          word: "eq.world",
        }),
      }),
    );
  });

  it("does not fetch without a session", async () => {
    mockedGetState.mockReturnValue({
      session: null,
      getValidAccessToken,
    } as unknown as ReturnType<typeof useAuthStore.getState>);

    await expect(getWordFavoriteStatus("hello")).rejects.toThrow(
      "User is not authenticated.",
    );

    expect(getValidAccessToken).not.toHaveBeenCalled();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("does not fetch without an access token", async () => {
    getValidAccessToken.mockResolvedValue(null);

    await expect(getWordFavoriteStatus("hello")).rejects.toThrow(
      "User is not authenticated.",
    );

    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("forwards the AbortSignal to Axios", async () => {
    const controller = new AbortController();

    await getWordFavoriteStatus("hello", controller.signal);

    expect(mockedGet).toHaveBeenCalledWith(
      "/favorites",
      expect.objectContaining({
        signal: controller.signal,
      }),
    );
  });

  it("propagates API errors", async () => {
    const error = new Error("Unable to check favorite");

    mockedGet.mockRejectedValueOnce(error);

    await expect(getWordFavoriteStatus("hello")).rejects.toBe(error);
  });

  it("propagates authentication errors", async () => {
    const error = new Error("Session validation failed");

    getValidAccessToken.mockRejectedValueOnce(error);

    await expect(getWordFavoriteStatus("hello")).rejects.toBe(error);

    expect(mockedGet).not.toHaveBeenCalled();
  });
});
