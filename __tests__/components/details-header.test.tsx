import { DetailsHeader } from "@/modules/details/components/details-header";
import { FavoriteButton } from "@/modules/details/components/favorite-button";
import {
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react-native";

jest.mock("@/modules/details/components/favorite-button", () => {
  const { Text } = require("react-native");

  return {
    FavoriteButton: jest.fn(({ word }: { word: string }) => (
      <Text testID="favorite-button">{word}</Text>
    )),
  };
});

const mockedFavoriteButton = jest.mocked(FavoriteButton);

describe("DetailsHeader", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanup();
  });

  it("renders the close button", async () => {
    await render(<DetailsHeader word="hello" onClose={onClose} />);

    expect(screen.getByRole("button", { name: "Close details" })).toBeTruthy();
  });

  it("calls onClose when the close button is pressed", async () => {
    await render(<DetailsHeader word="hello" onClose={onClose} />);

    fireEvent.press(screen.getByRole("button", { name: "Close details" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders FavoriteButton for the selected word", async () => {
    await render(<DetailsHeader word="hello" onClose={onClose} />);

    expect(mockedFavoriteButton).toHaveBeenCalledWith(
      expect.objectContaining({ word: "hello" }),
      undefined,
    );

    expect(screen.getByTestId("favorite-button")).toBeTruthy();
  });

  it("does not render FavoriteButton without a word", async () => {
    await render(<DetailsHeader word="" onClose={onClose} />);

    expect(mockedFavoriteButton).not.toHaveBeenCalled();
    expect(screen.queryByTestId("favorite-button")).toBeNull();
  });
});
