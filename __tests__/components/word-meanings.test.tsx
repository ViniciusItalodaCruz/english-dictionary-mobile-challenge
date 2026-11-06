import { WordMeanings } from "@/modules/details/components/word-meanings";
import { cleanup, render, screen } from "@testing-library/react-native";

describe("WordMeanings", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("renders the section title", async () => {
    await render(<WordMeanings meanings={[]} />);

    expect(screen.getByText("Meanings")).toBeTruthy();
  });

  it("renders the empty state", async () => {
    await render(<WordMeanings meanings={[]} />);

    expect(screen.getByText("No definitions available.")).toBeTruthy();
  });

  it("renders meanings grouped by part of speech", async () => {
    await render(
      <WordMeanings
        meanings={[
          {
            partOfSpeech: "noun",
            definitions: [{ definition: "A greeting." }],
          },
          {
            partOfSpeech: "verb",
            definitions: [{ definition: "To greet someone." }],
          },
        ]}
      />,
    );

    expect(screen.getByText("noun")).toBeTruthy();
    expect(screen.getByText("verb")).toBeTruthy();
    expect(screen.getByText("A greeting.")).toBeTruthy();
    expect(screen.getByText("To greet someone.")).toBeTruthy();
  });

  it("does not render the empty state when meanings exist", async () => {
    await render(
      <WordMeanings
        meanings={[
          {
            partOfSpeech: "noun",
            definitions: [{ definition: "A greeting." }],
          },
        ]}
      />,
    );

    expect(screen.queryByText("No definitions available.")).toBeNull();
  });
});
