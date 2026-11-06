import { cn } from "@/shared/utils";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useMemo,
} from "react";
import {
  Text,
  type TextProps,
  TouchableOpacity,
  type TouchableOpacityProps,
  View,
  type ViewProps,
} from "react-native";

type TabsContextType = {
  value: string;
  onValueChange: Dispatch<SetStateAction<string>>;
};

type TabsTriggerContextType = {
  isActive: boolean;
  disabled: boolean;
};

type TabsRootProps = ViewProps & TabsContextType;

type TabsTriggerProps = TouchableOpacityProps & {
  value: string;
};

type TabsContentProps = ViewProps & {
  value: string;
  title: string;
};

const TabsContext = createContext<TabsContextType | null>(null);

const TabsTriggerContext = createContext<TabsTriggerContextType | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);

  if (!context) {
    throw new Error("Os componentes Tabs devem estar dentro de <Tabs>.");
  }

  return context;
}

function useTabsTriggerContext() {
  const context = useContext(TabsTriggerContext);

  if (!context) {
    throw new Error("<Tabs.Item> deve estar dentro de <Tabs.Trigger>.");
  }

  return context;
}

function Root({
  children,
  className,
  value,
  onValueChange,
  ...props
}: TabsRootProps) {
  const values = useMemo(
    () => ({ value, onValueChange }),
    [value, onValueChange],
  );

  return (
    <TabsContext.Provider value={values}>
      <View {...props} className={cn("w-full", className)}>
        {children}
      </View>
    </TabsContext.Provider>
  );
}

function List({ children, className, ...props }: ViewProps) {
  useTabsContext();

  return (
    <View {...props} className={cn("w-full flex-row", className)}>
      {children}
    </View>
  );
}

function Trigger({
  children,
  className,
  value,
  disabled = false,
  onPress,
  accessibilityState,
  ...props
}: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabsContext();

  const isActive = selectedValue === value;

  const handlePress: NonNullable<TouchableOpacityProps["onPress"]> = (
    event,
  ) => {
    if (disabled) return;

    if (!isActive) {
      onValueChange(value);
    }

    onPress?.(event);
  };

  const triggerValue = useMemo(
    () => ({ isActive, disabled }),
    [isActive, disabled],
  );

  return (
    <TabsTriggerContext.Provider value={triggerValue}>
      <TouchableOpacity
        {...props}
        className={cn(
          "flex-1 items-center justify-center border border-zinc-800 py-4",
          isActive ? "bg-zinc-800" : "bg-zinc-900",
          disabled && "opacity-50",
          className,
        )}
        disabled={disabled}
        onPress={handlePress}
        accessibilityRole="tab"
        accessibilityState={{
          ...accessibilityState,
          selected: isActive,
          disabled,
        }}
      >
        {children}
      </TouchableOpacity>
    </TabsTriggerContext.Provider>
  );
}

function Item({ children, className, ...props }: Readonly<TextProps>) {
  const { isActive } = useTabsTriggerContext();

  return (
    <Text
      {...props}
      className={cn(
        "text-center text-xl font-medium",
        isActive ? "text-neutral-50" : "text-zinc-400",
        className,
      )}
    >
      {children}
    </Text>
  );
}

function Content({
  children,
  value,
  title,
  className,
  ...props
}: TabsContentProps) {
  const { value: selectedValue } = useTabsContext();

  if (selectedValue !== value) return null;

  return (
    <View {...props} className={cn("w-full py-4", className)}>
      <Text className="text-2xl font-medium mb-4 text-white">{title}</Text>
      {children}
    </View>
  );
}

export const Tabs = Object.assign(Root, {
  List,
  Trigger,
  Item,
  Content,
});
