import { beforeEach, describe, expect, it, vi } from "vitest";

async function importSidepanel() {
  vi.resetModules();
  document.body.innerHTML = `
    <p id="status"></p>
    <div id="answer"></div>
    <textarea id="question"></textarea>
    <button id="ask">Ask</button>
    <div id="followUp"></div>
    <button id="selectRegion">Select region</button>
  `;

  globalThis.chrome = {
    storage: {
      session: {
        get: vi.fn(async (defaults) => defaults)
      },
      onChanged: {
        addListener: vi.fn()
      }
    },
    runtime: {
      sendMessage: vi.fn(async () => ({
        ok: true,
        result: {
          analysisId: "analysis-1",
          answer: {
            title: "Follow-up answer",
            sections: [{ heading: "Answer", content: "Async keeps the UI responsive." }]
          },
          suggestedQuestions: ["Can you show an example?"]
        }
      }))
    },
    tabs: {
      query: vi.fn(async () => [{ id: 123 }]),
      sendMessage: vi.fn(async () => {
        throw new Error("No receiving end");
      })
    }
  };

  await import("../src/sidepanel.js");
  await Promise.resolve();
  await Promise.resolve();
}

describe("sidepanel region selection", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a status error and re-enables the button when active-tab messaging fails", async () => {
    await importSidepanel();

    const button = document.querySelector("#selectRegion");
    button.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(document.querySelector("#status").textContent).toBe("Unable to start region selection on this tab.");
    expect(document.querySelector("#answer").textContent).toContain("No receiving end");
    expect(button.disabled).toBe(false);
  });

  it("sends an ask message and renders the follow-up answer", async () => {
    await importSidepanel();

    document.querySelector("#question").value = "Why async?";
    document.querySelector("#ask").click();
    await Promise.resolve();
    await Promise.resolve();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "VLA_FOLLOW_UP",
      payload: { message: "Why async?" }
    });
    expect(document.querySelector("#followUp").textContent).toContain("Follow-up answer");
    expect(document.querySelector("#followUp").textContent).toContain("Async keeps the UI responsive.");
  });
});
