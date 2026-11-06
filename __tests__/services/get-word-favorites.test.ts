import { useAuthStore } from "@/modules/authentication/stores";
import { getWordFavorites } from "@/modules/home/services";
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

const createFavorites = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    user_id: "user-123",
    word: `word-${index}`,
    created_at: "2026-11-06T10:00:00.000Z",
  }));

describe("getWordFavorites", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getValidAccessToken.mockResolvedValue("access-token-123");

    mockedGetState.mockReturnValue({
      getValidAccessToken,
    } as unknown as ReturnType<typeof useAuthStore.getState>);

    mockedGet.mockResolvedValue({
      data: [],
    });
  });

  it("fetches the authenticated user's favorites", async () => {
    const items = createFavorites(2);

    mockedGet.mockResolvedValueOnce({ data: items });

    const result = await getWordFavorites({
      page: 0,
      pageSize: 20,
    });

    expect(getValidAccessToken).toHaveBeenCalledTimes(1);

    expect(mockedGet).toHaveBeenCalledWith("/favorites", {
      params: {
        select: "user_id,word,created_at",
        order: "created_at.desc,word.asc",
        limit: 21,
        offset: 0,
      },
      signal: undefined,
      headers: {
        Authorization: "Bearer access-token-123",
      },
    });

    expect(result).toEqual({
      items,
      page: 0,
      pageSize: 20,
      hasNextPage: false,
      nextPage: null,
    });
  });

  it("uses the default page size", async () => {
    const result = await getWordFavorites({ page: 0 });

    expect(result.pageSize).toBe(20);

    expect(mockedGet).toHaveBeenCalledWith(
      "/favorites",
      expect.objectContaining({
        params: expect.objectContaining({
          limit: 21,
          offset: 0,
        }),
      }),
    );
  });

  it("calculates the offset for subsequent pages", async () => {
    await getWordFavorites({
      page: 2,
      pageSize: 10,
    });

    expect(mockedGet).toHaveBeenCalledWith(
      "/favorites",
      expect.objectContaining({
        params: expect.objectContaining({
          limit: 11,
          offset: 20,
        }),
      }),
    );
  });

  it("detects when another page is available", async () => {
    mockedGet.mockResolvedValueOnce({
      data: createFavorites(21),
    });

    const result = await getWordFavorites({
      page: 0,
      pageSize: 20,
    });

    expect(result.items).toHaveLength(20);
    expect(result.hasNextPage).toBe(true);
    expect(result.nextPage).toBe(1);
  });

  it("identifies the last page", async () => {
    mockedGet.mockResolvedValueOnce({
      data: createFavorites(5),
    });

    const result = await getWordFavorites({
      page: 1,
      pageSize: 20,
    });

    expect(result.items).toHaveLength(5);
    expect(result.hasNextPage).toBe(false);
    expect(result.nextPage).toBeNull();
  });

  it("returns an empty list when no favorites exist", async () => {
    const result = await getWordFavorites({ page: 0 });

    expect(result).toEqual({
      items: [],
      page: 0,
      pageSize: 20,
      hasNextPage: false,
      nextPage: null,
    });
  });

  it.each([-1, 1.5, NaN, Infinity])(
    "rejects invalid page: %s",
    async (page) => {
      await expect(getWordFavorites({ page })).rejects.toThrow(
        "page must be a non-negative integer",
      );

      expect(mockedGet).not.toHaveBeenCalled();
      expect(getValidAccessToken).not.toHaveBeenCalled();
    },
  );

  it.each([0, -1, 1.5, 101, NaN, Infinity])(
    "rejects invalid pageSize: %s",
    async (pageSize) => {
      await expect(getWordFavorites({ page: 0, pageSize })).rejects.toThrow(
        "pageSize must be an integer between 1 and 100",
      );

      expect(mockedGet).not.toHaveBeenCalled();
      expect(getValidAccessToken).not.toHaveBeenCalled();
    },
  );

  it("does not fetch when the token is missing", async () => {
    getValidAccessToken.mockResolvedValue(null);

    await expect(getWordFavorites({ page: 0 })).rejects.toThrow(
      "User is not authenticated.",
    );

    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("forwards the AbortSignal to Axios", async () => {
    const controller = new AbortController();

    await getWordFavorites({
      page: 0,
      signal: controller.signal,
    });

    expect(mockedGet).toHaveBeenCalledWith(
      "/favorites",
      expect.objectContaining({
        signal: controller.signal,
      }),
    );
  });

  it("propagates API errors", async () => {
    const error = new Error("Unable to load favorites");

    mockedGet.mockRejectedValueOnce(error);

    await expect(getWordFavorites({ page: 0 })).rejects.toBe(error);

    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it("propagates authentication errors", async () => {
    const error = new Error("Session validation failed");

    getValidAccessToken.mockRejectedValueOnce(error);

    await expect(getWordFavorites({ page: 0 })).rejects.toBe(error);

    expect(mockedGet).not.toHaveBeenCalled();
  });
});
