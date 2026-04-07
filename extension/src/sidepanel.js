const captureBtn = document.getElementById("capture");
const newSessionBtn = document.getElementById("newSession");
const openOptions = document.getElementById("openOptions");
const sessionBar = document.getElementById("sessionBar");
const sessionTitle = document.getElementById("sessionTitle");
const sessionMeta = document.getElementById("sessionMeta");
const warnBox = document.getElementById("warnBox");
const emptyHint = document.getElementById("emptyHint");
const thread = document.getElementById("thread");
const askForm = document.getElementById("askForm");
const questionEl = document.getElementById("question");
const submitAsk = document.getElementById("submitAsk");
const debugRetrieval = document.getElementById("debugRetrieval");

/** @type {{ role: 'user' | 'assistant'; content: string }[]} */
let transcript = [];

/** Tracks whether we had an active session (for clearing thread when it becomes stale). */
let hadSession = false;

/** @type {ReturnType<typeof setTimeout> | null} */
let tabUpdateDebounce = null;

function showWarn(msg) {
  warnBox.textContent = msg;
  warnBox.classList.remove("hidden");
}

function clearWarn() {
  warnBox.textContent = "";
  warnBox.classList.add("hidden");
}

function resetConversation() {
  transcript = [];
  thread.innerHTML = "";
}

async function refreshSession() {
  const res = await chrome.runtime.sendMessage({ type: "SKIM_SESSION_GET" });
  const s = res?.session;

  if (!s) {
    sessionBar.classList.add("hidden");
    emptyHint?.classList.remove("hidden");
    if (hadSession) {
      resetConversation();
      clearWarn();
    }
    hadSession = false;
    return;
  }

  hadSession = true;
  emptyHint?.classList.add("hidden");
  sessionBar.classList.remove("hidden");
  sessionTitle.textContent = s.title || s.url || "Captured page";
  const parts = [
    `${s.chunkCount} passages indexed`,
    s.shortPageMode ? "Full page in context" : "Snippets by relevance",
    s.sourceType === "pdf" ? "PDF" : "Web page",
  ];
  if (s.pdfMeta?.pageCount) parts.push(`~${s.pdfMeta.pageCount} pdf pages`);
  sessionMeta.textContent = parts.join(" · ");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {object} result
 */
function renderAssistantMessage(result) {
  const div = document.createElement("div");
  div.className = "bubble assistant";

  const answer = result.answer || "";
  const notFound = result.not_found || "";
  const citations = Array.isArray(result.citations) ? result.citations : [];
  const retrieval = result.retrieval;

  let html = `<div class="answer">${escapeHtml(answer)}</div>`;
  if (notFound) {
    html += `<p class="muted small">${escapeHtml(notFound)}</p>`;
  }
  if (citations.length) {
    html += `<div class="citations"><h3>Quotes from this page</h3>`;
    for (const c of citations) {
      const n = c.n ?? "?";
      const q = c.quote || "";
      const cid = c.chunk_id ? ` <span class="muted">(${escapeHtml(String(c.chunk_id))})</span>` : "";
      html += `<div class="cite-item"><strong>[${escapeHtml(String(n))}]</strong>${cid}<span class="cite-quote">${escapeHtml(q)}</span></div>`;
    }
    html += `</div>`;
  }
  if (debugRetrieval?.checked && retrieval && Array.isArray(retrieval)) {
    const scores = retrieval.map((r) => `${r.chunk_id}:${r.score?.toFixed?.(3) ?? "?"}`).join(", ");
    html += `<div class="debug">Retrieval: ${escapeHtml(scores)}</div>`;
  }
  div.innerHTML = html;
  thread.appendChild(div);
  thread.scrollTop = thread.scrollHeight;
}

function appendUserBubble(text) {
  const div = document.createElement("div");
  div.className = "bubble user";
  div.textContent = text;
  thread.appendChild(div);
  thread.scrollTop = thread.scrollHeight;
}

captureBtn?.addEventListener("click", async () => {
  clearWarn();
  captureBtn.disabled = true;
  try {
    const res = await chrome.runtime.sendMessage({ type: "SKIM_CAPTURE" });
    if (res?.error) {
      showWarn(res.error);
      return;
    }
    if (res?.warning) {
      showWarn(res.warning);
    } else {
      clearWarn();
    }
    resetConversation();
    await refreshSession();
  } catch (e) {
    showWarn(e instanceof Error ? e.message : String(e));
  } finally {
    captureBtn.disabled = false;
  }
});

newSessionBtn?.addEventListener("click", async () => {
  clearWarn();
  await chrome.runtime.sendMessage({ type: "SKIM_SESSION_CLEAR" });
  resetConversation();
  await refreshSession();
});

openOptions?.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

askForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = questionEl.value.trim();
  if (!q) return;
  clearWarn();
  submitAsk.disabled = true;
  appendUserBubble(q);
  questionEl.value = "";
  transcript.push({ role: "user", content: q });

  try {
    const res = await chrome.runtime.sendMessage({
      type: "SKIM_ASK",
      question: q,
      history: transcript.slice(0, -1),
    });
    if (res?.error) {
      showWarn(res.error);
      await refreshSession();
      return;
    }
    const result = res?.result;
    if (!result) {
      showWarn("No response.");
      await refreshSession();
      return;
    }
    renderAssistantMessage(result);
    transcript.push({ role: "assistant", content: result.answer || "" });
  } catch (err) {
    showWarn(err instanceof Error ? err.message : String(err));
    await refreshSession();
  } finally {
    submitAsk.disabled = false;
  }
});

chrome.tabs.onActivated.addListener(() => {
  void refreshSession();
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.url === undefined && changeInfo.status !== "complete") return;
  if (tabUpdateDebounce) clearTimeout(tabUpdateDebounce);
  tabUpdateDebounce = setTimeout(() => {
    tabUpdateDebounce = null;
    void refreshSession();
  }, 150);
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    void refreshSession();
  }
});

void refreshSession();
