import { useAuthStore } from "@/modules/authentication/stores";
import { deleteWordFavorite } from "@/modules/home/services/delete-word-favorite.service";
import { api } from "@/shared/utils";

jest.mock("@/modules/authentication/stores", () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

jest.mock("@/shared/utils", () => ({
  api: {
    delete: jest.fn(),
  },
}));

const mockedGetState = jest.mocked(useAuthStore.getState);
const mockedDelete = jest.mocked(api.delete);

const getValidAccessToken = jest.fn();

describe("deleteWordFavorite", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getValidAccessToken.mockResolvedValue("access-token-123");

    mockedGetState.mockReturnValue({
      session: {
        user: { id: "user-123" },
      },
      getValidAccessToken,
    } as unknown as ReturnType<typeof useAuthStore.getState>);

    mockedDelete.mockResolvedValue({
      data: null,
      status: 204,
      statusText: "No Content",
      headers: {},
      config: {} as never,
    });
  });

  it("deletes the selected favorite for the authenticated user", async () => {
    await deleteWordFavorite("hello");

    expect(getValidAccessToken).toHaveBeenCalledTimes(1);

    expect(mockedDelete).toHaveBeenCalledWith("/favorites", {
      params: {
        user_id: "eq.user-123",
        word: "eq.hello",
      },
      headers: {
        Authorization: "Bearer access-token-123",
        Prefer: "return=minimal",
      },
    });

    expect(mockedDelete).toHaveBeenCalledTimes(1);
  });

  it("uses the selected word in the deletion filter", async () => {
    await deleteWordFavorite("world");

    expect(mockedDelete).toHaveBeenCalledWith(
      "/favorites",
      expect.objectContaining({
        params: {
          user_id: "eq.user-123",
          word: "eq.world",
        },
      }),
    );
  });

  it("does not delete when the access token is missing", async () => {
    getValidAccessToken.mockResolvedValue(null);

    await expect(deleteWordFavorite("hello")).rejects.toThrow(
      "User is not authenticated.",
    );

    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it("does not delete when the session is missing", async () => {
    mockedGetState.mockReturnValue({
      session: null,
      getValidAccessToken,
    } as unknown as ReturnType<typeof useAuthStore.getState>);

    await expect(deleteWordFavorite("hello")).rejects.toThrow(
      "User is not authenticated.",
    );

    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it("propagates API errors", async () => {
    const error = new Error("Unable to delete favorite");

    mockedDelete.mockRejectedValueOnce(error);

    await expect(deleteWordFavorite("hello")).rejects.toBe(error);

    expect(mockedDelete).toHaveBeenCalledTimes(1);
  });

  it("propagates authentication errors", async () => {
    const error = new Error("Session validation failed");

    getValidAccessToken.mockRejectedValueOnce(error);

    await expect(deleteWordFavorite("hello")).rejects.toBe(error);

    expect(mockedDelete).not.toHaveBeenCalled();
  });
});
