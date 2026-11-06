import { Pressable, Text, View } from "react-native";

import { FavoriteButton } from "./favorite-button";

interface DetailsHeaderProps {
  word: string;
  onClose: () => void;
}

export function DetailsHeader({ word, onClose }: Readonly<DetailsHeaderProps>) {
  return (
    <View className="flex-row items-center justify-between gap-3 px-4 py-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close details"
        onPress={onClose}
        className="h-11 w-11 shrink-0 items-start justify-center"
      >
        <Text className="text-2xl text-neutral-50">×</Text>
      </Pressable>

      {word ? (
        <View className="min-w-0 max-w-[75%] shrink">
          <FavoriteButton word={word} />
        </View>
      ) : null}
    </View>
  );
}
