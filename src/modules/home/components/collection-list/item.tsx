import { cn } from "@/shared/utils";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { CollectionItemProps } from "./types";

export function Item({
  word,
  onRemove,
  isRemoving = false,
  className,
}: Readonly<CollectionItemProps>) {
  return (
    <View
      className={cn(
        "min-h-28 w-1/3 items-center justify-center",
        "border-b border-r border-zinc-800",
        "bg-zinc-900",
        className,
      )}
    >
      <Link
        href={{
          pathname: "/words/[word]",
          params: { word },
        }}
        asChild
      >
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`View details of ${word}`}
          className="w-full flex-1 items-center justify-center px-2"
        >
          <Text className="text-center text-base font-semibold text-neutral-50">
            {word}
          </Text>
        </Pressable>
      </Link>

      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${word}`}
          accessibilityState={{ disabled: isRemoving }}
          disabled={isRemoving}
          onPress={() => onRemove(word)}
          className="w-full items-center justify-center py-2 active:bg-zinc-800"
        >
          <Text className="text-xs text-zinc-400">
            {isRemoving ? "Removing..." : "Remove"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
