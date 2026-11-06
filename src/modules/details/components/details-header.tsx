import { Pressable, Text, View } from "react-native";

import { FavoriteButton } from "./favorite-button";

interface DetailsHeaderProps {
  word: string;
  onClose: () => void;
}

export function DetailsHeader({ word, onClose }: Readonly<DetailsHeaderProps>) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close details"
        onPress={onClose}
        className="h-10 w-10 items-start justify-center"
      >
        <Text className="text-2xl text-neutral-50">×</Text>
      </Pressable>

      {word ? <FavoriteButton word={word} /> : null}
    </View>
  );
}
