import { useAuthStore } from "@/modules/authentication/stores";
import { AUTHENTICATED_QUERY_SCOPE } from "@/modules/authentication/util/authenticated-query";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { getWordHistory } from "../services";

const PAGE_SIZE = 20;

export function useGetWordHistory() {
  const userId = useAuthStore((state) =>
    state.status === "authenticated" ? state.session?.user.id : undefined,
  );

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
    queryKey: [AUTHENTICATED_QUERY_SCOPE, userId, "word-history"] as const,

    initialPageParam: 0,

    enabled: Boolean(userId),

    queryFn: ({ pageParam, signal }) =>
      getWordHistory({
        page: pageParam,
        pageSize: PAGE_SIZE,
        signal,
      }),

    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });

  const history = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  const loadMore = useCallback((): void => {
    if (!userId || !hasNextPage || isFetching || isError) return;

    void fetchNextPage({ cancelRefetch: false });
  }, [userId, hasNextPage, isFetching, isError, fetchNextPage]);

  const retry = useCallback((): void => {
    if (!userId || isFetching) return;

    if (isFetchNextPageError) {
      void fetchNextPage({ cancelRefetch: false });
      return;
    }

    void refetch();
  }, [userId, isFetching, isFetchNextPageError, fetchNextPage, refetch]);

  return {
    history,
    error,
    isLoading: Boolean(userId) && isPending,
    isLoadingMore: isFetchingNextPage,
    isError,
    isEmpty: Boolean(userId) && !isPending && !isError && history.length === 0,
    hasNextPage: Boolean(userId) && hasNextPage,
    loadMore,
    retry,
  };
}
