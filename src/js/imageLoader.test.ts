import { describe, expect, it } from "vitest";
import { getImage } from "./imageLoader";

describe("getImage", () => {
  it("returns srcSet and src for valid restaurant ids 1-10", () => {
    for (let i = 1; i <= 10; i++) {
      const result = getImage(String(i));
      expect(result).toHaveProperty("srcSet");
      expect(result).toHaveProperty("src");
    }
  });

  it("returns defined src for a valid id", () => {
    const result = getImage("1");
    expect(result.src).toBeDefined();
  });

  it("falls back to failwhale for an unknown filename", () => {
    const unknown = getImage("notarestaurant");
    const fallback = getImage("failwhale");
    expect(unknown.src).toBe(fallback.src);
    expect(unknown.srcSet).toBe(fallback.srcSet);
  });

  it("falls back to failwhale for an empty string", () => {
    const unknown = getImage("");
    const fallback = getImage("failwhale");
    expect(unknown.src).toBe(fallback.src);
  });

  it("treats failwhale itself as a valid key", () => {
    const result = getImage("failwhale");
    expect(result.src).toBeDefined();
  });
});
