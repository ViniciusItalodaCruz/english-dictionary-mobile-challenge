import "@/global.css";
import { QUERY_CLIENT } from "@/shared/utils";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <QueryClientProvider client={QUERY_CLIENT}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
