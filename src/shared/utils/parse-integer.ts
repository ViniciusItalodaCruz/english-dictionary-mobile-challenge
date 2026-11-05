interface ParseIntegerInput {
  value: string | string[] | undefined;
  fallback: number;
  min: number;
  max?: number;
}

export const parseInteger = ({
  value,
  fallback,
  min,
  max = Number.MAX_SAFE_INTEGER,
}: ParseIntegerInput): number => {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue || !/^\d+$/.test(rawValue)) {
    return fallback;
  }

  const parsed = Number(rawValue);

  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : fallback;
};
