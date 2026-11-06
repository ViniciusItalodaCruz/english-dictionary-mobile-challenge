import type { ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuthStore } from "../stores";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: Readonly<AuthGateProps>) {
  const status = useAuthStore((state) => state.status);

  if (status === "loading") {
    return (
      <View
        className="flex-1 items-center justify-center bg-zinc-950"
        testID="auth-loading"
      >
        <ActivityIndicator
          color="#a1a1aa"
          accessibilityLabel="Restoring session"
        />
      </View>
    );
  }

  return children;
}
