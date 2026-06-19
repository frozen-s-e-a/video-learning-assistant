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

function renderAnswerPayload(container, result) {
  container.innerHTML = `
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

function renderFollowUpState(state) {
  const followUp = document.querySelector("#followUp");

  if (state.followUpStatus === "loading") {
    followUp.innerHTML = "<p>Answering follow-up...</p>";
    return;
  }

  if (state.followUpStatus === "error") {
    followUp.innerHTML = `<p>${escapeHtml(state.latestFollowUpError || "Unknown error")}</p>`;
    return;
  }

  if (state.latestFollowUp) {
    renderAnswerPayload(followUp, state.latestFollowUp);
    return;
  }

  followUp.innerHTML = "";
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
  renderFollowUpState(state);
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
    analysisStatus: null,
    latestFollowUp: null,
    latestFollowUpError: null,
    followUpStatus: null
  };
  const stored = await chrome.storage.session.get(defaults);
  renderState(stored);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "session") return;
    if (
      !changes.latestAnalysis &&
      !changes.latestAnalysisError &&
      !changes.analysisStatus &&
      !changes.latestFollowUp &&
      !changes.latestFollowUpError &&
      !changes.followUpStatus
    ) return;

    chrome.storage.session.get(defaults).then(renderState);
  });

  document.querySelector("#ask").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const question = document.querySelector("#question");
    const followUp = document.querySelector("#followUp");
    const message = question.value.trim();

    if (!message) {
      followUp.innerHTML = "<p>Enter a follow-up question.</p>";
      return;
    }

    button.disabled = true;
    followUp.innerHTML = "<p>Answering follow-up...</p>";
    try {
      const response = await chrome.runtime.sendMessage({
        type: "VLA_FOLLOW_UP",
        payload: { message }
      });

      if (!response?.ok) {
        throw new Error(response?.error || "Follow-up failed");
      }

      renderAnswerPayload(followUp, response.result);
    } catch (error) {
      followUp.innerHTML = `<p>${escapeHtml(error?.message || "Unknown error")}</p>`;
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector("#selectRegion").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const status = document.querySelector("#status");
    const answer = document.querySelector("#answer");

    button.disabled = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        throw new Error("No active tab found.");
      }

      await chrome.tabs.sendMessage(tab.id, {
        type: "VLA_SELECT_REGION",
        taskType: "auto"
      });
    } catch (error) {
      status.textContent = "Unable to start region selection on this tab.";
      answer.innerHTML = `<p>${escapeHtml(error?.message || "Unknown error")}</p>`;
    } finally {
      button.disabled = false;
    }
  });
}

main();
