import { getRankForLevel } from '../data/ranks'
import type { TimeRecord } from '../types'
import { getTodayISO } from './dates'

export const MINUTES_PER_LEVEL = 300

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatHoursDecimal(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = (minutes / 60).toFixed(1)
  return `${h} hrs`
}

export function getLevelFromMinutes(totalMinutes: number) {
  const level = Math.floor(totalMinutes / MINUTES_PER_LEVEL) + 1
  const current = totalMinutes % MINUTES_PER_LEVEL
  return {
    level,
    current,
    toNext: MINUTES_PER_LEVEL,
    percent: Math.round((current / MINUTES_PER_LEVEL) * 100),
  }
}

export function getMaturityFromMinutes(totalMinutes: number) {
  const { level, current, toNext, percent } = getLevelFromMinutes(totalMinutes)
  return {
    level,
    rank: getRankForLevel(level),
    minutes: current,
    minutesToNext: toNext,
    percent,
  }
}

function getWeekStartISO(date: string): string {
  const d = new Date(date + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}

export function sumMinutesForHabit(
  records: TimeRecord[],
  habitId: string,
  filter?: { date?: string; weekOf?: string },
): number {
  return records
    .filter((r) => {
      if (r.habitId !== habitId) return false
      if (filter?.date && r.date !== filter.date) return false
      if (filter?.weekOf) {
        const weekStart = getWeekStartISO(r.date)
        if (weekStart !== filter.weekOf) return false
      }
      return true
    })
    .reduce((sum, r) => sum + r.minutes, 0)
}

export function getHabitTimeBreakdown(
  records: TimeRecord[],
  habitId: string,
  today = getTodayISO(),
) {
  const weekOf = getWeekStartISO(today)
  const todayMinutes = sumMinutesForHabit(records, habitId, { date: today })
  const weekMinutes = sumMinutesForHabit(records, habitId, { weekOf })
  const totalMinutes = sumMinutesForHabit(records, habitId)
  return { todayMinutes, weekMinutes, totalMinutes }
}

export function getProfileTotalMinutes(
  records: TimeRecord[],
  habitTotals: number[],
): number {
  const fromRecords = records.reduce((s, r) => s + r.minutes, 0)
  const fromHabits = habitTotals.reduce((s, m) => s + m, 0)
  return Math.max(fromRecords, fromHabits)
}
