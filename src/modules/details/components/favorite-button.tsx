import { useSaveWordFavorite } from "@/modules/details/hooks";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text } from "react-native";

type FavoriteButtonProps = {
  word: string;
};

export function FavoriteButton({ word }: Readonly<FavoriteButtonProps>) {
  const { addFavorite, isSaving } = useSaveWordFavorite();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${word} to favorites`}
      accessibilityState={{ disabled: isSaving }}
      disabled={isSaving}
      onPress={() => addFavorite(word)}
      className="flex-row items-center justify-center gap-2 rounded-lg bg-zinc-800 px-4 py-3 active:bg-zinc-700"
    >
      {isSaving ? (
        <ActivityIndicator
          size="small"
          color="#a1a1aa"
          accessibilityLabel="Saving favorite"
        />
      ) : (
        <Ionicons name="star-outline" size={20} color="#fafafa" />
      )}

      <Text className="font-semibold text-neutral-50">Add to favorites</Text>
    </Pressable>
  );
}
