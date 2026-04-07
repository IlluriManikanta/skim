# Skim

Skim is a **source-grounded reading assistant** for your browser. You pick **one** webpage or **text-based PDF** in your active tab; it captures the readable text from that page only, then answers **reading goals** and **follow-up questions** using **only** that content — not the live web, not other tabs, and not open-ended chat.

Long pages are split into chunks and embedded for retrieval; a chat model answers with **verbatim quotes** and citations. Short pages can skip retrieval and use the **full text** instead.

## Features

- **Your choice of AI provider** — Use **OpenAI** or **Google Gemini** with your own API key. Pick the provider, models, and keys in Skim’s **Options**; keys stay in the browser only.
- **Grounded answers** — Replies are tied to text captured from the current tab when you use **Capture this page**.
- **HTML and text PDFs** — Works on normal websites and on `.pdf` URLs the browser can open.

## What Skim is good for

| You can rely on Skim for | Skim is not built for (in this version) |
|--------------------------|------------------------------------------|
| Long articles and documentation in HTML | Scanned PDFs (no OCR) |
| Browser-opened PDFs that have real text | Chrome internal pages (`chrome://…`) |
| Follow-ups in one temporary session | Saving history across sessions or accounts |
| Your own API key (OpenAI or Gemini) | Web search or letting the model browse freely |

## Privacy

- **API keys and model names** are stored only on your machine (**Chrome local storage**). There is no Skim backend.
- **Page text and questions** are sent **directly to OpenAI or Google**, depending on the provider you choose. See [OpenAI’s policies](https://openai.com/policies) and [Google AI / Gemini terms](https://ai.google.dev/gemini-api/terms).
- A **session** is cleared when you start a new session, reload the extension, or restart the browser (and when you switch away from the captured page’s URL).

## Permissions (why Skim asks for them)

- **All URLs** — Read page content and fetch PDF bytes from the tab you are on.
- **`https://api.openai.com/*`** — OpenAI API (when you choose OpenAI).
- **`https://generativelanguage.googleapis.com/*`** — Gemini API (when you choose Gemini).
- **Tabs** — Know when you change tabs or navigate so the side panel does not mix different pages.

---

## Setup

### 1. Build the extension

You need **Node.js 20+**. In a terminal:

```bash
git clone https://github.com/IlluriManikanta/skim.git
cd skim
npm install
npm run build
```

`extension/dist/` must exist after `npm run build`. Run `npm run build` again after you change code or pull updates.

### 2. Load it in the browser

1. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
2. Turn on **Developer mode**.
3. **Load unpacked** → select the **`extension`** folder (the one that contains `manifest.json`), not the repo root.

Pin Skim from the puzzle icon if you want it on the toolbar.

### 3. Add your API key

1. Open Skim **Options** (puzzle icon → **Skim** → **Options**).
2. Choose **OpenAI** or **Google Gemini**.
3. Paste your API key. Model fields have sensible defaults; change them only if you know what your account supports.
4. Click **Save**.

**OpenAI** — Create a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys). It needs **chat** and **embeddings** access.

**Gemini** — Create a key in [Google AI Studio](https://aistudio.google.com/apikey). Default embedding model is **`gemini-embedding-001`** (see [Google’s embedding docs](https://ai.google.dev/gemini-api/docs/embeddings)). Older ids like `text-embedding-004` do not work on this Gemini API.

To **remove** a key, clear that field and save. If you **change provider or embedding model**, use **Capture this page** again on the article so embeddings stay in sync.

### 4. Use Skim

1. Open an article, docs page, or `.pdf` URL (not `chrome://` pages).
2. Open Skim’s **side panel** (Skim toolbar icon).
3. Click **Capture this page**, then ask your question.

Switching tabs or navigating clears the capture for that URL so you do not mix sources. Use **New session** when you want a clean slate on purpose.

### If capture or the API misbehaves

- **Reload the extension** after `npm run build` (`chrome://extensions` → **Reload** on Skim).
- **Refresh the article tab** (F5 or the browser reload button) if capture fails or the page has been open a long time — sometimes the content script needs a fresh load.
- Confirm your key and provider in **Options**, then try **Capture this page** again.

---

## Development

- **`npm run build`** — Bundles `extension/src/` into `extension/dist/`.
- **`npm run watch`** — Rebuilds when files change.

## Manual evaluation checklist

Before a release:

1. **News / blog HTML** — Capture works; answers cite text from the article.
2. **Technical docs** — Follow-ups stay on-topic; no invented APIs.
3. **Paywall / empty page** — Clear error, no invented content.
4. **Text PDF** — Capture via `.pdf` URL; quotes match extracted text.
5. **Grounding** — A question with no answer on the page should get an honest “not found,” not a guess.
6. **Short page** — Session shows “short page (full context)” where expected.

## License

MIT — see [LICENSE](LICENSE).
