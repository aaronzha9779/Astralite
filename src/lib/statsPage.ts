import { groupCompletionsByDate } from './completions'
import type { CompletionRecord, DashboardStat, Habit } from '../types'

export function getStatsPageSummary(
  habits: Habit[],
  completions: CompletionRecord[],
): DashboardStat[] {
  const byDate = groupCompletionsByDate(completions)
  const totalCompletions = completions.length
  const activeDays = byDate.size
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0)
  const bestDay = [...byDate.values()].reduce(
    (max, day) => Math.max(max, day.length),
    0,
  )

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
      value: bestDay === 0 ? '—' : `${bestDay} habits`,
    },
  ]
}

export function getRecentHistory(
  completions: CompletionRecord[],
  limit = 20,
): CompletionRecord[] {
  return [...completions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
}
