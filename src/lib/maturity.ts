import { getMaturityFromMinutes } from './time'

export function getHabitMaturity(totalMinutes: number) {
  const m = getMaturityFromMinutes(totalMinutes)
  return {
    level: m.level,
    rank: m.rank,
    minutes: m.minutes,
    minutesToNext: m.minutesToNext,
    percent: m.percent,
  }
}
