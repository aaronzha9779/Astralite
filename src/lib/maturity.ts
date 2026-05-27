import { getRankForLevel } from '../data/ranks'
import type { AppPreferences } from '../types'
import { getLevelFromXp } from './xp'

export function getHabitMaturity(totalXp: number, preferences?: AppPreferences) {
  const m = getLevelFromXp(totalXp, preferences)
  return {
    level: m.level,
    rank: getRankForLevel(m.level, preferences?.ranks),
    minutes: m.current,
    minutesToNext: m.toNext,
    percent: m.percent,
  }
}

export function getHobbyMaturity(totalProgress: number) {
  const progress = Math.max(0, totalProgress)
  const level = Math.floor(progress / 100) + 1
  const current = progress % 100
  return {
    level,
    rank: 'Hobby',
    minutes: current,
    minutesToNext: 100,
    percent: current,
  }
}
