import { beforeEach, describe, expect, it, vi } from "vitest";

async function importSidepanel() {
  vi.resetModules();
  document.body.innerHTML = `
    <p id="status"></p>
    <div id="answer"></div>
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
});
