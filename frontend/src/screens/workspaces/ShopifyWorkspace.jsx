import React, { useState, useEffect, useRef } from 'react'
import { Loader2, Play, Globe2, FileText, Package, Layers, Image, Sparkles, AlertTriangle, ListPlus, Download, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { WorkspaceLayout, ResultPanel } from '../../components/layout/WorkspaceLayout.jsx'
import { WarningBox, DownloadButton } from '../../components/ui/index.jsx'
import { downloadCsv } from '../../api/client.js'
import { scrapeStore, scrapeProduct, enqueueJobs, fetchJobs } from '../../api/shopify.js'
import { downloadHistoryCsv } from '../../api/history.js'

function parseHost(input) {
  const trimmed = input.trim()
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return new URL(trimmed).hostname
    }
  } catch {}
  return trimmed.split('/')[0]
}

export function ShopifyWorkspace({ health }) {
  const [tab, setTab] = useState('brand')

  const [brandInput, setBrandInput] = useState('')
  const [allPages, setAllPages] = useState(true)
  const [enrich, setEnrich] = useState(true)
  const [pageInput, setPageInput] = useState('')

  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const [queueInput, setQueueInput] = useState('')
  const [jobs, setJobs] = useState([])
  const [queueBusy, setQueueBusy] = useState(false)
  const pollRef = useRef(null)

  function switchTab(t) { setTab(t); setResult(null); setError('') }

  async function loadJobs() {
    try { const d = await fetchJobs(); setJobs(d.jobs || []) } catch {}
  }
  useEffect(() => {
    if (tab !== 'queue') { if (pollRef.current) clearInterval(pollRef.current); return }
    loadJobs()
    pollRef.current = setInterval(loadJobs, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }

  }, [tab])

  async function submitQueue() {
    const hosts = queueInput.split(/[\n,]+/).map((s) => parseHost(s)).filter(Boolean)
    if (hosts.length === 0) { setError('Enter one or more store domains (one per line).'); return }
    setError(''); setQueueBusy(true)
    try {
      await enqueueJobs({ hosts, allPages, enrich })
      setQueueInput('')
      await loadJobs()
    } catch (err) {
      setError(err?.message || 'Could not queue brands.')
    } finally { setQueueBusy(false) }
  }

  async function downloadJob(historyId) {
    try { await downloadHistoryCsv(historyId) }
    catch (err) { setError(err?.message || 'Download failed'); loadJobs() }
  }

  async function handleRun() {
    setError(''); setResult(null)

    if (tab === 'brand') {
      if (!brandInput.trim()) { setError('Enter a Shopify store domain.'); return }
      const host = parseHost(brandInput)
      setProcessing(true)
      try { setResult(await scrapeStore({ host, allPages, enrich })) }
      catch (err) { setError(err?.message || 'Harvest failed.') }
      finally { setProcessing(false) }
    } else {
      if (!pageInput.trim()) { setError('Paste a product URL.'); return }
      let host = '', handle = ''
      try {
        const u = new URL(pageInput.trim())
        host = u.hostname
        const m = u.pathname.match(/\/products\/([a-z0-9-]+)/i)
        if (m) handle = m[1].toLowerCase()
      } catch { setError('Invalid URL.'); return }
      if (!host) { setError('Could not parse hostname.'); return }
      if (!handle) { setError('Could not find /products/<handle> in URL.'); return }
      setProcessing(true)
      try { setResult(await scrapeProduct({ host, handle, enrich })) }
      catch (err) { setError(err?.message || 'Product fetch failed.') }
      finally { setProcessing(false) }
    }
  }

  const status = processing ? 'Harvesting…' : (health?.ok ? 'Connected' : 'Backend offline')

  const summaryTiles = result ? [
    { icon: Package, label: 'Products', value: result.summary?.product_count ?? 0 },
    { icon: Layers, label: 'Variants', value: result.summary?.variant_count ?? 0 },
    { icon: Image, label: 'Images', value: result.summary?.image_count ?? 0 },
    { icon: Sparkles, label: 'AI Enriched', value: result.enrichedCount ?? 0 },
  ] : []

  return (
    <WorkspaceLayout
      modeLabel="SHOPIFY"
      title={tab === 'brand' ? 'Full store harvest' : 'Single product harvest'}
      description={
        tab === 'brand'
          ? 'Enter a Shopify store domain. Harvests all products, runs AI content + taxonomy + pricing, outputs a ready-to-deploy CSV.'
          : 'Paste a product URL. Fetches that single product, enriches it, outputs a ready-to-deploy CSV.'
      }
      status={status}
      left={
        <div className="mt-6 space-y-4">
          {}
          <div className="flex gap-2">
            <button type="button" onClick={() => switchTab('brand')} disabled={processing}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                tab === 'brand' ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 bg-black/30 text-white/55 hover:text-white/80'
              }`}>
              <Globe2 className="h-4 w-4" /> Brand URL
            </button>
            <button type="button" onClick={() => switchTab('page')} disabled={processing}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                tab === 'page' ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 bg-black/30 text-white/55 hover:text-white/80'
              }`}>
              <FileText className="h-4 w-4" /> Page URL
            </button>
            <button type="button" onClick={() => switchTab('queue')} disabled={processing}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                tab === 'queue' ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 bg-black/30 text-white/55 hover:text-white/80'
              }`}>
              <ListPlus className="h-4 w-4" /> Queue
            </button>
          </div>

          {tab === 'brand' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase tracking-[0.18em] text-white/55">Shopify store domain</label>
                <input type="text" value={brandInput}
                  onChange={(e) => { setBrandInput(e.target.value); setError('') }}
                  placeholder="allbirds.com"
                  disabled={processing}
                  onKeyDown={(e) => e.key === 'Enter' && handleRun()}
                  className="mt-2 w-full rounded-lg border border-white/14 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none disabled:opacity-50"
                />
                <p className="mt-1.5 text-[11px] text-white/40">Domain only — no https:// needed</p>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/78 hover:bg-white/[0.04] transition">
                <input type="checkbox" checked={allPages} onChange={(e) => setAllPages(e.target.checked)}
                  disabled={processing} className="h-4 w-4 accent-[#84CC16]" />
                <span>Fetch all pages <span className="text-white/40">(up to 200 × 250 products)</span></span>
              </label>
            </div>
          ) : tab === 'page' ? (
            <div>
              <label className="block text-xs uppercase tracking-[0.18em] text-white/55">Product page URL</label>
              <input type="url" value={pageInput}
                onChange={(e) => { setPageInput(e.target.value); setError('') }}
                placeholder="https://store.com/products/handle"
                disabled={processing}
                onKeyDown={(e) => e.key === 'Enter' && handleRun()}
                className="mt-2 w-full rounded-lg border border-white/14 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none disabled:opacity-50"
              />
              <p className="mt-1.5 text-[11px] text-white/40">Full URL — host and handle parsed automatically</p>
            </div>
          ) : (
            <div>
              <label className="block text-xs uppercase tracking-[0.18em] text-white/55">Store domains (one per line)</label>
              <textarea value={queueInput}
                onChange={(e) => { setQueueInput(e.target.value); setError('') }}
                placeholder={"naturtint.in\nhouseofem5.com\nbrand3.com"}
                rows={4}
                className="mt-2 w-full rounded-lg border border-white/14 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
              />
              <p className="mt-1.5 text-[11px] text-white/40">Queue 2-3 brands and walk away. They process one by one in the background — keep this site open. Finished CSVs appear below and in History (downloadable for 4 hours).</p>
            </div>
          )}

          {/* AI enrich toggle (applies to all modes) */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/78 hover:bg-white/[0.04] transition">
            <input type="checkbox" checked={enrich} onChange={(e) => setEnrich(e.target.checked)}
              disabled={processing} className="h-4 w-4 accent-[#84CC16]" />
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#84CC16]" />
              AI enrich <span className="text-white/40">(Body, SEO, alt text, category &amp; type via Gemini)</span>
            </span>
          </label>

          {/* Run / Queue button */}
          {tab === 'queue' ? (
            <button type="button" onClick={submitQueue} disabled={queueBusy || !queueInput.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50">
              {queueBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Queuing…</> : <><ListPlus className="h-4 w-4" /> Add to queue</>}
            </button>
          ) : (
            <button type="button" onClick={handleRun}
              disabled={processing || (tab === 'brand' ? !brandInput.trim() : !pageInput.trim())}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
            >
              {processing
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Harvesting…</>
                : <><Play className="h-4 w-4" /> Run harvest</>}
            </button>
          )}

          {/* Jobs list (queue tab) */}
          {tab === 'queue' && jobs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Your queue</p>
              {jobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm">
                  <span className="truncate font-medium text-white/85">{j.host}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    {j.status === 'pending' && <span className="flex items-center gap-1 text-white/45 text-xs"><Clock className="h-3.5 w-3.5" /> Pending</span>}
                    {j.status === 'running' && <span className="flex items-center gap-1 text-[#bef264] text-xs"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running</span>}
                    {j.status === 'error' && <span className="flex items-center gap-1 text-red-300 text-xs" title={j.error}><XCircle className="h-3.5 w-3.5" /> Failed</span>}
                    {j.status === 'done' && (
                      j.history_id ? (
                        <button onClick={() => downloadJob(j.history_id)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#84CC16]/40 bg-[#84CC16]/[0.12] px-3 py-1 text-xs font-medium text-[#bef264] hover:bg-[#84CC16]/[0.2]">
                          <Download className="h-3.5 w-3.5" /> {j.product_count} · CSV
                        </button>
                      ) : <span className="flex items-center gap-1 text-white/45 text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Done</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Download ready-to-deploy CSV */}
          {result?.csv && (
            <DownloadButton onClick={() => downloadCsv(result.csv, result.fileName)} fileName={result.fileName} primary />
          )}

          {/* Needs-review notice */}
          {result?.needsReviewCount > 0 && (
            <div className="flex items-start gap-2.5 rounded-[16px] border border-amber-400/30 bg-amber-400/[0.08] px-4 py-3 text-xs text-amber-200/90">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <b>{result.needsReviewCount}</b> product(s) missing price or weight — saved as
                <b> draft</b> with a <code>needs-review</code> tag. Verify the temp price before deploying.
              </span>
            </div>
          )}

          <WarningBox error={error} errorTitle="Failed" />
        </div>
      }
      right={
        <ResultPanel
          processing={processing}
          idleText={tab === 'brand' ? 'Results appear once the store harvest completes.' : 'Results appear once the product is fetched.'}
          result={result}
          summaryTiles={summaryTiles.map(({ label, value }) => [label, value])}
        >
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {summaryTiles.map(({ icon: Icon, label, value }) => (
                  <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-1.5 rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-3">
                    <div className="flex items-center gap-1.5 text-white/50">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-[11px] uppercase tracking-[0.2em]">{label}</span>
                    </div>
                    <p className="text-2xl font-semibold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-1.5 text-sm">
                {result.host && (
                  <p className="text-white/55 font-mono text-xs">{result.host}{result.handle ? `/products/${result.handle}` : ''}</p>
                )}
                {!result.aiConfigured && enrich && (
                  <p className="text-amber-200/80 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    Gemini not configured — AI content fields left blank (set GEMINI_API_KEY).
                  </p>
                )}
                {result.aiConfigured && result.enrichedCount > 0 && (
                  <p className="text-[#84CC16] text-xs flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    AI enriched {result.enrichedCount} products
                  </p>
                )}
                <p className="text-white/40 text-xs">
                  {((result.durationMs || 0) / 1000).toFixed(1)}s · ready-to-deploy Shopify CSV (with Temp Price)
                </p>
              </div>
            </div>
          )}
        </ResultPanel>
      }
    />
  )
}

