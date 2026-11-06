import { WordCard } from "@/modules/details/components/word-card";
import { cleanup, render, screen } from "@testing-library/react-native";

describe("WordCard", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("renders the selected word", async () => {
    await render(<WordCard word="hello" />);

    expect(screen.getByText("hello")).toBeTruthy();
  });

  it("renders the phonetic when available", async () => {
    await render(<WordCard word="hello" phonetic="/həˈləʊ/" />);

    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.getByText("/həˈləʊ/")).toBeTruthy();
  });

  it("does not render a phonetic when unavailable", async () => {
    await render(<WordCard word="hello" />);

    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.queryByText("/həˈləʊ/")).toBeNull();
  });

  it("handles an empty phonetic", async () => {
    await render(<WordCard word="hello" phonetic="" />);

    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.queryByText("")).toBeNull();
  });

  it("renders a different selected word", async () => {
    await render(<WordCard word="world" phonetic="/wɜːld/" />);

    expect(screen.getByText("world")).toBeTruthy();
    expect(screen.getByText("/wɜːld/")).toBeTruthy();
    expect(screen.queryByText("hello")).toBeNull();
  });
});
