import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchUsers, createUser, updateUser, deleteUser } from '../../api/admin.js'
import { useAuth } from '../../contexts/AuthContext.jsx'

const initialForm = () => ({
  email: '', fullName: '', password: '', role: 'shopify', createInFirebase: true,
})

export function SettingsScreen() {
  const { user: currentUser, isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchUsers()
      setUsers(data.users || [])
    } catch (err) {
      setError(err?.message || 'Failed to load users')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (isAdmin) load() }, [isAdmin, load])

  if (!isAdmin) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pb-8 pt-1 sm:px-8 lg:px-10">
        <div className="rounded-[28px] border border-white/10 bg-black/28 p-5 backdrop-blur-xl">
          <p className="text-white/60">Admin access required.</p>
        </div>
      </motion.div>
    )
  }

  async function handleAdd() {
    if (!form.email.trim()) { setAddError('Email is required'); return }
    if (form.createInFirebase && (!form.password || form.password.length < 6)) {
      setAddError('Password must be at least 6 characters')
      return
    }
    setAddLoading(true)
    setAddError('')
    try {
      const data = await createUser({
        email: form.email.trim(),
        fullName: form.fullName.trim() || undefined,
        role: form.role,
        password: form.createInFirebase ? form.password : undefined,
        createInFirebase: form.createInFirebase,
      })
      if (data.firebase && !data.firebase.created && data.firebase.error) {
        setAddError(`Local row created, but Firebase: ${data.firebase.error}`)
      }
      setForm(initialForm())
      setShowAddForm(false)
      load()
    } catch (err) {
      setAddError(err?.message || 'Failed to create user')
    } finally { setAddLoading(false) }
  }

  async function handleToggleActive(u) {
    try { await updateUser(u.id, { isActive: !u.is_active }); load() }
    catch (err) { alert(err?.message || 'Update failed') }
  }

  async function handleSetRole(u, role) {
    try { await updateUser(u.id, { role }); load() }
    catch (err) { alert(err?.message || 'Update failed') }
  }

  async function handleRemove(u) {
    if (!confirm(`Delete user "${u.email}"?`)) return
    try { await deleteUser(u.id); load() }
    catch (err) { alert(err?.message || 'Delete failed') }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.4 }}
      className="relative px-5 pb-6 pt-1 sm:px-8 sm:pb-8 lg:px-10 lg:pb-10"
    >
      <div className="rounded-[28px] border border-white/10 bg-black/28 p-5 backdrop-blur-xl sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-white/42">Settings</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">User Management</h2>
            <p className="mt-3 text-sm leading-6 text-white/62">
              Add team members. They're created in Firebase Auth and the local DB at once.
            </p>
          </div>
          <button
            onClick={() => { setShowAddForm((v) => !v); setAddError('') }}
            className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78 transition hover:bg-white/10 hover:text-white"
          >
            {showAddForm ? 'Cancel' : '+ Add User'}
          </button>
        </div>

        {showAddForm && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="mb-4 text-sm font-medium text-white">New User</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
                placeholder="email@example.com" type="email"
                value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              <input className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
                placeholder="Full name (optional)"
                value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
              <input type="password" disabled={!form.createInFirebase}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 disabled:opacity-50"
                placeholder="Initial password (min 6 chars)"
                value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
              <select className="rounded-xl border border-white/10 bg-[#111] px-4 py-2 text-sm text-white"
                value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
                <option value="shopify">Shopify user</option>
                <option value="amazon">Amazon user</option>
                <option value="user">Both (Shopify + Amazon)</option>
                <option value="owner">Owner (full access)</option>
              </select>
            </div>
            <label className="mt-3 inline-flex items-center gap-2 text-xs text-white/60">
              <input type="checkbox" checked={form.createInFirebase}
                onChange={(e) => setForm((p) => ({ ...p, createInFirebase: e.target.checked }))} />
              Also create in Firebase Auth (recommended)
            </label>
            <div className="mt-4 flex items-center justify-end gap-2">
              {addError && <p className="mr-auto text-xs text-red-300">{addError}</p>}
              <button onClick={handleAdd} disabled={addLoading}
                className="rounded-xl bg-lime-500/90 px-5 py-2 text-sm font-semibold text-black transition hover:bg-lime-400 disabled:opacity-50">
                {addLoading ? 'Adding…' : 'Create user'}
              </button>
            </div>
          </div>
        )}

        {loading && <div className="mt-6 text-sm text-white/70">Loading users…</div>}
        {error && <div className="mt-6 text-sm text-red-300">{error}</div>}

        {!loading && !error && (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
            <div className="grid min-w-[760px] grid-cols-[1.6fr_100px_120px_140px_1fr] gap-3 bg-white/[0.05] px-4 py-3 text-xs uppercase tracking-[0.22em] text-white/42">
              <span>Email</span><span>Role</span><span>Status</span><span>Last Login</span><span>Actions</span>
            </div>
            <div className="divide-y divide-white/10">
              {users.map((u) => {
                const isPending = u.firebase_uid?.startsWith('pending:')
                const isMe = u.id === currentUser?.id
                return (
                  <div key={u.id} className="grid min-w-[760px] grid-cols-[1.6fr_100px_120px_140px_1fr] items-center gap-3 px-4 py-3 text-sm text-white/78">
                    <div className="min-w-0">
                      <p className="truncate">{u.email}</p>
                      {u.full_name && <p className="text-xs text-white/45">{u.full_name}</p>}
                      {isPending && <p className="text-[10px] text-amber-300/80">Pending first sign-in</p>}
                    </div>
                    <select value={u.role} onChange={(e) => handleSetRole(u, e.target.value)} disabled={isMe}
                      className="rounded-md border border-white/10 bg-[#111] px-2 py-1 text-xs text-white disabled:opacity-60">
                      <option value="shopify">shopify</option>
                      <option value="amazon">amazon</option>
                      <option value="user">both</option>
                      <option value="owner">owner</option>
                      {/* legacy value still selectable if a row has it */}
                      {u.role === 'admin' && <option value="admin">admin</option>}
                    </select>
                    <button onClick={() => handleToggleActive(u)} disabled={isMe}
                      className={`rounded-md border px-2 py-1 text-xs transition disabled:opacity-50 ${
                        u.is_active ? 'border-emerald-400/30 bg-emerald-500/[0.10] text-emerald-200' : 'border-white/10 bg-white/5 text-white/60'
                      }`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </button>
                    <span className="truncate text-xs text-white/45">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '—'}
                    </span>
                    <div className="flex gap-2">
                      {isMe ? <span className="text-xs text-white/30">You</span>
                            : <button onClick={() => handleRemove(u)}
                                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-300 transition hover:bg-red-500/20">
                                Delete
                              </button>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

