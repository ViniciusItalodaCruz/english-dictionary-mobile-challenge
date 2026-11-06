import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useMemo } from "react";

import { parseInteger } from "@/shared/utils";
import { getWordList } from "../services";

type WordListSearchParams = {
  page?: string | string[];
  pageSize?: string | string[];
};

export const useGetWordList = () => {
  const params = useLocalSearchParams<WordListSearchParams>();

  const initialPage = parseInteger({
    value: params.page,
    fallback: 0,
    min: 0,
  });

  const pageSize = parseInteger({
    value: params.pageSize,
    fallback: 100,
    min: 1,
    max: 100,
  });

  const {
    data,
    error,
    isPending,
    isError,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["word-list", { initialPage, pageSize }] as const,
    initialPageParam: initialPage,

    queryFn: ({ pageParam, signal }) =>
      getWordList({
        page: pageParam,
        pageSize,
        signal,
      }),

    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });

  const words = useMemo(
    () =>
      data?.pages.flatMap((page) => page.items.map(({ word }) => word)) ?? [],
    [data],
  );

  const loadMore = useCallback((): void => {
    if (!hasNextPage || isFetching || isError) return;

    void fetchNextPage({ cancelRefetch: false });
  }, [hasNextPage, isFetching, isError, fetchNextPage]);

  const retry = useCallback((): void => {
    if (isFetching) return;

    if (isFetchNextPageError) {
      void fetchNextPage({ cancelRefetch: false });
      return;
    }

    void refetch();
  }, [isFetching, isFetchNextPageError, fetchNextPage, refetch]);

  return {
    words,
    error,
    isLoading: isPending,
    isLoadingMore: isFetchingNextPage,
    isError,
    isEmpty: !isPending && !isError && words.length === 0,
    hasNextPage,
    loadMore,
    retry,
  };
};
