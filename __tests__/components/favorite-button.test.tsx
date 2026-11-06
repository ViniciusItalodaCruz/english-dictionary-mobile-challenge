import { FavoriteButton } from "@/modules/details/components/favorite-button";
import {
  useSaveWordFavorite,
  useWordFavoriteStatus,
} from "@/modules/details/hooks";
import { useDeleteWordFavorite } from "@/modules/home/hooks";
import { act, cleanup, fireEvent, render } from "@testing-library/react-native";

jest.mock("@/modules/home/hooks", () => ({
  useDeleteWordFavorite: jest.fn(),
}));

jest.mock("@/modules/details/hooks", () => ({
  useWordFavoriteStatus: jest.fn(),
  useSaveWordFavorite: jest.fn(),
}));

const mockedUseWordFavoriteStatus = jest.mocked(useWordFavoriteStatus);
const mockedUseSaveWordFavorite = jest.mocked(useSaveWordFavorite);
const mockedUseDeleteWordFavorite = jest.mocked(useDeleteWordFavorite);

const addFavorite = jest.fn();
const removeFavorite = jest.fn();
const isRemovingWord = jest.fn(() => false);
const retry = jest.fn();

type StatusState = ReturnType<typeof useWordFavoriteStatus>;
type SaveState = ReturnType<typeof useSaveWordFavorite>;
type DeleteState = ReturnType<typeof useDeleteWordFavorite>;

const createStatusState = (
  overrides: Partial<StatusState> = {},
): StatusState => ({
  isFavorite: false,
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
  retry: retry as StatusState["retry"],
  ...overrides,
});

const createSaveState = (overrides: Partial<SaveState> = {}): SaveState => ({
  addFavorite,
  isSaving: false,
  isError: false,
  error: null,
  ...overrides,
});

const createDeleteState = (
  overrides: Partial<DeleteState> = {},
): DeleteState => ({
  removeFavorite,
  isRemovingWord,
  removingWords: [],
  isError: false,
  error: null,
  ...overrides,
});

describe("FavoriteButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    isRemovingWord.mockReturnValue(false);

    mockedUseWordFavoriteStatus.mockReturnValue(createStatusState());

    mockedUseSaveWordFavorite.mockReturnValue(createSaveState());

    mockedUseDeleteWordFavorite.mockReturnValue(createDeleteState());
  });

  afterEach(async () => {
    await cleanup();
  });

  it("checks the status of the selected word", async () => {
    await render(<FavoriteButton word="hello" />);

    expect(mockedUseWordFavoriteStatus).toHaveBeenCalledWith("hello");
  });

  it("renders the add action when the word is not favorited", async () => {
    const screen = await render(<FavoriteButton word="hello" />);

    expect(screen.getByLabelText("Add hello to favorites")).toBeTruthy();

    expect(screen.getByText("Add to favorites")).toBeTruthy();
  });

  it("adds a word when it is not favorited", async () => {
    const screen = await render(<FavoriteButton word="hello" />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Add hello to favorites"));
    });

    expect(addFavorite).toHaveBeenCalledWith("hello");
    expect(removeFavorite).not.toHaveBeenCalled();
  });

  it("renders the remove action when the word is favorited", async () => {
    mockedUseWordFavoriteStatus.mockReturnValue(
      createStatusState({ isFavorite: true }),
    );

    const screen = await render(<FavoriteButton word="hello" />);

    expect(screen.getByLabelText("Remove hello from favorites")).toBeTruthy();

    expect(screen.getByText("Remove from favorites")).toBeTruthy();
  });

  it("removes a word when it is favorited", async () => {
    mockedUseWordFavoriteStatus.mockReturnValue(
      createStatusState({ isFavorite: true }),
    );

    const screen = await render(<FavoriteButton word="hello" />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Remove hello from favorites"));
    });

    expect(removeFavorite).toHaveBeenCalledWith("hello");
    expect(addFavorite).not.toHaveBeenCalled();
  });

  it.each([
    ["loading", { isLoading: true }],
    ["refetching", { isFetching: true }],
  ])("blocks interaction while status is %s", async (_, overrides) => {
    mockedUseWordFavoriteStatus.mockReturnValue(createStatusState(overrides));

    const screen = await render(<FavoriteButton word="hello" />);

    const button = screen.getByLabelText("Add hello to favorites");

    expect(button.props.accessibilityState.disabled).toBe(true);

    await act(async () => {
      fireEvent.press(button);
    });

    expect(addFavorite).not.toHaveBeenCalled();
    expect(removeFavorite).not.toHaveBeenCalled();
  });

  it("blocks interaction while saving", async () => {
    mockedUseSaveWordFavorite.mockReturnValue(
      createSaveState({ isSaving: true }),
    );

    const screen = await render(<FavoriteButton word="hello" />);

    const button = screen.getByLabelText("Add hello to favorites");

    expect(button.props.accessibilityState.disabled).toBe(true);

    expect(screen.getByLabelText("Updating favorite")).toBeTruthy();

    await act(async () => {
      fireEvent.press(button);
    });

    expect(addFavorite).not.toHaveBeenCalled();
  });

  it("blocks interaction while removing", async () => {
    mockedUseWordFavoriteStatus.mockReturnValue(
      createStatusState({ isFavorite: true }),
    );

    isRemovingWord.mockReturnValue(true);

    const screen = await render(<FavoriteButton word="hello" />);

    const button = screen.getByLabelText("Remove hello from favorites");

    expect(isRemovingWord).toHaveBeenCalledWith("hello");
    expect(button.props.accessibilityState.disabled).toBe(true);

    await act(async () => {
      fireEvent.press(button);
    });

    expect(removeFavorite).not.toHaveBeenCalled();
  });

  it("displays a retry action when checking status fails", async () => {
    mockedUseWordFavoriteStatus.mockReturnValue(
      createStatusState({
        isError: true,
        error: new Error("Network error"),
      }),
    );

    const screen = await render(<FavoriteButton word="hello" />);

    expect(screen.getByText("Unable to check favorite status.")).toBeTruthy();

    expect(screen.queryByLabelText("Add hello to favorites")).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Retry favorite status"));
    });

    expect(retry).toHaveBeenCalledTimes(1);
    expect(addFavorite).not.toHaveBeenCalled();
    expect(removeFavorite).not.toHaveBeenCalled();
  });

  it("updates the action when favorite status changes", async () => {
    const screen = await render(<FavoriteButton word="hello" />);

    expect(screen.getByLabelText("Add hello to favorites")).toBeTruthy();

    mockedUseWordFavoriteStatus.mockReturnValue(
      createStatusState({ isFavorite: true }),
    );

    await screen.rerender(<FavoriteButton word="hello" />);

    expect(screen.getByLabelText("Remove hello from favorites")).toBeTruthy();

    expect(screen.queryByLabelText("Add hello to favorites")).toBeNull();
  });

  it("shows an error when adding a favorite fails", async () => {
    const screen = await render(<FavoriteButton word="hello" />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Add hello to favorites"));
    });

    mockedUseSaveWordFavorite.mockReturnValue(
      createSaveState({
        isError: true,
        error: new Error("Network error"),
      }),
    );

    await screen.rerender(<FavoriteButton word="hello" />);

    expect(screen.getByText("Unable to add word to favorites.")).toBeTruthy();

    expect(screen.getByLabelText("Add hello to favorites")).toBeTruthy();

    expect(addFavorite).toHaveBeenCalledTimes(1);
    expect(removeFavorite).not.toHaveBeenCalled();
  });

  it("shows an error when removing a favorite fails", async () => {
    mockedUseWordFavoriteStatus.mockReturnValue(
      createStatusState({ isFavorite: true }),
    );

    const screen = await render(<FavoriteButton word="hello" />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Remove hello from favorites"));
    });

    mockedUseDeleteWordFavorite.mockReturnValue(
      createDeleteState({
        isError: true,
        error: new Error("Network error"),
      }),
    );

    await screen.rerender(<FavoriteButton word="hello" />);

    expect(
      screen.getByText("Unable to remove word from favorites."),
    ).toBeTruthy();

    expect(screen.getByLabelText("Remove hello from favorites")).toBeTruthy();

    expect(removeFavorite).toHaveBeenCalledTimes(1);
    expect(addFavorite).not.toHaveBeenCalled();
  });

  it("does not display previous mutation errors before interacting", async () => {
    mockedUseSaveWordFavorite.mockReturnValue(
      createSaveState({
        isError: true,
        error: new Error("Previous save error"),
      }),
    );

    mockedUseDeleteWordFavorite.mockReturnValue(
      createDeleteState({
        isError: true,
        error: new Error("Previous delete error"),
      }),
    );

    const screen = await render(<FavoriteButton word="hello" />);

    expect(screen.queryByText("Unable to add word to favorites.")).toBeNull();

    expect(
      screen.queryByText("Unable to remove word from favorites."),
    ).toBeNull();

    expect(screen.getByLabelText("Add hello to favorites")).toBeTruthy();
  });

  it("dismisses the previous error when retrying the action", async () => {
    const screen = await render(<FavoriteButton word="hello" />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Add hello to favorites"));
    });

    mockedUseSaveWordFavorite.mockReturnValue(
      createSaveState({
        isError: true,
        error: new Error("Network error"),
      }),
    );

    await screen.rerender(<FavoriteButton word="hello" />);

    expect(screen.getByText("Unable to add word to favorites.")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Add hello to favorites"));
    });

    expect(screen.queryByText("Unable to add word to favorites.")).toBeNull();

    expect(addFavorite).toHaveBeenCalledTimes(2);
  });

  it("clears the previous action error when the word changes", async () => {
    const screen = await render(<FavoriteButton word="hello" />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Add hello to favorites"));
    });

    mockedUseSaveWordFavorite.mockReturnValue(
      createSaveState({
        isError: true,
        error: new Error("Network error"),
      }),
    );

    await screen.rerender(<FavoriteButton word="hello" />);

    expect(screen.getByText("Unable to add word to favorites.")).toBeTruthy();

    await act(async () => {
      await screen.rerender(<FavoriteButton word="world" />);
    });

    expect(screen.queryByText("Unable to add word to favorites.")).toBeNull();

    expect(screen.getByLabelText("Add world to favorites")).toBeTruthy();
  });
});
