# Listify — Setup Guide


## Prerequisites

- **Node.js 20 or higher** ([download](https://nodejs.org/))
- **Git** (optional, only if you'll use version control)
- A **Firebase project** (free tier works) — for authentication

## 1. Install dependencies

```powershell
# Backend
cd backend
npm install

# Frontend (in a new terminal)
cd frontend
npm install
```

## 2. Configure environment

### Backend — create `backend/.env`

Copy `backend/.env.example` to `backend/.env` and fill in:

```ini
NODE_ENV=development
PORT=8080
CORS_ORIGINS=http://localhost:5173

# Firebase Auth (from Firebase Console → Project Settings → Service Accounts)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}   # paste full JSON on one line
ADMIN_EMAIL=your-email@example.com

# SQLite (auto-created on first run)
DB_PATH=./data/catalog.db

# Shopify tuning (optional — defaults shown)
SHOPIFY_MAX_PAGES=200
SHOPIFY_PAGE_DELAY_MS=250

```

**How to get `FIREBASE_SERVICE_ACCOUNT_JSON`:**
1. Open Firebase Console → your project → Project Settings → Service Accounts
2. Click "Generate new private key" → downloads a JSON file
3. Open the JSON file, copy the entire contents
4. Paste it as a **single line** as the value of `FIREBASE_SERVICE_ACCOUNT_JSON`

### Frontend — create `frontend/.env`

```ini
VITE_API_BASE_URL=http://localhost:8080

# Firebase Web SDK config (from Firebase Console → Project Settings → General → Your apps → Web app)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Firebase Web SDK keys are **not secrets** — they identify the project to the browser and are safe to commit.

## 3. Set up Firebase Auth

1. In Firebase Console → Authentication → Sign-in method
2. Enable **Email/Password** provider
3. Go to Authentication → Users → Add user
4. Add a user with the **same email** as `ADMIN_EMAIL` in `backend/.env` — this user becomes the admin
5. Note the password — you'll use it to log in

## 4. Run locally

```powershell
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open http://localhost:5173 — sign in with the admin email/password from step 3.

## 5. Optional — Load mapping rules

Mapping rules teach the engine how to categorise/tag products. If you have a reference CSV with mappings:

1. Log in as admin
2. Go to **Mappings** mode
3. Drop your reference CSV (must have a `title` column; optional: `handle, brand, type, category, tags, keywords`)
4. Click **Import rules**

## Three modes

| Mode | What it does |
|------|--------------|
| **CSV → CSV** | Upload any product CSV. Mapping rules fill category/type/tags. Outputs a Shopify import CSV. |
| **Mappings** | Admin-only. Import reference CSVs to train category/type/tag rules. |

## Deployment (optional)

The project ships with a `backend/Dockerfile` (Node 20, slim image). It deploys cleanly to:
- **Google Cloud Run** (recommended, scales to zero — ~free for low traffic)
- Any container host: Render, Fly.io, Railway, AWS App Runner

Frontend is a static Vite build (`npm run build` → `frontend/dist/`) — deploy to:
- Firebase Hosting (recommended — already configured in `firebase.json`)
- Vercel, Netlify, Cloudflare Pages

## Troubleshooting

**"Missing FIREBASE_PROJECT_ID" on backend boot**
→ `.env` not loaded. Make sure file is at `backend/.env`, not in repo root.

**CORS error in browser**
→ Set `CORS_ORIGINS=http://localhost:5173` in `backend/.env`.

**`better-sqlite3` fails to build**
→ Install Visual Studio Build Tools (Windows) or `build-essential python3` (Linux). Then `npm rebuild better-sqlite3`.

**AI Enrich button does nothing**
