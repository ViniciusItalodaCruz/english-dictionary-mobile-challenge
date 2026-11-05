import { render, screen, userEvent } from "@testing-library/react-native";

import { Button } from "@/shared/components";

describe("Button", () => {
  it("renders the content received", async () => {
    await render(<Button>Buscar palavra</Button>);

    expect(screen.getByText("Buscar palavra")).toBeOnTheScreen();
  });

  it("executes onPress when pressed", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    await render(
      <Button accessibilityLabel="Buscar palavra" onPress={onPress}>
        Buscar
      </Button>,
    );

    await user.press(screen.getByLabelText("Buscar palavra"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not execute onPress when disabled", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    await render(
      <Button accessibilityLabel="Buscar palavra" disabled onPress={onPress}>
        Buscar
      </Button>,
    );

    const button = screen.getByLabelText("Buscar palavra");

    expect(button).toBeDisabled();

    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  it("passes the accessibility properties", async () => {
    await render(
      <Button
        accessibilityRole="button"
        accessibilityLabel="Buscar palavra"
        accessibilityHint="Consulta a definição no dicionário"
      >
        Buscar
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Buscar palavra" })).toHaveProp(
      "accessibilityHint",
      "Consulta a definição no dicionário",
    );
  });
});
