import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  listener: null,
  selectionPromise: null,
  resolveSelection: null
}));

vi.mock("../src/adapters/index.js", () => ({
  createAdapter: vi.fn(() => ({
    detect: vi.fn(() => false),
    getVideoElement: vi.fn(() => null),
    getVideoContext: vi.fn(() => ({
      title: "Video",
      url: "https://example.com/video",
      timeSeconds: 42
    })),
    getCurrentSubtitle: vi.fn(() => "Current subtitle")
  }))
}));

vi.mock("../src/ui/pauseButton.js", () => ({
  createPauseButton: vi.fn(() => ({
    show: vi.fn(),
    hide: vi.fn()
  }))
}));

vi.mock("../src/ui/overlay.js", () => ({
  startRegionSelection: vi.fn(() => testState.selectionPromise)
}));

describe("content region selection", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllGlobals();
    delete window.__VLA_CONTENT_SCRIPT_LOADED__;
    testState.listener = null;
    testState.selectionPromise = new Promise((resolve) => {
      testState.resolveSelection = resolve;
    });

    globalThis.chrome = {
      runtime: {
        getURL: vi.fn((path) => `../${path}`),
        onMessage: {
          addListener: vi.fn((listener) => {
            testState.listener = listener;
          })
        },
        sendMessage: vi.fn()
      }
    };

    await import("../src/content.js");
    await vi.waitFor(() => expect(testState.listener).toEqual(expect.any(Function)));
  });

  it("rejects a duplicate active region selection without scheduling another analysis", async () => {
    const firstResponse = vi.fn();
    const secondResponse = vi.fn();

    expect(testState.listener({ type: "VLA_SELECT_REGION", taskType: "explain" }, {}, firstResponse)).toBe(true);
    expect(testState.listener({ type: "VLA_SELECT_REGION", taskType: "translate" }, {}, secondResponse)).toBe(true);

    expect(secondResponse).toHaveBeenCalledWith({
      ok: false,
      error: "Region selection is already active"
    });

    testState.resolveSelection({ x: 10, y: 20, width: 100, height: 60 });
    await vi.waitFor(() => expect(firstResponse).toHaveBeenCalled());

    expect(firstResponse).toHaveBeenCalledWith({
      ok: true,
      selection: { x: 10, y: 20, width: 100, height: 60 }
    });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "VLA_ANALYZE_CURRENT_FRAME",
      payload: expect.objectContaining({
        taskType: "explain",
        selection: { x: 10, y: 20, width: 100, height: 60 }
      })
    }));
  });
});
