import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { env } from '../config/env.js'

let dbInstance = null

export function getDatabase() {
  if (dbInstance) return dbInstance
  const dbPath = path.resolve(env.DB_PATH)
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new Database(dbPath)

  const journalMode = (env.DB_JOURNAL_MODE || 'WAL').toUpperCase()
  db.pragma(`journal_mode = ${journalMode}`)
  db.pragma('foreign_keys = ON')
  dbInstance = db
  return db
}

