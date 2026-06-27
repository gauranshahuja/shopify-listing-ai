"use strict";

const addBtn = document.getElementById("addBtn");
const processBtn = document.getElementById("processBtn");
const clearQueueBtn = document.getElementById("clearQueue");
const queueCountEl = document.getElementById("queueCount");
const enrichCb = document.getElementById("enrich");
const statusEl = document.getElementById("status");
const previewEl = document.getElementById("preview");
const progressEl = document.getElementById("progress");

const loginCard = document.getElementById("loginCard");
const userbar = document.getElementById("userbar");
const userEmailEl = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginMsg = document.getElementById("loginMsg");

const MAX_QUEUE = 150;
const ADD_COOLDOWN_MS = 20_000;
let queue = [];
let busy = false;
let cooldownTimer = null;

function setStatus(msg, type) { statusEl.textContent = msg; statusEl.className = type || ""; }

const addBtnLabel = "＋ Add this product";

function runCountdownUntil(until) {
  if (cooldownTimer) clearInterval(cooldownTimer);
  const tick = () => {
    const remaining = Math.ceil((until - Date.now()) / 1000);
    if (remaining <= 0) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
      addBtn.disabled = false;
      addBtn.textContent = addBtnLabel;
    } else {
      addBtn.disabled = true;
      addBtn.textContent = `Wait ${remaining}s…`;
    }
  };
  tick();
  cooldownTimer = setInterval(tick, 1000);
}

async function startAddCooldown() {
  const now = Date.now();
  await chrome.storage.local.set({ amz_lastAdd: now });
  runCountdownUntil(now + ADD_COOLDOWN_MS);
}

function resumeAddCooldown(lastAdd) {
  if (!lastAdd) return;
  const until = lastAdd + ADD_COOLDOWN_MS;
  if (until > Date.now()) runCountdownUntil(until);
}

async function loadQueue() {
  const d = await chrome.storage.local.get(["amz_queue"]);
  queue = Array.isArray(d.amz_queue) ? d.amz_queue : [];
  renderQueue();
}
async function saveQueue() {
  await chrome.storage.local.set({ amz_queue: queue });
  renderQueue();
}
function renderQueue() {
  queueCountEl.textContent = String(queue.length);
  processBtn.disabled = queue.length === 0;
  processBtn.textContent = queue.length
    ? `Process all ${queue.length} → one CSV`
    : "Process all → one CSV";
}

async function addCurrent() {
  if (busy) { setStatus("Processing in progress — please wait…", "error"); return; }

  const { amz_lastAdd } = await chrome.storage.local.get(["amz_lastAdd"]);
  const sinceLast = Date.now() - (amz_lastAdd || 0);
  if (sinceLast < ADD_COOLDOWN_MS) {
    const left = Math.ceil((ADD_COOLDOWN_MS - sinceLast) / 1000);
    setStatus(`Please wait ${left}s before adding the next product.`, "error");
    resumeAddCooldown(amz_lastAdd);
    return;
  }
  if (queue.length >= MAX_QUEUE) { setStatus(`Queue is full (${MAX_QUEUE} max). Process or clear first.`, "error"); return; }
  setStatus("Reading the product page…");
  previewEl.style.display = "none";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^https?:\/\/[^/]*amazon\./i.test(tab.url || "")) {
      throw new Error("Open an Amazon product page first.");
    }
    const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["scrape.js"] });
    const product = results && results[0] && results[0].result;
    if (!product || !product.title) throw new Error("Couldn't read this page — is it a product page?");

    if (queue.some((p) => p.handle === product.handle)) {
      setStatus("Already in the queue: " + product.title.slice(0, 50), "");
      return;
    }

    queue.push(product);
    await saveQueue();

    const v = product.variants[0] || {};
    const priceOk = v.price !== "" && v.price != null;
    const weightOk = v.grams !== "" && v.grams != null;
    previewEl.innerHTML =
      `<b>Added (#${queue.length}):</b> ${product.title}<br>` +
      `Cost (₹): ${priceOk ? v.price : '<span class="warn">missing</span>'} · ` +
      `MRP (₹): ${v.compare_at_price || "—"} · ` +
      `Weight: ${weightOk ? v.grams + " g" : '<span class="warn">missing</span>'} · ` +
      `Images: ${product.images.length}`;
    previewEl.style.display = "block";
    setStatus(`Added ✓  ${queue.length} product(s) collected. Wait 20s, then add the next.`, "ok");
    startAddCooldown();
  } catch (err) {
    setStatus("Error: " + (err.message || err), "error");
  }
}

async function processAll() {
  if (queue.length === 0) { setStatus("Queue is empty — add some products first.", "error"); return; }
  processBtn.disabled = true;

  const stamp = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  try {
    await chrome.runtime.sendMessage({
      type: "CE_PROCESS_BATCH",
      products: queue,
      opts: { fileName: `amazon_batch_${queue.length}items_${stamp}.csv`, enrich: enrichCb.checked },
    });
    setStatus(`Sent ✓  ${queue.length} products are processing in the background. You can CLOSE this popup — the CSV will be saved to History (downloadable for 4 hours) and you'll get a notification when it's ready.`, "ok");
  } catch (err) {
    setStatus("Error: " + (err.message || err), "error");
    processBtn.disabled = false;
  }
}

async function reflectBgStatus() {
  const d = await chrome.storage.local.get(["amz_bg"]);
  const bg = d.amz_bg;
  if (!bg) return;
  if (bg.status === "running") setStatus(`⏳ Background: processing ${bg.count} products… (you can close this)`, "");
  else if (bg.status === "done") setStatus(`Done ✓  ${bg.count} products built in the background. Check History for the CSV (4-hour download).`, "ok");
  else if (bg.status === "error") setStatus("Background error: " + (bg.error || "failed"), "error");
}

function showSignedIn(email) {
  userEmailEl.textContent = email;
  userbar.classList.remove("hidden");
  loginCard.classList.add("hidden");
  document.getElementById("scrapePanel").classList.remove("hidden");
  addBtn.disabled = false;
  renderQueue();
}
function showSignedOut() {
  userbar.classList.add("hidden");
  loginCard.classList.remove("hidden");
  document.getElementById("scrapePanel").classList.add("hidden");
  addBtn.disabled = true;
  processBtn.disabled = true;
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

addBtn.addEventListener("click", addCurrent);
processBtn.addEventListener("click", processAll);
clearQueueBtn.addEventListener("click", async () => {
  if (busy) return;
  queue = [];
  await saveQueue();
  previewEl.style.display = "none";
  setStatus("Queue cleared.", "");
});

(async function init() {
  await loadQueue();
  const email = await refreshAuthUI();
  if (email) emailInput.value = email;
  await reflectBgStatus();
  const { amz_lastAdd } = await chrome.storage.local.get(["amz_lastAdd"]);
  if (email) resumeAddCooldown(amz_lastAdd);
})();

