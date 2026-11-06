import { useAuthStore } from "@/modules/authentication/stores";
import { api } from "@/shared/utils";

export type WordHistory = {
  user_id: string;
  word: string;
  last_viewed_at: string;
};

export type GetWordHistoryInput = {
  page: number;
  pageSize?: number;
  signal?: AbortSignal;
};

export type GetWordHistoryOutput = {
  items: WordHistory[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  nextPage: number | null;
};

type WordHistoryQueryParams = {
  select: "user_id,word,last_viewed_at";
  order: "last_viewed_at.desc,word.asc";
  limit: number;
  offset: number;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export const getWordHistory = async ({
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  signal,
}: GetWordHistoryInput): Promise<GetWordHistoryOutput> => {
  if (!Number.isSafeInteger(page) || page < 0) {
    throw new Error("page must be a non-negative integer");
  }

  if (
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > MAX_PAGE_SIZE
  ) {
    throw new Error("pageSize must be an integer between 1 and 100");
  }

  const accessToken = await useAuthStore.getState().getValidAccessToken();

  if (!accessToken) {
    throw new Error("User is not authenticated.");
  }

  const params = {
    select: "user_id,word,last_viewed_at",
    order: "last_viewed_at.desc,word.asc",
    limit: pageSize + 1,
    offset: page * pageSize,
  } satisfies WordHistoryQueryParams;

  const { data } = await api.get<WordHistory[]>("/word_history", {
    params,
    signal,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const hasNextPage = data.length > pageSize;

  return {
    items: data.slice(0, pageSize),
    page,
    pageSize,
    hasNextPage,
    nextPage: hasNextPage ? page + 1 : null,
  };
};
