import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useWordAudioPlayer } from "../hooks/use-word-audio-player";

interface WordAudioPlayerProps {
  audioUrl: string | null;
}

export function WordAudioPlayer({ audioUrl }: Readonly<WordAudioPlayerProps>) {
  const {
    hasAudio,
    isLoading,
    isPlaying,
    hasError,
    progress,
    togglePlayback,
    retry,
    accessibilityLabel,
  } = useWordAudioPlayer(audioUrl);

  if (!hasAudio) {
    return null;
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ disabled: isLoading }}
          disabled={isLoading}
          onPress={hasError ? retry : togglePlayback}
          className="h-12 w-12 items-center justify-center"
        >
          {isLoading ? (
            <ActivityIndicator color="#f5f5f5" testID="audio-loading" />
          ) : (
            <Text className="text-2xl text-neutral-50">
              {hasError ? "↻" : isPlaying ? "Ⅱ" : "▶"}
            </Text>
          )}
        </Pressable>

        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Pronunciation progress"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(progress * 100),
          }}
          className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-700"
          testID="audio-progress-track"
        >
          <View
            testID="audio-progress"
            className="h-full bg-fuchsia-200"
            style={{ width: `${progress * 100}%` }}
          />
        </View>
      </View>

      {hasError ? (
        <Text accessibilityRole="alert" className="text-sm text-red-400">
          Unable to load pronunciation.
        </Text>
      ) : null}
    </View>
  );
}
