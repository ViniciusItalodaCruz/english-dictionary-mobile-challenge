import { useMemo } from "react";

interface WordPronunciationEntry {
  phonetics?: {
    audio?: string;
  }[];
}

export function useWordPronunciation(entries: WordPronunciationEntry[]) {
  const audioUrl = useMemo(() => {
    for (const entry of entries) {
      const phonetic = entry.phonetics?.find((item) =>
        Boolean(item.audio?.trim()),
      );

      if (phonetic?.audio) {
        return phonetic.audio.trim();
      }
    }

    return null;
  }, [entries]);

  return {
    audioUrl,
    hasAudio: Boolean(audioUrl),
  };
}
