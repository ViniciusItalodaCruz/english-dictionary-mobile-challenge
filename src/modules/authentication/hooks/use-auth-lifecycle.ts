import { useEffect } from "react";
import { AppState } from "react-native";

import { useAuthStore } from "../stores";

export function useAuthLifecycle(): void {
  const initialize = useAuthStore((state) => state.initialize);
  const session = useAuthStore((state) => state.session);
  const status = useAuthStore((state) => state.status);
  const getValidAccessToken = useAuthStore(
    (state) => state.getValidAccessToken,
  );

  useEffect(() => {
    void initialize();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void getValidAccessToken();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [initialize, getValidAccessToken]);

  useEffect(() => {
    if (status !== "authenticated" || !session) return;

    const remainingMs = session.expiresAt * 1000 - Date.now();

    if (remainingMs <= 0) {
      void getValidAccessToken();
      return;
    }

    const timeout = setTimeout(() => {
      void getValidAccessToken();
    }, remainingMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [status, session, getValidAccessToken]);
}
