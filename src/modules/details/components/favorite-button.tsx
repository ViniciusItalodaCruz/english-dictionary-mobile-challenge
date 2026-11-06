import {
  useSaveWordFavorite,
  useWordFavoriteStatus,
} from "@/modules/details/hooks";
import { useDeleteWordFavorite } from "@/modules/home/hooks";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type FavoriteButtonProps = {
  word: string;
};

export function FavoriteButton({ word }: Readonly<FavoriteButtonProps>) {
  const { isFavorite, isLoading, isFetching, isError, retry } =
    useWordFavoriteStatus(word);

  const { addFavorite, isSaving } = useSaveWordFavorite();

  const { removeFavorite, isRemovingWord } = useDeleteWordFavorite();

  const isRemoving = isRemovingWord(word);
  const isBusy = isLoading || isFetching || isSaving || isRemoving;

  const handlePress = () => {
    if (isBusy || isError) return;

    if (isFavorite) {
      removeFavorite(word);
      return;
    }

    addFavorite(word);
  };

  if (isError) {
    return (
      <View className="gap-2">
        <Text className="text-sm text-red-400" accessibilityRole="alert">
          Unable to check favorite status.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry favorite status"
          onPress={() => void retry()}
          className="items-center rounded-lg bg-zinc-800 px-4 py-3"
        >
          <Text className="font-semibold text-neutral-50">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const accessibilityLabel = isFavorite
    ? `Remove ${word} from favorites`
    : `Add ${word} to favorites`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        disabled: isBusy,
        selected: isFavorite,
      }}
      disabled={isBusy}
      onPress={handlePress}
      className="flex-row items-center justify-center gap-2 rounded-lg bg-zinc-800 px-4 py-3 active:bg-zinc-700"
    >
      {isBusy ? (
        <ActivityIndicator
          size="small"
          color="#a1a1aa"
          accessibilityLabel="Updating favorite"
        />
      ) : (
        <Ionicons
          name={isFavorite ? "star" : "star-outline"}
          size={20}
          color={isFavorite ? "#facc15" : "#fafafa"}
        />
      )}

      <Text className="font-semibold text-neutral-50">
        {isFavorite ? "Remove from favorites" : "Add to favorites"}
      </Text>
    </Pressable>
  );
}
