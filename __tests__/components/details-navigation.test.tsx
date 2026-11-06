import { DetailsNavigation } from "@/modules/details/components/details-navigation";
import {
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react-native";

describe("DetailsNavigation", () => {
  const onPrevious = jest.fn();
  const onNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanup();
  });

  it("renders previous and next buttons", async () => {
    await render(
      <DetailsNavigation
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious
        hasNext
      />,
    );

    expect(screen.getByText("Voltar")).toBeTruthy();
    expect(screen.getByText("Próximo")).toBeTruthy();
  });

  it("calls onPrevious when previous is pressed", async () => {
    await render(
      <DetailsNavigation
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious
        hasNext
      />,
    );

    fireEvent.press(
      screen.getByRole("button", {
        name: "Previous word",
      }),
    );

    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
  });

  it("calls onNext when next is pressed", async () => {
    await render(
      <DetailsNavigation
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious
        hasNext
      />,
    );

    fireEvent.press(
      screen.getByRole("button", {
        name: "Next word",
      }),
    );

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("disables previous when unavailable", async () => {
    await render(
      <DetailsNavigation
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious={false}
        hasNext
      />,
    );

    const previousButton = screen.getByRole("button", {
      name: "Previous word",
    });

    expect(previousButton.props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(previousButton);

    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("disables next when unavailable", async () => {
    await render(
      <DetailsNavigation
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious
        hasNext={false}
      />,
    );

    const nextButton = screen.getByRole("button", {
      name: "Next word",
    });

    expect(nextButton.props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(nextButton);

    expect(onNext).not.toHaveBeenCalled();
  });

  it("supports both buttons disabled", async () => {
    await render(
      <DetailsNavigation
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious={false}
        hasNext={false}
      />,
    );

    expect(screen.getByText("Voltar")).toBeTruthy();
    expect(screen.getByText("Próximo")).toBeTruthy();

    expect(onPrevious).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });
});
