import { QUERY_CLIENT } from "@/shared/utils";
import { QueryClient } from "@tanstack/react-query";

describe("QUERY_CLIENT", () => {
  it("exports an instance of QueryClient", () => {
    expect(QUERY_CLIENT).toBeInstanceOf(QueryClient);
  });

  it("configures cache for five minutes and disables retry and refetch when focusing", () => {
    expect(QUERY_CLIENT.getDefaultOptions().queries).toEqual({
      staleTime: 300_000,
      retry: false,
      refetchOnWindowFocus: false,
    });
  });
});
