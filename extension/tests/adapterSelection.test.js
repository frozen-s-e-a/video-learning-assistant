import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { BilibiliAdapter } from "../src/adapters/bilibili.js";
import { selectAdapterName } from "../src/adapters/index.js";
import { YouTubeAdapter } from "../src/adapters/youtube.js";

function createDocumentWithVisibleVideo(url) {
  const dom = new JSDOM("<!doctype html><video></video>", { url });
  const video = dom.window.document.querySelector("video");
  Object.defineProperties(video, {
    offsetWidth: { value: 640 },
    offsetHeight: { value: 360 },
  });
  return { document: dom.window.document, window: dom.window };
}

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

describe("direct adapter detection", () => {
  it("rejects YouTube false positives", () => {
    const nearMisses = [
      "https://notyoutube.com/watch?v=abc",
      "http://www.youtube.com/watch?v=abc",
      "https://m.youtube.com/watch?v=abc",
      "https://www.youtube.com/embed/abc",
    ];

    for (const url of nearMisses) {
      const { document, window } = createDocumentWithVisibleVideo(url);
      expect(new YouTubeAdapter(document, window).detect()).toBe(false);
    }
  });

  it("rejects Bilibili false positives", () => {
    const nearMisses = [
      "https://notbilibili.com/video/BV123",
      "http://www.bilibili.com/video/BV123",
      "https://www.bilibili.com/bangumi/play/abc",
    ];

    for (const url of nearMisses) {
      const { document, window } = createDocumentWithVisibleVideo(url);
      expect(new BilibiliAdapter(document, window).detect()).toBe(false);
    }
  });
});
