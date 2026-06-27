const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }
const CURRENT = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] || 20

function fmt(level, args) {
  const ts = new Date().toISOString()
  const msg = args.map((a) =>
    typeof a === 'string' ? a : (a instanceof Error ? a.stack || a.message : JSON.stringify(a))
  ).join(' ')
  return `${ts} [${level}] ${msg}`
}

export const logger = {
  debug: (...a) => CURRENT <= 10 && console.log(fmt('DEBUG', a)),
  info:  (...a) => CURRENT <= 20 && console.log(fmt('INFO', a)),
  warn:  (...a) => CURRENT <= 30 && console.warn(fmt('WARN', a)),
  error: (...a) => CURRENT <= 40 && console.error(fmt('ERROR', a)),
  fatal: (...a) => console.error(fmt('FATAL', a)),
}

