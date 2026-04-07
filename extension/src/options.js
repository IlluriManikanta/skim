import {
  AI_STORAGE_KEYS,
  DEFAULT_OPENAI_CHAT_MODEL,
  DEFAULT_OPENAI_EMBEDDING_MODEL,
  DEFAULT_GEMINI_CHAT_MODEL,
  DEFAULT_GEMINI_EMBEDDING_MODEL,
  repairObsoleteGeminiEmbeddingModel,
} from "./lib/ai-config.js";

const form = document.getElementById("form");
const providerEl = document.getElementById("provider");
const openaiSection = document.getElementById("openaiSection");
const geminiSection = document.getElementById("geminiSection");
const openaiKey = document.getElementById("openaiKey");
const geminiKey = document.getElementById("geminiKey");
const openaiEmbedding = document.getElementById("openaiEmbedding");
const openaiChat = document.getElementById("openaiChat");
const geminiEmbedding = document.getElementById("geminiEmbedding");
const geminiChat = document.getElementById("geminiChat");
const status = document.getElementById("status");

const K = AI_STORAGE_KEYS;

function syncSections() {
  const p = providerEl?.value || "openai";
  if (openaiSection) openaiSection.classList.toggle("hidden", p !== "openai");
  if (geminiSection) geminiSection.classList.toggle("hidden", p !== "gemini");
}

async function load() {
  await repairObsoleteGeminiEmbeddingModel();
  const data = await chrome.storage.local.get(Object.values(K));

  const provider = data[K.aiProvider] === "gemini" ? "gemini" : "openai";
  if (providerEl) providerEl.value = provider;

  openaiKey.value = typeof data[K.openaiApiKey] === "string" ? data[K.openaiApiKey] : "";
  geminiKey.value = typeof data[K.geminiApiKey] === "string" ? data[K.geminiApiKey] : "";

  openaiEmbedding.value =
    (typeof data[K.openaiEmbeddingModel] === "string" && data[K.openaiEmbeddingModel]) ||
    DEFAULT_OPENAI_EMBEDDING_MODEL;
  openaiChat.value =
    (typeof data[K.openaiChatModel] === "string" && data[K.openaiChatModel]) || DEFAULT_OPENAI_CHAT_MODEL;
  geminiEmbedding.value =
    (typeof data[K.geminiEmbeddingModel] === "string" && data[K.geminiEmbeddingModel]) ||
    DEFAULT_GEMINI_EMBEDDING_MODEL;
  geminiChat.value =
    (typeof data[K.geminiChatModel] === "string" && data[K.geminiChatModel]) || DEFAULT_GEMINI_CHAT_MODEL;

  syncSections();
}

providerEl?.addEventListener("change", syncSections);

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const provider = providerEl?.value === "gemini" ? "gemini" : "openai";

  const payload = {
    [K.aiProvider]: provider,
    [K.openaiApiKey]: openaiKey.value.trim(),
    [K.geminiApiKey]: geminiKey.value.trim(),
    [K.openaiEmbeddingModel]: openaiEmbedding.value.trim() || DEFAULT_OPENAI_EMBEDDING_MODEL,
    [K.openaiChatModel]: openaiChat.value.trim() || DEFAULT_OPENAI_CHAT_MODEL,
    [K.geminiEmbeddingModel]: geminiEmbedding.value.trim() || DEFAULT_GEMINI_EMBEDDING_MODEL,
    [K.geminiChatModel]: geminiChat.value.trim() || DEFAULT_GEMINI_CHAT_MODEL,
  };

  await chrome.storage.local.set(payload);
  if (status) {
    status.hidden = false;
    setTimeout(() => {
      status.hidden = true;
    }, 2000);
  }
});

load();
