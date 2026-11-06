import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import AppLayout from "@/app/(app)/_layout";
import SignInScreen from "@/app/sign-in";
import { AuthGate } from "@/modules/authentication/components";
import {
  resetAuthStoreForTests,
  useAuthStore,
  type AuthStatus,
} from "@/modules/authentication/stores";
import type { AuthSession } from "@/modules/authentication/util";

jest.mock("expo-router", () => {
  const { Text: RouterText } =
    require("react-native") as typeof import("react-native");

  return {
    Redirect: ({ href }: { href: string }) => (
      <RouterText>{`redirect:${href}`}</RouterText>
    ),
    Stack: () => <RouterText>Private stack</RouterText>,
    useRouter: () => ({
      replace: jest.fn(),
    }),
  };
});

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 2,
  isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
  },
}));

const createSession = (
  expiresAt = Math.floor(Date.now() / 1000) + 3600,
): AuthSession => ({
  accessToken: "access-token",
  expiresAt,
  user: {
    id: "user-1",
    email: "user@example.com",
  },
});

const setStatus = (
  status: AuthStatus,
  session: AuthSession | null = null,
): void => {
  useAuthStore.setState({ status, session });
};

describe("authentication navigation", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    resetAuthStoreForTests();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });
  });

  afterEach(async () => {
    await cleanup();
    queryClient.clear();
  });

  it("shows sign in when the user is unauthenticated", async () => {
    setStatus("unauthenticated");

    await render(<SignInScreen />, { wrapper });

    expect(screen.getByText("Welcome back.")).toBeOnTheScreen();
    expect(screen.queryByText("Private stack")).toBeNull();
  });

  it("shows the home stack when the user is authenticated", async () => {
    setStatus("authenticated", createSession());

    await render(<AppLayout />, { wrapper });

    expect(screen.getByText("Private stack")).toBeOnTheScreen();
    expect(screen.queryByText("redirect:/sign-in")).toBeNull();
  });

  it("does not keep an authenticated user on sign in", async () => {
    setStatus("authenticated", createSession());

    await render(<SignInScreen />, { wrapper });

    expect(screen.getByText("redirect:/")).toBeOnTheScreen();
    expect(screen.queryByText("Welcome back.")).toBeNull();
  });

  it("blocks private routes while the session is restoring", async () => {
    setStatus("loading", createSession());

    await render(
      <AuthGate>
        <AppLayout />
      </AuthGate>,
      { wrapper },
    );

    expect(screen.getByTestId("auth-loading")).toBeOnTheScreen();
    expect(screen.queryByText("Private stack")).toBeNull();
    expect(screen.queryByText("redirect:/sign-in")).toBeNull();
  });

  it("removes access to private routes after sign-out", async () => {
    setStatus("authenticated", createSession());

    await render(<AppLayout />, { wrapper });

    expect(screen.getByText("Private stack")).toBeOnTheScreen();

    await useAuthStore.getState().signOut();

    expect(screen.getByText("redirect:/sign-in")).toBeOnTheScreen();
    expect(screen.queryByText("Private stack")).toBeNull();
  });

  it("redirects an expired session to sign in", async () => {
    setStatus(
      "authenticated",
      createSession(Math.floor(Date.now() / 1000) - 60),
    );

    await render(<AppLayout />, { wrapper });

    expect(screen.getByText("redirect:/sign-in")).toBeOnTheScreen();
    expect(screen.queryByText("Private stack")).toBeNull();
  });

  it("shows sign in when the authenticated session is already expired", async () => {
    setStatus(
      "authenticated",
      createSession(Math.floor(Date.now() / 1000) - 60),
    );

    await render(<SignInScreen />, { wrapper });

    expect(screen.getByText("Welcome back.")).toBeOnTheScreen();
    expect(screen.queryByText("redirect:/")).toBeNull();
  });
});
