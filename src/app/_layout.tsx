import "@/global.css";

import { AuthGate } from "@/modules/authentication/components";
import { useAuthLifecycle } from "@/modules/authentication/hooks";
import { QUERY_CLIENT } from "@/shared/utils";
import { QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";

export default function RootLayout() {
  useAuthLifecycle();

  return (
    <QueryClientProvider client={QUERY_CLIENT}>
      <AuthGate>
        <Slot />
      </AuthGate>
    </QueryClientProvider>
  );
}
