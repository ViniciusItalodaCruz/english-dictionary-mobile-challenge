import { useAuthStore } from "@/modules/authentication/stores";
import { isSessionExpired } from "@/modules/authentication/util/auth-session";
import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function AppLayout() {
  const status = useAuthStore((state) => state.status);
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const expired = session !== null && isSessionExpired(session);

  useEffect(() => {
    if (status === "authenticated" && expired) {
      void signOut();
    }
  }, [status, expired, signOut]);

  if (status === "loading") {
    return (
      <View
        className="flex-1 items-center justify-center bg-zinc-950"
        testID="private-route-loading"
      >
        <ActivityIndicator
          color="#a1a1aa"
          accessibilityLabel="Checking session"
        />
      </View>
    );
  }

  if (status !== "authenticated" || !session || expired) {
    return <Redirect href="/sign-in" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
