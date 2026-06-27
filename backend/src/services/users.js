import { getDatabase } from '../db/client.js'
import { env } from '../config/env.js'

export class UserService {
  constructor() { this.db = getDatabase() }

  syncFromFirebase(decodedToken) {
    const email = (decodedToken.email || '').toLowerCase().trim()
    if (!email) throw new Error('Token has no email')

    const uid = decodedToken.uid
    const now = new Date().toISOString()
    const isBootstrapAdmin = email === env.ADMIN_EMAIL

    let user = this.db.prepare('SELECT * FROM users WHERE firebase_uid = ?').get(uid)
    if (user) {
      this.db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, user.id)
      return user
    }

    user = this.db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email)
    if (user) {
      this.db.prepare(`
        UPDATE users
        SET firebase_uid = ?, last_login_at = ?, role = CASE WHEN ? = 1 THEN 'admin' ELSE role END
        WHERE id = ?
      `).run(uid, now, isBootstrapAdmin ? 1 : 0, user.id)
      return this.findById(user.id)
    }

    if (isBootstrapAdmin) {
      const r = this.db.prepare(`
        INSERT INTO users (firebase_uid, email, full_name, role, is_active, last_login_at)
        VALUES (?, ?, ?, 'admin', 1, ?)
      `).run(uid, email, decodedToken.name || 'Admin', now)
      return this.findById(r.lastInsertRowid)
    }

    throw Object.assign(new Error('Email not authorized. Contact admin.'), { status: 403 })
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  }

  findByEmail(email) {
    return this.db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email.toLowerCase())
  }

  listAll() {
    return this.db.prepare('SELECT * FROM users ORDER BY created_at DESC').all()
  }

  preCreate({ email, fullName = '', role = 'user' }) {
    email = email.toLowerCase().trim()
    const existing = this.findByEmail(email)
    if (existing) throw new Error('User with this email already exists')
    const placeholder = `pending:${email}:${Date.now()}`
    const r = this.db.prepare(`
      INSERT INTO users (firebase_uid, email, full_name, role, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).run(placeholder, email, fullName, role)
    return this.findById(r.lastInsertRowid)
  }

  setRole(id, role) {
    this.db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id)
    return this.findById(id)
  }

  setActive(id, isActive) {
    this.db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id)
    return this.findById(id)
  }

  delete(id) {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id)
  }
}

