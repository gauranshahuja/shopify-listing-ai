"use strict";

const storeInput = document.getElementById("store");
const collectionSelect = document.getElementById("collection");
const reloadBtn = document.getElementById("reload");
const scrapeBtn = document.getElementById("scrape");
const queueBtn = document.getElementById("queueBtn");
const deepCb = document.getElementById("deep");
const enrichCb = document.getElementById("enrich");
const statusEl = document.getElementById("status");
const progressEl = document.getElementById("progress");

const loginCard = document.getElementById("loginCard");
const userbar = document.getElementById("userbar");
const userEmailEl = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginMsg = document.getElementById("loginMsg");

let busy = false;

function setStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = type || "";
}

function normaliseOrigin(raw) {
  let v = (raw || "").trim();
  if (!v) throw new Error("Enter a store URL.");
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  return new URL(v).origin;
}

async function loadCollections() {
  collectionSelect.innerHTML = '<option value="">All products (whole store)</option>';
  let origin;
  try { origin = normaliseOrigin(storeInput.value); } catch (_) { return; }
  const limit = 250;
  try {
    for (let page = 1; page <= 20; page++) {
      const res = await fetch(`${origin}/collections.json?limit=${limit}&page=${page}`, { credentials: "omit" });
      if (!res.ok) break;
      const data = await res.json();
      const cols = (data && data.collections) || [];
      if (cols.length === 0) break;
      for (const c of cols) {
        const opt = document.createElement("option");
        opt.value = c.handle;
        const count = c.products_count != null ? ` (${c.products_count})` : "";
        opt.textContent = `${c.title}${count}`;
        collectionSelect.appendChild(opt);
      }
      if (cols.length < limit) break;
    }
  } catch (_) {  }
}

async function fetchAllProducts(baseUrl, onPage) {
  const all = [];
  const limit = 250;
  const maxPages = 250;
  for (let page = 1; page <= maxPages; page++) {
    const url = `${baseUrl}?limit=${limit}&page=${page}`;
    let res;
    try { res = await fetch(url, { credentials: "omit" }); }
    catch (e) { throw new Error("Network error reaching the store. Check the URL."); }
    if (res.status === 404) throw new Error("No public products.json here (store or collection not found).");
    if (!res.ok) throw new Error(`Store returned HTTP ${res.status}.`);
    let data;
    try { data = await res.json(); }
    catch (e) { throw new Error("Response wasn't JSON — is this a Shopify store?"); }
    const products = (data && data.products) || [];
    if (products.length === 0) break;
    all.push(...products);
    if (onPage) onPage(page, all.length);
    if (products.length < limit) break;
  }
  return all;
}

async function deepFetch(origin, products, onProgress) {
  const concurrency = 5;
  let index = 0, done = 0;
  async function worker() {
    while (index < products.length) {
      const p = products[index++];
      try {
        const res = await fetch(`${origin}/products/${p.handle}.js`, { credentials: "omit" });
        if (res.ok) {
          const full = await res.json();
          const byId = {};
          for (const v of full.variants || []) byId[v.id] = v;
          for (const v of p.variants || []) {
            const f = byId[v.id];
            if (!f) continue;
            if (f.barcode != null && f.barcode !== "") v.barcode = f.barcode;
            if (typeof f.inventory_quantity === "number") v.inventory_quantity = f.inventory_quantity;
            if (typeof f.available === "boolean") v.available = f.available;
          }
        }
      } catch (_) {  }
      done++;
      if (onProgress) onProgress(done, products.length);
    }
  }
  const workers = [];
  for (let i = 0; i < concurrency; i++) workers.push(worker());
  await Promise.all(workers);
}

async function run() {
  if (busy) { setStatus("A process is already running — please wait…", "error"); return; }
  busy = true;
  scrapeBtn.disabled = true;
  reloadBtn.disabled = true;
  progressEl.hidden = false;
  progressEl.removeAttribute("value");
  setStatus("⏳ Connecting to store…");
  try {
    const origin = normaliseOrigin(storeInput.value);
    const host = new URL(origin).hostname;
    const collection = collectionSelect.value;
    const base = collection
      ? `${origin}/collections/${collection}/products.json`
      : `${origin}/products.json`;

    const products = await fetchAllProducts(base, (page, total) => {
      setStatus(`Fetched ${total} products (page ${page})…`);
    });
    if (products.length === 0) { setStatus("No products found for this scope.", "error"); return; }

    if (deepCb.checked) {
      progressEl.removeAttribute("value");
      await deepFetch(origin, products, (done, total) => {
        progressEl.max = total; progressEl.value = done;
        setStatus(`Deep fetch: ${done}/${total} products…`);
      });
    }

    setStatus(`⏳ Sending ${products.length} products to Listify… building CSV (AI + pricing may take a few minutes). Please don't close this popup.`);
    progressEl.removeAttribute("value");

    const stamp = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const scopeTag = collection ? `_${collection}` : "";
    const result = await CE.build(products, {
      fileName: `${host}${scopeTag}_${stamp}.csv`,
      source: "shopify-extension",
      enrich: enrichCb.checked,
    });

    CE.downloadCsv(result.csv, result.fileName);
    const ai = result.aiConfigured
      ? `AI: ${result.enrichedCount} enriched`
      : "AI: not configured (content fields blank)";
    const review = result.needsReviewCount
      ? `\n⚠ ${result.needsReviewCount} need review (missing price/weight) — saved as draft.`
      : "";
    setStatus(
      `Done ✓  ${result.summary.product_count} products, ${result.summary.variant_count} variants.\n${ai}.${review}\nCSV downloaded. Also saved to History — re-downloadable for 4 hours (even after closing this).`,
      "ok"
    );
  } catch (err) {
    setStatus("Error: " + (err && err.message ? err.message : String(err)), "error");
  } finally {
    busy = false;
    scrapeBtn.disabled = false;
    reloadBtn.disabled = false;
    progressEl.hidden = true;
  }
}

function showSignedIn(email) {
  userEmailEl.textContent = email;
  userbar.classList.remove("hidden");
  loginCard.classList.add("hidden");
  scrapeBtn.disabled = false;
}
function showSignedOut() {
  userbar.classList.add("hidden");
  loginCard.classList.remove("hidden");
  scrapeBtn.disabled = true;
}

async function refreshAuthUI() {
  const email = await CE.currentEmail();
  if (email) showSignedIn(email); else showSignedOut();
  return email;
}

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const pass = passwordInput.value;
  if (!email || !pass) { loginMsg.textContent = "Enter email and password."; loginMsg.className = "error"; return; }
  try {
    loginBtn.disabled = true;
    loginMsg.className = ""; loginMsg.textContent = "Signing in…";
    await CE.login(email, pass);
    passwordInput.value = "";
    loginMsg.textContent = "";
    await refreshAuthUI();
  } catch (err) {
    loginMsg.textContent = err.message || "Login failed.";
    loginMsg.className = "error";
  } finally {
    loginBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  await CE.logout();
  await refreshAuthUI();
});

passwordInput.addEventListener("keydown", (e) => { if (e.key === "Enter") loginBtn.click(); });

async function queueInBackground() {
  let origin;
  try { origin = normaliseOrigin(storeInput.value); } catch (e) { setStatus("Enter a store URL first.", "error"); return; }
  const host = new URL(origin).hostname;
  queueBtn.disabled = true;
  setStatus(`Queuing ${host} on the server…`);
  try {
    await CE.enqueueJob(host, { allPages: true, enrich: enrichCb.checked });
    setStatus(`Queued ✓  ${host} is processing on the server. You can close this — the CSV will appear in History (downloadable for 4 hours).`, "ok");
  } catch (err) {
    setStatus("Error: " + (err.message || err), "error");
  } finally {
    queueBtn.disabled = false;
  }
}

scrapeBtn.addEventListener("click", run);
queueBtn.addEventListener("click", queueInBackground);
reloadBtn.addEventListener("click", loadCollections);
storeInput.addEventListener("change", loadCollections);

(async function init() {

  const email = await refreshAuthUI();
  if (email) emailInput.value = email;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    try {
      const url = tabs && tabs[0] && tabs[0].url;
      if (url && /^https?:/.test(url)) {
        storeInput.value = new URL(url).origin;
        loadCollections();
      }
    } catch (_) {  }
  });
})();

