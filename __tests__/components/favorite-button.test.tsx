import { FavoriteButton } from "@/modules/details/components";
import { useSaveWordFavorite } from "@/modules/details/hooks";
import { act, cleanup, fireEvent, render } from "@testing-library/react-native";

jest.mock("@/modules/details/hooks", () => ({
  useSaveWordFavorite: jest.fn(),
}));

const mockedUseSaveWordFavorite = jest.mocked(useSaveWordFavorite);

const addFavorite = jest.fn();

type FavoriteHookResult = ReturnType<typeof useSaveWordFavorite>;

const createFavoriteState = (
  overrides: Partial<FavoriteHookResult> = {},
): FavoriteHookResult => ({
  addFavorite,
  isSaving: false,
  isError: false,
  error: null,
  ...overrides,
});

describe("FavoriteButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseSaveWordFavorite.mockReturnValue(createFavoriteState());
  });

  afterEach(async () => {
    await cleanup();
  });

  it("renders the favorite action", async () => {
    const screen = await render(<FavoriteButton word="hello" />);

    expect(screen.getByLabelText("Add hello to favorites")).toBeTruthy();

    expect(screen.getByText("Add to favorites")).toBeTruthy();
  });

  it("adds the selected word to favorites", async () => {
    const screen = await render(<FavoriteButton word="hello" />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Add hello to favorites"));
    });

    expect(addFavorite).toHaveBeenCalledWith("hello");
    expect(addFavorite).toHaveBeenCalledTimes(1);
  });

  it("disables the button while saving", async () => {
    mockedUseSaveWordFavorite.mockReturnValue(
      createFavoriteState({ isSaving: true }),
    );

    const screen = await render(<FavoriteButton word="hello" />);

    const button = screen.getByLabelText("Add hello to favorites");

    expect(button.props.accessibilityState).toEqual({
      disabled: true,
    });

    expect(screen.getByLabelText("Saving favorite")).toBeTruthy();

    await act(async () => {
      fireEvent.press(button);
    });

    expect(addFavorite).not.toHaveBeenCalled();
  });
});
