export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

export function istDateKey(ms = Date.now()) {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10)
}

export function istDayBounds(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error('Invalid IST date key')
  const startUtcMs = Date.parse(`${dateKey}T00:00:00.000Z`) - IST_OFFSET_MS
  if (!Number.isFinite(startUtcMs)) throw new Error('Invalid IST date key')
  return { startUtcMs, endUtcMs: startUtcMs + 24 * 60 * 60 * 1000 }
}

export function shiftIstDate(dateKey, dayDelta) {
  const { startUtcMs } = istDayBounds(dateKey)
  return istDateKey(startUtcMs + Number(dayDelta) * 24 * 60 * 60 * 1000)
}

export function previousClosedIstDate(nowMs = Date.now()) {
  const today = istDateKey(nowMs)
  return shiftIstDate(today, -1)
}
