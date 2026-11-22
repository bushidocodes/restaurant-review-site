import { describe, expect, it } from "vitest";
import meta300 from "../img/1.jpg?w=300&format=jpg&as=metadata";
import meta600 from "../img/1.jpg?w=600&format=jpg&as=metadata";
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

  it("emits 300w and 600w descriptors in srcSet", () => {
    const { srcSet, src } = getImage("1");
    const entries = srcSet.split(",").map((part) => part.trim());
    const widths = entries.map((part) => {
      const match = part.match(/\s(\d+)w$/);
      expect(match, `missing width descriptor in "${part}"`).toBeTruthy();
      return Number(match![1]);
    });
    expect(widths.sort((a, b) => a - b)).toEqual([300, 600]);
    expect(src).toBeTruthy();
  });
});

describe("imagetools width variants", () => {
  it("resizes each JPEG to the requested pixel width", () => {
    expect(meta300.width).toBe(300);
    expect(meta600.width).toBe(600);
  });
});
