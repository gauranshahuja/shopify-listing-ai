# Listify — Browser Extensions

Two Chrome (Manifest V3) extensions that scrape product data and send it
straight to your Listify backend, which builds a **ready-to-deploy
Shopify CSV** (AI content via Gemini, Shopify taxonomy category/type, and the
temp pricing formula).

| Extension | Scrapes | Output |
|---|---|---|
| **shopify-scraper** | Any Shopify store's public `/products.json` (whole store or one collection) | Ready-to-deploy CSV |
| **amazon-scraper** | The Amazon product page you're currently viewing | Ready-to-deploy CSV |

Both POST to the backend's `POST /api/shopify/build` with a Firebase ID token.

## How it fits together

```
Extension  ──(raw products JSON + Bearer token)──►  /api/shopify/build
                                                          │
                                          Gemini (Body/SEO/Alt/Category/Type)
                                          Taxonomy lookup (category → type)
                                          Pricing formula (cost+weight → USD)
                                          Review gate (missing price/weight → draft)
                                                          │
                                                  ready-to-deploy.csv  ◄── downloaded
```

The **scraped price is treated as the cost (INR)**. The tool computes the USD
storefront price with:

```
Temp Price        = ROUNDUP((cost_INR + weight_g + 100) × 1.5 / 94) + 0.99
Temp Compare Price = same formula applied to the scraped compare-at / list price
```

If price **or** weight is missing, the product is tagged `needs-review` and set
to `draft` so a human verifies it before it goes live.

## Install (both extensions)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. **Load unpacked** → select `extensions/shopify-scraper` (repeat for `extensions/amazon-scraper`)

## First-time connection setup

Open either extension's popup → **⚙ Connection**:

1. **Listify API URL** — your backend base URL
   (e.g. `http://localhost:8080` in dev, or your Cloud Run URL).
2. **Firebase Web API Key** — from Firebase Console → Project Settings →
   General → Your apps → Web app (`apiKey`, starts with `AIza…`). This is the
   public web key, safe to paste.
3. Click **Save connection**.
4. Enter the **email + password** of an authorised Listify user and
   click **Sign in**. The ID token is cached and auto-used for `/build`.

> The token is stored in `chrome.storage.local` and refreshed on expiry by
> signing in again. No password is stored.

## Using shopify-scraper

1. Open any Shopify store in a tab (the popup pre-fills the URL).
2. Pick **Scope** (whole store or a collection).
3. Optional: **Deep fetch** (barcode/stock where exposed), **AI enrich** (on by default).
4. **Scrape → Listify** → the CSV downloads automatically.

## Using amazon-scraper

1. Open an Amazon **product page**.
2. Click **Scrape this page** → review the preview (title / cost / weight / images).
3. **Send → Listify** → the CSV downloads.

Amazon's DOM varies; selectors are best-effort. If price or weight reads as
"missing", the tool still produces the row but flags it for review.

## Notes

- The backend must allow the extension origin via `CORS_ORIGINS`, or run the
  backend with CORS open in dev. Chrome extension fetches send an
  `chrome-extension://…` origin; add it (or `*` in dev only).
- AI fields are only populated when `GEMINI_API_KEY` is set on the backend.
  Without it the build still succeeds — those columns are just blank.
