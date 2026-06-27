import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDatabase } from './client.js'
import { logger } from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function runMigrations() {
  const db = getDatabase()
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  )`)

  const dir = path.join(__dirname, 'migrations')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  const applied = new Set(db.prepare('SELECT name FROM _migrations').all().map((r) => r.name))

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    logger.info(`Applying migration: ${file}`)
    db.transaction(() => {
      db.exec(sql)
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file)
    })()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
  logger.info('Migrations done')
  process.exit(0)
}

