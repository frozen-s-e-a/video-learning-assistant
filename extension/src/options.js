import { getSettings, saveSettings } from "./services/settings.js";
import { normalizeHistoryLimit } from "./services/history.js";

const fields = [
  "backendUrl",
  "accessToken",
  "defaultProvider",
  "defaultModel",
  "defaultTaskType",
  "historyLimit",
  "showPauseButton"
];

function readForm() {
  return {
    backendUrl: document.querySelector("#backendUrl").value.trim(),
    accessToken: document.querySelector("#accessToken").value.trim(),
    defaultProvider: document.querySelector("#defaultProvider").value,
    defaultModel: document.querySelector("#defaultModel").value.trim(),
    defaultTaskType: document.querySelector("#defaultTaskType").value,
    historyLimit: normalizeHistoryLimit(document.querySelector("#historyLimit").value),
    showPauseButton: document.querySelector("#showPauseButton").checked
  };
}

function writeForm(settings) {
  for (const field of fields) {
    const element = document.querySelector(`#${field}`);
    if (element.type === "checkbox") {
      element.checked = Boolean(settings[field]);
    } else {
      element.value = settings[field];
    }
  }
}

async function main() {
  writeForm(await getSettings());
  document.querySelector("#save").addEventListener("click", async () => {
    await saveSettings(readForm());
    document.querySelector("#status").textContent = "Saved";
  });
}

main();
