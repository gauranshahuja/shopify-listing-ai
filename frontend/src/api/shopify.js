import { apiJson } from './client.js'

export function scrapeStore({ host, allPages = true, enrich = true }) {
  return apiJson('/api/shopify/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, allPages, enrich }),
  })
}

export function scrapeProduct({ host, handle, enrich = true }) {
  return apiJson('/api/shopify/product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, handle, enrich }),
  })
}

export function enrichProducts({ products, fileName }) {
  return apiJson('/api/shopify/enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products, fileName }),
  })
}

export function enqueueJobs({ hosts, allPages = true, enrich = true }) {
  return apiJson('/api/shopify/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hosts, allPages, enrich }),
  })
}

export function fetchJobs() {
  return apiJson('/api/shopify/jobs')
}

