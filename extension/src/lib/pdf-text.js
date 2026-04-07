import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * Configure PDF.js worker URL (extension-local).
 */
export function configurePdfWorker() {
  const url = chrome.runtime.getURL("dist/pdfjs/pdf.worker.min.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = url;
}

/**
 * Extract plain text from PDF bytes (text-based PDFs). Scanned PDFs may return little or no text.
 * @param {ArrayBuffer} data
 * @returns {Promise<{ text: string; pageCount: number; lowTextWarning: boolean }>}
 */
export async function extractTextFromPdfBytes(data) {
  configurePdfWorker();

  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableRange: true,
    disableStream: true,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const parts = [];

  for (let p = 1; p <= pageCount; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const strings = content.items.map((it) => ("str" in it ? it.str : "")).filter(Boolean);
    parts.push(strings.join(" "));
  }

  const text = parts
    .join("\n\n")
    .replace(/\s+/g, " ")
    .trim();

  const words = text.split(/\s+/).filter(Boolean).length;
  const lowTextWarning = pageCount > 0 && words < pageCount * 8;

  return { text, pageCount, lowTextWarning };
}
