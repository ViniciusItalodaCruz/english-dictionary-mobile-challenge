import { WordAudioPlayer } from "@/modules/details/components/word-audio-player";
import { useWordAudioPlayer } from "@/modules/details/hooks/use-word-audio-player";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";

jest.mock("@/modules/details/hooks/use-word-audio-player", () => ({
  useWordAudioPlayer: jest.fn(),
}));

const mockedHook = jest.mocked(useWordAudioPlayer);
const togglePlayback = jest.fn();

const createPlayerState = (
  overrides: Partial<ReturnType<typeof useWordAudioPlayer>> = {},
): ReturnType<typeof useWordAudioPlayer> => ({
  hasAudio: true,
  isLoading: false,
  isPlaying: false,
  hasError: false,
  progress: 0,
  currentTime: 0,
  retry: jest.fn(),
  duration: 10,
  togglePlayback,
  accessibilityLabel: "Play pronunciation",
  ...overrides,
});

describe("WordAudioPlayer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedHook.mockReturnValue(createPlayerState());
  });

  afterEach(async () => {
    await cleanup();
  });

  it("renders the play button", async () => {
    await render(<WordAudioPlayer audioUrl="https://example.com/audio.mp3" />);

    expect(
      screen.getByRole("button", {
        name: "Play pronunciation",
      }),
    ).toBeTruthy();
  });

  it("plays when the button is pressed", async () => {
    await render(<WordAudioPlayer audioUrl="https://example.com/audio.mp3" />);

    fireEvent.press(
      screen.getByRole("button", {
        name: "Play pronunciation",
      }),
    );

    expect(togglePlayback).toHaveBeenCalledTimes(1);
  });

  it("renders the pause control when playing", async () => {
    mockedHook.mockReturnValue(createPlayerState({ isPlaying: true }));

    await render(<WordAudioPlayer audioUrl="https://example.com/audio.mp3" />);

    expect(
      screen.getByRole("button", {
        name: "Pause pronunciation",
      }),
    ).toBeTruthy();
  });

  it("renders loading state", async () => {
    mockedHook.mockReturnValue(createPlayerState({ isLoading: true }));

    await render(<WordAudioPlayer audioUrl="https://example.com/audio.mp3" />);

    expect(screen.getByTestId("audio-loading")).toBeTruthy();
  });

  it("renders playback errors", async () => {
    mockedHook.mockReturnValue(createPlayerState({ hasError: true }));

    await render(<WordAudioPlayer audioUrl="https://example.com/audio.mp3" />);

    expect(screen.getByText("Unable to play pronunciation.")).toBeTruthy();
  });

  it("renders nothing without audio", async () => {
    mockedHook.mockReturnValue(createPlayerState({ hasAudio: false }));

    const { toJSON } = await render(<WordAudioPlayer audioUrl={null} />);

    expect(toJSON()).toBeNull();
  });

  it("shows retry when audio loading fails", async () => {
    const retry = jest.fn();

    mockedHook.mockReturnValue(
      createPlayerState({
        hasError: true,
        retry,
      }),
    );

    await render(<WordAudioPlayer audioUrl="https://example.com/audio.mp3" />);

    fireEvent.press(
      screen.getByRole("button", {
        name: "Retry pronunciation",
      }),
    );

    expect(retry).toHaveBeenCalledTimes(1);
    expect(togglePlayback).not.toHaveBeenCalled();
  });
});
