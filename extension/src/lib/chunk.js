/**
 * Split plain text into overlapping chunks with stable ids (c0, c1, …).
 * @param {string} text
 * @param {{ maxChars?: number, overlap?: number }} opts
 * @returns {{ id: string, text: string, index: number }[]}
 */
export function chunkText(text, opts = {}) {
  const maxChars = opts.maxChars ?? 1200;
  const overlap = opts.overlap ?? 150;

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n\s*\n+/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);

  /** @type {string[]} */
  const pieces = [];
  let buf = "";

  const flush = () => {
    if (buf.trim()) pieces.push(buf.trim());
    buf = "";
  };

  for (const p of paragraphs) {
    if (buf.length + p.length + 2 <= maxChars) {
      buf = buf ? `${buf}\n\n${p}` : p;
    } else {
      if (buf) flush();
      if (p.length <= maxChars) {
        buf = p;
      } else {
        for (let i = 0; i < p.length; i += maxChars - overlap) {
          pieces.push(p.slice(i, i + maxChars));
        }
      }
    }
  }
  flush();

  if (pieces.length === 0) return [];

  /** @type {{ id: string, text: string, index: number }[]} */
  const chunks = [];
  for (let i = 0; i < pieces.length; i++) {
    const t = pieces[i];
    if (!t) continue;
    chunks.push({ id: `c${i}`, text: t, index: i });
  }

  return chunks;
}

/** Rough token estimate for budgeting (not exact). */
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}
