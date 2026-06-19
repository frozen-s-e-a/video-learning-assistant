import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  events: [],
  listener: null,
  analyzeDeferred: null,
  analyzeDeferredPromise: null,
  result: {
    analysisId: "analysis-1",
    detectedType: "slide",
    mode: "vision",
    answer: { title: "Frame summary", sections: [] },
    suggestedQuestions: []
  },
  followUpResult: {
    analysisId: "analysis-1",
    answer: { title: "Follow-up answer", sections: [] },
    suggestedQuestions: ["Next?"]
  }
}));

vi.mock("../src/services/settings.js", () => ({
  getSettings: vi.fn(async () => ({
    backendUrl: "https://backend.test",
    accessToken: "token",
    defaultProvider: "openai",
    defaultModel: "gpt-test",
    defaultTaskType: "explain",
    historyLimit: 10
  }))
}));

vi.mock("../src/services/capture.js", () => ({
  captureVisibleTab: vi.fn(async () => {
    testState.events.push("capture");
    return "data:image/png;base64,frame";
  })
}));

vi.mock("../src/services/apiClient.js", () => ({
  analyzeFrame: vi.fn(async () => {
    testState.events.push("analyze");
    if (testState.analyzeDeferredPromise) {
      return testState.analyzeDeferredPromise;
    }
    return testState.result;
  }),
  sendFollowUp: vi.fn(async () => {
    testState.events.push("follow-up");
    return testState.followUpResult;
  })
}));

vi.mock("../src/services/history.js", () => ({
  addHistoryEntry: vi.fn(async () => {
    testState.events.push("history");
  })
}));

describe("background analysis flow", () => {
  beforeEach(async () => {
    vi.resetModules();
    testState.events = [];
    testState.listener = null;
    testState.analyzeDeferred = null;
    testState.analyzeDeferredPromise = null;

    globalThis.chrome = {
      runtime: {
        onMessage: {
          addListener: vi.fn((listener) => {
            testState.listener = listener;
          })
        }
      },
      storage: {
        session: {
          get: vi.fn(async (defaults) => ({
            ...defaults,
            latestAnalysis: testState.result
          })),
          set: vi.fn(async (value) => {
            testState.events.push(`storage:${value.analysisStatus || value.followUpStatus}`);
          })
        }
      },
      sidePanel: {
        open: vi.fn(async () => {
          testState.events.push("open");
        })
      },
      windows: {
        getCurrent: vi.fn(async () => ({ id: 1 }))
      }
    };

    await import("../src/background.js");
  });

  it("opens the side panel and stores loading state before capture and analysis", async () => {
    const sendResponse = vi.fn();

    const returnValue = testState.listener({
      type: "VLA_ANALYZE_CURRENT_FRAME",
      payload: {
        videoContext: {
          title: "Video",
          url: "https://example.com/video",
          timeSeconds: 42
        }
      }
    }, { tab: { windowId: 7 } }, sendResponse);

    expect(returnValue).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());

    expect(testState.events).toEqual([
      "open",
      "storage:loading",
      "capture",
      "analyze",
      "history",
      "storage:done"
    ]);
    expect(chrome.storage.session.set).toHaveBeenNthCalledWith(1, {
      latestAnalysis: null,
      latestAnalysisError: null,
      analysisStatus: "loading"
    });
    expect(chrome.storage.session.set).toHaveBeenLastCalledWith({
      latestAnalysis: testState.result,
      latestAnalysisError: null,
      analysisStatus: "done"
    });
  });

  it("rejects duplicate analyze requests for the same tab while one is running", async () => {
    testState.analyzeDeferredPromise = new Promise((resolve) => {
      testState.analyzeDeferred = resolve;
    });
    const firstResponse = vi.fn();
    const secondResponse = vi.fn();
    const message = {
      type: "VLA_ANALYZE_CURRENT_FRAME",
      payload: {
        videoContext: {
          title: "Video",
          url: "https://example.com/video",
          timeSeconds: 42
        }
      }
    };

    expect(testState.listener(message, { tab: { id: 99, windowId: 7 } }, firstResponse)).toBe(true);
    await vi.waitFor(() => expect(testState.events).toContain("analyze"));

    expect(testState.listener(message, { tab: { id: 99, windowId: 7 } }, secondResponse)).toBe(true);

    expect(secondResponse).toHaveBeenCalledWith({
      ok: false,
      error: "Analysis is already in progress"
    });
    expect(testState.events.filter((event) => event === "capture")).toHaveLength(1);
    expect(testState.events.filter((event) => event === "analyze")).toHaveLength(1);

    testState.analyzeDeferred(testState.result);
    await vi.waitFor(() => expect(firstResponse).toHaveBeenCalledWith({
      ok: true,
      result: testState.result
    }));
  });

  it("sends follow-up questions and stores the latest follow-up response", async () => {
    const sendResponse = vi.fn();

    const returnValue = testState.listener({
      type: "VLA_FOLLOW_UP",
      payload: { message: "Why async?" }
    }, { tab: { windowId: 7 } }, sendResponse);

    expect(returnValue).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());

    expect(testState.events).toContain("follow-up");
    expect(chrome.storage.session.set).toHaveBeenLastCalledWith({
      latestFollowUp: testState.followUpResult,
      latestFollowUpError: null,
      followUpStatus: "done"
    });
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      result: testState.followUpResult
    });
  });
});
