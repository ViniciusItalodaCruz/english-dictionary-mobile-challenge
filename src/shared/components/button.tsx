import { cn } from "@/shared/utils";
import { Text, TouchableOpacity, TouchableOpacityProps } from "react-native";

type ButtonProps = TouchableOpacityProps & {
  variant?: "primary" | "secondary";
};

export const Button = ({
  variant = "primary",
  className,
  disabled,
  ...props
}: ButtonProps) => (
  <TouchableOpacity
    className={cn(
      className,
      "py-6 px-8",
      variant === "primary" ? "bg-neutral-50" : "bg-zinc-800",
      disabled && "opacity-50",
    )}
    disabled={disabled}
    {...props}
  >
    <Text
      className={cn(
        variant === "primary" ? "text-zinc-800" : "text-neutral-50",
        "text-center text-lg font-medium",
      )}
    >
      {props.children}
    </Text>
  </TouchableOpacity>
);
