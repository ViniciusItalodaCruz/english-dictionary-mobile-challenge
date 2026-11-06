import { useAuthStore } from "@/modules/authentication/stores";
import { AUTHENTICATED_QUERY_SCOPE } from "@/modules/authentication/util/authenticated-query";
import { useSaveWordFavorite } from "@/modules/details/hooks";
import { saveWordFavorite } from "@/modules/details/services";
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
  saveWordFavorite: jest.fn(),
}));

const mockedSaveWordFavorite = jest.mocked(saveWordFavorite);
const mockedUseAuthStore = jest.mocked(useAuthStore);

const FAVORITES_QUERY_KEY = [
  AUTHENTICATED_QUERY_SCOPE,
  "user-123",
  "word-favorites",
] as const;

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;

  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

describe("useSaveWordFavorite", () => {
  let queryClient: QueryClient;
  let userId: string | undefined;
  let consoleErrorSpy: jest.SpyInstance;

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSaveWordFavorite.mockReset();
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

    mockedSaveWordFavorite.mockResolvedValue(undefined);

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

  it("saves the selected favorite", async () => {
    const { result } = await renderHook(() => useSaveWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.addFavorite("hello");
    });

    expect(mockedSaveWordFavorite).toHaveBeenCalledWith("hello");
    expect(mockedSaveWordFavorite).toHaveBeenCalledTimes(1);
  });

  it("does not save when unauthenticated", async () => {
    userId = undefined;

    const { result } = await renderHook(() => useSaveWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.addFavorite("hello");
    });

    expect(mockedSaveWordFavorite).not.toHaveBeenCalled();
  });

  it("does not save an empty word", async () => {
    const { result } = await renderHook(() => useSaveWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.addFavorite("");
    });

    expect(mockedSaveWordFavorite).not.toHaveBeenCalled();
  });

  it("exposes the loading state while saving", async () => {
    const deferred = createDeferred<void>();

    mockedSaveWordFavorite.mockReturnValueOnce(deferred.promise);

    const { result } = await renderHook(() => useSaveWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.addFavorite("hello");
    });

    await waitFor(() => {
      expect(result.current.isSaving).toBe(true);
    });

    await act(async () => {
      deferred.resolve(undefined);
      await deferred.promise;
    });

    await waitFor(() => {
      expect(result.current.isSaving).toBe(false);
    });
  });

  it("prevents duplicate requests while saving", async () => {
    const deferred = createDeferred<void>();

    mockedSaveWordFavorite.mockReturnValueOnce(deferred.promise);

    const { result } = await renderHook(() => useSaveWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.addFavorite("hello");
    });

    await waitFor(() => {
      expect(result.current.isSaving).toBe(true);
    });

    await act(async () => {
      result.current.addFavorite("hello");
    });

    expect(mockedSaveWordFavorite).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve(undefined);
      await deferred.promise;
    });
  });

  it("invalidates favorites after a successful save", async () => {
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useSaveWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.addFavorite("hello");
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: FAVORITES_QUERY_KEY,
      });
    });
  });

  it("handles API errors without invalidating favorites", async () => {
    const error = new Error("Unable to save favorite");

    mockedSaveWordFavorite.mockRejectedValueOnce(error);

    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useSaveWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.addFavorite("hello");
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.isSaving).toBe(false);
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to save word favorite:",
      error,
    );
  });

  it("does not invalidate another user's favorites", async () => {
    const deferred = createDeferred<void>();

    mockedSaveWordFavorite.mockReturnValueOnce(deferred.promise);

    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useSaveWordFavorite(), {
      wrapper,
    });

    await act(async () => {
      result.current.addFavorite("hello");
    });

    userId = "user-456";

    await act(async () => {
      deferred.resolve(undefined);
      await deferred.promise;
    });

    await waitFor(() => {
      expect(result.current.isSaving).toBe(false);
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
