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

  it("falls back to generic for YouTube near misses", () => {
    expect(selectAdapterName("https://notyoutube.com/watch?v=abc")).toBe("generic");
    expect(selectAdapterName("http://www.youtube.com/watch?v=abc")).toBe("generic");
    expect(selectAdapterName("https://m.youtube.com/watch?v=abc")).toBe("generic");
  });

  it("falls back to generic for Bilibili near misses", () => {
    expect(selectAdapterName("https://www.bilibili.com/bangumi/play/abc")).toBe("generic");
    expect(selectAdapterName("http://www.bilibili.com/video/BV123")).toBe("generic");
  });
});
