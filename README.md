# Skim

Skim is a **source-grounded reading assistant** for your browser. You pick **one** webpage or **text-based PDF** in your active tab; Skim captures the readable text from that page only, then helps you reach a **reading goal** and answer **follow-up questions** using **only** that content — not the live web, not other tabs, and not open-ended chat.

Under the hood, the extension **splits** long pages into chunks, **embeds** them once per session (OpenAI embeddings), **finds** the most relevant passages for each question, and uses a small model (**gpt-4o-mini**) to answer with **verbatim quotes** and citations. Very short pages can skip retrieval and use the **full text** instead.

## What Skim is good for

| You can rely on Skim for | Skim is not built for (in this version) |
|--------------------------|-------------------------------------------|
| Long articles and documentation in HTML | Scanned PDFs (no OCR) |
| Browser-opened PDFs that have real text | Chrome internal pages (`chrome://…`) |
| Follow-ups in one temporary session | Saving history across sessions or accounts |
| Your own OpenAI API key | Web search or letting the model browse freely |

## Privacy in plain language

- Your **OpenAI API key** is saved only on your computer in **Chrome’s local storage** (via the Skim settings page). It is not sent to any Skim server — this project does not include a backend.
- The **text of the page** and your **questions** go **straight to OpenAI** when you use Skim. See [OpenAI’s policies](https://openai.com/policies) for how they handle API data.
- A **session** lives in memory until you start a **new session**, reload the extension, or restart the browser.

## Why the extension asks for these permissions

- **`host_permissions` for all URLs** — So Skim can run on normal websites and, when needed, **fetch PDF bytes** from the address of the tab you’re on.
- **`https://api.openai.com/*`** — So Skim can call OpenAI’s API.
- **`tabs`** — So Skim knows when you **switch tabs or navigate**, and can clear the in-memory session so the side panel stays aligned with the page you’re actually reading.

---

## How to set up Skim

Follow these steps in order the first time you install Skim from this repository.

### 1. Install Node.js

You need **Node.js version 20 or newer** to build the extension. If you are not sure what you have, open a terminal and run:

```bash
node -v
```

If the version is below 20, install a current LTS release from [nodejs.org](https://nodejs.org/) (or use a version manager you already trust).

### 2. Get the code and install dependencies

In a terminal, go to the folder where you keep projects, then clone the repository and enter the project folder:

```bash
git clone https://github.com/IlluriManikanta/skim.git
cd skim
```

If you use SSH or a fork, use that clone URL instead.

Install the JavaScript dependencies:

```bash
npm install
```

This downloads the tools and libraries the build needs (for example the bundler and PDF support). You only need to do this again if the project’s dependencies change.

### 3. Build the extension

Skim’s source files live under `extension/src/` and must be **compiled** into the `extension/dist/` folder that Chrome loads.

```bash
npm run build
```

You should see output that finishes without errors. If you change Skim’s code later, run `npm run build` again (or use `npm run watch` during development — it rebuilds when files change).

**If `dist/` is missing or out of date**, the loaded extension will not work correctly, so always build before loading or after pulling updates.

### 4. Load Skim in Chrome (or another Chromium browser)

1. Open **Google Chrome** (or a Chromium-based browser that supports Manifest V3 extensions and the side panel, such as Microsoft Edge in many setups).
2. Go to the extensions page:
   - **Chrome:** paste `chrome://extensions` into the address bar and press Enter.
   - **Edge:** paste `edge://extensions`.
3. Turn on **Developer mode** (usually a toggle in the top-right or in a menu).
4. Click **Load unpacked** (or **Load unpacked extension**).
5. In the file picker, select the **`extension`** folder inside your Skim project — the folder that **contains `manifest.json`**, not the repository root.

After loading, you should see **Skim** in your extensions list. Pin it to the toolbar if you like (puzzle icon → pin Skim).

### 5. Add your OpenAI API key

Skim needs an API key from OpenAI with access to **chat completions** and **embeddings**.

1. Open [OpenAI’s API keys page](https://platform.openai.com/api-keys) (log in if asked) and create a key, or copy an existing one.
2. In the browser, open Skim’s **Options**:
   - Click the **extensions** puzzle icon → find **Skim** → **Options** (wording may vary slightly by browser),  
   - or right-click the Skim toolbar icon and choose **Options** if that menu appears.
3. Paste your key into **OpenAI API key** and click **Save**. The key stays in this browser only.

### 6. Use Skim on a page

1. Open a **long article**, **documentation page**, or a **`.pdf` URL** in a normal tab (not a `chrome://` page).
2. Click the **Skim** icon in the toolbar to open the **side panel**.
3. In the side panel, use **Capture this page** so Skim reads the current tab’s content into a session.
4. Enter your **reading goal** or a **question**. Skim answers from the captured text and shows quotes where it can.

If you switch to another tab or navigate away, Skim clears the session for that capture so you are not accidentally mixing pages. Use **New session** when you want to start fresh on purpose.

---

## Development

- **`npm run build`** — Bundles `extension/src/*` into `extension/dist/` (required after code changes before reloading the extension in the browser).
- **`npm run watch`** — Rebuilds automatically when files change.

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
