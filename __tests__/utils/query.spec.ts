import { QUERY_CLIENT } from "@/shared/utils";
import { QueryClient } from "@tanstack/react-query";

describe("QUERY_CLIENT", () => {
  it("exporta uma instância de QueryClient", () => {
    expect(QUERY_CLIENT).toBeInstanceOf(QueryClient);
  });

  it("configura cache de cinco minutos e desabilita retry e refetch ao focar", () => {
    expect(QUERY_CLIENT.getDefaultOptions().queries).toEqual({
      staleTime: 300_000,
      retry: false,
      refetchOnWindowFocus: false,
    });
  });
});
