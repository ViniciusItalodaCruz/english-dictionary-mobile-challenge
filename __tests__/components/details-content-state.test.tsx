import { DetailsContentState } from "@/modules/details/components/details-content-state";
import {
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react-native";

describe("DetailsContentState", () => {
  const onRetry = jest.fn();

  const defaultProps = {
    isLoading: false,
    isError: false,
    isEmpty: false,
    isNotFound: false,
    onRetry,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanup();
  });

  it("renders loading state", async () => {
    await render(<DetailsContentState {...defaultProps} isLoading />);

    expect(screen.getByTestId("word-details-loading")).toBeTruthy();
  });

  it("renders a generic error message", async () => {
    await render(<DetailsContentState {...defaultProps} isError />);

    expect(screen.getByText("Unable to load word details.")).toBeTruthy();
  });

  it("renders a specific message for 404 errors", async () => {
    await render(<DetailsContentState {...defaultProps} isError isNotFound />);

    expect(screen.getByText("Word not found.")).toBeTruthy();
  });

  it("calls onRetry when retry is pressed", async () => {
    await render(<DetailsContentState {...defaultProps} isError />);

    fireEvent.press(
      screen.getByRole("button", {
        name: "Retry loading word details",
      }),
    );

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders the empty state", async () => {
    await render(<DetailsContentState {...defaultProps} isEmpty />);

    expect(screen.getByText("No definitions available.")).toBeTruthy();
  });

  it("renders nothing when data is available", async () => {
    const { toJSON } = await render(<DetailsContentState {...defaultProps} />);

    expect(toJSON()).toBeNull();
  });

  it("prioritizes loading over error and empty", async () => {
    await render(
      <DetailsContentState {...defaultProps} isLoading isError isEmpty />,
    );

    expect(screen.getByTestId("word-details-loading")).toBeTruthy();

    expect(screen.queryByText("Unable to load word details.")).toBeNull();

    expect(screen.queryByText("No definitions available.")).toBeNull();
  });

  it("prioritizes error over empty", async () => {
    await render(<DetailsContentState {...defaultProps} isError isEmpty />);

    expect(screen.getByText("Unable to load word details.")).toBeTruthy();

    expect(screen.queryByText("No definitions available.")).toBeNull();
  });

  it("does not render retry outside error state", async () => {
    await render(<DetailsContentState {...defaultProps} isEmpty />);

    expect(
      screen.queryByRole("button", {
        name: "Retry loading word details",
      }),
    ).toBeNull();
  });
});
