import { Readability } from "@mozilla/readability";

/**
 * @returns {{ title: string; text: string; url: string; excerpt: string } | null}
 */
function extractArticle() {
  try {
    const documentClone = document.cloneNode(true);
    const article = new Readability(/** @type {Document} */ (documentClone)).parse();
    if (!article || !article.textContent) {
      return {
        title: document.title || "",
        text: "",
        url: location.href,
        excerpt: "",
      };
    }
    const text = article.textContent.trim();
    return {
      title: article.title || document.title || "",
      text,
      url: location.href,
      excerpt: (article.excerpt || "").trim(),
    };
  } catch {
    return null;
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "SKIM_EXTRACT") {
    const data = extractArticle();
    sendResponse(data);
    return true;
  }
  return false;
});
