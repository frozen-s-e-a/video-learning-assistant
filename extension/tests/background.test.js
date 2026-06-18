import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  events: [],
  listener: null,
  result: {
    analysisId: "analysis-1",
    detectedType: "slide",
    mode: "vision",
    answer: { title: "Frame summary", sections: [] },
    suggestedQuestions: []
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
    return testState.result;
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
          set: vi.fn(async (value) => {
            testState.events.push(`storage:${value.analysisStatus}`);
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
});
