import {
  getWordList,
  type Word,
} from "@/modules/home/services/word-list.service";
import { api } from "@/shared/utils";

jest.mock("@/shared/utils", () => ({
  api: {
    get: jest.fn(),
  },
}));

const mockedGet = jest.mocked(api.get);

describe("getWordList", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it("uses the default page size and starts at offset zero", async () => {
    mockedGet.mockResolvedValueOnce({
      data: [{ word: "hello" }],
    });

    const result = await getWordList({ page: 0 });

    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith("/words", {
      params: {
        select: "word",
        order: "word.asc",
        limit: 101,
        offset: 0,
      },
      signal: undefined,
    });

    expect(result).toEqual({
      items: [{ word: "hello" }],
      page: 0,
      pageSize: 100,
      hasNextPage: false,
      nextPage: null,
    });
  });

  it("calculates the offset, excludes the extra item, and identifies the next page", async () => {
    const words: Word[] = [
      { word: "apple" },
      { word: "book" },
      { word: "chair" },
    ];

    mockedGet.mockResolvedValueOnce({ data: words });

    const result = await getWordList({
      page: 2,
      pageSize: 2,
    });

    expect(mockedGet).toHaveBeenCalledWith("/words", {
      params: {
        select: "word",
        order: "word.asc",
        limit: 3,
        offset: 4,
      },
      signal: undefined,
    });

    expect(result).toEqual({
      items: [{ word: "apple" }, { word: "book" }],
      page: 2,
      pageSize: 2,
      hasNextPage: true,
      nextPage: 3,
    });
  });

  it("ends pagination when the response contains exactly pageSize items", async () => {
    const words: Word[] = [{ word: "apple" }, { word: "book" }];

    mockedGet.mockResolvedValueOnce({ data: words });

    await expect(getWordList({ page: 1, pageSize: 2 })).resolves.toEqual({
      items: words,
      page: 1,
      pageSize: 2,
      hasNextPage: false,
      nextPage: null,
    });
  });

  it("returns an empty list without a next page", async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });

    await expect(getWordList({ page: 0, pageSize: 2 })).resolves.toEqual({
      items: [],
      page: 0,
      pageSize: 2,
      hasNextPage: false,
      nextPage: null,
    });
  });

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects an invalid page: %p",
    async (page) => {
      await expect(getWordList({ page })).rejects.toThrow(
        "page must be a positive integer",
      );

      expect(mockedGet).not.toHaveBeenCalled();
    },
  );

  it.each([-1, 0, 1.5, 101, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects an invalid pageSize: %p",
    async (pageSize) => {
      await expect(getWordList({ page: 0, pageSize })).rejects.toThrow(
        "pageSize must be an integer between 1 and 100",
      );

      expect(mockedGet).not.toHaveBeenCalled();
    },
  );

  it.each([1, 100])(
    "accepts a valid pageSize boundary: %p",
    async (pageSize) => {
      mockedGet.mockResolvedValueOnce({ data: [] });

      await expect(getWordList({ page: 0, pageSize })).resolves.toMatchObject({
        pageSize,
        hasNextPage: false,
      });

      expect(mockedGet).toHaveBeenCalledTimes(1);
    },
  );

  it("forwards the abort signal to the HTTP client", async () => {
    const controller = new AbortController();

    mockedGet.mockResolvedValueOnce({ data: [] });

    await getWordList({
      page: 0,
      signal: controller.signal,
    });

    expect(mockedGet).toHaveBeenCalledWith(
      "/words",
      expect.objectContaining({
        signal: controller.signal,
      }),
    );
  });

  it("propagates HTTP client errors", async () => {
    const error = new Error("Network Error");

    mockedGet.mockRejectedValueOnce(error);

    await expect(getWordList({ page: 0 })).rejects.toBe(error);
  });
});
