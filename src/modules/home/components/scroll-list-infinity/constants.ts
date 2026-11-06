export const LIST_CONFIG = {
  columns: 3,
  initialNumToRender: 24,
  maxToRenderPerBatch: 24,
  windowSize: 7,
  onEndReachedThreshold: 0.4,
} as const;

export const COLORS = {
  border: "#27272a",
  loading: "#a1a1aa",
} as const;

export const COLUMN_WRAPPER_STYLE = {
  borderLeftWidth: 1,
  borderColor: COLORS.border,
};

export const CONTENT_CONTAINER_STYLE = {
  flexGrow: 1,
};

export const LIST_STYLE = {
  flex: 1,
};
