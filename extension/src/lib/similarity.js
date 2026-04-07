/**
 * @param {number[]} a
 * @param {number[]} b
 */
export function cosineSimilarity(a, b) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * @param {number[][]} vectors
 * @param {number[]} query
 * @param {number} topK
 * @returns {{ index: number, score: number }[]}
 */
export function topKByCosine(vectors, query, topK) {
  const scored = vectors.map((v, index) => ({
    index,
    score: cosineSimilarity(v, query),
  }));
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, topK);
}
