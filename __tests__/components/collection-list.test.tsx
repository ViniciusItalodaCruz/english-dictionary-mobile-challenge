import { CollectionList } from "@/modules/home/components";
import { act, cleanup, fireEvent, render } from "@testing-library/react-native";

import type { CollectionItem } from "@/modules/home/components/collection-list/types";

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");

  return {
    Link: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const items: CollectionItem[] = [
  { word: "hello" },
  { word: "world" },
  { word: "apple" },
];

describe("CollectionList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanup();
  });

  it("renders the collection items", async () => {
    const screen = await render(
      <CollectionList.Root listKey="history" items={items} />,
    );

    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.getByText("world")).toBeTruthy();
    expect(screen.getByText("apple")).toBeTruthy();
  });

  it("renders the empty state", async () => {
    const screen = await render(
      <CollectionList.Root
        listKey="history"
        items={[]}
        emptyMessage="No words in your history."
      />,
    );

    expect(screen.getByText("No words in your history.")).toBeTruthy();
  });

  it("renders the initial loading state", async () => {
    const screen = await render(
      <CollectionList.Root listKey="history" items={[]} isLoading />,
    );

    expect(screen.getByLabelText("Loading words")).toBeTruthy();

    expect(screen.queryByText("No words found.")).toBeNull();
  });

  it("renders an error message", async () => {
    const screen = await render(
      <CollectionList.Root
        listKey="history"
        items={[]}
        error="Unable to load history."
      />,
    );

    expect(screen.getByText("Unable to load history.")).toBeTruthy();
  });

  it("calls onRetry when the retry button is pressed", async () => {
    const onRetry = jest.fn();

    const screen = await render(
      <CollectionList.Root
        listKey="history"
        items={[]}
        error="Unable to load history."
        onRetry={onRetry}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText("Try again"));
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("calls onRemove with the selected word", async () => {
    const onRemove = jest.fn();

    const screen = await render(
      <CollectionList.Root
        listKey="history"
        items={items}
        onRemove={onRemove}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Remove hello"));
    });

    expect(onRemove).toHaveBeenCalledWith("hello");
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("disables removal while the word is being removed", async () => {
    const onRemove = jest.fn();

    const screen = await render(
      <CollectionList.Root
        listKey="history"
        items={items}
        onRemove={onRemove}
        isRemovingWord={(word) => word === "hello"}
      />,
    );

    const removeButton = screen.getByLabelText("Remove hello");

    expect(removeButton.props.accessibilityState).toEqual({
      disabled: true,
    });

    await act(async () => {
      fireEvent.press(removeButton);
    });

    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Removing hello")).toBeTruthy();
  });

  it("loads more items when the end is reached", async () => {
    const onLoadMore = jest.fn();

    const screen = await render(
      <CollectionList.Root
        listKey="history"
        items={items}
        hasNextPage
        onLoadMore={onLoadMore}
      />,
    );

    await act(async () => {
      fireEvent(screen.getByTestId("collection-list"), "onEndReached");
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("does not load more when no pages remain", async () => {
    const onLoadMore = jest.fn();

    const screen = await render(
      <CollectionList.Root
        listKey="history"
        items={items}
        hasNextPage={false}
        onLoadMore={onLoadMore}
      />,
    );

    await act(async () => {
      fireEvent(screen.getByTestId("collection-list"), "onEndReached");
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("does not load more while loading", async () => {
    const onLoadMore = jest.fn();

    const screen = await render(
      <CollectionList.Root
        listKey="history"
        items={items}
        hasNextPage
        isLoadingMore
        onLoadMore={onLoadMore}
      />,
    );

    expect(screen.getByLabelText("Loading more words")).toBeTruthy();

    await act(async () => {
      fireEvent(screen.getByTestId("collection-list"), "onEndReached");
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("does not load more when an error exists", async () => {
    const onLoadMore = jest.fn();

    const screen = await render(
      <CollectionList.Root
        listKey="history"
        items={items}
        hasNextPage
        error="Unable to load more words."
        onLoadMore={onLoadMore}
      />,
    );

    await act(async () => {
      fireEvent(screen.getByTestId("collection-list"), "onEndReached");
    });

    expect(onLoadMore).not.toHaveBeenCalled();
    expect(screen.getByText("Unable to load more words.")).toBeTruthy();
  });

  it("supports Favorites using the same component", async () => {
    const screen = await render(
      <CollectionList.Root
        listKey="favorites"
        items={[{ word: "favorite" }]}
        emptyMessage="No favorites yet."
      />,
    );

    expect(screen.getByText("favorite")).toBeTruthy();
  });

  it("renders items in a single column", async () => {
    const screen = await render(
      <CollectionList.Root listKey="history" items={items} />,
    );

    const list = screen.getByTestId("collection-list");

    expect(list.props.numColumns ?? 1).toBe(1);

    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.getByText("world")).toBeTruthy();
  });

  it("renders the remove action and calls the callback", async () => {
    const onRemove = jest.fn();

    const screen = await render(
      <CollectionList.Root
        listKey="history"
        items={items}
        onRemove={onRemove}
      />,
    );

    const removeButton = screen.getByLabelText("Remove hello");

    expect(removeButton).toBeTruthy();

    await act(async () => {
      fireEvent.press(removeButton);
    });

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith("hello");
  });
});
