const form = document.getElementById("form");
const keyInput = document.getElementById("key");
const status = document.getElementById("status");

async function load() {
  const { openaiApiKey } = await chrome.storage.local.get("openaiApiKey");
  if (typeof openaiApiKey === "string" && openaiApiKey) {
    keyInput.value = openaiApiKey;
  }
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const v = keyInput.value.trim();
  await chrome.storage.local.set({ openaiApiKey: v });
  if (status) {
    status.hidden = false;
    setTimeout(() => {
      status.hidden = true;
    }, 2000);
  }
});

load();
