import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";

import { useSignIn } from "@/modules/authentication/hooks";
import { signIn } from "@/modules/authentication/services/sign-in.service";
import {
  resetAuthStoreForTests,
  useAuthStore,
} from "@/modules/authentication/stores";
import { resetSessionStorageForTests } from "@/modules/authentication/util/session-storage";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock("@/modules/authentication/services/sign-in.service", () => ({
  signIn: jest.fn(),
}));

jest.mock("react-hook-form", () => {
  const actual =
    jest.requireActual<typeof import("react-hook-form")>("react-hook-form");

  return {
    ...actual,
    useForm: (options: Parameters<typeof actual.useForm>[0]) => {
      const form = actual.useForm(options);

      return {
        ...form,
        handleSubmit:
          (callback: (data: { email: string; password: string }) => unknown) =>
          () =>
            callback({
              email: "reader@example.com",
              password: "secret-password",
            }),
      };
    },
  };
});

const mockSignIn = jest.mocked(signIn);
const mockSetItemAsync = jest.mocked(SecureStore.setItemAsync);
const mockGetItemAsync = jest.mocked(SecureStore.getItemAsync);
const mockDeleteItemAsync = jest.mocked(SecureStore.deleteItemAsync);
const mockInstallGet = jest.mocked(AsyncStorage.getItem);
const mockInstallSet = jest.mocked(AsyncStorage.setItem);

const secureMemory = new Map<string, string>();
const installMemory = new Map<string, string>();

const authOutput = {
  access_token: "access-token",
  refresh_token: "refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: "user-1",
    email: "reader@example.com",
  },
};

describe("useSignIn", () => {
  beforeEach(() => {
    secureMemory.clear();
    installMemory.clear();
    mockReplace.mockReset();
    mockSignIn.mockReset();

    mockGetItemAsync.mockImplementation(
      async (key) => secureMemory.get(key) ?? null,
    );
    mockDeleteItemAsync.mockImplementation(async (key) => {
      secureMemory.delete(key);
    });
    mockSetItemAsync.mockImplementation(async (key, value) => {
      secureMemory.set(key, value);
    });
    mockInstallGet.mockImplementation(
      async (key) => installMemory.get(key) ?? null,
    );
    mockInstallSet.mockImplementation(async (key, value) => {
      installMemory.set(key, value);
    });

    resetSessionStorageForTests();
    resetAuthStoreForTests();
    useAuthStore.setState({
      status: "unauthenticated",
      session: null,
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  it("navigates only after the session has been stored", async () => {
    let releaseWrite: (() => void) | undefined;
    let writes = 0;

    mockSignIn.mockResolvedValue(authOutput);
    mockSetItemAsync.mockImplementation(async (key, value) => {
      writes += 1;

      if (writes === 1) {
        await new Promise<void>((resolve) => {
          releaseWrite = resolve;
        });
      }

      secureMemory.set(key, value);
    });

    const { result } = await renderHook(() => useSignIn());
    let pending: Promise<void> | undefined;

    await act(async () => {
      pending = result.current.onSubmit();
    });

    await waitFor(() => expect(writes).toBe(1));
    expect(mockReplace).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).not.toBe("authenticated");

    releaseWrite?.();

    await act(async () => {
      await pending;
    });

    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().session?.accessToken).toBe("access-token");
    expect(useAuthStore.getState().session).not.toHaveProperty("refreshToken");
    expect([...secureMemory.values()].join(" ")).not.toContain("refresh-token");
    expect(mockSignIn).toHaveBeenCalledWith(
      "reader@example.com",
      "secret-password",
    );
  });

  it("does not navigate when the session cannot be stored", async () => {
    mockSignIn.mockResolvedValue(authOutput);
    mockSetItemAsync.mockRejectedValue(new Error("disk full"));

    const { result } = await renderHook(() => useSignIn());

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(result.current.errorSubmit).toBe(
      "Unable to sign in. Please try again later.",
    );
    expect(mockReplace).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe("unauthenticated");
  });

  it("shows a generic credential error without storing a session", async () => {
    mockSignIn.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          error_code: "invalid_credentials",
        },
      },
    });

    const { result } = await renderHook(() => useSignIn());

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(result.current.errorSubmit).toBe("Invalid email or password.");
    expect(mockSetItemAsync).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
