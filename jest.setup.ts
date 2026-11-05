process.env.EXPO_PUBLIC_SUPABASE_URL ||= "https://example.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||= "test-publishable-key";

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
    },
  };
});
