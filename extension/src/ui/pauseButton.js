export function createPauseButton(onAnalyze) {
  document.getElementById("vla-pause-button")?.remove();

  const container = document.createElement("div");
  container.id = "vla-pause-button";
  container.style.cssText = [
    "position: fixed",
    "right: 24px",
    "bottom: 96px",
    "z-index: 2147483647",
    "display: none",
    "gap: 8px",
    "align-items: center",
    "background: #111827",
    "color: white",
    "padding: 10px",
    "border-radius: 8px",
    "box-shadow: 0 8px 30px rgba(0,0,0,.25)",
    "font: 14px system-ui, sans-serif",
  ].join(";");

  const select = document.createElement("select");
  select.innerHTML = `
    <option value="auto">Auto</option>
    <option value="code">Code</option>
    <option value="error">Error</option>
    <option value="concept">Concept</option>
  `;

  const button = document.createElement("button");
  button.textContent = "Analyze current frame";
  button.addEventListener("click", () => onAnalyze(select.value));

  container.append(select, button);
  document.documentElement.append(container);

  return {
    show() {
      container.style.display = "flex";
    },
    hide() {
      container.style.display = "none";
    },
  };
}
