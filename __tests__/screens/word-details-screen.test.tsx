import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";

import WordScreen from "@/app/(app)/words/[word]";
import { useDetailsScreen } from "@/modules/details/hooks/use-details-screen";

jest.mock("@/modules/details/hooks/use-word-audio-player", () => ({
  useWordAudioPlayer: () => ({
    hasAudio: true,
    isLoading: false,
    isPlaying: false,
    hasError: false,
    progress: 0,
    currentTime: 0,
    duration: 1,
    togglePlayback: jest.fn(),
    retry: jest.fn(),
    accessibilityLabel: "Play pronunciation",
  }),
}));

jest.mock("@/modules/details/components/favorite-button", () => {
  const { Text } = jest.requireActual("react-native");

  return {
    FavoriteButton: ({ word }: { word: string }) => (
      <Text testID="favorite-button">{word}</Text>
    ),
  };
});

jest.mock("@/modules/details/hooks/use-details-screen", () => ({
  useDetailsScreen: jest.fn(),
}));

const mockedDetailsScreen = jest.mocked(useDetailsScreen);

const onClose = jest.fn();
const onPrevious = jest.fn();
const onNext = jest.fn();
const retry = jest.fn();

describe("WordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedDetailsScreen.mockReturnValue({
      selectedWord: "hello",
      word: "hello",
      phonetic: "/həˈləʊ/",
      audioUrl: "https://example.com/hello.mp3",
      meanings: [
        {
          partOfSpeech: "noun",
          definitions: [{ definition: "A greeting.", example: "Say hello." }],
        },
      ],
      isLoading: false,
      isError: false,
      isEmpty: false,
      isNotFound: false,
      showContent: true,
      retry,
      onClose,
      hasPrevious: true,
      hasNext: false,
      onPrevious,
      onNext,
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  it("connects the current word, favorite and navigation", async () => {
    await render(<WordScreen />);

    expect(screen.getByRole("header", { name: "hello" })).toBeTruthy();
    expect(screen.getByText("/həˈləʊ/")).toBeTruthy();
    expect(screen.getByText("Meanings")).toBeTruthy();
    expect(screen.getByTestId("favorite-button")).toHaveTextContent("hello");

    await fireEvent.press(
      screen.getByRole("button", { name: "Previous word" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Next word" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Close details" }),
    );

    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps navigation available while details are loading", async () => {
    mockedDetailsScreen.mockReturnValue({
      selectedWord: "hello",
      word: "hello",
      phonetic: "",
      audioUrl: null,
      meanings: [],
      isLoading: true,
      isError: false,
      isEmpty: false,
      isNotFound: false,
      showContent: false,
      retry,
      onClose,
      hasPrevious: false,
      hasNext: true,
      onPrevious,
      onNext,
    });

    await render(<WordScreen />);

    expect(screen.getByTestId("word-details-loading")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Next word" }));

    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
