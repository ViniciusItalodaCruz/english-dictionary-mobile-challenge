import type { ReactNode } from "react";
import { Text } from "react-native";

import { useInputContext } from "./input-context";

type InputLabelProps = {
  children: ReactNode;
  className?: string;
};

export function InputLabel({ children, className }: Readonly<InputLabelProps>) {
  const { disabled } = useInputContext();

  return (
    <Text
      className={[
        "text-sm font-medium text-zinc-200",
        disabled ? "opacity-50" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Text>
  );
}
