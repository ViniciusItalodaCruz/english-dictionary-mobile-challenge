import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useCallback, useEffect, useState } from "react";

const AUDIO_LOAD_TIMEOUT = 10_000;

export function useWordAudioPlayer(audioUrl: string | null) {
  const player = useAudioPlayer(audioUrl, {
    updateInterval: 100,
  });

  const status = useAudioPlayerStatus(player);

  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const hasAudio = Boolean(audioUrl);
  const hasError = Boolean(status.error) || hasTimedOut;

  useEffect(() => {
    if (!hasAudio || status.isLoaded || status.error) {
      return;
    }

    const timeout = setTimeout(() => {
      setHasTimedOut(true);
    }, AUDIO_LOAD_TIMEOUT);

    return () => clearTimeout(timeout);
  }, [hasAudio, status.isLoaded, status.error, attempt]);

  const retry = useCallback((): void => {
    if (!audioUrl) return;

    setHasTimedOut(false);
    setAttempt((current) => current + 1);
    player.replace(audioUrl);
  }, [audioUrl, player]);

  const togglePlayback = useCallback((): void => {
    if (!hasAudio || hasError || !status.isLoaded) return;

    if (status.playing) {
      player.pause();
      return;
    }

    player.play();
  }, [hasAudio, hasError, status.isLoaded, status.playing, player]);

  const progress =
    status.duration > 0
      ? Math.min(1, Math.max(0, status.currentTime / status.duration))
      : 0;

  let accessibilityLabel = "Play pronunciation";

  if (hasError) {
    accessibilityLabel = "Retry pronunciation";
  } else if (status.playing) {
    accessibilityLabel = "Pause pronunciation";
  }

  return {
    hasAudio,
    isLoading:
      hasAudio && !hasError && (!status.isLoaded || status.isBuffering),
    isPlaying: status.playing,
    hasError,
    accessibilityLabel,
    progress,
    currentTime: status.currentTime,
    duration: status.duration,
    togglePlayback,
    retry,
  };
}
