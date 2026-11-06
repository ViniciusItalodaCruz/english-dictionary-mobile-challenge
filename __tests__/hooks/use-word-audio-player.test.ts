import { useWordAudioPlayer } from "@/modules/details/hooks/use-word-audio-player";
import { act, cleanup, renderHook } from "@testing-library/react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

jest.mock("expo-audio", () => ({
  useAudioPlayer: jest.fn(),
  useAudioPlayerStatus: jest.fn(),
}));

const mockedPlayer = jest.mocked(useAudioPlayer);
const mockedStatus = jest.mocked(useAudioPlayerStatus);

const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockReplace = jest.fn();

const audioUrl = "https://example.com/hello.mp3";

const createStatus = (overrides = {}) => ({
  isLoaded: true,
  isBuffering: false,
  playing: false,
  currentTime: 0,
  duration: 10,
  error: null,
  ...overrides,
});

describe("useWordAudioPlayer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockedPlayer.mockReturnValue({
      play: mockPlay,
      pause: mockPause,
      replace: mockReplace,
    } as unknown as ReturnType<typeof useAudioPlayer>);

    mockedStatus.mockReturnValue(
      createStatus() as ReturnType<typeof useAudioPlayerStatus>,
    );
  });

  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
  });

  it("initializes the player with the audio URL", async () => {
    await renderHook(() => useWordAudioPlayer(audioUrl));

    expect(mockedPlayer).toHaveBeenCalledWith(audioUrl, {
      updateInterval: 100,
    });
  });

  it("plays the audio when ready", async () => {
    const { result } = await renderHook(() => useWordAudioPlayer(audioUrl));

    await act(async () => {
      result.current.togglePlayback();
    });

    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it("pauses when the audio is playing", async () => {
    mockedStatus.mockReturnValue(
      createStatus({
        playing: true,
      }) as ReturnType<typeof useAudioPlayerStatus>,
    );

    const { result } = await renderHook(() => useWordAudioPlayer(audioUrl));

    await act(async () => {
      result.current.togglePlayback();
    });

    expect(mockPause).toHaveBeenCalledTimes(1);
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("does not play without an audio URL", async () => {
    const { result } = await renderHook(() => useWordAudioPlayer(null));

    await act(async () => {
      result.current.togglePlayback();
    });

    expect(result.current.hasAudio).toBe(false);
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("does not play before loading", async () => {
    mockedStatus.mockReturnValue(
      createStatus({
        isLoaded: false,
      }) as ReturnType<typeof useAudioPlayerStatus>,
    );

    const { result } = await renderHook(() => useWordAudioPlayer(audioUrl));

    await act(async () => {
      result.current.togglePlayback();
    });

    expect(result.current.isLoading).toBe(true);
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("calculates playback progress", async () => {
    mockedStatus.mockReturnValue(
      createStatus({
        currentTime: 5,
        duration: 10,
      }) as ReturnType<typeof useAudioPlayerStatus>,
    );

    const { result } = await renderHook(() => useWordAudioPlayer(audioUrl));

    expect(result.current.progress).toBe(0.5);
  });

  it("handles zero duration", async () => {
    mockedStatus.mockReturnValue(
      createStatus({
        duration: 0,
      }) as ReturnType<typeof useAudioPlayerStatus>,
    );

    const { result } = await renderHook(() => useWordAudioPlayer(audioUrl));

    expect(result.current.progress).toBe(0);
  });

  it("limits progress to 100 percent", async () => {
    mockedStatus.mockReturnValue(
      createStatus({
        currentTime: 15,
        duration: 10,
      }) as ReturnType<typeof useAudioPlayerStatus>,
    );

    const { result } = await renderHook(() => useWordAudioPlayer(audioUrl));

    expect(result.current.progress).toBe(1);
  });

  it("exposes playback errors", async () => {
    mockedStatus.mockReturnValue(
      createStatus({
        error: "Unable to load audio",
      }) as ReturnType<typeof useAudioPlayerStatus>,
    );

    const { result } = await renderHook(() => useWordAudioPlayer(audioUrl));

    expect(result.current.hasError).toBe(true);
  });

  it("detects a silent loading failure", async () => {
    mockedStatus.mockReturnValue(
      createStatus({
        isLoaded: false,
        isBuffering: false,
        error: null,
      }) as ReturnType<typeof useAudioPlayerStatus>,
    );

    const { result } = await renderHook(() => useWordAudioPlayer(audioUrl));

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });

    expect(result.current.hasError).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("retries loading the same audio URL", async () => {
    mockedStatus.mockReturnValue(
      createStatus({
        isLoaded: false,
        error: null,
      }) as ReturnType<typeof useAudioPlayerStatus>,
    );

    const { result } = await renderHook(() => useWordAudioPlayer(audioUrl));

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });

    expect(result.current.hasError).toBe(true);

    await act(async () => {
      result.current.retry();
    });

    expect(mockReplace).toHaveBeenCalledWith(audioUrl);
    expect(result.current.hasError).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it("does not retry without an audio URL", async () => {
    const { result } = await renderHook(() => useWordAudioPlayer(null));

    await act(async () => {
      result.current.retry();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not timeout after loading successfully", async () => {
    const { result } = await renderHook(() => useWordAudioPlayer(audioUrl));

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });

    expect(result.current.hasError).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});
