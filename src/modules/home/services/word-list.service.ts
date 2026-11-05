import { api } from "@/shared/utils";

export type Word = {
  word: string;
};

export type GetWordListInput = {
  page: number;
  pageSize?: number;
  signal?: AbortSignal;
};

export type GetWordListOutput = {
  items: Word[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  nextPage: number | null;
};

type WordListQueryParams = {
  select: "word";
  order: "word.asc";
  limit: number;
  offset: number;
};

const DEFAULT_PAGE_SIZE = 100;

export const getWordList = async ({
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  signal,
}: GetWordListInput): Promise<GetWordListOutput> => {
  if (!Number.isSafeInteger(page) || page < 0) {
    throw new Error("page must be a positive integer");
  }

  if (
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > DEFAULT_PAGE_SIZE
  ) {
    throw new Error("pageSize must be an integer between 1 and 100");
  }

  const params = {
    select: "word",
    order: "word.asc",
    limit: pageSize + 1,
    offset: page * pageSize,
  } satisfies WordListQueryParams;

  const { data } = await api.get<Word[]>("/words", {
    params,
    signal,
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
