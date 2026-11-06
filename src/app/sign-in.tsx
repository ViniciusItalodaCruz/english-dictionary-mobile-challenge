import { FormSignIn } from "@/modules/authentication/components";
import { useAuthStore } from "@/modules/authentication/stores";
import { isSessionExpired } from "@/modules/authentication/util/auth-session";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function SignInScreen() {
  const status = useAuthStore((state) => state.status);
  const session = useAuthStore((state) => state.session);

  if (status === "loading") {
    return (
      <View
        className="flex-1 items-center justify-center bg-zinc-950"
        testID="sign-in-loading"
      >
        <ActivityIndicator
          color="#a1a1aa"
          accessibilityLabel="Restoring session"
        />
      </View>
    );
  }

  if (status === "authenticated" && session && !isSessionExpired(session)) {
    return <Redirect href="/" />;
  }

  return <FormSignIn />;
}
