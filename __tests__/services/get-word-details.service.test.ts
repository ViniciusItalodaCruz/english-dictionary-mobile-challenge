import axios from "axios";

import {
    getWordDetails,
    type GetWordDetailsOutput,
} from "@/modules/details/services/get-word-details.service";

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));
const mockedGet = jest.mocked(axios.get);

const BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";

const createWordDetails = (): GetWordDetailsOutput => [
  {
    word: "hello",
    phonetic: "/həˈləʊ/",
    phonetics: [
      {
        text: "/həˈləʊ/",
        audio: "https://example.com/hello.mp3",
      },
    ],
    meanings: [
      {
        partOfSpeech: "noun",
        definitions: [
          {
            definition: "A greeting.",
            example: "Hello, everyone.",
            synonyms: ["greeting"],
            antonyms: [],
          },
        ],
        synonyms: [],
        antonyms: [],
      },
    ],
  },
];

describe("getWordDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch and return word details", async () => {
    const response = createWordDetails();

    mockedGet.mockResolvedValueOnce({ data: response });

    const result = await getWordDetails("hello");

    expect(mockedGet).toHaveBeenCalledWith(`${BASE_URL}/hello`, {
      signal: undefined,
    });

    expect(result).toEqual(response);
  });

  it("should encode the requested word", async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });

    await getWordDetails("ice cream");

    expect(mockedGet).toHaveBeenCalledWith(`${BASE_URL}/ice%20cream`, {
      signal: undefined,
    });
  });

  it("should return multiple entries", async () => {
    const response = [
      ...createWordDetails(),
      {
        word: "hello",
        meanings: [
          {
            partOfSpeech: "verb",
            definitions: [
              {
                definition: "To greet someone.",
              },
            ],
          },
        ],
      },
    ];

    mockedGet.mockResolvedValueOnce({ data: response });

    const result = await getWordDetails("hello");

    expect(result).toEqual(response);
    expect(result).toHaveLength(2);
  });

  it("should handle missing optional fields", async () => {
    const response: GetWordDetailsOutput = [
      {
        word: "hello",
        meanings: [
          {
            partOfSpeech: "noun",
            definitions: [
              {
                definition: "A greeting.",
              },
            ],
          },
        ],
      },
    ];

    mockedGet.mockResolvedValueOnce({ data: response });

    const result = await getWordDetails("hello");

    expect(result).toEqual(response);
    expect(result[0].phonetic).toBeUndefined();
    expect(result[0].phonetics).toBeUndefined();
  });

  it("should forward the abort signal", async () => {
    const controller = new AbortController();

    mockedGet.mockResolvedValueOnce({ data: [] });

    await getWordDetails("hello", controller.signal);

    expect(mockedGet).toHaveBeenCalledWith(`${BASE_URL}/hello`, {
      signal: controller.signal,
    });
  });

  it("should propagate a not found error", async () => {
    const error = {
      response: {
        status: 404,
        data: {
          title: "No Definitions Found",
        },
      },
    };

    mockedGet.mockRejectedValueOnce(error);

    await expect(getWordDetails("unknownword")).rejects.toBe(error);
  });

  it("should propagate network errors", async () => {
    const error = new Error("Network Error");

    mockedGet.mockRejectedValueOnce(error);

    await expect(getWordDetails("hello")).rejects.toThrow("Network Error");
  });

  it("should propagate cancellation errors", async () => {
    const error = new Error("Request canceled");

    mockedGet.mockRejectedValueOnce(error);

    await expect(getWordDetails("hello")).rejects.toBe(error);
  });
});
