import { Button } from "@/shared/components";
import { View } from "react-native";

interface DetailsNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function DetailsNavigation({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: Readonly<DetailsNavigationProps>) {
  return (
    <View className="flex-row gap-4">
      <Button
        variant="secondary"
        className="flex-1"
        accessibilityRole="button"
        accessibilityLabel="Previous word"
        disabled={!hasPrevious}
        onPress={onPrevious}
      >
        Voltar
      </Button>

      <Button
        variant="primary"
        className="flex-1"
        accessibilityRole="button"
        accessibilityLabel="Next word"
        disabled={!hasNext}
        onPress={onNext}
      >
        Próximo
      </Button>
    </View>
  );
}
