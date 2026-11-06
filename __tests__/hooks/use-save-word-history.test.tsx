import { useAuthStore } from "@/modules/authentication/stores";
import { AUTHENTICATED_QUERY_SCOPE } from "@/modules/authentication/util/authenticated-query";
import { useSaveWordHistory } from "@/modules/details/hooks";
import { saveWordHistory } from "@/modules/details/services";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

const mockGetState = jest.fn();

jest.mock("@/modules/authentication/stores", () => ({
  useAuthStore: Object.assign(jest.fn(), {
    getState: () => mockGetState(),
  }),
}));

jest.mock("@/modules/details/services", () => ({
  saveWordHistory: jest.fn(),
}));

const mockedSaveWordHistory = jest.mocked(saveWordHistory);
const mockedUseAuthStore = jest.mocked(useAuthStore);

const HISTORY_QUERY_KEY = [
  AUTHENTICATED_QUERY_SCOPE,
  "user-123",
  "word-history",
] as const;

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;

  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

describe("useSaveWordHistory", () => {
  let queryClient: QueryClient;
  let consoleErrorSpy: jest.SpyInstance;
  let userId: string | undefined;

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSaveWordHistory.mockReset();
    mockGetState.mockReset();

    userId = "user-123";

    mockedUseAuthStore.mockImplementation((selector) =>
      selector({
        status: userId ? "authenticated" : "unauthenticated",
        session: userId ? { user: { id: userId } } : null,
      } as ReturnType<typeof useAuthStore.getState>),
    );

    mockGetState.mockImplementation(() => ({
      status: userId ? "authenticated" : "unauthenticated",
      session: userId ? { user: { id: userId } } : null,
    }));

    mockedSaveWordHistory.mockResolvedValue(undefined);

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
        mutations: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });

    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await cleanup();
    queryClient.clear();
    consoleErrorSpy.mockRestore();
  });

  it("saves the word when the hook mounts", async () => {
    await renderHook(() => useSaveWordHistory("hello"), {
      wrapper,
    });

    await waitFor(() => {
      expect(mockedSaveWordHistory).toHaveBeenCalledWith("hello");
    });

    expect(mockedSaveWordHistory).toHaveBeenCalledTimes(1);
  });

  it("does not save when the word is missing", async () => {
    await renderHook(() => useSaveWordHistory(undefined), {
      wrapper,
    });

    expect(mockedSaveWordHistory).not.toHaveBeenCalled();
  });

  it("does not save when the user is unauthenticated", async () => {
    userId = undefined;

    await renderHook(() => useSaveWordHistory("hello"), {
      wrapper,
    });

    expect(mockedSaveWordHistory).not.toHaveBeenCalled();
  });

  it("saves a new word when the parameter changes", async () => {
    const { rerender } = await renderHook(
      ({ word }: { word: string }) => useSaveWordHistory(word),
      {
        initialProps: { word: "hello" },
        wrapper,
      },
    );

    await waitFor(() => {
      expect(mockedSaveWordHistory).toHaveBeenCalledWith("hello");
    });

    await rerender({ word: "world" });

    await waitFor(() => {
      expect(mockedSaveWordHistory).toHaveBeenCalledWith("world");
    });

    expect(mockedSaveWordHistory).toHaveBeenCalledTimes(2);
  });

  it("does not save again when the word remains unchanged", async () => {
    const { rerender } = await renderHook(
      ({ word }: { word: string }) => useSaveWordHistory(word),
      {
        initialProps: { word: "hello" },
        wrapper,
      },
    );

    await waitFor(() => {
      expect(mockedSaveWordHistory).toHaveBeenCalledTimes(1);
    });

    await rerender({ word: "hello" });

    expect(mockedSaveWordHistory).toHaveBeenCalledTimes(1);
  });

  it("invalidates history after a successful save", async () => {
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    await renderHook(() => useSaveWordHistory("hello"), {
      wrapper,
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: HISTORY_QUERY_KEY,
      });
    });

    expect(mockedSaveWordHistory).toHaveBeenCalledTimes(1);
  });

  it("handles API errors without invalidating history", async () => {
    const error = new Error("Supabase request failed");

    mockedSaveWordHistory.mockRejectedValueOnce(error);

    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    await renderHook(() => useSaveWordHistory("hello"), {
      wrapper,
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to save word history:",
        error,
      );
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("does not invalidate history after a session change", async () => {
    const deferred = createDeferred<void>();

    mockedSaveWordHistory.mockReturnValueOnce(deferred.promise);

    mockedUseAuthStore.mockImplementation((selector) =>
      selector({
        status: "authenticated",
        session: { user: { id: "user-123" } },
      } as ReturnType<typeof useAuthStore.getState>),
    );

    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    await renderHook(() => useSaveWordHistory("hello"), {
      wrapper,
    });

    await waitFor(() => {
      expect(mockedSaveWordHistory).toHaveBeenCalledTimes(1);
    });

    userId = "user-456";

    await act(async () => {
      deferred.resolve(undefined);
      await deferred.promise;
    });

    await waitFor(() => {
      expect(queryClient.getMutationCache().getAll()[0]?.state.status).toBe(
        "success",
      );
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(mockedSaveWordHistory).toHaveBeenCalledTimes(1);
  });
  it("does not invalidate history after logout", async () => {
    const deferred = createDeferred<void>();

    mockedSaveWordHistory.mockReturnValueOnce(deferred.promise);

    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    await renderHook(() => useSaveWordHistory("hello"), {
      wrapper,
    });

    await waitFor(() => {
      expect(mockedSaveWordHistory).toHaveBeenCalledTimes(1);
    });

    userId = undefined;

    await act(async () => {
      deferred.resolve(undefined);
      await deferred.promise;
    });

    await waitFor(() => {
      expect(queryClient.getMutationCache().getAll()[0]?.state.status).toBe(
        "success",
      );
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
