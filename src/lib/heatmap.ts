import { groupCompletionsByDate } from './completions'
import type { CompletionRecord, HeatmapDay } from '../types'

const WEEKS = 52

function toLocalISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getLevel(count: number): HeatmapDay['level'] {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

export function buildHeatmapDays(completions: CompletionRecord[]): HeatmapDay[] {
  const byDate = groupCompletionsByDate(completions)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = new Date(today)
  start.setDate(start.getDate() - WEEKS * 7 + 1)

  const days: HeatmapDay[] = []
  const cursor = new Date(start)

  while (cursor <= today) {
    const date = toLocalISODate(cursor)
    const count = byDate.get(date)?.length ?? 0
    days.push({ date, count, level: getLevel(count) })
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

export function formatHeatmapDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
