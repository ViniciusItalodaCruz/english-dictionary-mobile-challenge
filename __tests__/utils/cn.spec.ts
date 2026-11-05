import { cn } from "@/shared/utils";

describe("cn", () => {
  it("returns the correct class names", () => {
    expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white");
  });

  it("returns the correct class names when passed an array", () => {
    expect(cn(["bg-red-500", "text-white"])).toBe("bg-red-500 text-white");
  });

  it("returns the correct class names when passed an object", () => {
    expect(cn({ "bg-red-500": true, "text-white": true })).toBe(
      "bg-red-500 text-white",
    );
  });
});
