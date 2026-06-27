export const USD_RATE = 94
export const MARGIN = 1.5
export const HANDLING_G = 100

function toNumber(v) {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : null
}

export function tempPrice(costINR, weightG) {
  const cost = toNumber(costINR)
  const weight = toNumber(weightG)
  if (cost === null || cost <= 0) return null
  if (weight === null || weight < 0) return null
  const usd = (cost + weight + HANDLING_G) * MARGIN / USD_RATE
  return Math.ceil(usd) + 0.99
}

export function computeTempPrices(variant = {}) {
  const reasons = []

  const price = toNumber(variant.price)
  const grams = toNumber(variant.grams)
  const compareAt = toNumber(variant.compare_at_price)

  if (price === null || price <= 0) reasons.push('missing-price')
  if (grams === null || grams <= 0) reasons.push('missing-weight')

  const tp = tempPrice(price, grams)

  const tcp = compareAt !== null && compareAt > 0 ? tempPrice(compareAt, grams) : null

  return {
    tempPrice: tp,
    tempComparePrice: tcp,
    needsReview: reasons.length > 0,
    reasons,
  }
}

