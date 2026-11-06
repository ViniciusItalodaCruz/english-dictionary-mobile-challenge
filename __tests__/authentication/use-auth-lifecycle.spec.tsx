import { cleanup, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import { useAuthLifecycle } from "@/modules/authentication/hooks";
import {
  resetAuthStoreForTests,
  useAuthStore,
} from "@/modules/authentication/stores";

type AppStateListener = (state: AppStateStatus) => void;

describe("useAuthLifecycle", () => {
  const listeners: AppStateListener[] = [];
  const initialize = jest.fn(async () => undefined);
  const getValidAccessToken = jest.fn(async () => null);

  beforeEach(() => {
    listeners.length = 0;
    initialize.mockClear();
    getValidAccessToken.mockClear();
    resetAuthStoreForTests();
    useAuthStore.setState({
      initialize,
      getValidAccessToken,
    });

    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_type, listener) => {
        listeners.push(listener);
        return {
          remove: () => {
            const index = listeners.indexOf(listener);
            if (index >= 0) listeners.splice(index, 1);
          },
        };
      });
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it("restores the session on mount and checks the token when the app becomes active", async () => {
    await renderHook(() => useAuthLifecycle());

    expect(initialize).toHaveBeenCalledTimes(1);

    listeners.forEach((listener) => listener("background"));
    expect(getValidAccessToken).not.toHaveBeenCalled();

    listeners.forEach((listener) => listener("active"));
    expect(getValidAccessToken).toHaveBeenCalledTimes(1);
  });

  it("checks the access token when the restored session is already expired", async () => {
    useAuthStore.setState({
      status: "authenticated",
      session: {
        accessToken: "access-token",
        expiresAt: Math.floor(Date.now() / 1000) - 5,
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      },
    });

    await renderHook(() => useAuthLifecycle());

    expect(getValidAccessToken).toHaveBeenCalledTimes(1);
  });
});
