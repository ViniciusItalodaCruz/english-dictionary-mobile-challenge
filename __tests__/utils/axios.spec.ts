const mockCreate = jest.fn();

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: mockCreate,
  },
}));

describe("api", () => {
  const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const loadModule = () => {
    let loadedModule: typeof import("@/shared/utils/axios") | undefined;

    jest.isolateModules(() => {
      loadedModule =
        require("@/shared/utils/axios") as typeof import("@/shared/utils/axios");
    });

    return loadedModule!;
  };

  beforeEach(() => {
    mockCreate.mockReset();

    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  });

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    } else {
      process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    }

    if (originalKey === undefined) {
      delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    } else {
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
    }
  });

  it("configura e exporta a instância HTTP", () => {
    const instance = { get: jest.fn() };
    mockCreate.mockReturnValue(instance);

    const { api } = loadModule();

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      baseURL: "https://example.supabase.co/rest/v1",
      timeout: 15_000,
      headers: {
        apikey: "sb_publishable_test",
        "Content-Type": "application/json",
      },
    });

    expect(api).toBe(instance);
  });

  it.each([undefined, ""])("lança erro quando a URL é %p", (value) => {
    if (value === undefined) {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    } else {
      process.env.EXPO_PUBLIC_SUPABASE_URL = value;
    }

    expect(loadModule).toThrow("Configuração do Supabase ausente.");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it.each([undefined, ""])("lança erro quando a chave é %p", (value) => {
    if (value === undefined) {
      delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    } else {
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = value;
    }

    expect(loadModule).toThrow("Configuração do Supabase ausente.");
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
