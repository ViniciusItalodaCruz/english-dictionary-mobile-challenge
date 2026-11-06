import { useAuthStore } from "@/modules/authentication/stores";
import { api } from "@/shared/utils";

export type WordFavorite = {
  user_id: string;
  word: string;
  created_at: string;
};

export type GetWordFavoritesInput = {
  page: number;
  pageSize?: number;
  signal?: AbortSignal;
};

export type GetWordFavoritesOutput = {
  items: WordFavorite[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  nextPage: number | null;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function getWordFavorites({
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  signal,
}: GetWordFavoritesInput): Promise<GetWordFavoritesOutput> {
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

  const { data } = await api.get<WordFavorite[]>("/favorites", {
    params: {
      select: "user_id,word,created_at",
      order: "created_at.desc,word.asc",
      limit: pageSize + 1,
      offset: page * pageSize,
    },
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
}
