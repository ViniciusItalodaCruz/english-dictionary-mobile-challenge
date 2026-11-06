import { Pressable, Text } from "react-native";

import { useAuthStore } from "../stores";

export function SignOutButton() {
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <Pressable
      onPress={() => {
        void signOut();
      }}
      accessibilityRole="button"
      accessibilityLabel="Sign out"
      className="px-3 py-2"
    >
      <Text className="text-sm font-medium text-zinc-300">Sign out</Text>
    </Pressable>
  );
}
