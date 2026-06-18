function renderAnalysis(result) {
  const status = document.querySelector("#status");
  const answer = document.querySelector("#answer");

  if (!result) {
    status.textContent = "No analysis yet.";
    answer.innerHTML = "";
    return;
  }

  status.textContent = `${result.detectedType} analysis via ${result.mode}`;
  answer.innerHTML = `
    <h2>${escapeHtml(result.answer.title)}</h2>
    ${result.answer.sections.map((section) => `
      <article>
        <h3>${escapeHtml(section.heading)}</h3>
        <p>${escapeHtml(section.content)}</p>
      </article>
    `).join("")}
    <h3>Suggested questions</h3>
    <ul>${result.suggestedQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul>
  `;
}

function renderState(state) {
  const status = document.querySelector("#status");
  const answer = document.querySelector("#answer");

  if (state.analysisStatus === "loading") {
    status.textContent = "Analyzing current frame...";
    answer.innerHTML = "";
    return;
  }

  if (state.analysisStatus === "error") {
    status.textContent = "Analysis failed.";
    answer.innerHTML = `<p>${escapeHtml(state.latestAnalysisError || "Unknown error")}</p>`;
    return;
  }

  renderAnalysis(state.latestAnalysis);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function main() {
  const defaults = {
    latestAnalysis: null,
    latestAnalysisError: null,
    analysisStatus: null
  };
  const stored = await chrome.storage.session.get(defaults);
  renderState(stored);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "session") return;
    if (!changes.latestAnalysis && !changes.latestAnalysisError && !changes.analysisStatus) return;

    chrome.storage.session.get(defaults).then(renderState);
  });
}

main();
