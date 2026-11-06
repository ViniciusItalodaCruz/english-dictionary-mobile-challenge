import { Button, Input } from "@/shared/components";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  Text,
  View,
  type KeyboardEvent,
  type ScrollViewInstance,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSignIn } from "../hooks";

function keyboardOverlap(event: KeyboardEvent): number {
  return Math.max(0, event.endCoordinates.height);
}

export function FormSignIn() {
  const { control, errors, onSubmit, isSubmitting, errorSubmit, isValid } =
    useSignIn();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [keyboardOverlapHeight, setKeyboardOverlapHeight] = useState(0);

  useEffect(() => {
    const showEventName =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEventName =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(
      showEventName,
      (event: KeyboardEvent) => {
        setKeyboardOverlapHeight(keyboardOverlap(event));
      },
    );
    const hideSubscription = Keyboard.addListener(hideEventName, () => {
      setKeyboardOverlapHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["top", "bottom"]}>
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        style={{ marginBottom: keyboardOverlapHeight }}
        contentContainerClassName="flex-grow justify-center px-6 py-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onLayout={() => {
          if (keyboardOverlapHeight === 0) return;

          scrollRef.current?.scrollToEnd({ animated: true });
        }}
      >
        <View className="w-full max-w-md self-center gap-8">
          <View className="gap-2">
            <Text className="text-4xl font-bold text-neutral-50">
              Welcome back.
            </Text>

            <Text className="text-base text-zinc-400">
              Sign in to continue learning.
            </Text>
          </View>

          <View className="gap-5">
            <Input.Root name="email" control={control} disabled={isSubmitting}>
              <Input.Label>E-mail</Input.Label>
              <Input.Field
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
              />
              <Input.Error />
            </Input.Root>

            <Input.Root
              name="password"
              control={control}
              disabled={isSubmitting}
            >
              <Input.Label>Password</Input.Label>
              <Input.Field
                placeholder="Enter your password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (!isSubmitting) {
                    void onSubmit();
                  }
                }}
              />
              <Input.Error />
            </Input.Root>

            {Boolean(errors.root?.message) && (
              <Text className="text-sm text-red-400" accessibilityRole="alert">
                {errors.root?.message}
              </Text>
            )}

            <Button
              onPress={() => void onSubmit()}
              disabled={isSubmitting || !isValid}
              className="mt-2 rounded-xl"
              accessibilityRole="button"
              accessibilityState={{
                disabled: isSubmitting,
                busy: isSubmitting,
              }}
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>

            {Boolean(errorSubmit) && (
              <Text className="text-sm text-red-400" accessibilityRole="alert">
                {errorSubmit}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
