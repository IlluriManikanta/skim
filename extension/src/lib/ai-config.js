/** @typedef {'openai' | 'gemini'} AiProvider */

export const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_OPENAI_CHAT_MODEL = "gpt-4o-mini";
/** @see https://ai.google.dev/gemini-api/docs/embeddings — legacy id is not served on `generativelanguage` v1beta. */
export const DEFAULT_GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";

/** Prior Skim default; auto-migrated to {@link DEFAULT_GEMINI_EMBEDDING_MODEL}. */
export const OBSOLETE_GEMINI_EMBEDDING_MODEL = "text-embedding-004";

/**
 * Rewrites stored embedding model if it was the old default (fixes 404 on capture).
 */
export async function repairObsoleteGeminiEmbeddingModel() {
  const raw = await chrome.storage.local.get(K.geminiEmbeddingModel);
  const v = typeof raw[K.geminiEmbeddingModel] === "string" ? raw[K.geminiEmbeddingModel].trim() : "";
  if (v === OBSOLETE_GEMINI_EMBEDDING_MODEL) {
    await chrome.storage.local.set({ [K.geminiEmbeddingModel]: DEFAULT_GEMINI_EMBEDDING_MODEL });
  }
}
export const DEFAULT_GEMINI_CHAT_MODEL = "gemini-2.0-flash";

export const AI_STORAGE_KEYS = {
  aiProvider: "aiProvider",
  openaiApiKey: "openaiApiKey",
  geminiApiKey: "geminiApiKey",
  openaiChatModel: "openaiChatModel",
  openaiEmbeddingModel: "openaiEmbeddingModel",
  geminiChatModel: "geminiChatModel",
  geminiEmbeddingModel: "geminiEmbeddingModel",
};

const K = AI_STORAGE_KEYS;

/**
 * @typedef {{
 *   provider: AiProvider,
 *   apiKey: string,
 *   embeddingModel: string,
 *   chatModel: string,
 * }} ResolvedAiConfig
 */

/**
 * @param {Record<string, unknown>} raw
 */
async function migrateLegacyProvider(raw) {
  if (raw[K.aiProvider] === "openai" || raw[K.aiProvider] === "gemini") return;

  const openai = typeof raw[K.openaiApiKey] === "string" ? raw[K.openaiApiKey].trim() : "";
  const gemini = typeof raw[K.geminiApiKey] === "string" ? raw[K.geminiApiKey].trim() : "";
  if (openai) {
    await chrome.storage.local.set({ [K.aiProvider]: "openai" });
    raw[K.aiProvider] = "openai";
  } else if (gemini) {
    await chrome.storage.local.set({ [K.aiProvider]: "gemini" });
    raw[K.aiProvider] = "gemini";
  }
}

/**
 * @returns {Promise<ResolvedAiConfig | null>}
 */
export async function getAiConfig() {
  const raw = await chrome.storage.local.get(Object.values(K));
  await migrateLegacyProvider(raw);

  /** @type {AiProvider} */
  const provider =
    raw[K.aiProvider] === "gemini" ? "gemini" : "openai";

  const apiKey =
    provider === "gemini"
      ? typeof raw[K.geminiApiKey] === "string"
        ? raw[K.geminiApiKey].trim()
        : ""
      : typeof raw[K.openaiApiKey] === "string"
        ? raw[K.openaiApiKey].trim()
        : "";

  if (!apiKey) return null;

  let embeddingModel =
    provider === "gemini"
      ? (typeof raw[K.geminiEmbeddingModel] === "string" && raw[K.geminiEmbeddingModel].trim()) ||
        DEFAULT_GEMINI_EMBEDDING_MODEL
      : (typeof raw[K.openaiEmbeddingModel] === "string" && raw[K.openaiEmbeddingModel].trim()) ||
        DEFAULT_OPENAI_EMBEDDING_MODEL;

  if (provider === "gemini" && embeddingModel === OBSOLETE_GEMINI_EMBEDDING_MODEL) {
    embeddingModel = DEFAULT_GEMINI_EMBEDDING_MODEL;
    void chrome.storage.local.set({ [K.geminiEmbeddingModel]: embeddingModel });
  }

  const chatModel =
    provider === "gemini"
      ? (typeof raw[K.geminiChatModel] === "string" && raw[K.geminiChatModel].trim()) ||
        DEFAULT_GEMINI_CHAT_MODEL
      : (typeof raw[K.openaiChatModel] === "string" && raw[K.openaiChatModel].trim()) ||
        DEFAULT_OPENAI_CHAT_MODEL;

  return { provider, apiKey, embeddingModel, chatModel };
}

export function missingApiKeyMessage() {
  return "Add your API key in Skim options (extension settings).";
}
