import { cleanup, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { CollectionList, ScrollListInfinity } from "@/modules/home/components";

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");

  return {
    Link: ({
      href,
      children,
    }: {
      href: unknown;
      children: ReactElement<{ accessibilityHint?: string }>;
    }) =>
      React.cloneElement(children, {
        accessibilityHint: JSON.stringify(href),
      }),
  };
});

function linkTarget(name: string) {
  const hint = screen.getByLabelText(name).props.accessibilityHint;

  return JSON.parse(hint);
}

describe("word navigation links", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("opens home words with the word list source", async () => {
    await render(
      <ScrollListInfinity listKey="word-list" words={["hello", "today"]} />,
    );

    expect(linkTarget("View details of hello")).toEqual({
      pathname: "/words/[word]",
      params: { word: "hello", source: "word-list" },
    });
    expect(linkTarget("View details of today")).toEqual({
      pathname: "/words/[word]",
      params: { word: "today", source: "word-list" },
    });
  });

  it("opens history words with the history source", async () => {
    await render(
      <CollectionList.Root
        listKey="history"
        items={[{ word: "great" }, { word: "hello" }]}
      />,
    );

    expect(linkTarget("View details of great")).toEqual({
      pathname: "/words/[word]",
      params: { word: "great", source: "history" },
    });
    expect(linkTarget("View details of hello")).toEqual({
      pathname: "/words/[word]",
      params: { word: "hello", source: "history" },
    });
  });

  it("opens favorite words with the favorites source", async () => {
    await render(
      <CollectionList.Root listKey="favorites" items={[{ word: "peace" }]} />,
    );

    expect(linkTarget("View details of peace")).toEqual({
      pathname: "/words/[word]",
      params: { word: "peace", source: "favorites" },
    });
  });
});
