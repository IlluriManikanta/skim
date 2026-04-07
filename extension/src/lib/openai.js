import { DEFAULT_OPENAI_CHAT_MODEL, DEFAULT_OPENAI_EMBEDDING_MODEL } from "./ai-config.js";

/**
 * @param {string} apiKey
 * @param {string[]} inputs
 * @param {string} [embeddingModel]
 * @returns {Promise<number[][]>}
 */
export async function embedTexts(apiKey, inputs, embeddingModel = DEFAULT_OPENAI_EMBEDDING_MODEL) {
  if (inputs.length === 0) return [];
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: embeddingModel,
      input: inputs,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embeddings failed: ${res.status} ${err}`);
  }
  /** @type {{ data: { embedding: number[]; index: number }[] }} */
  const json = await res.json();
  const sorted = [...json.data].sort((a, b) => a.index - b.index);
  return sorted.map((d) => d.embedding);
}

/**
 * @param {string} apiKey
 * @param {string} text
 * @param {string} [embeddingModel]
 */
export async function embedQuery(apiKey, text, embeddingModel) {
  const [v] = await embedTexts(apiKey, [text], embeddingModel);
  return v;
}

/**
 * @param {string} apiKey
 * @param {string} chatModel
 * @param {object} body
 */
export async function chatCompletionJson(apiKey, chatModel, body) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      temperature: 0.2,
      response_format: { type: "json_object" },
      ...body,
      model: chatModel,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI chat failed: ${res.status} ${err}`);
  }
  return res.json();
}

export { DEFAULT_OPENAI_EMBEDDING_MODEL as EMBEDDING_MODEL_DEFAULT, DEFAULT_OPENAI_CHAT_MODEL as CHAT_MODEL_DEFAULT };
