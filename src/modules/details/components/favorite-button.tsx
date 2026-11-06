import {
  useSaveWordFavorite,
  useWordFavoriteStatus,
} from "@/modules/details/hooks";
import { useDeleteWordFavorite } from "@/modules/home/hooks";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type FavoriteButtonProps = {
  word: string;
};

type FavoriteAction = "add" | "remove";

export function FavoriteButton({ word }: Readonly<FavoriteButtonProps>) {
  const {
    isFavorite,
    isLoading,
    isFetching,
    isError: isStatusError,
    retry,
  } = useWordFavoriteStatus(word);

  const { addFavorite, isSaving, isError: isSaveError } = useSaveWordFavorite();

  const {
    removeFavorite,
    isRemovingWord,
    isError: isDeleteError,
  } = useDeleteWordFavorite();

  const [lastAction, setLastAction] = useState<FavoriteAction | null>(null);
  const [dismissedError, setDismissedError] = useState(false);

  const previousErrors = useRef({
    save: isSaveError,
    delete: isDeleteError,
  });

  useEffect(() => {
    const saveFailed =
      lastAction === "add" && isSaveError && !previousErrors.current.save;

    const deleteFailed =
      lastAction === "remove" &&
      isDeleteError &&
      !previousErrors.current.delete;

    previousErrors.current = {
      save: isSaveError,
      delete: isDeleteError,
    };

    if (saveFailed || deleteFailed) {
      setDismissedError(false);
    }
  }, [isSaveError, isDeleteError, lastAction]);

  const isRemoving = isRemovingWord(word);
  const isBusy = isLoading || isFetching || isSaving || isRemoving;

  const hasActionError =
    !dismissedError &&
    ((lastAction === "add" && isSaveError) ||
      (lastAction === "remove" && isDeleteError));

  useEffect(() => {
    setLastAction(null);
    setDismissedError(false);
  }, [word]);

  const handlePress = () => {
    if (isBusy || isStatusError) return;

    if (isFavorite) {
      setLastAction("remove");
      setDismissedError(true);
      removeFavorite(word);
      return;
    }

    setLastAction("add");
    setDismissedError(true);
    addFavorite(word);
  };

  if (isStatusError) {
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
    <View className="gap-2">
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

      {hasActionError ? (
        <Text accessibilityRole="alert" className="text-sm text-red-400">
          {lastAction === "add"
            ? "Unable to add word to favorites."
            : "Unable to remove word from favorites."}
        </Text>
      ) : null}
    </View>
  );
}
