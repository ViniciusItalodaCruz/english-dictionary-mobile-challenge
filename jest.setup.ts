process.env.EXPO_PUBLIC_SUPABASE_URL ||= "https://example.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||= "test-publishable-key";

jest.mock("expo-audio", () => ({
  useAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    replace: jest.fn(),
  })),
  useAudioPlayerStatus: jest.fn(() => ({
    isLoaded: false,
    isBuffering: false,
    playing: false,
    currentTime: 0,
    duration: 0,
    error: null,
  })),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 2,
  isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock("axios", () => {
  const client = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => client),
      isAxiosError: (error: unknown): boolean => {
        if (typeof error !== "object" || error === null) return false;

        if (!("isAxiosError" in error)) return false;

        return error.isAxiosError === true;
      },
    },
  };
});
