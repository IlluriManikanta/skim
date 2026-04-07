const EMBEDDING_MODEL = "text-embedding-3-small";
const CHAT_MODEL = "gpt-4o-mini";

/**
 * @param {string} apiKey
 * @param {string[]} inputs
 * @returns {Promise<number[][]>}
 */
export async function embedTexts(apiKey, inputs) {
  if (inputs.length === 0) return [];
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
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
 */
export async function embedQuery(apiKey, text) {
  const [v] = await embedTexts(apiKey, [text]);
  return v;
}

/**
 * @param {string} apiKey
 * @param {object} body
 */
export async function chatCompletionJson(apiKey, body) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      ...body,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI chat failed: ${res.status} ${err}`);
  }
  return res.json();
}

export { EMBEDDING_MODEL, CHAT_MODEL };
