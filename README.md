# Listify — Shopify Harvester

Sign in, scrape products (in-app by Shopify URL, or via the two browser
extensions), and download a **ready-to-deploy Shopify-import CSV**. The build
pipeline runs:

- **Gemini AI** → Body (HTML), SEO Description, Image Alt Text, and a
  taxonomy-validated Product Category + Type (configurable via `GEMINI_API_KEY`;
  fields are left blank if not set).
- **Shopify Product Taxonomy** → category/type chosen from the official
  `categories.txt` dataset (bundled at `backend/data/shopify-categories.txt`).
- **Pricing formula** → `Temp Price` / `Temp Compare At Price` from the scraped
  INR cost + weight: `ROUNDUP((cost + weight_g + 100) × 1.5 / 94) + 0.99`.
- **Review gate** → products missing price/weight are tagged `needs-review` and
  set to `draft` so a human verifies them before they go live.

The two browser extensions (`extensions/`) collect raw products and POST them to
`/api/shopify/build`; see [extensions/README.md](extensions/README.md).

## Architecture

| Layer | Stack |
|---|---|
| Backend | Node 20 + Express, deployed on **Cloud Run** |
| Auth | Firebase Auth (admin-invite only — no public signup) |
| Database | SQLite via `better-sqlite3` (WAL mode) |
| Frontend | React + Vite + Tailwind, deployed on **Firebase Hosting** |

## Features

- **Store harvest** — paginates `/products.json` up to 200 pages × 250 products (50k max)
- **Product harvest** — fetches a single product via `/products/<handle>.json`
- **Shopify-import CSV** — ready to upload directly to Shopify admin
- **Run history** — every harvest logged with product/variant/image counts
- **Admin invite** — only emails added via admin panel can sign up

## API

```
GET  /api/health                    — { ok, service, version, time, firebase }

POST /api/shopify/scrape            — full store harvest
  body: { host: "allbirds.com", allPages: true }
  resp: { ok, mode:"store", host, summary:{product_count,variant_count,image_count,vendor_count}, csv, fileName, durationMs }

POST /api/shopify/product           — single product
  body: { host: "allbirds.com", handle: "mens-tree-runners", enrich?: true }
  resp: { ok, mode:"product", host, handle, summary, enrichedCount, needsReviewCount, csv, fileName, durationMs }

POST /api/shopify/build             — ready-to-deploy CSV from raw products
  body: { products: [...], fileName?, enrich?: true, source? }
        (products come from the browser extensions — Shopify or normalised Amazon)
  resp: { ok, csv, fileName, summary, enrichedCount, failedCount, needsReviewCount, aiConfigured, durationMs }
```

All `/api/shopify/*` endpoints require a Firebase ID token in `Authorization: Bearer <token>`.

## Local development

### Backend

```bash
cd backend
cp .env.example .env          # fill in FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT_JSON, ADMIN_EMAIL
npm install
npm run dev
# → http://localhost:8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## Environment variables

See [backend/.env.example](backend/.env.example) for the full list. Required in production:

| Variable | Description |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Service account JSON (single line) |
| `ADMIN_EMAIL` | Email that gets admin role on first login |
| `CORS_ORIGINS` | Comma-separated allowed origins (**required in production**) |
| `DB_PATH` | SQLite file path — use `/tmp/catalog.db` on Cloud Run |

Optional Shopify tuning:

| Variable | Default | Description |
|---|---|---|
| `SHOPIFY_MAX_PAGES` | `200` | Max pages per store scrape |
| `SHOPIFY_PAGE_DELAY_MS` | `250` | Delay between page requests (ms) |

## Deploy

### Backend — Cloud Run

```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT/listify-engine-backend backend/
gcloud run deploy listify-engine-backend \
  --image gcr.io/YOUR_PROJECT/listify-engine-backend \
  --region asia-south1 \
  --set-env-vars FIREBASE_PROJECT_ID=...,CORS_ORIGINS=...,ADMIN_EMAIL=...,DB_PATH=/tmp/catalog.db
```

> **Note:** Cloud Run is ephemeral — SQLite history is lost on container restart. For durable history, mount a Cloud Storage FUSE volume or migrate to Cloud SQL.

### Frontend — Firebase Hosting

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

## Security notes

- `cleanHost()` in the harvester validates the hostname with a strict regex and blocks loopback/private IP addresses (SSRF mitigation).
- In production the server will refuse to start if `CORS_ORIGINS` is not set.
- Firebase service account JSON should be stored as a Cloud Run secret, not a plain env var.
