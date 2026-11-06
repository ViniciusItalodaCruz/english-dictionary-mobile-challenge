import { WordMeaningItem } from "@/modules/details/components/word-meaning-item";
import { cleanup, render, screen } from "@testing-library/react-native";

describe("WordMeaningItem", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("renders the part of speech", async () => {
    await render(<WordMeaningItem partOfSpeech="noun" definitions={[]} />);

    expect(screen.getByText("noun")).toBeTruthy();
  });

  it("renders a definition", async () => {
    await render(
      <WordMeaningItem
        partOfSpeech="noun"
        definitions={[{ definition: "A greeting." }]}
      />,
    );

    expect(screen.getByText("A greeting.")).toBeTruthy();
  });

  it("renders multiple definitions", async () => {
    await render(
      <WordMeaningItem
        partOfSpeech="noun"
        definitions={[
          { definition: "First definition." },
          { definition: "Second definition." },
        ]}
      />,
    );

    expect(screen.getByText("First definition.")).toBeTruthy();
    expect(screen.getByText("Second definition.")).toBeTruthy();
  });

  it("renders an example when available", async () => {
    await render(
      <WordMeaningItem
        partOfSpeech="noun"
        definitions={[
          {
            definition: "A greeting.",
            example: "Hello, everyone.",
          },
        ]}
      />,
    );

    expect(screen.getByText('"Hello, everyone."')).toBeTruthy();
  });

  it("does not render an example when unavailable", async () => {
    await render(
      <WordMeaningItem
        partOfSpeech="noun"
        definitions={[{ definition: "A greeting." }]}
      />,
    );

    expect(screen.queryByText('"Hello, everyone."')).toBeNull();
  });
});
