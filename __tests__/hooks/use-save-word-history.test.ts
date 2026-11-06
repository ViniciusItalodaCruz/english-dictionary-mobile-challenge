import { renderHook, waitFor } from "@testing-library/react-native";

import { useSaveWordHistory } from "@/modules/details/hooks";
import { saveWordHistory } from "@/modules/details/services";

jest.mock("@/modules/details/services", () => ({
  saveWordHistory: jest.fn(),
}));

const mockSaveWordHistory = jest.mocked(saveWordHistory);

describe("useSaveWordHistory", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSaveWordHistory.mockResolvedValue(undefined);

    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("saves the word when the hook mounts", async () => {
    renderHook(() => useSaveWordHistory("hello"));

    await waitFor(() => {
      expect(mockSaveWordHistory).toHaveBeenCalledWith("hello");
    });

    expect(mockSaveWordHistory).toHaveBeenCalledTimes(1);
  });

  it("does not save when the word is missing", () => {
    renderHook(() => useSaveWordHistory(undefined));

    expect(mockSaveWordHistory).not.toHaveBeenCalled();
  });

  it("saves a new word when the parameter changes", async () => {
    const { rerender } = await renderHook(
      ({ word }: { word: string }) => useSaveWordHistory(word),
      {
        initialProps: { word: "hello" },
      },
    );

    expect(mockSaveWordHistory).toHaveBeenCalledWith("hello");

    await rerender({ word: "world" });

    expect(mockSaveWordHistory).toHaveBeenCalledWith("world");
    expect(mockSaveWordHistory).toHaveBeenCalledTimes(2);
  });

  it("does not save again when the word remains unchanged", async () => {
    const { rerender } = await renderHook(
      ({ word }: { word: string }) => useSaveWordHistory(word),
      {
        initialProps: { word: "hello" },
      },
    );

    await rerender({ word: "hello" });

    expect(mockSaveWordHistory).toHaveBeenCalledTimes(1);
  });

  it("handles API errors without throwing", async () => {
    const error = new Error("Supabase request failed");

    mockSaveWordHistory.mockRejectedValue(error);

    renderHook(() => useSaveWordHistory("hello"));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to save word history:",
        error,
      );
    });
  });
});
