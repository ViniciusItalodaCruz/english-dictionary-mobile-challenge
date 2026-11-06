import { createContext, useContext } from "react";

export type InputContextValue = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  disabled: boolean;
};

export const InputContext = createContext<InputContextValue | null>(null);

export function useInputContext(): InputContextValue {
  const context = useContext(InputContext);

  if (!context) {
    throw new Error("Input components must be used inside Input.Root");
  }

  return context;
}
