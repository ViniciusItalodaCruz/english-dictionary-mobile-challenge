import { Text } from "react-native";

import { useInputContext } from "./input-context";

type InputErrorProps = {
  className?: string;
};

export function InputError({ className }: Readonly<InputErrorProps>) {
  const { error } = useInputContext();

  if (!error) return null;

  return (
    <Text
      className={["text-xs text-red-400", className].filter(Boolean).join(" ")}
      accessibilityRole="alert"
    >
      {error}
    </Text>
  );
}
