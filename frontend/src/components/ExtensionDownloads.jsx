import React, { useState } from 'react'
import { ShoppingBag, Package, Download } from 'lucide-react'

async function forceDownload(url, fileName) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const blob = await resp.blob()
  const objUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objUrl
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(objUrl), 2000)
}

const EXTENSIONS = [
  {
    id: 'shopify',
    icon: ShoppingBag,
    title: 'Shopify Scraper',
    desc: 'Scrape any Shopify store (whole store or one collection) → ready-to-deploy CSV.',
    file: '/downloads/shopify-scraper.zip',
  },
  {
    id: 'amazon',
    icon: Package,
    title: 'Amazon Scraper',
    desc: 'Scrape the Amazon product page you are viewing → ready-to-deploy CSV.',
    file: '/downloads/amazon-scraper.zip',
  },
]

export function ExtensionDownloads({ compact = false }) {
  const [busyId, setBusyId] = useState(null)
  const [err, setErr] = useState('')

  async function handleDownload(ext) {
    setErr(''); setBusyId(ext.id)
    try {
      await forceDownload(ext.file, ext.file.split('/').pop())
    } catch (e) {

      try { window.open(ext.file, '_blank') } catch {}
      setErr(`If the download didn't start, right-click “Download” → “Save link as”. (${e.message})`)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {EXTENSIONS.map((ext) => {
          const Icon = ext.icon
          return (
            <div key={ext.id} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-base font-medium text-white">{ext.title}</p>
              <p className="mt-1.5 text-xs leading-5 text-white/55">{ext.desc}</p>
              <button
                type="button"
                onClick={() => handleDownload(ext)}
                disabled={busyId === ext.id}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
              >
                <Download className="h-4 w-4" /> {busyId === ext.id ? 'Downloading…' : 'Download (.zip)'}
              </button>
              {}
              <a href={ext.file} download className="mt-2 block text-center text-[11px] text-white/40 underline hover:text-white/70">
                or direct link
              </a>
            </div>
          )
        })}
      </div>

      {err && <div className="rounded-[16px] border border-amber-400/30 bg-amber-400/[0.08] px-4 py-3 text-xs text-amber-200/90">{err}</div>}

      {!compact && (
        <div className="rounded-[20px] border border-white/10 bg-black/20 px-5 py-4 text-xs leading-6 text-white/60">
          <p className="mb-1.5 font-medium text-white/80">How to install (one time):</p>
          <ol className="list-decimal space-y-0.5 pl-5">
            <li>Download &amp; unzip the extension.</li>
            <li>Open <span className="font-mono text-white/75">chrome://extensions</span> and turn on <b>Developer mode</b>.</li>
            <li>Click <b>Load unpacked</b> → select the unzipped folder.</li>
            <li>Open the extension, <b>sign in</b> with your Listify email &amp; password — the API URL &amp; key are already set.</li>
          </ol>
        </div>
      )}
    </div>
  )
}

