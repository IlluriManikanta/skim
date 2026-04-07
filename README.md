# Skim

Skim is a **source-grounded reading assistant** browser extension. It captures readable text from **one** webpage or **text-based PDF** in your active tab, then answers your **reading goal** and **follow-up questions** using **only** that snapshot — not the live web, not multi-page memory, and not general chat.

The default pipeline **chunks** the page, **embeds** chunks once per session (OpenAI embeddings), **retrieves** the top relevant chunks for each question, and asks a small model (**gpt-4o-mini**) to answer with **verbatim quotes** and citations. Very short pages can use a **full-text** path instead of retrieval.

## What this is / is not

| In scope | Out of scope (MVP) |
|----------|---------------------|
| Long-form HTML articles and docs | Scanned PDFs (no OCR) |
| Browser-opened PDFs with a real text layer | Chrome `chrome://` internal pages |
| Follow-ups in one temporary session | Cross-session history or accounts |
| OpenAI API (you provide a key) | Web search or browsing for the model |

## Privacy and data

- Your OpenAI API key is stored in **`chrome.storage.local`** on your machine only (via the Options page).
- Page text and questions are sent **directly to OpenAI** from the extension (see [OpenAI’s policies](https://openai.com/policies)). There is **no Skim backend** in this repo.
- A session lives in the service worker’s memory and is cleared when you click **New session**, reload the extension, or restart the browser.

## Permissions

The manifest requests **`host_permissions` for `<all_urls>`** so the extension can (a) inject the content script on normal `http(s)` pages and (b) **fetch PDF bytes** from the active tab’s URL when needed. Requests to **`https://api.openai.com/`** are for the API only.

The **`tabs`** permission lets the extension read the active tab’s URL so it can **invalidate the in-memory session** when you navigate or switch tabs (keeping the UI aligned with the current page).

## Setup

1. **Node.js 20+** recommended.
2. Clone the repo and install dependencies:

   ```bash
   npm install
   npm run build
   ```

3. Open **Chrome** (or Chromium) → **Extensions** → enable **Developer mode** → **Load unpacked** → select the **`extension`** folder (the one containing `manifest.json`).

4. Open **Skim** from the puzzle menu → **Options** (or right-click the extension icon) and paste your **OpenAI API key** (needs Chat Completions + Embeddings access).

5. Open a long article or a `.pdf` URL, click the Skim toolbar icon to open the **side panel**, then **Capture this page** and ask a question.

## Development

- `npm run build` — bundles `extension/src/*` into `extension/dist/` (required after changes).
- `npm run watch` — rebuilds on file changes.

## Manual evaluation checklist

Use these before tagging a release:

1. **News / blog HTML** — Capture succeeds; answer cites quotes that appear in the article body.
2. **Technical docs** — Follow-up question stays on-topic; no invented APIs or external facts.
3. **Paywall / empty page** — Clear error, no fabricated content.
4. **Text PDF** — Capture via `.pdf` URL; quotes come from extracted text (not layout-perfect).
5. **Follow-up grounding** — Ask something not on the page; model should admit excerpts do not contain it (or similar), not guess from prior chat alone.
6. **Short page** — Confirm `short page (full context)` in the session bar and sensible citations without retrieval scores (unless you enable **Show retrieval scores**).

## License

MIT — see [LICENSE](LICENSE).
