import { useGetWordDetails } from "@/modules/details/hooks";
import type { GetWordDetailsOutput } from "@/modules/details/services";
import { getWordDetails } from "@/modules/details/services";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
    act,
    cleanup,
    renderHook,
    waitFor,
} from "@testing-library/react-native";

import type { PropsWithChildren } from "react";

jest.mock("@/modules/details/services", () => ({
  getWordDetails: jest.fn(),
}));

const mockedGetWordDetails = jest.mocked(getWordDetails);

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
          },
        ],
      },
    ],
  },
];

describe("useGetWordDetails", () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return function Wrapper({ children }: PropsWithChildren) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });

    mockedGetWordDetails.mockResolvedValue(createWordDetails());
  });

  afterEach(async () => {
    await cleanup();
    queryClient.clear();
  });

  it("fetches word details successfully", async () => {
    const response = createWordDetails();

    const { result } = await renderHook(() => useGetWordDetails("hello"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.wordDetails).toEqual(response);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isEmpty).toBe(false);

    expect(mockedGetWordDetails).toHaveBeenCalledWith(
      "hello",
      expect.anything(),
    );
  });

  it("exposes loading state", async () => {
    mockedGetWordDetails.mockImplementation(() => new Promise(() => {}));

    const { result } = await renderHook(() => useGetWordDetails("hello"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.wordDetails).toEqual([]);
  });

  it("does not fetch when word is empty", async () => {
    const { result } = await renderHook(() => useGetWordDetails(""), {
      wrapper: createWrapper(),
    });

    expect(mockedGetWordDetails).not.toHaveBeenCalled();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isEmpty).toBe(false);
  });

  it("does not fetch when word contains only spaces", async () => {
    const { result } = await renderHook(() => useGetWordDetails("   "), {
      wrapper: createWrapper(),
    });

    expect(mockedGetWordDetails).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("normalizes the requested word", async () => {
    const { result } = await renderHook(() => useGetWordDetails("  HELLO  "), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockedGetWordDetails).toHaveBeenCalledWith(
      "hello",
      expect.anything(),
    );
  });

  it("exposes empty state", async () => {
    mockedGetWordDetails.mockResolvedValueOnce([]);

    const { result } = await renderHook(() => useGetWordDetails("hello"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isEmpty).toBe(true);
    });

    expect(result.current.wordDetails).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it("exposes API errors", async () => {
    const error = new Error("Unable to fetch word");

    mockedGetWordDetails.mockRejectedValueOnce(error);

    const { result } = await renderHook(() => useGetWordDetails("hello"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isEmpty).toBe(false);
  });

  it("retries after an error", async () => {
    const error = new Error("Network Error");

    mockedGetWordDetails
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(createWordDetails());

    const { result } = await renderHook(() => useGetWordDetails("hello"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(false);
      expect(result.current.wordDetails).toHaveLength(1);
    });

    expect(mockedGetWordDetails).toHaveBeenCalledTimes(2);
  });

  it("forwards AbortSignal to the service", async () => {
    const { result } = await renderHook(() => useGetWordDetails("hello"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const signal = mockedGetWordDetails.mock.calls[0][1];

    expect(signal).toBeDefined();
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("uses separate cache entries for different words", async () => {
    const { result, rerender } = await renderHook(
      ({ word }: { word: string }) => useGetWordDetails(word),
      {
        initialProps: { word: "hello" },
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await rerender({ word: "world" });

    await waitFor(() => {
      expect(mockedGetWordDetails).toHaveBeenCalledWith(
        "world",
        expect.anything(),
      );
    });

    expect(queryClient.getQueryData(["word-details", "hello"])).toEqual(
      createWordDetails(),
    );

    expect(mockedGetWordDetails).toHaveBeenCalledTimes(2);
  });
});
