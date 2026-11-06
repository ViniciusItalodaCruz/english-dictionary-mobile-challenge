import { useEffect } from "react";

import { saveWordHistory } from "../services";

export function useSaveWordHistory(word?: string): void {
  useEffect(() => {
    if (!word) return;

    void saveWordHistory(word).catch((error: unknown) => {
      console.error("Failed to save word history:", error);
    });
  }, [word]);
}
