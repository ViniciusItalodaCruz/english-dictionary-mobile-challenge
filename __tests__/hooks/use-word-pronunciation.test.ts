import { useWordPronunciation } from "@/modules/details/hooks/use-word-pronunciation";
import { cleanup, renderHook } from "@testing-library/react-native";

describe("useWordPronunciation", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("returns the first available audio URL", async () => {
    const { result } = await renderHook(() =>
      useWordPronunciation([
        {
          phonetics: [
            { audio: "" },
            { audio: "https://example.com/hello.mp3" },
          ],
        },
      ]),
    );

    expect(result.current.audioUrl).toBe("https://example.com/hello.mp3");
    expect(result.current.hasAudio).toBe(true);
  });

  it("finds audio in subsequent entries", async () => {
    const { result } = await renderHook(() =>
      useWordPronunciation([
        { phonetics: [{ audio: "" }] },
        {
          phonetics: [{ audio: "https://example.com/second.mp3" }],
        },
      ]),
    );

    expect(result.current.audioUrl).toBe("https://example.com/second.mp3");
  });

  it("ignores whitespace-only audio URLs", async () => {
    const { result } = await renderHook(() =>
      useWordPronunciation([
        {
          phonetics: [
            { audio: "   " },
            { audio: " https://example.com/audio.mp3 " },
          ],
        },
      ]),
    );

    expect(result.current.audioUrl).toBe("https://example.com/audio.mp3");
  });

  it("handles entries without phonetics", async () => {
    const { result } = await renderHook(() => useWordPronunciation([{}]));

    expect(result.current.audioUrl).toBeNull();
    expect(result.current.hasAudio).toBe(false);
  });

  it("handles an empty response", async () => {
    const { result } = await renderHook(() => useWordPronunciation([]));

    expect(result.current.audioUrl).toBeNull();
    expect(result.current.hasAudio).toBe(false);
  });

  it("returns no audio when phonetics have no URLs", async () => {
    const { result } = await renderHook(() =>
      useWordPronunciation([{ phonetics: [{}] }]),
    );

    expect(result.current.audioUrl).toBeNull();
    expect(result.current.hasAudio).toBe(false);
  });
});
