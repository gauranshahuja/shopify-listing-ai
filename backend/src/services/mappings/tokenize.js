const STOP = new Set([
  'a','an','the','and','or','for','of','in','on','at','to','with','by','from',
  'is','it','its','this','that','these','those','new','used',
])

export function tokenize(str = '') {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
}

export function tokenSet(str) {
  return new Set(tokenize(str))
}

export function overlap(setA, setB) {
  if (!setA.size || !setB.size) return 0
  let common = 0
  for (const t of setA) if (setB.has(t)) common++
  return common / Math.min(setA.size, setB.size)
}

