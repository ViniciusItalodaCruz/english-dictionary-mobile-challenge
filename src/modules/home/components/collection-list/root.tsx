import { cn } from "@/shared/utils";
import { useCallback } from "react";
import { FlatList, type ListRenderItem, View } from "react-native";

import { EmptyState } from "./empty-state";
import { Footer } from "./footer";
import { Item } from "./item";
import type {
    CollectionItem,
    CollectionItemProps,
    CollectionListProps,
} from "./types";

export function Root({
  items,
  listKey,
  onLoadMore,
  onRetry,
  onRemove,
  isRemovingWord,
  hasNextPage = false,
  isLoading = false,
  isLoadingMore = false,
  error = null,
  emptyMessage = "No words found.",
  className,
  renderItem,
}: Readonly<CollectionListProps>) {
  const hasItems = items.length > 0;

  const canLoadMore =
    hasItems && hasNextPage && !isLoading && !isLoadingMore && !error;

  const renderCollectionItem = useCallback<ListRenderItem<CollectionItem>>(
    ({ item }) => {
      const itemProps: CollectionItemProps = {
        word: item.word,
        onRemove,
        isRemoving: isRemovingWord?.(item.word) ?? false,
      };

      if (renderItem) {
        return renderItem(itemProps) as React.ReactElement;
      }

      return <Item {...itemProps} />;
    },
    [onRemove, isRemovingWord, renderItem],
  );

  const handleEndReached = useCallback(() => {
    if (!canLoadMore) return;

    onLoadMore?.();
  }, [canLoadMore, onLoadMore]);

  return (
    <View className={cn("flex-1 overflow-hidden bg-zinc-950", className)}>
      <FlatList
        key={listKey}
        testID="collection-list"
        data={items}
        keyExtractor={(item) => item.word}
        renderItem={renderCollectionItem}
        numColumns={3}
        contentContainerStyle={!hasItems ? { flexGrow: 1 } : undefined}
        ListEmptyComponent={
          <EmptyState
            isLoading={isLoading}
            error={error}
            message={emptyMessage}
            onRetry={onRetry}
          />
        }
        ListFooterComponent={
          hasItems ? (
            <Footer
              isLoadingMore={isLoadingMore}
              error={error}
              onRetry={onRetry}
            />
          ) : undefined
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}
