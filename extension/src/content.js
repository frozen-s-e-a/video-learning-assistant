async function initializeVideoLearningAssistant() {
  const [{ createAdapter }, { createPauseButton }] = await Promise.all([
    import(chrome.runtime.getURL("src/adapters/index.js")),
    import(chrome.runtime.getURL("src/ui/pauseButton.js")),
  ]);

  const adapter = createAdapter();
  const pauseButton = createPauseButton((taskType) => {
    const videoContext = adapter.getVideoContext();
    const subtitle = adapter.getCurrentSubtitle();
    chrome.runtime.sendMessage({
      type: "VLA_ANALYZE_CURRENT_FRAME",
      payload: { taskType, videoContext, subtitle },
    });
  });

  let pauseTimer = null;

  function showAfterDebounce() {
    clearTimeout(pauseTimer);
    pauseTimer = setTimeout(() => {
      const video = adapter.getVideoElement();
      if (video?.paused) pauseButton.show();
    }, 300);
  }

  function hideButton() {
    clearTimeout(pauseTimer);
    pauseButton.hide();
  }

  function attach() {
    if (!adapter.detect()) return;
    adapter.onPause(showAfterDebounce);
    adapter.onPlay(hideButton);
  }

  attach();
}

initializeVideoLearningAssistant().catch((error) => {
  console.error("Video Learning Assistant failed to initialize", error);
});
