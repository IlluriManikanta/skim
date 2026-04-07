export const SYSTEM_GROUNDED = `You are a reading assistant. You MUST answer using ONLY the excerpts provided in the user message under "CONTEXT_EXCERPTS". You MUST NOT use outside knowledge, web search, or prior assumptions beyond what is written there.

If the excerpts do not contain enough information to answer, say so clearly in "not_found" and keep "answer" minimal.

Output MUST be a single JSON object with this exact shape:
{
  "answer": "string with inline citation markers like [1] referring to excerpt numbers",
  "citations": [
    { "n": 1, "chunk_id": "c0", "quote": "verbatim substring from that excerpt" }
  ],
  "not_found": "optional short note if the question cannot be answered from excerpts, else empty string"
}

Rules:
- Every substantive claim in "answer" should have a citation marker [n] matching "citations".
- "quote" must be copied verbatim from the CONTEXT excerpt text for that chunk_id (short quotes, ideally 1–3 sentences).
- Do not invent quotes or chunk_ids.
- Be concise: a short paragraph or bullet list in "answer" is preferred.`;

export function buildUserPayload(question, excerpts, priorTurns) {
  const excerptBlock = excerpts
    .map((e, i) => `--- Excerpt [${i + 1}] chunk_id=${e.chunk_id} ---\n${e.text}`)
    .join("\n\n");

  let history = "";
  if (priorTurns && priorTurns.length > 0) {
    history =
      "\n\nPRIOR_TURNS (for disambiguation only; do NOT treat as evidence):\n" +
      priorTurns.map((t) => `${t.role}: ${t.content}`).join("\n");
  }

  return `QUESTION:\n${question}\n\nCONTEXT_EXCERPTS:\n${excerptBlock}${history}`;
}

export function buildFullTextPayload(question, fullText, priorTurns) {
  let history = "";
  if (priorTurns && priorTurns.length > 0) {
    history =
      "\n\nPRIOR_TURNS (for disambiguation only; do NOT treat as evidence):\n" +
      priorTurns.map((t) => `${t.role}: ${t.content}`).join("\n");
  }
  return `QUESTION:\n${question}\n\nFULL_PAGE_TEXT:\n${fullText}${history}`;
}

export const SYSTEM_FULL_TEXT = `You are a reading assistant. You MUST answer using ONLY the text provided under FULL_PAGE_TEXT. You MUST NOT use outside knowledge or web search.

If the text does not contain enough information, say so in "not_found".

Output MUST be a single JSON object:
{
  "answer": "string with inline [n] citations",
  "citations": [
    { "n": 1, "quote": "verbatim substring from FULL_PAGE_TEXT" }
  ],
  "not_found": ""
}`;
