import { parseInteger } from "@/shared/utils";

describe("parseInteger", () => {
  it("should return the fallback value if the value is not a number", () => {
    expect(parseInteger({ value: "invalid", fallback: 0, min: 0 })).toBe(0);
  });

  it("should return the fallback value if the value is not a positive integer", () => {
    expect(parseInteger({ value: "-1", fallback: 0, min: 0 })).toBe(0);
  });

  it("should return the fallback value if the value is not an integer", () => {
    expect(parseInteger({ value: "1.5", fallback: 0, min: 0 })).toBe(0);
  });
});
