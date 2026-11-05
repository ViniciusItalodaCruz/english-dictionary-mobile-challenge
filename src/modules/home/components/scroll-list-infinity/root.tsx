import { cn } from "@/shared/utils";
import { useCallback } from "react";
import { FlatList, type ListRenderItem, View } from "react-native";

import {
  COLUMN_WRAPPER_STYLE,
  CONTENT_CONTAINER_STYLE,
  LIST_CONFIG,
  LIST_STYLE,
} from "./constants";
import { EmptyState } from "./empty-state";
import { Footer } from "./footer";
import { GridHeader } from "./grid-header";
import { Item } from "./item";
import type { ScrollListInfinityProps, WordItemProps } from "./types";

function getWordKey(word: string) {
  return word;
}

export function Root({
  words,
  listKey,
  onLoadMore,
  onRetry,
  hasNextPage = false,
  isLoading = false,
  isLoadingMore = false,
  error = null,
  emptyMessage = "No words found.",
  className,
  itemClassName,
  itemTextClassName,
  renderItem,
  loadingComponent,
  emptyComponent,
}: ScrollListInfinityProps) {
  const hasWords = words.length > 0;

  const canLoadMore =
    hasWords && hasNextPage && !isLoading && !isLoadingMore && !error;

  const renderWord = useCallback<ListRenderItem<string>>(
    ({ item }) => {
      const itemProps: WordItemProps = {
        word: item,
        className: itemClassName,
        textClassName: itemTextClassName,
      };

      if (renderItem) {
        return renderItem(itemProps);
      }

      return <Item {...itemProps} />;
    },
    [itemClassName, itemTextClassName, renderItem],
  );

  const handleEndReached = useCallback(() => {
    if (!canLoadMore) {
      return;
    }

    onLoadMore?.();
  }, [canLoadMore, onLoadMore]);

  return (
    <View className={cn("flex-1 overflow-hidden bg-white", className)}>
      <FlatList
        key={listKey}
        style={LIST_STYLE}
        data={words}
        keyExtractor={getWordKey}
        renderItem={renderWord}
        numColumns={LIST_CONFIG.columns}
        columnWrapperStyle={COLUMN_WRAPPER_STYLE}
        contentContainerStyle={CONTENT_CONTAINER_STYLE}
        ListHeaderComponent={hasWords ? GridHeader : undefined}
        ListEmptyComponent={
          <EmptyState
            isLoading={isLoading}
            error={error}
            message={emptyMessage}
            onRetry={onRetry}
            loadingComponent={loadingComponent}
            emptyComponent={emptyComponent}
          />
        }
        ListFooterComponent={
          <Footer
            hasWords={hasWords}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            error={error}
            onRetry={onRetry}
            loadingComponent={loadingComponent}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={LIST_CONFIG.onEndReachedThreshold}
        initialNumToRender={LIST_CONFIG.initialNumToRender}
        maxToRenderPerBatch={LIST_CONFIG.maxToRenderPerBatch}
        windowSize={LIST_CONFIG.windowSize}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}
