export const DEFAULT_SETTINGS = {
  backendUrl: "",
  accessToken: "",
  defaultProvider: "fake",
  defaultModel: "fake-vision",
  defaultTaskType: "auto",
  historyLimit: 50,
  showPauseButton: true
};

export async function getSettings(storage = chrome.storage.local) {
  const stored = await storage.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings, storage = chrome.storage.local) {
  await storage.set({ ...DEFAULT_SETTINGS, ...settings });
}
