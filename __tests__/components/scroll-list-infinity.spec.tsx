import { render, screen, userEvent } from "@testing-library/react-native";
import type { ComponentProps } from "react";
import { Text } from "react-native";

import { ScrollListInfinity } from "@/modules/home/components";

type EndReachedHandler = (info?: { distanceFromEnd: number }) => void;

type EndReachedFiber = {
  child: EndReachedFiber | null;
  sibling: EndReachedFiber | null;
  memoizedProps?: {
    onEndReached?: EndReachedHandler;
  };
};

const words = ["hello", "world", "peace"] as const;

function renderList(
  props: Partial<ComponentProps<typeof ScrollListInfinity>> = {},
) {
  return render(
    <ScrollListInfinity listKey="word-list" words={words} {...props} />,
  );
}

function findOnEndReached(
  fiber: EndReachedFiber | null,
): EndReachedHandler | undefined {
  if (!fiber) {
    return undefined;
  }

  const onEndReached = fiber.memoizedProps?.onEndReached;

  if (typeof onEndReached === "function") {
    return onEndReached;
  }

  return findOnEndReached(fiber.child) ?? findOnEndReached(fiber.sibling);
}

function reachListEnd() {
  for (const child of screen.container.children) {
    if (typeof child === "string") {
      continue;
    }

    const onEndReached = findOnEndReached(child.unstable_fiber);

    if (onEndReached) {
      onEndReached({ distanceFromEnd: 0 });
      return;
    }
  }

  throw new Error("Could not reach the end of the list.");
}

describe("ScrollListInfinity", () => {
  it("renders each word as a link to its details", async () => {
    await renderList();

    expect(
      screen.getByRole("link", { name: "View details of hello" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("link", { name: "View details of world" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("link", { name: "View details of peace" }),
    ).toBeOnTheScreen();
  });

  it("renders a word link from the item slot", async () => {
    await render(<ScrollListInfinity.Item word="hello" />);

    expect(
      screen.getByRole("link", { name: "View details of hello" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("hello")).toBeOnTheScreen();
  });

  it("renders a custom item", async () => {
    await renderList({
      renderItem: ({ word }) => <Text>{`Custom ${word}`}</Text>,
    });

    expect(screen.getByText("Custom hello")).toBeOnTheScreen();
    expect(screen.getByText("Custom world")).toBeOnTheScreen();
    expect(screen.getByText("Custom peace")).toBeOnTheScreen();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders the default empty message", async () => {
    await renderList({ words: [] });

    expect(screen.getByText("No words found.")).toBeOnTheScreen();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders a custom empty message", async () => {
    await renderList({
      words: [],
      emptyMessage: "Your history is empty.",
    });

    expect(screen.getByText("Your history is empty.")).toBeOnTheScreen();
    expect(screen.queryByText("No words found.")).toBeNull();
  });

  it("renders a custom empty component", async () => {
    await renderList({
      words: [],
      emptyComponent: <Text>Nothing here</Text>,
    });

    expect(screen.getByText("Nothing here")).toBeOnTheScreen();
    expect(screen.queryByText("No words found.")).toBeNull();
  });

  it("shows the loading indicator while the first page is loading", async () => {
    await renderList({ words: [], isLoading: true });

    expect(screen.getByLabelText("Loading words")).toBeOnTheScreen();
    expect(screen.queryByText("No words found.")).toBeNull();
  });

  it("renders a custom loading component", async () => {
    await renderList({
      words: [],
      isLoading: true,
      loadingComponent: <Text>Custom loading</Text>,
    });

    expect(screen.getByText("Custom loading")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Loading words")).toBeNull();
  });

  it("shows the loading indicator instead of the error during the first load", async () => {
    await renderList({
      words: [],
      isLoading: true,
      error: "Could not load the words.",
    });

    expect(screen.getByLabelText("Loading words")).toBeOnTheScreen();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the error instead of the empty message", async () => {
    await renderList({
      words: [],
      error: "Could not load the words.",
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load the words.",
    );
    expect(screen.queryByText("No words found.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("retries the failed request", async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();

    await renderList({
      words: [],
      error: "Could not load the words.",
      onRetry,
    });

    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("keeps the words visible while loading the next page", async () => {
    await renderList({ isLoadingMore: true });

    expect(screen.getByText("hello")).toBeOnTheScreen();
    expect(screen.getByLabelText("Loading words")).toBeOnTheScreen();
  });

  it("keeps the words visible when the next page fails", async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();

    await renderList({
      error: "Could not load more words.",
      onRetry,
    });

    expect(screen.getByText("hello")).toBeOnTheScreen();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load more words.",
    );

    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("requests the next page when the end is reached", async () => {
    const onLoadMore = jest.fn();

    await renderList({ hasNextPage: true, onLoadMore });

    onLoadMore.mockClear();
    reachListEnd();

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it.each<[string, Partial<ComponentProps<typeof ScrollListInfinity>>]>([
    ["there is no next page", { hasNextPage: false }],
    ["the first page is still loading", { hasNextPage: true, isLoading: true }],
    [
      "the next page is already loading",
      { hasNextPage: true, isLoadingMore: true },
    ],
    [
      "the list has an error",
      { hasNextPage: true, error: "Could not load more words." },
    ],
    ["the list is empty", { words: [], hasNextPage: true }],
  ])("does not request the next page when %s", async (_, props) => {
    const onLoadMore = jest.fn();

    await renderList({ onLoadMore, ...props });

    onLoadMore.mockClear();
    reachListEnd();

    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
