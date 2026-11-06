import { useAuthStore } from "@/modules/authentication/stores";
import { api } from "@/shared/utils";

import { getWordHistory } from "@/modules/home/services";

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

const mockGetState = jest.mocked(useAuthStore.getState);
const mockGet = jest.mocked(api.get);

const getValidAccessToken = jest.fn();

const makeHistory = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    user_id: "user-123",
    word: `word-${index}`,
    last_viewed_at: "2026-11-06T10:00:00.000Z",
  }));

describe("getWordHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getValidAccessToken.mockResolvedValue("access-token-123");

    mockGetState.mockReturnValue({
      getValidAccessToken,
    } as unknown as ReturnType<typeof useAuthStore.getState>);
  });

  it("fetches the authenticated user's history", async () => {
    const items = makeHistory(2);

    mockGet.mockResolvedValue({ data: items });

    const result = await getWordHistory({
      page: 0,
      pageSize: 20,
    });

    expect(mockGet).toHaveBeenCalledWith("/word_history", {
      params: {
        select: "user_id,word,last_viewed_at",
        order: "last_viewed_at.desc,word.asc",
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

    expect(getValidAccessToken).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("uses the default page size", async () => {
    mockGet.mockResolvedValue({ data: [] });

    const result = await getWordHistory({ page: 0 });

    expect(mockGet).toHaveBeenCalledWith(
      "/word_history",
      expect.objectContaining({
        params: expect.objectContaining({
          limit: 21,
          offset: 0,
        }),
      }),
    );

    expect(result.pageSize).toBe(20);
  });

  it("calculates the correct offset for subsequent pages", async () => {
    mockGet.mockResolvedValue({ data: [] });

    await getWordHistory({
      page: 2,
      pageSize: 10,
    });

    expect(mockGet).toHaveBeenCalledWith(
      "/word_history",
      expect.objectContaining({
        params: expect.objectContaining({
          limit: 11,
          offset: 20,
        }),
      }),
    );
  });

  it("detects when another page is available", async () => {
    mockGet.mockResolvedValue({
      data: makeHistory(21),
    });

    const result = await getWordHistory({
      page: 0,
      pageSize: 20,
    });

    expect(result.items).toHaveLength(20);
    expect(result.hasNextPage).toBe(true);
    expect(result.nextPage).toBe(1);
  });

  it("identifies the last page", async () => {
    mockGet.mockResolvedValue({
      data: makeHistory(5),
    });

    const result = await getWordHistory({
      page: 1,
      pageSize: 20,
    });

    expect(result.items).toHaveLength(5);
    expect(result.hasNextPage).toBe(false);
    expect(result.nextPage).toBeNull();
  });

  it("handles an empty history", async () => {
    mockGet.mockResolvedValue({ data: [] });

    const result = await getWordHistory({ page: 0 });

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
      await expect(getWordHistory({ page })).rejects.toThrow(
        "page must be a non-negative integer",
      );

      expect(mockGet).not.toHaveBeenCalled();
    },
  );

  it.each([0, -1, 1.5, 101, NaN, Infinity])(
    "rejects invalid pageSize: %s",
    async (pageSize) => {
      await expect(getWordHistory({ page: 0, pageSize })).rejects.toThrow(
        "pageSize must be an integer between 1 and 100",
      );

      expect(mockGet).not.toHaveBeenCalled();
    },
  );

  it("rejects requests when the access token is missing", async () => {
    getValidAccessToken.mockResolvedValue(null);

    await expect(getWordHistory({ page: 0 })).rejects.toThrow(
      "User is not authenticated.",
    );

    expect(mockGet).not.toHaveBeenCalled();
  });

  it("forwards the AbortSignal to Axios", async () => {
    mockGet.mockResolvedValue({ data: [] });

    const controller = new AbortController();

    await getWordHistory({
      page: 0,
      signal: controller.signal,
    });

    expect(mockGet).toHaveBeenCalledWith(
      "/word_history",
      expect.objectContaining({
        signal: controller.signal,
      }),
    );
  });

  it("propagates API errors", async () => {
    const error = new Error("Supabase request failed");

    mockGet.mockRejectedValue(error);

    await expect(getWordHistory({ page: 0 })).rejects.toBe(error);

    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
