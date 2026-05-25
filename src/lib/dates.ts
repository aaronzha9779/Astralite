function toLocalISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toLocalISODateTime(d: Date): string {
  const date = toLocalISODate(d)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${date}T${hours}:${minutes}:${seconds}`
}

export function getTodayISO(): string {
  return toLocalISODate(new Date())
}

export function getYesterdayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toLocalISODate(d)
}

export function getNowLocalISO(): string {
  return toLocalISODateTime(new Date())
}
