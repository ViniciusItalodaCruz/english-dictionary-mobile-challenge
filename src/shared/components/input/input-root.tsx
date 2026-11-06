import { useMemo, type ReactNode } from "react";
import {
    FieldPathByValue,
    FieldValues,
    useController,
    UseControllerProps,
} from "react-hook-form";
import { View } from "react-native";

import { InputContext } from "./input-context";

type StringFieldPath<T extends FieldValues> = FieldPathByValue<
  T,
  string | undefined
>;

type InputRootProps<
  T extends FieldValues,
  TName extends StringFieldPath<T>,
> = Omit<UseControllerProps<T, TName>, "name"> & {
  name: TName;
  children: ReactNode;
  className?: string;
};

export function InputRoot<
  T extends FieldValues,
  TName extends StringFieldPath<T>,
>({
  name,
  control,
  rules,
  defaultValue,
  disabled = false,
  children,
  className,
}: Readonly<InputRootProps<T, TName>>) {
  const { field, fieldState } = useController<T, TName>({
    name,
    control,
    rules,
    defaultValue,
  });

  const contextValue = useMemo(
    () => ({
      name: field.name,
      value: typeof field.value === "string" ? field.value : "",
      onChange: (value: string) => field.onChange(value),
      onBlur: field.onBlur,
      error: fieldState.error?.message,
      disabled: disabled || Boolean(field.disabled),
    }),
    [field, fieldState, disabled],
  );

  return (
    <InputContext.Provider value={contextValue}>
      <View className={className ?? "w-full gap-2"}>{children}</View>
    </InputContext.Provider>
  );
}
