import { formatMinutes } from './time'
import { groupCompletionsByDate } from './completions'
import type { CompletionRecord, DashboardStat, Habit, TimeRecord } from '../types'

export type RecentHistoryDay = {
  date: string
  count: number
  entries: CompletionRecord[]
}

export function getStatsPageSummary(
  habits: Habit[],
  completions: CompletionRecord[],
  timeRecords: TimeRecord[],
): DashboardStat[] {
  const byDate = groupCompletionsByDate(completions)
  const totalCompletions = completions.length
  const activeDays = byDate.size
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0)
  let bestDayCount = 0
  let bestDayMinutes = 0

  for (const [date, dayCompletions] of byDate.entries()) {
    const dayMinutes = timeRecords
      .filter((record) => record.date === date)
      .reduce((sum, record) => sum + record.minutes, 0)

    if (
      dayCompletions.length > bestDayCount ||
      (dayCompletions.length === bestDayCount && dayMinutes > bestDayMinutes)
    ) {
      bestDayCount = dayCompletions.length
      bestDayMinutes = dayMinutes
    }
  }

  return [
    {
      id: 'total',
      label: 'Total completions',
      value: String(totalCompletions),
    },
    {
      id: 'active-days',
      label: 'Active days',
      value: String(activeDays),
    },
    {
      id: 'best-streak',
      label: 'Best streak',
      value: bestStreak === 0 ? '—' : `${bestStreak} days`,
    },
    {
      id: 'best-day',
      label: 'Best day',
      value:
        bestDayCount === 0
          ? '—'
          : `${bestDayCount} habits · ${formatMinutes(bestDayMinutes)}`,
    },
  ]
}

export function getRecentHistory(
  completions: CompletionRecord[],
  limit = 12,
): RecentHistoryDay[] {
  const grouped = groupCompletionsByDate(completions)

  return [...grouped.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, limit)
    .map(([date, entries]) => ({
      date,
      count: entries.length,
      entries: [...entries].sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    }))
}

export function formatHistoryDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatHistoryTime(isoDateTime: string): string {
  const [datePart, timePart = '12:00:00'] = isoDateTime.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hour, minute, second = '0'] = timePart.split(':')
  return new Date(
    y,
    m - 1,
    d,
    Number(hour),
    Number(minute),
    Number(second),
  ).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}
