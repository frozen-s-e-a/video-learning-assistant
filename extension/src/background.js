import { analyzeFrame, sendFollowUp } from "./services/apiClient.js";
import { captureVisibleTab } from "./services/capture.js";
import { addHistoryEntry } from "./services/history.js";
import { getSettings } from "./services/settings.js";

const inFlightAnalyze = new Set();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "VLA_ANALYZE_CURRENT_FRAME") {
    const analyzeKey = getAnalyzeKey(sender);
    if (inFlightAnalyze.has(analyzeKey)) {
      sendResponse({ ok: false, error: "Analysis is already in progress" });
      return true;
    }

    inFlightAnalyze.add(analyzeKey);
    handleAnalyze(message.payload, sender)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }))
      .finally(() => {
        inFlightAnalyze.delete(analyzeKey);
      });

    return true;
  }

  if (message.type === "VLA_FOLLOW_UP") {
    handleFollowUp(message.payload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));

    return true;
  }

  return false;
});

function getAnalyzeKey(sender) {
  return String(sender?.tab?.id ?? "global");
}

async function handleAnalyze(payload, sender) {
  await openSidePanel(sender);
  await chrome.storage.session.set({
    latestAnalysis: null,
    latestAnalysisError: null,
    analysisStatus: "loading",
    latestFollowUp: null,
    latestFollowUpError: null,
    followUpStatus: null
  });

  try {
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

    await chrome.storage.session.set({
      latestAnalysis: result,
      latestAnalysisError: null,
      analysisStatus: "done",
      latestFollowUp: null,
      latestFollowUpError: null,
      followUpStatus: null
    });
    return result;
  } catch (error) {
    await chrome.storage.session.set({
      latestAnalysis: null,
      latestAnalysisError: error.message,
      analysisStatus: "error",
      latestFollowUp: null,
      latestFollowUpError: null,
      followUpStatus: null
    });
    throw error;
  }
}

async function handleFollowUp(payload) {
  let analysisId = null;

  await chrome.storage.session.set({
    latestFollowUp: null,
    latestFollowUpError: null,
    followUpStatus: "loading"
  });

  try {
    const settings = await getSettings();
    const session = await chrome.storage.session.get({
      latestAnalysis: null
    });
    const latestAnalysis = session.latestAnalysis;
    analysisId = payload.analysisId || latestAnalysis?.analysisId;

    if (!analysisId) {
      throw new Error("No analysis is available for follow-up.");
    }

    const result = await sendFollowUp({
      backendUrl: settings.backendUrl,
      accessToken: settings.accessToken,
      payload: {
        analysisId,
        provider: settings.defaultProvider,
        model: settings.defaultModel,
        message: payload.message,
        context: {
          latestAnalysis
        }
      }
    });

    const currentSession = await chrome.storage.session.get({
      latestAnalysis: null
    });
    if (currentSession.latestAnalysis?.analysisId !== analysisId) {
      return result;
    }

    await chrome.storage.session.set({
      latestFollowUp: result,
      latestFollowUpError: null,
      followUpStatus: "done"
    });
    return result;
  } catch (error) {
    const currentSession = await chrome.storage.session.get({
      latestAnalysis: null
    });
    if (currentSession.latestAnalysis?.analysisId !== analysisId) {
      throw error;
    }

    await chrome.storage.session.set({
      latestFollowUp: null,
      latestFollowUpError: error.message,
      followUpStatus: "error"
    });
    throw error;
  }
}

async function openSidePanel(sender) {
  const windowId = sender?.tab?.windowId ?? (await chrome.windows.getCurrent()).id;
  await chrome.sidePanel.open({ windowId });
}
