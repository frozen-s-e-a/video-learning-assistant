async function initializeVideoLearningAssistant() {
  const [{ createAdapter }, { createPauseButton }, { startRegionSelection }] = await Promise.all([
    import(chrome.runtime.getURL("src/adapters/index.js")),
    import(chrome.runtime.getURL("src/ui/pauseButton.js")),
    import(chrome.runtime.getURL("src/ui/overlay.js")),
  ]);

  let activeAdapter = null;
  let attachedVideo = null;
  let detachCurrent = null;
  let pauseTimer = null;

  function sendAnalyzeMessage(taskType, selection) {
    const adapter = activeAdapter ?? createAdapter();
    const videoContext = adapter.getVideoContext();
    const subtitle = adapter.getCurrentSubtitle();
    chrome.runtime.sendMessage({
      type: "VLA_ANALYZE_CURRENT_FRAME",
      payload: { taskType, videoContext, subtitle, selection },
    });
  }

  const pauseButton = createPauseButton((taskType) => {
    sendAnalyzeMessage(taskType, null);
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== "VLA_SELECT_REGION") return false;

    startRegionSelection().then((selection) => {
      if (selection) sendAnalyzeMessage(message.taskType || "auto", selection);
      sendResponse({ ok: true, selection });
    });

    return true;
  });

  function showAfterDebounce() {
    clearTimeout(pauseTimer);
    pauseTimer = setTimeout(() => {
      const video = activeAdapter?.getVideoElement();
      if (video?.paused) pauseButton.show();
    }, 300);
  }

  function hideButton() {
    clearTimeout(pauseTimer);
    pauseButton.hide();
  }

  function detachAttachedVideo() {
    detachCurrent?.();
    detachCurrent = null;
    attachedVideo = null;
    activeAdapter = null;
    hideButton();
  }

  function tryAttach() {
    const adapter = createAdapter();
    if (!adapter.detect()) {
      if (attachedVideo && !document.documentElement.contains(attachedVideo)) {
        detachAttachedVideo();
      }
      return false;
    }

    const video = adapter.getVideoElement();
    if (!video) return false;
    if (video === attachedVideo) {
      activeAdapter = adapter;
      return true;
    }

    detachAttachedVideo();

    video.addEventListener("pause", showAfterDebounce);
    video.addEventListener("play", hideButton);
    attachedVideo = video;
    activeAdapter = adapter;
    detachCurrent = () => {
      video.removeEventListener("pause", showAfterDebounce);
      video.removeEventListener("play", hideButton);
    };
    return true;
  }

  const observer = new MutationObserver(() => {
    tryAttach();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (!tryAttach()) {
    setTimeout(tryAttach, 500);
  }
}

if (!window.__VLA_CONTENT_SCRIPT_LOADED__) {
  window.__VLA_CONTENT_SCRIPT_LOADED__ = true;
  initializeVideoLearningAssistant().catch((error) => {
    console.error("Video Learning Assistant failed to initialize", error);
  });
}
