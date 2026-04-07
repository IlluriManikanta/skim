import { chunkText } from "./lib/chunk.js";
import { embedTexts, embedQuery, chatCompletionJson } from "./lib/openai.js";
import { topKByCosine } from "./lib/similarity.js";
import {
  SYSTEM_GROUNDED,
  SYSTEM_FULL_TEXT,
  buildUserPayload,
  buildFullTextPayload,
} from "./lib/prompt.js";
import { extractTextFromPdfBytes } from "./lib/pdf-text.js";

const SHORT_PAGE_CHARS = 3500;
const TOP_K = 10;
const MAX_CONTEXT_CHARS = 12000;
const MIN_WORDS = 50;

/**
 * @param {string} raw
 */
function safeParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return {
      answer: raw,
      citations: [],
      not_found: "The model returned non-JSON output; showing raw text above.",
    };
  }
}

/**
 * @typedef {{
 *   url: string,
 *   title: string,
 *   sourceType: 'html'|'pdf',
 *   fullText: string,
 *   chunks: { id: string, text: string, index: number }[],
 *   embeddings: number[][] | null,
 *   shortPageMode: boolean,
 *   pdfMeta: { pageCount?: number; lowTextWarning?: boolean; contentType?: string } | null,
 *   capturedAt: number
 * }} SessionState
 */

/** @type {SessionState | null} */
let session = null;

/** @typedef {{ role: 'user' | 'assistant'; content: string }} ChatTurn */

async function getApiKey() {
  const { openaiApiKey } = await chrome.storage.local.get("openaiApiKey");
  const k = typeof openaiApiKey === "string" ? openaiApiKey.trim() : "";
  return k;
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function looksLikePdfUrl(url) {
  try {
    const u = new URL(url);
    if (u.pathname.toLowerCase().endsWith(".pdf")) return true;
  } catch {
    return false;
  }
  return false;
}

/**
 * @param {number} tabId
 * @returns {Promise<{ title: string; text: string; url: string }>}
 */
async function extractFromHtmlTab(tabId) {
  const res = await chrome.tabs.sendMessage(tabId, { type: "SKIM_EXTRACT" });
  if (!res || typeof res.text !== "string") {
    throw new Error("Could not read this page. Try a normal article page or use reader mode.");
  }
  if (wordCount(res.text) < MIN_WORDS) {
    throw new Error(
      "Extracted very little text from this page. It may be a web app, feed, or paywalled article. Try another page or open the article URL directly."
    );
  }
  return { title: res.title || "", text: res.text, url: res.url || "" };
}

/**
 * @param {string} url
 * @returns {Promise<{ title: string; text: string; url: string; pdfMeta: object }>}
 */
async function extractFromPdfUrl(url) {
  let res;
  try {
    res = await fetch(url, { credentials: "include", cache: "no-store" });
  } catch (e) {
    throw new Error(`Could not fetch PDF: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!res.ok) {
    throw new Error(`PDF fetch failed (${res.status}). The file may require login or block extensions.`);
  }
  const ct = res.headers.get("content-type") || "";
  const buf = await res.arrayBuffer();
  const { text, pageCount, lowTextWarning } = await extractTextFromPdfBytes(buf);

  if (!text || wordCount(text) < MIN_WORDS) {
    throw new Error(
      "Almost no text was extracted from this PDF. Scanned/image PDFs are not supported in this MVP — use a text-based PDF or OCR elsewhere."
    );
  }

  let title = "";
  try {
    const path = new URL(url).pathname.split("/").pop() || "document.pdf";
    title = decodeURIComponent(path.replace(/\.pdf$/i, "")) || "PDF";
  } catch {
    title = "PDF";
  }

  return {
    title,
    text,
    url,
    pdfMeta: { pageCount, lowTextWarning, contentType: ct },
  };
}

/**
 * @param {string} apiKey
 * @param {{ id: string; text: string }[]} chunks
 * @returns {Promise<number[][]>}
 */
async function embedAllChunks(apiKey, chunks) {
  const texts = chunks.map((c) => c.text);
  const batchSize = 64;
  /** @type {number[][]} */
  const all = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const vectors = await embedTexts(apiKey, batch);
    all.push(...vectors);
  }
  return all;
}

/**
 * Trim retrieved chunks to max context size (drop lowest similarity first).
 * @param {{ chunk: { id: string; text: string }; score: number }[]} ranked
 */
function trimToCharBudget(ranked) {
  const out = [];
  let total = 0;
  for (const r of ranked) {
    const len = r.chunk.text.length;
    if (total + len > MAX_CONTEXT_CHARS && out.length > 0) break;
    out.push(r);
    total += len;
  }
  return out.length ? out : ranked.slice(0, 1);
}

/**
 * @param {string} question
 * @param {ChatTurn[]} history
 * @param {SessionState} sess
 */
async function answerFromSession(question, history, sess) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("Add your OpenAI API key in Skim options (extension settings).");
  }

  const priorTurns =
    history?.length > 0
      ? history.slice(-6).map((t) => ({ role: t.role, content: t.content }))
      : [];

  if (sess.shortPageMode) {
    const userContent = buildFullTextPayload(question, sess.fullText, priorTurns);
    const json = await chatCompletionJson(apiKey, {
      messages: [
        { role: "system", content: SYSTEM_FULL_TEXT },
        { role: "user", content: userContent },
      ],
    });
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty response from model");
    return safeParseJson(raw);
  }

  if (!sess.embeddings || !sess.chunks?.length) {
    throw new Error("Session is missing chunks. Capture the page again.");
  }

  const qVec = await embedQuery(apiKey, question);
  const ranked = topKByCosine(sess.embeddings, qVec, TOP_K).map(({ index, score }) => ({
    chunk: sess.chunks[index],
    score,
  }));

  const trimmed = trimToCharBudget(ranked);
  const excerpts = trimmed.map((t, i) => ({
    n: i + 1,
    chunk_id: t.chunk.id,
    text: t.chunk.text,
    score: t.score,
  }));

  const userContent = buildUserPayload(
    question,
    excerpts.map((e) => ({ chunk_id: e.chunk_id, text: e.text })),
    priorTurns
  );

  const completion = await chatCompletionJson(apiKey, {
    messages: [
      { role: "system", content: SYSTEM_GROUNDED },
      { role: "user", content: userContent },
    ],
  });
  const raw = completion.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty response from model");
  const parsed = safeParseJson(raw);
  return { ...parsed, retrieval: excerpts };
}

async function captureCurrentTab() {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("Add your OpenAI API key in Skim options (extension settings).");
  }

  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs[0];
  if (!tab?.id) throw new Error("No active tab.");
  const url = tab.url || "";

  if (url.startsWith("chrome://") || url.startsWith("edge://") || url.startsWith("about:")) {
    throw new Error("This built-in browser page cannot be captured. Open an http(s) page or PDF URL.");
  }

  /** @type {{ title: string; text: string; url: string; pdfMeta?: object }} */
  let extracted;

  if (looksLikePdfUrl(url)) {
    extracted = await extractFromPdfUrl(url);
  } else {
    try {
      extracted = await extractFromHtmlTab(tab.id);
    } catch (e) {
      let asPdf = false;
      try {
        const head = await fetch(url, { method: "HEAD", credentials: "include", cache: "no-store" });
        const ct = (head.headers.get("content-type") || "").toLowerCase();
        asPdf = ct.includes("application/pdf");
      } catch {
        asPdf = false;
      }
      if (asPdf) {
        extracted = await extractFromPdfUrl(url);
      } else {
        throw e;
      }
    }
  }

  const fullText = extracted.text;
  const chunks = chunkText(fullText);
  if (chunks.length === 0) {
    throw new Error("No text chunks produced from this page.");
  }

  const shortPage = fullText.length <= SHORT_PAGE_CHARS || chunks.length <= 2;

  /** @type {SessionState} */
  const sess = {
    url: extracted.url,
    title: extracted.title,
    sourceType: extracted.pdfMeta ? "pdf" : "html",
    fullText,
    chunks,
    embeddings: null,
    shortPageMode: shortPage,
    pdfMeta: extracted.pdfMeta || null,
    capturedAt: Date.now(),
  };

  if (!shortPage) {
    sess.embeddings = await embedAllChunks(
      apiKey,
      chunks.map((c) => ({ id: c.id, text: c.text }))
    );
  }

  session = sess;

  /** @type {string | undefined} */
  let warning;
  if (sess.pdfMeta?.lowTextWarning) {
    warning =
      "PDF text looks sparse — this may be a scanned or image-heavy PDF. Answers may be unreliable.";
  }

  return {
    ok: true,
    session: summarizeSession(sess),
    ...(warning ? { warning } : {}),
  };
}

/**
 * @param {SessionState} sess
 */
function summarizeSession(sess) {
  return {
    url: sess.url,
    title: sess.title,
    sourceType: sess.sourceType,
    chunkCount: sess.chunks.length,
    shortPageMode: sess.shortPageMode,
    pdfMeta: sess.pdfMeta,
    capturedAt: sess.capturedAt,
  };
}

function clearSession() {
  session = null;
}

/**
 * Normalize for comparison: drop hash (SPA in-page nav), trim non-root trailing slash.
 * @param {string} url
 */
function normalizePageUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.href;
  } catch {
    return url;
  }
}

function isUnsupportedTabUrl(url) {
  if (!url) return true;
  return (
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("devtools:") ||
    url.startsWith("chrome-extension://")
  );
}

async function invalidateSessionIfStale() {
  if (!session) return;

  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs[0];
  const tabUrl = tab?.url;

  if (isUnsupportedTabUrl(tabUrl || "") || !tabUrl) {
    clearSession();
    return;
  }

  if (normalizePageUrl(tabUrl) !== normalizePageUrl(session.url)) {
    clearSession();
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "SKIM_CAPTURE") {
        await invalidateSessionIfStale();
        const out = await captureCurrentTab();
        sendResponse(out);
        return;
      }
      if (msg?.type === "SKIM_SESSION_GET") {
        await invalidateSessionIfStale();
        sendResponse({ session: session ? summarizeSession(session) : null });
        return;
      }
      if (msg?.type === "SKIM_SESSION_CLEAR") {
        clearSession();
        sendResponse({ ok: true });
        return;
      }
      if (msg?.type === "SKIM_ASK") {
        await invalidateSessionIfStale();
        if (!session) {
          sendResponse({ error: "No session. Capture a page first." });
          return;
        }
        const { question, history } = msg;
        if (!question || typeof question !== "string") {
          sendResponse({ error: "Missing question." });
          return;
        }
        const result = await answerFromSession(question, history || [], session);
        sendResponse({ ok: true, result });
        return;
      }
      sendResponse({ error: "Unknown message" });
    } catch (e) {
      sendResponse({ error: e instanceof Error ? e.message : String(e) });
    }
  })();
  return true;
});

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {});
