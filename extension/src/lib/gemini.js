const BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * @param {string} model
 */
function modelResourceName(model) {
  const id = model.replace(/^models\//, "");
  return `models/${id}`;
}

/**
 * @param {string} model
 */
function modelPathSegment(model) {
  return model.replace(/^models\//, "");
}

/**
 * @param {string} apiKey
 * @param {string} embeddingModel
 * @param {string[]} inputs
 * @returns {Promise<number[][]>}
 */
export async function geminiEmbedTexts(apiKey, embeddingModel, inputs) {
  if (inputs.length === 0) return [];
  const pathSeg = modelPathSegment(embeddingModel);
  const resource = modelResourceName(embeddingModel);
  const url = `${BASE}/models/${encodeURIComponent(pathSeg)}:batchEmbedContents?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: inputs.map((text) => ({
        model: resource,
        content: { parts: [{ text }] },
      })),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini embeddings failed: ${res.status} ${err}`);
  }
  /** @type {{ embeddings?: { values: number[] }[] }} */
  const json = await res.json();
  const embeddings = json.embeddings;
  if (!Array.isArray(embeddings)) {
    throw new Error("Gemini embeddings: missing embeddings array in response.");
  }
  return embeddings.map((e) => {
    if (!e?.values?.length) {
      throw new Error("Gemini embeddings: missing values for an item.");
    }
    return e.values;
  });
}

/**
 * @param {{ role: string; content: string }[]} messages
 */
function splitSystemAndUser(messages) {
  let systemText = "";
  /** @type {string[]} */
  const userParts = [];
  for (const m of messages) {
    if (m.role === "system") systemText = m.content;
    else if (m.role === "user") userParts.push(m.content);
    else if (m.role === "assistant") userParts.push(`(assistant) ${m.content}`);
  }
  return { systemText, userText: userParts.join("\n\n") };
}

/**
 * Returns assistant message text (JSON string).
 * @param {string} apiKey
 * @param {string} chatModel
 * @param {{ role: string; content: string }[]} messages
 * @returns {Promise<string>}
 */
export async function geminiGenerateJsonText(apiKey, chatModel, messages) {
  const pathSeg = modelPathSegment(chatModel);
  const url = `${BASE}/models/${encodeURIComponent(pathSeg)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const { systemText, userText } = splitSystemAndUser(messages);

  /** @type {Record<string, unknown>} */
  const body = {
    contents: [{ role: "user", parts: [{ text: userText }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };
  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini chat failed: ${res.status} ${err}`);
  }
  /** @type {{
   *   candidates?: { content?: { parts?: { text?: string }[] } }[],
   *   promptFeedback?: { blockReason?: string },
   * }} */
  const json = await res.json();
  const block = json.promptFeedback?.blockReason;
  if (block) {
    throw new Error(`Gemini blocked the prompt: ${block}`);
  }
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty response from Gemini model.");
  }
  return text;
}
