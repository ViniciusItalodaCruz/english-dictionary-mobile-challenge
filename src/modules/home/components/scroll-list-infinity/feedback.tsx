import { cn } from "@/shared/utils";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { COLORS } from "./constants";
import type { ErrorFeedbackProps, FeedbackProps } from "./types";

export function Feedback({ children }: FeedbackProps) {
  return (
    <View className="items-center justify-center gap-3 px-4 py-8">
      {children}
    </View>
  );
}

export function LoadingFeedback() {
  return (
    <Feedback>
      <ActivityIndicator
        color={COLORS.loading}
        accessibilityLabel="Loading words"
      />
    </Feedback>
  );
}

export function ErrorFeedback({ message, onRetry }: ErrorFeedbackProps) {
  return (
    <Feedback>
      <Text
        accessibilityRole="alert"
        className="text-center text-sm leading-5 text-red-400"
      >
        {message}
      </Text>

      {onRetry && (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className={cn(
            "min-h-12 items-center justify-center rounded-lg",
            "border border-zinc-700 bg-zinc-800 px-4 py-3",
            "active:bg-zinc-700",
          )}
        >
          <Text className="text-sm font-semibold text-neutral-50">Try again</Text>
        </Pressable>
      )}
    </Feedback>
  );
}
