import { cn } from "@/shared/utils";
import { Link } from "expo-router";
import { Text, View } from "react-native";

import type { WordItemProps } from "./types";

export function Item({ word, className, textClassName }: WordItemProps) {
  return (
    <View
      className={cn(
        "min-h-24 w-1/3 items-center justify-center",
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
        <Text
          accessibilityLabel={`View details of ${word}`}
          className={cn(
            "w-full px-2 py-4 text-center text-base font-medium text-neutral-50",
            "active:bg-zinc-800",
            textClassName,
          )}
        >
          {word}
        </Text>
      </Link>
    </View>
  );
}
