import { describe, expect, it } from "vitest";
import { selectAdapterName } from "../src/adapters/index.js";

describe("selectAdapterName", () => {
  it("selects bilibili for Bilibili video pages", () => {
    expect(selectAdapterName("https://www.bilibili.com/video/BV123")).toBe("bilibili");
  });

  it("selects youtube for YouTube watch pages", () => {
    expect(selectAdapterName("https://www.youtube.com/watch?v=abc")).toBe("youtube");
  });

  it("falls back to generic for other pages", () => {
    expect(selectAdapterName("https://example.com/course")).toBe("generic");
  });
});
