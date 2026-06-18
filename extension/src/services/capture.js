export function dataUrlToImagePayload(dataUrl) {
  const [meta, data] = dataUrl.split(",");
  const mimeType = meta.includes("image/png") ? "image/png" : "image/jpeg";
  return { mimeType, data };
}

export async function captureVisibleTab() {
  const dataUrl = await chrome.tabs.captureVisibleTab({ format: "jpeg", quality: 82 });
  return dataUrlToImagePayload(dataUrl);
}
