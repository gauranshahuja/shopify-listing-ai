import React, { useEffect, useRef, useState } from 'react'
import { Loader2, Upload, Database, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout.jsx'
import { WarningBox } from '../../components/ui/index.jsx'
import { getMappingsStats, importMappings } from '../../api/mappings.js'
import { useAuth } from '../../contexts/AuthContext.jsx'

export function MappingsWorkspace() {
  const { isAdmin } = useAuth()
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [sourceName, setSourceName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [dragOver, setDragOver] = useState(false)

  async function loadStats() {
    setLoadingStats(true)
    try {
      const data = await getMappingsStats()
      setStats(data)
    } catch (err) {
      setStats(null)
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => { loadStats() }, [])

  function handleFile(f) {
    if (!f) return
    if (!f.name.endsWith('.csv')) { setError('Only .csv files are accepted.'); return }
    setFile(f)
    setError('')
    setResult(null)
  }

  async function handleImport() {
    if (!file) { setError('Please select a CSV file first.'); return }
    setUploading(true)
    setError('')
    setResult(null)
    try {
      const data = await importMappings(file, sourceName || file.name)
      setResult(data)
      await loadStats()
    } catch (err) {
      setError(err?.message || 'Import failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <WorkspaceLayout
      modeLabel="MAPPINGS"
      title="Mapping rules"
      description="Import reference CSVs to train category, type, and tag rules. These rules are applied automatically when processing CSV files."
      status={loadingStats ? 'Loading…' : `${(stats?.mappings ?? 0).toLocaleString()} rules loaded`}
      left={
        <div className="mt-6 space-y-5">
          {}
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Mapping rules', stats?.mappings ?? '—'],
              ['Type → Category', stats?.typeCategories ?? '—'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/42">{label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {loadingStats ? '…' : (typeof value === 'number' ? value.toLocaleString() : value)}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={loadStats}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs text-white/70 hover:text-white transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh stats
          </button>

          {isAdmin ? (
            <div className="space-y-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm font-medium text-white">Import reference CSV</p>
              <p className="text-xs text-white/50 leading-5">
                CSV must have a <code className="text-white/70">title</code> column.
                Optional: <code className="text-white/70">handle, brand, type, category, tags, keywords</code>.
              </p>

              {}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded-[18px] border-2 border-dashed px-5 py-8 text-center transition ${
                  dragOver ? 'border-white/40 bg-white/[0.07]' : 'border-white/12 hover:border-white/25 hover:bg-white/[0.04]'
                }`}
              >
                <input ref={inputRef} type="file" accept=".csv" className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])} />
                <Upload className="mx-auto h-6 w-6 text-white/40" />
                {file ? (
                  <p className="mt-2 text-sm text-white">{file.name} <span className="text-white/50">— click to change</span></p>
                ) : (
                  <p className="mt-2 text-sm text-white/60">Drop CSV or <span className="underline">browse</span></p>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.18em] text-white/55 mb-2">
                  Source label (optional)
                </label>
                <input
                  type="text" value={sourceName} onChange={(e) => setSourceName(e.target.value)}
                  placeholder="e.g. brand-reference-2024"
                  className="w-full rounded-lg border border-white/14 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
                />
              </div>

              <button
                type="button" onClick={handleImport}
                disabled={uploading || !file}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                {uploading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                  : <><Database className="h-4 w-4" /> Import rules</>}
              </button>

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-[18px] border border-emerald-400/20 bg-emerald-500/[0.08] p-4 text-sm text-emerald-100"
                >
                  <p className="font-medium">Import complete</p>
                  <p className="mt-1 text-emerald-100/75">
                    {result.imported?.toLocaleString()} rules imported
                    {result.skipped > 0 && `, ${result.skipped} rows skipped`}
                    {result.errors?.length > 0 && ` (${result.errors.length} errors)`}.
                  </p>
                </motion.div>
              )}

              <WarningBox
                error={error}
                warnings={result?.errors}
                errorTitle="Import failed"
              />
            </div>
          ) : (
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
              Importing mapping rules requires admin access.
            </div>
          )}
        </div>
      }
      right={
        <div className="rounded-[28px] border border-white/10 bg-black/28 p-5 backdrop-blur-xl sm:p-6">
          <p className="text-xs uppercase tracking-[0.26em] text-white/42">How it works</p>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">Mapping rules</h3>
          <div className="mt-5 space-y-4 text-sm leading-6 text-white/65">
            <p>
              Mapping rules teach the engine how to categorise and tag products. When a CSV is processed, each product's title, brand, and handle are matched against these rules.
            </p>
            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4 space-y-2">
              <p className="text-white/80 font-medium text-xs uppercase tracking-[0.18em]">Match priority</p>
              <ol className="list-decimal list-inside space-y-1 text-white/60 text-xs">
                <li>Exact handle match (fastest)</li>
                <li>Exact brand + title match</li>
                <li>Fuzzy token overlap on title (≥35% threshold)</li>
                <li>Type → Category fallback</li>
              </ol>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4 space-y-2">
              <p className="text-white/80 font-medium text-xs uppercase tracking-[0.18em]">CSV columns</p>
              <p className="text-xs text-white/55">
                Required: <code>title</code><br/>
                Optional: <code>handle, brand, type, category, tags, keywords</code><br/>
                Aliases accepted: <code>vendor→brand, slug→handle, cat→category</code>
              </p>
            </div>
          </div>
        </div>
      }
    />
  )
}

