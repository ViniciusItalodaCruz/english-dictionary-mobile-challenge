import { cn } from "@/shared/utils";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import type { CollectionItemProps } from "./types";

export function Item({
  word,
  source,
  onRemove,
  isRemoving = false,
  className,
}: Readonly<CollectionItemProps>) {
  return (
    <View
      className={cn(
        "min-h-20 w-full flex-row items-center",
        "border-b border-zinc-800 bg-zinc-900",
        className,
      )}
    >
      <Link
        href={{
          pathname: "/words/[word]",
          params: source ? { word, source } : { word },
        }}
        asChild
      >
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`View details of ${word}`}
          className="min-h-20 flex-1 justify-center px-4 active:bg-zinc-800"
        >
          <Text className="text-base font-semibold text-neutral-50">
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
          className="h-14 w-14 items-center justify-center active:bg-zinc-800"
        >
          {isRemoving ? (
            <ActivityIndicator
              size="small"
              color="#a1a1aa"
              accessibilityLabel={`Removing ${word}`}
            />
          ) : (
            <Ionicons name="trash-outline" size={20} color="#a1a1aa" />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}
