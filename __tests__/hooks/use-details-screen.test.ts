import { useDetailsScreen } from "@/modules/details/hooks/use-details-screen";
import { useSaveWordHistory } from "@/modules/details/hooks/use-save-word-history";
import { useWordDetails } from "@/modules/details/hooks/use-word-details";
import { useWordNavigation } from "@/modules/details/hooks/use-word-navigation";
import { act, cleanup, renderHook } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@/modules/details/hooks/use-save-word-history", () => ({
  useSaveWordHistory: jest.fn(),
}));

jest.mock("@/modules/details/hooks/use-word-details", () => ({
  useWordDetails: jest.fn(),
}));

jest.mock("@/modules/details/hooks/use-word-navigation", () => ({
  useWordNavigation: jest.fn(),
}));

const mockedParams = jest.mocked(useLocalSearchParams);
const mockedRouter = jest.mocked(useRouter);
const mockedHistory = jest.mocked(useSaveWordHistory);
const mockedDetails = jest.mocked(useWordDetails);
const mockedNavigation = jest.mocked(
  jest.requireMock("@/modules/details/hooks/use-word-navigation")
    .useWordNavigation,
);

const mockBack = jest.fn();
const mockRetry = jest.fn();
const mockOnPrevious = jest.fn();
const mockOnNext = jest.fn();

const createDetails = (
  overrides: Partial<ReturnType<typeof useWordDetails>> = {},
): ReturnType<typeof useWordDetails> => ({
  word: "hello",
  phonetic: "/həˈləʊ/",
  meanings: [
    {
      partOfSpeech: "noun",
      definitions: [{ definition: "A greeting." }],
    },
  ],
  isLoading: false,
  isError: false,
  isEmpty: false,
  isNotFound: false,
  retry: mockRetry,
  audioUrl: "https://example.com/hello.mp3",
  ...overrides,
});

describe("useDetailsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedParams.mockReturnValue({ word: "hello" });

    mockedRouter.mockReturnValue({
      back: mockBack,
    } as unknown as ReturnType<typeof useRouter>);

    mockedDetails.mockReturnValue(createDetails());
    mockedNavigation.mockReturnValue({
      hasPrevious: true,
      hasNext: false,
      onPrevious: mockOnPrevious,
      onNext: mockOnNext,
    } satisfies ReturnType<typeof useWordNavigation>);
  });

  afterEach(async () => {
    await cleanup();
  });

  it("passes the selected word to the existing hooks", async () => {
    await renderHook(() => useDetailsScreen());

    expect(mockedHistory).toHaveBeenCalledWith("hello");
    expect(mockedDetails).toHaveBeenCalledWith("hello");
  });

  it("exposes the details for presentation", async () => {
    const { result } = await renderHook(() => useDetailsScreen());

    expect(result.current.selectedWord).toBe("hello");
    expect(result.current.word).toBe("hello");
    expect(result.current.phonetic).toBe("/həˈləʊ/");
    expect(result.current.meanings).toHaveLength(1);
    expect(result.current.showContent).toBe(true);
  });

  it("navigates back when closing details", async () => {
    const { result } = await renderHook(() => useDetailsScreen());

    await act(async () => {
      result.current.onClose();
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["loading", { isLoading: true }],
    ["error", { isError: true }],
    ["empty", { isEmpty: true }],
  ])("hides content during %s state", async (_, overrides) => {
    mockedDetails.mockReturnValue(createDetails(overrides));

    const { result } = await renderHook(() => useDetailsScreen());

    expect(result.current.showContent).toBe(false);
  });

  it("handles a missing route word", async () => {
    mockedParams.mockReturnValue({});

    const { result } = await renderHook(() => useDetailsScreen());

    expect(mockedHistory).toHaveBeenCalledWith(undefined);
    expect(mockedDetails).toHaveBeenCalledWith("");
    expect(result.current.selectedWord).toBe("");
    expect(result.current.showContent).toBe(false);
  });

  it("preserves the existing retry callback", async () => {
    const { result } = await renderHook(() => useDetailsScreen());

    expect(result.current.retry).toBe(mockRetry);
  });

  it("exposes the audio URL from word details", async () => {
    const { result } = await renderHook(() => useDetailsScreen());

    expect(result.current.audioUrl).toBe("https://example.com/hello.mp3");
  });

  it("exposes navigation for the current word", async () => {
    const { result } = await renderHook(() => useDetailsScreen());

    expect(result.current.hasPrevious).toBe(true);
    expect(result.current.hasNext).toBe(false);
    expect(result.current.onPrevious).toBe(mockOnPrevious);
    expect(result.current.onNext).toBe(mockOnNext);
  });

  it("follows the route when the selected word changes", async () => {
    const { rerender } = await renderHook(() => useDetailsScreen());

    mockedParams.mockReturnValue({ word: "world" });

    await rerender(undefined);

    expect(mockedHistory).toHaveBeenLastCalledWith("world");
    expect(mockedDetails).toHaveBeenLastCalledWith("world");
  });
});
