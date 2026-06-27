import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import { fetchHistory, clearMyHistory, downloadHistoryCsv } from '../api/history.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const MODE_LABELS = {
  store: 'Store',
  product: 'Product',
  extension: 'Shopify ext',
  amazon: 'Amazon ext',
  csv: 'CSV',
}

function formatIST(ts) {
  if (!ts) return '—'

  let s = String(ts)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) s = s.replace(' ', 'T') + 'Z'
  const d = new Date(s)
  if (isNaN(d.getTime())) return ts
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }) + ' IST'
}

export function HistoryScreen() {
  const { isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scope, setScope] = useState('me')
  const [clearing, setClearing] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)

  async function handleDownload(id) {
    setDownloadingId(id)
    setError('')
    try { await downloadHistoryCsv(id) }
    catch (err) { setError(err?.message || 'Download failed'); load() }
    finally { setDownloadingId(null) }
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchHistory({ limit: 200, scope: scope === 'all' ? 'all' : undefined })
      setItems(data.items || [])
    } catch (err) {
      setError(err?.message || 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [scope])

  async function handleClear() {
    if (!confirm('Clear your history?')) return
    setClearing(true)
    try {
      await clearMyHistory()
      await load()
    } catch (err) {
      setError(err?.message || 'Clear failed')
    } finally {
      setClearing(false)
    }
  }

  const gridCols = 'grid-cols-[1.1fr_1.2fr_100px_80px_1fr_120px]'
  const minWidth = 'min-w-[720px]'

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.4 }}
      className="relative px-5 pb-6 pt-1 sm:px-8 sm:pb-8 lg:px-10 lg:pb-10"
    >
      <div className="rounded-[28px] border border-white/10 bg-black/28 p-5 backdrop-blur-xl sm:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-white/42">History</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Harvest history</h2>
            <p className="mt-3 text-sm leading-6 text-white/62">
              Your harvests — user, brand, product count &amp; date. The CSV can be re-downloaded for 4 hours after a run.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <select
                value={scope} onChange={(e) => setScope(e.target.value)}
                className="rounded-full border border-white/10 bg-[#111] px-3 py-1.5 text-xs text-white"
              >
                <option value="me">My runs</option>
                <option value="all">All users (admin)</option>
              </select>
            )}
            <button
              onClick={handleClear} disabled={clearing}
              className="rounded-full border border-red-400/20 bg-red-500/[0.08] px-3 py-1.5 text-xs text-red-200 transition hover:bg-red-500/[0.14] disabled:opacity-50"
            >
              {clearing ? 'Clearing…' : 'Clear my history'}
            </button>
          </div>
        </div>

        {loading && <div className="mt-6 text-sm text-white/70">Loading…</div>}
        {error && <div className="mt-6 text-sm text-red-200">{error}</div>}
        {!loading && !error && !items.length && (
          <div className="mt-6 text-sm text-white/70">No history yet. Run a harvest to see results here.</div>
        )}

        {!!items.length && (
          <div className="mt-6 overflow-x-auto rounded-[22px] border border-white/10">
            {}
            <div className={`grid ${minWidth} gap-3 bg-white/[0.05] px-4 py-3 text-xs uppercase tracking-[0.22em] text-white/42 ${gridCols}`}>
              <span>User</span>
              <span>Brand</span>
              <span>Mode</span>
              <span>Products</span>
              <span>Date &amp; time</span>
              <span>Download</span>
            </div>

            <div className="divide-y divide-white/10">
              {items.map((it) => (
                <div
                  key={it.id}
                  className={`grid ${minWidth} items-center gap-3 px-4 py-3 text-sm text-white/78 ${gridCols}`}
                >
                  <span className="truncate text-white/55">{it.user_email || '—'}</span>
                  <span className="truncate font-medium text-white/85">{it.host || '—'}</span>
                  <span className="text-white/60 text-xs">{MODE_LABELS[it.mode] || it.mode || '—'}</span>
                  <span className="font-medium">{it.product_count ?? 0}</span>
                  <span className="text-white/55">
                    {formatIST(it.created_at)}
                  </span>
                  <span>
                    {it.downloadable ? (
                      <button
                        onClick={() => handleDownload(it.id)}
                        disabled={downloadingId === it.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#84CC16]/40 bg-[#84CC16]/[0.12] px-3 py-1.5 text-xs font-medium text-[#bef264] transition hover:bg-[#84CC16]/[0.2] disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {downloadingId === it.id ? 'Downloading…' : 'CSV'}
                      </button>
                    ) : (
                      <span className="text-xs text-white/35">Expired</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

