import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useRef, useState } from "react";

const AUDIO_LOAD_TIMEOUT = 10_000;

export function useWordAudioPlayer(audioUrl: string | null) {
  const player = useAudioPlayer(audioUrl, {
    updateInterval: 100,
  });
  const status = useAudioPlayerStatus(player);
  const playerRef = useRef(player);
  const ignoredErrorRef = useRef<string | null>(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const hasAudio = Boolean(audioUrl);
  const statusError = status.error;
  const isIgnoredError =
    statusError !== null &&
    statusError === ignoredErrorRef.current &&
    !status.isLoaded;
  const hasError = (statusError !== null && !isIgnoredError) || hasTimedOut;

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    ignoredErrorRef.current = null;
    setHasTimedOut(false);
    setAttempt(0);

    return () => {
      playerRef.current.pause();
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!status.isLoaded) {
      return;
    }

    ignoredErrorRef.current = null;
    setHasTimedOut(false);
  }, [status.isLoaded]);

  useEffect(() => {
    if (!hasAudio || status.isLoaded) {
      return;
    }

    const currentError = status.error;
    const isStaleError =
      currentError !== null && currentError === ignoredErrorRef.current;

    if (currentError && !isStaleError) {
      return;
    }

    const timeout = setTimeout(() => {
      setHasTimedOut(true);
    }, AUDIO_LOAD_TIMEOUT);

    return () => {
      clearTimeout(timeout);
    };
  }, [audioUrl, attempt, hasAudio, status.error, status.isLoaded]);

  const retry = (): void => {
    if (!audioUrl) {
      return;
    }

    ignoredErrorRef.current = status.error;
    setHasTimedOut(false);
    setAttempt((current) => current + 1);
    player.pause();
    player.replace(audioUrl);
  };

  const togglePlayback = (): void => {
    if (!hasAudio || hasError || !status.isLoaded) {
      return;
    }

    if (status.playing) {
      player.pause();
      return;
    }

    player.play();
  };

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
    isLoading: hasAudio && !hasError && !status.isLoaded,
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
