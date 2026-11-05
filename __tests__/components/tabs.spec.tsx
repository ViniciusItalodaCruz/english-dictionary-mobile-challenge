import { render, screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";
import { Text } from "react-native";

import { Tabs } from "@/shared/components";

describe("Tabs", () => {
  it("renders the provided items", async () => {
    await render(
      <Tabs value="definition" onValueChange={jest.fn()}>
        <Tabs.List>
          <Tabs.Trigger value="definition">
            <Tabs.Item>Definition</Tabs.Item>
          </Tabs.Trigger>

          <Tabs.Trigger value="synonyms">
            <Tabs.Item>Synonyms</Tabs.Item>
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs>,
    );

    expect(screen.getByRole("tab", { name: "Definition" })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Synonyms" })).toBeOnTheScreen();
  });

  it("changes the value and calls only the pressed trigger callback", async () => {
    const onValueChange = jest.fn();
    const onDefinitionPress = jest.fn();
    const onSynonymsPress = jest.fn();
    const user = userEvent.setup();

    await render(
      <Tabs value="definition" onValueChange={onValueChange}>
        <Tabs.List>
          <Tabs.Trigger value="definition" onPress={onDefinitionPress}>
            <Tabs.Item>Definition</Tabs.Item>
          </Tabs.Trigger>

          <Tabs.Trigger value="synonyms" onPress={onSynonymsPress}>
            <Tabs.Item>Synonyms</Tabs.Item>
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs>,
    );

    await user.press(screen.getByRole("tab", { name: "Synonyms" }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("synonyms");
    expect(onSynonymsPress).toHaveBeenCalledTimes(1);
    expect(onDefinitionPress).not.toHaveBeenCalled();
  });

  it("calls onPress without changing the value when the active tab is pressed", async () => {
    const onValueChange = jest.fn();
    const onPress = jest.fn();
    const user = userEvent.setup();

    await render(
      <Tabs value="definition" onValueChange={onValueChange}>
        <Tabs.Trigger value="definition" onPress={onPress}>
          <Tabs.Item>Definition</Tabs.Item>
        </Tabs.Trigger>
      </Tabs>,
    );

    await user.press(screen.getByRole("tab", { name: "Definition" }));

    expect(onValueChange).not.toHaveBeenCalled();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not change the value or call onPress when the trigger is disabled", async () => {
    const onValueChange = jest.fn();
    const onPress = jest.fn();
    const user = userEvent.setup();

    await render(
      <Tabs value="definition" onValueChange={onValueChange}>
        <Tabs.Trigger value="synonyms" disabled onPress={onPress}>
          <Tabs.Item>Synonyms</Tabs.Item>
        </Tabs.Trigger>
      </Tabs>,
    );

    const trigger = screen.getByRole("tab", { name: "Synonyms" });

    expect(trigger).toBeDisabled();

    await user.press(trigger);

    expect(onValueChange).not.toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it("derives the selected state from the context value", async () => {
    await render(
      <Tabs value="definition" onValueChange={jest.fn()}>
        <Tabs.List>
          <Tabs.Trigger
            value="definition"
            accessibilityState={{ selected: false }}
          >
            <Tabs.Item>Definition</Tabs.Item>
          </Tabs.Trigger>

          <Tabs.Trigger
            value="synonyms"
            accessibilityState={{ selected: true }}
          >
            <Tabs.Item>Synonyms</Tabs.Item>
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs>,
    );

    expect(
      screen.getByRole("tab", { name: "Definition", selected: true }),
    ).toBeOnTheScreen();

    expect(
      screen.getByRole("tab", { name: "Synonyms", selected: false }),
    ).toBeOnTheScreen();
  });

  it("renders only the active content", async () => {
    await render(
      <Tabs value="definition" onValueChange={jest.fn()}>
        <Tabs.Content value="definition" title="Definition">
          <Text>Definition content</Text>
        </Tabs.Content>

        <Tabs.Content value="synonyms" title="Synonyms">
          <Text>Synonyms content</Text>
        </Tabs.Content>
      </Tabs>,
    );

    expect(screen.getByText("Definition content")).toBeOnTheScreen();
    expect(screen.queryByText("Synonyms content")).toBeNull();
    expect(screen.getByText("Definition")).toBeOnTheScreen();
    expect(screen.queryByText("Synonyms")).toBeNull();
  });

  it("updates the selected tab and visible content when the value changes", async () => {
    const user = userEvent.setup();

    function ControlledTabs() {
      const [value, setValue] = useState("definition");

      return (
        <Tabs value={value} onValueChange={setValue}>
          <Tabs.List>
            <Tabs.Trigger value="definition">
              <Tabs.Item>Definition</Tabs.Item>
            </Tabs.Trigger>

            <Tabs.Trigger value="synonyms">
              <Tabs.Item>Synonyms</Tabs.Item>
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="definition" title="Definition">
            <Text>Definition content</Text>
          </Tabs.Content>

          <Tabs.Content value="synonyms" title="Synonyms">
            <Text>Synonyms content</Text>
          </Tabs.Content>
        </Tabs>
      );
    }

    await render(<ControlledTabs />);

    expect(screen.getByText("Definition content")).toBeOnTheScreen();

    await user.press(screen.getByRole("tab", { name: "Synonyms" }));

    expect(
      screen.getByRole("tab", { name: "Synonyms", selected: true }),
    ).toBeOnTheScreen();

    expect(
      screen.getByRole("tab", { name: "Definition", selected: false }),
    ).toBeOnTheScreen();

    expect(screen.getByText("Synonyms content")).toBeOnTheScreen();
    expect(screen.queryByText("Definition content")).toBeNull();
  });

  it("forwards props to the root element", async () => {
    await render(
      <Tabs
        value="definition"
        onValueChange={jest.fn()}
        testID="dictionary-tabs"
        accessibilityLabel="Categories"
      >
        <Tabs.Trigger value="definition">
          <Tabs.Item>Definition</Tabs.Item>
        </Tabs.Trigger>
      </Tabs>,
    );

    expect(screen.getByTestId("dictionary-tabs")).toHaveProp(
      "accessibilityLabel",
      "Categories",
    );
  });

  it("forwards props to the list element", async () => {
    await render(
      <Tabs value="definition" onValueChange={jest.fn()}>
        <Tabs.List testID="tabs-list" accessibilityLabel="Available tabs">
          <Tabs.Trigger value="definition">
            <Tabs.Item>Definition</Tabs.Item>
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs>,
    );

    expect(screen.getByTestId("tabs-list")).toHaveProp(
      "accessibilityLabel",
      "Available tabs",
    );
  });

  it("forwards props to the item text", async () => {
    await render(
      <Tabs value="definition" onValueChange={jest.fn()}>
        <Tabs.Trigger value="definition">
          <Tabs.Item numberOfLines={1} selectable>
            Definition
          </Tabs.Item>
        </Tabs.Trigger>
      </Tabs>,
    );

    const item = screen.getByText("Definition");

    expect(item).toHaveProp("numberOfLines", 1);
    expect(item).toHaveProp("selectable", true);
  });

  it("forwards props to the active content element", async () => {
    await render(
      <Tabs value="definition" onValueChange={jest.fn()}>
        <Tabs.Content
          value="definition"
          title="Definition"
          testID="definition-content"
          accessibilityLabel="Definition details"
        >
          <Text>Definition content</Text>
        </Tabs.Content>
      </Tabs>,
    );

    expect(screen.getByTestId("definition-content")).toHaveProp(
      "accessibilityLabel",
      "Definition details",
    );
  });
});
