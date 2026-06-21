export function createPauseButton(onAnalyze) {
  document.getElementById("vla-pause-button")?.remove();

  const host = document.createElement("div");
  host.id = "vla-pause-button";
  host.style.cssText = [
    "position: fixed",
    "right: 24px",
    "bottom: 96px",
    "z-index: 2147483647",
    "display: none"
  ].join(";");

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .panel {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.94);
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.28);
        color: #f8fafc;
        font: 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        backdrop-filter: blur(8px);
      }
      select,
      button {
        height: 34px;
        border-radius: 7px;
        border: 1px solid rgba(203, 213, 225, 0.5);
        font: inherit;
        line-height: 1;
      }
      select {
        min-width: 104px;
        padding: 0 28px 0 10px;
        background: #ffffff;
        color: #0f172a;
      }
      button {
        cursor: pointer;
        padding: 0 12px;
        border-color: #2563eb;
        background: #2563eb;
        color: #ffffff;
        font-weight: 650;
      }
      button:hover { background: #1d4ed8; }
      button:active { transform: translateY(1px); }
      button:focus-visible,
      select:focus-visible {
        outline: 2px solid #93c5fd;
        outline-offset: 2px;
      }
    </style>
    <div class="panel" role="group" aria-label="Video Learning Assistant controls">
      <select aria-label="Analysis type">
        <option value="auto">Auto</option>
        <option value="code">Code</option>
        <option value="error">Error</option>
        <option value="concept">Concept</option>
      </select>
      <button type="button">Analyze frame</button>
    </div>
  `;

  const select = shadow.querySelector("select");
  const button = shadow.querySelector("button");
  button.addEventListener("click", () => onAnalyze(select.value));

  document.documentElement.append(host);

  return {
    show() {
      host.style.display = "block";
    },
    hide() {
      host.style.display = "none";
    },
  };
}
