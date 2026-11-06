import { cn } from "@/shared/utils";
import { useState } from "react";
import { Pressable, Text, TextInput, TextInputProps, View } from "react-native";

import { useInputContext } from "./input-context";

type InputFieldProps = Omit<
  TextInputProps,
  "value" | "onChangeText" | "onBlur" | "defaultValue"
>;

export function InputField({
  className,
  secureTextEntry = false,
  onFocus,
  editable = true,
  ...props
}: Readonly<InputFieldProps>) {
  const { name, value, onChange, onBlur, error, disabled } = useInputContext();

  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isEditable = editable && !disabled;

  return (
    <View className="relative justify-center">
      <TextInput
        {...props}
        className={cn(
          "h-14 w-full rounded-xl border bg-zinc-900 px-4 text-base text-neutral-50",
          "placeholder:text-zinc-500",
          "border-zinc-700",
          isFocused && !error && "border-neutral-50",
          Boolean(error) && "border-red-500",
          !isEditable && "opacity-50",
          secureTextEntry && "pr-24",
          className,
        )}
        value={value}
        onChangeText={onChange}
        onBlur={() => {
          setIsFocused(false);
          onBlur();
        }}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        secureTextEntry={secureTextEntry && !isPasswordVisible}
        editable={isEditable}
        accessibilityLabel={props.accessibilityLabel ?? name}
        accessibilityState={{ disabled: !isEditable }}
      />

      {secureTextEntry && (
        <Pressable
          className="absolute right-4 h-11 justify-center"
          onPress={() => setIsPasswordVisible((previous) => !previous)}
          disabled={!isEditable}
          accessibilityRole="button"
          accessibilityLabel={
            isPasswordVisible ? "Hide password" : "Show password"
          }
        >
          <Text className="text-sm font-medium text-zinc-300">
            {isPasswordVisible ? "Hide" : "Show"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
