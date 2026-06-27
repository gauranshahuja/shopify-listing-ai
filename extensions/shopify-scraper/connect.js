"use strict";

const CE_DEFAULTS = {
  apiBase: "",
  fbKey: "",
};

const CE = {

  async getConfig() {

    return { apiBase: CE_DEFAULTS.apiBase, fbKey: CE_DEFAULTS.fbKey };
  },

  async _storedToken() {
    const d = await chrome.storage.local.get(["ce_idToken", "ce_tokenExp"]);
    if (d.ce_idToken && d.ce_tokenExp && Date.now() < d.ce_tokenExp - 60_000) {
      return d.ce_idToken;
    }
    return null;
  },

  async login(email, password) {
    const { fbKey } = await this.getConfig();
    if (!fbKey) throw new Error("Set the Firebase Web API key in Settings first.");
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(fbKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = data && data.error && data.error.message;
      throw new Error("Login failed: " + (code || res.status));
    }
    const expiresInMs = (parseInt(data.expiresIn, 10) || 3600) * 1000;
    await chrome.storage.local.set({
      ce_idToken: data.idToken,
      ce_tokenExp: Date.now() + expiresInMs,
      ce_email: email,
    });
    return data.idToken;
  },

  async logout() {
    await chrome.storage.local.remove(["ce_idToken", "ce_tokenExp", "ce_email"]);
  },

  async currentEmail() {
    const d = await chrome.storage.local.get(["ce_email", "ce_idToken", "ce_tokenExp"]);
    if (d.ce_idToken && d.ce_tokenExp && Date.now() < d.ce_tokenExp - 60_000) return d.ce_email || "";
    return "";
  },

  async build(products, opts = {}) {
    const { apiBase } = await this.getConfig();
    if (!apiBase) throw new Error("Set the Listify API URL in Settings first.");
    let token = await this._storedToken();
    if (!token) throw new Error("Not signed in. Open Settings and sign in.");

    const res = await fetch(`${apiBase}/api/shopify/build`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        products,
        fileName: opts.fileName,
        source: opts.source || "extension",
        enrich: opts.enrich !== false,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Build failed (HTTP ${res.status})`);
    return data;
  },

  async enqueueJob(host, opts = {}) {
    const { apiBase } = await this.getConfig();
    let token = await this._storedToken();
    if (!token) throw new Error("Not signed in.");
    const res = await fetch(`${apiBase}/api/shopify/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ host, allPages: opts.allPages !== false, enrich: opts.enrich !== false }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Queue failed (HTTP ${res.status})`);
    return data;
  },

  downloadCsv(csv, filename) {
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "ready-to-deploy.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
};

window.CE = CE;

