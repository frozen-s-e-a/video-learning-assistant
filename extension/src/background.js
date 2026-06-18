import { analyzeFrame } from "./services/apiClient.js";
import { captureVisibleTab } from "./services/capture.js";
import { addHistoryEntry } from "./services/history.js";
import { getSettings } from "./services/settings.js";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "VLA_ANALYZE_CURRENT_FRAME") return false;

  handleAnalyze(message.payload, sender)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function handleAnalyze(payload, sender) {
  const settings = await getSettings();
  const image = await captureVisibleTab();

  const result = await analyzeFrame({
    backendUrl: settings.backendUrl,
    accessToken: settings.accessToken,
    payload: {
      provider: settings.defaultProvider,
      model: settings.defaultModel,
      taskType: payload.taskType || settings.defaultTaskType,
      image,
      selection: payload.selection || null,
      subtitle: payload.subtitle,
      videoContext: payload.videoContext,
      question: "Explain the current paused video frame."
    }
  });

  await addHistoryEntry({
    id: result.analysisId,
    videoTitle: payload.videoContext.title,
    videoUrl: payload.videoContext.url,
    timeSeconds: payload.videoContext.timeSeconds,
    provider: settings.defaultProvider,
    model: settings.defaultModel,
    taskType: payload.taskType || settings.defaultTaskType,
    question: "Explain the current paused video frame.",
    answerSummary: result.answer.title
  }, settings.historyLimit);

  await chrome.storage.session.set({ latestAnalysis: result });
  await openSidePanel(sender);
  return result;
}

async function openSidePanel(sender) {
  const windowId = sender?.tab?.windowId ?? (await chrome.windows.getCurrent()).id;
  await chrome.sidePanel.open({ windowId });
}
