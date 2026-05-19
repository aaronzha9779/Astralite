import type { DashboardStat, Habit } from '../types'

export function getDashboardStats(habits: Habit[]): DashboardStat[] {
  const completed = habits.filter((h) => h.doneToday).length
  const total = habits.length
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0)
  const todayPercent =
    total === 0 ? 0 : Math.round((completed / total) * 100)

  return [
    {
      id: 'completed',
      label: 'Done today',
      value: `${completed}/${total}`,
    },
    {
      id: 'streak',
      label: 'Best streak',
      value: bestStreak === 0 ? '—' : `${bestStreak} days`,
    },
    {
      id: 'today',
      label: 'Today',
      value: `${todayPercent}%`,
    },
  ]
}
