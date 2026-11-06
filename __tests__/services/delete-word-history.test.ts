import { useAuthStore } from "@/modules/authentication/stores";
import { deleteWordHistory } from "@/modules/home/services";
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

const mockGetState = jest.mocked(useAuthStore.getState);
const mockDelete = jest.mocked(api.delete);

const getValidAccessToken = jest.fn();

describe("deleteWordHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getValidAccessToken.mockResolvedValue("access-token-123");

    mockGetState.mockReturnValue({
      session: {
        user: { id: "user-123" },
      },
      getValidAccessToken,
    } as unknown as ReturnType<typeof useAuthStore.getState>);

    mockDelete.mockResolvedValue({
      data: null,
      status: 204,
      statusText: "No Content",
      headers: {},
      config: {} as never,
    });
  });

  it("deletes the selected word for the authenticated user", async () => {
    await deleteWordHistory("hello");

    expect(mockDelete).toHaveBeenCalledWith("/word_history", {
      params: {
        user_id: "eq.user-123",
        word: "eq.hello",
      },
      headers: {
        Authorization: "Bearer access-token-123",
        Prefer: "return=minimal",
      },
    });

    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("does not delete when the access token is missing", async () => {
    getValidAccessToken.mockResolvedValue(null);

    await expect(deleteWordHistory("hello")).rejects.toThrow(
      "User is not authenticated.",
    );

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("does not delete when the session is missing", async () => {
    mockGetState.mockReturnValue({
      session: null,
      getValidAccessToken,
    } as unknown as ReturnType<typeof useAuthStore.getState>);

    await expect(deleteWordHistory("hello")).rejects.toThrow(
      "User is not authenticated.",
    );

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("propagates API errors", async () => {
    const error = new Error("Unable to delete history");

    mockDelete.mockRejectedValue(error);

    await expect(deleteWordHistory("hello")).rejects.toBe(error);

    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
