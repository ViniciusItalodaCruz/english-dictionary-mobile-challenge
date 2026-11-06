import { useGetWordDetails } from "@/modules/details/hooks/use-get-word-details";
import { useWordDetails } from "@/modules/details/hooks/use-word-details";
import { cleanup, renderHook } from "@testing-library/react-native";

jest.mock("@/modules/details/hooks/use-get-word-details", () => ({
  useGetWordDetails: jest.fn(),
}));

const mockedUseGetWordDetails = jest.mocked(useGetWordDetails);

const retry = jest.fn();

const createQueryResult = (
  overrides: Partial<ReturnType<typeof useGetWordDetails>> = {},
): ReturnType<typeof useGetWordDetails> => ({
  wordDetails: [],
  error: null,
  isLoading: false,
  isError: false,
  isEmpty: false,
  retry,
  ...overrides,
});

describe("useWordDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseGetWordDetails.mockReturnValue(createQueryResult());
  });

  afterEach(async () => {
    await cleanup();
  });

  it("passes the selected word to the query hook", async () => {
    await renderHook(() => useWordDetails("hello"));

    expect(mockedUseGetWordDetails).toHaveBeenCalledWith("hello");
  });

  it("returns the word and phonetic from the API", async () => {
    mockedUseGetWordDetails.mockReturnValue(
      createQueryResult({
        wordDetails: [
          {
            word: "hello",
            phonetic: "/həˈləʊ/",
          },
        ],
      }),
    );

    const { result } = await renderHook(() => useWordDetails("hello"));

    expect(result.current.word).toBe("hello");
    expect(result.current.phonetic).toBe("/həˈləʊ/");
  });

  it("uses the first available phonetic text as fallback", async () => {
    mockedUseGetWordDetails.mockReturnValue(
      createQueryResult({
        wordDetails: [
          {
            word: "hello",
            phonetics: [
              { audio: "https://example.com/audio.mp3" },
              { text: "/həˈloʊ/" },
            ],
          },
        ],
      }),
    );

    const { result } = await renderHook(() => useWordDetails("hello"));

    expect(result.current.phonetic).toBe("/həˈloʊ/");
  });

  it("returns empty phonetic when none is available", async () => {
    mockedUseGetWordDetails.mockReturnValue(
      createQueryResult({
        wordDetails: [{ word: "hello" }],
      }),
    );

    const { result } = await renderHook(() => useWordDetails("hello"));

    expect(result.current.phonetic).toBe("");
  });

  it("combines meanings from multiple entries", async () => {
    mockedUseGetWordDetails.mockReturnValue(
      createQueryResult({
        wordDetails: [
          {
            word: "hello",
            meanings: [
              {
                partOfSpeech: "noun",
                definitions: [{ definition: "A greeting." }],
              },
            ],
          },
          {
            word: "hello",
            meanings: [
              {
                partOfSpeech: "verb",
                definitions: [{ definition: "To greet someone." }],
              },
            ],
          },
        ],
      }),
    );

    const { result } = await renderHook(() => useWordDetails("hello"));

    expect(result.current.meanings).toHaveLength(2);
    expect(result.current.meanings[0].partOfSpeech).toBe("noun");
    expect(result.current.meanings[1].partOfSpeech).toBe("verb");
  });

  it("handles entries without meanings", async () => {
    mockedUseGetWordDetails.mockReturnValue(
      createQueryResult({
        wordDetails: [{ word: "hello" }],
      }),
    );

    const { result } = await renderHook(() => useWordDetails("hello"));

    expect(result.current.meanings).toEqual([]);
  });

  it("detects a 404 error", async () => {
    const error = Object.assign(new Error("Not Found"), {
      response: { status: 404 },
    });

    mockedUseGetWordDetails.mockReturnValue(
      createQueryResult({
        isError: true,
        error,
      }),
    );

    const { result } = await renderHook(() => useWordDetails("unknown"));

    expect(result.current.isNotFound).toBe(true);
  });

  it("does not classify other errors as not found", async () => {
    mockedUseGetWordDetails.mockReturnValue(
      createQueryResult({
        isError: true,
        error: new Error("Network Error"),
      }),
    );

    const { result } = await renderHook(() => useWordDetails("hello"));

    expect(result.current.isNotFound).toBe(false);
  });

  it("exposes query states and retry", async () => {
    mockedUseGetWordDetails.mockReturnValue(
      createQueryResult({
        isLoading: true,
      }),
    );

    const { result } = await renderHook(() => useWordDetails("hello"));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.retry).toBe(retry);
  });

  it("uses the requested word when no entry exists", async () => {
    const { result } = await renderHook(() => useWordDetails("hello"));

    expect(result.current.word).toBe("hello");
  });
});
