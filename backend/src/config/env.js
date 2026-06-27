import 'dotenv/config'

function getStr(key, def = '') { return (process.env[key] || def).trim() }
function getInt(key, def) { const n = parseInt(process.env[key], 10); return Number.isFinite(n) ? n : def }

export const env = {
  NODE_ENV: getStr('NODE_ENV', 'development'),
  PORT: getInt('PORT', 8080),
  CORS_ORIGINS: getStr('CORS_ORIGINS', ''),

  FIREBASE_PROJECT_ID: getStr('FIREBASE_PROJECT_ID'),
  FIREBASE_SERVICE_ACCOUNT_JSON: getStr('FIREBASE_SERVICE_ACCOUNT_JSON'),
  ADMIN_EMAIL: getStr('ADMIN_EMAIL', '').toLowerCase(),

  DB_PATH: getStr('DB_PATH', './data/catalog.db'),

  DB_JOURNAL_MODE: getStr('DB_JOURNAL_MODE', 'WAL'),

  SHOPIFY_MAX_PAGES: getInt('SHOPIFY_MAX_PAGES', 200),
  SHOPIFY_PAGE_DELAY_MS: getInt('SHOPIFY_PAGE_DELAY_MS', 250),

  GEMINI_API_KEY: getStr('GEMINI_API_KEY'),

  GEMINI_MODEL: getStr('GEMINI_MODEL', 'gemini-2.5-flash-lite'),

  GEMINI_RPM: getInt('GEMINI_RPM', 300),
}

export function validateEnv() {
  const errors = []
  if (!env.FIREBASE_PROJECT_ID) errors.push('Missing: FIREBASE_PROJECT_ID')
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    errors.push('Note: FIREBASE_SERVICE_ACCOUNT_JSON not set — using Application Default Credentials (Cloud Run service account).')
  }
  return errors
}

