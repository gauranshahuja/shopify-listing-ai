"use strict";

const API_BASE = "YOUR_BACKEND_URL";

async function storedToken() {
  const d = await chrome.storage.local.get(["ce_idToken", "ce_tokenExp"]);
  if (d.ce_idToken && d.ce_tokenExp && Date.now() < d.ce_tokenExp - 60000) return d.ce_idToken;
  return null;
}

async function processBatch(products, opts) {
  const token = await storedToken();
  if (!token) {
    await chrome.storage.local.set({ amz_bg: { status: "error", error: "Not signed in.", at: Date.now() } });
    return;
  }
  await chrome.storage.local.set({ amz_bg: { status: "running", count: products.length, at: Date.now() } });
  try {
    const res = await fetch(`${API_BASE}/api/shopify/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({
        products,
        fileName: opts.fileName,
        source: "amazon-extension",
        enrich: opts.enrich !== false,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Build failed (HTTP ${res.status})`);

    await chrome.storage.local.set({
      amz_bg: { status: "done", count: data?.summary?.product_count || products.length, fileName: data.fileName, at: Date.now() },
      amz_queue: [],
    });
    try {
      chrome.notifications?.create({
        type: "basic", iconUrl: "icon128.png",
        title: "Listify — Amazon",
        message: `Done ✓ ${data?.summary?.product_count || products.length} products. CSV saved to History (4h download).`,
      });
    } catch (_) {}
  } catch (err) {
    await chrome.storage.local.set({ amz_bg: { status: "error", error: err.message, at: Date.now() } });
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "CE_PROCESS_BATCH") {

    processBatch(msg.products || [], msg.opts || {});
    sendResponse({ ok: true, accepted: (msg.products || []).length });
    return true;
  }
});

