import { getRankForLevel } from '../data/ranks'
import { getLevelFromMinutes } from './time'
import type { Habit, ProfileData, UserProfile } from '../types'

export type XpBreakdown = {
  base: number
  bonus: number
  total: number
  bonusLabel?: string
}

/** Weight from difficulty (1–5) and priority (1–5). */
export function getHabitWeight(habit: Habit): number {
  const difficulty = habit.difficulty ?? 3
  const priority = habit.priority ?? 3
  return 0.5 + (difficulty / 5) * 0.55 + (priority / 5) * 0.45
}

/** Variable bonus — law-of-maybe style intermittent rewards. */
export function rollBonusXp(base: number): { amount: number; label?: string } {
  if (base <= 0) return { amount: 0 }

  const roll = Math.random()
  if (roll < 0.04) {
    return { amount: Math.round(base * 5), label: 'Jackpot!' }
  }
  if (roll < 0.18) {
    const mult = 1.5 + Math.random() * 2
    return { amount: Math.round(base * mult), label: 'Big bonus!' }
  }
  if (roll < 0.38) {
    const mult = 0.35 + Math.random() * 0.85
    return { amount: Math.round(base * mult), label: 'Bonus!' }
  }
  if (roll < 0.55) {
    return { amount: Math.round(base * 0.2), label: 'Nice!' }
  }
  return { amount: 0 }
}

export function calculateTimeXp(habit: Habit, minutes: number): XpBreakdown {
  const weight = getHabitWeight(habit)
  const base = Math.max(1, Math.round(minutes * weight * 0.6))
  const bonusRoll = rollBonusXp(base)
  return {
    base,
    bonus: bonusRoll.amount,
    total: base + bonusRoll.amount,
    bonusLabel: bonusRoll.label,
  }
}

export function calculateCompletionXp(habit: Habit): XpBreakdown {
  const weight = getHabitWeight(habit)
  const base = Math.max(5, Math.round(12 * weight))
  const bonusRoll = rollBonusXp(base)
  return {
    base,
    bonus: bonusRoll.amount,
    total: base + bonusRoll.amount,
    bonusLabel: bonusRoll.label,
  }
}

export function getAvailableXp(profile: ProfileData): number {
  return Math.max(0, (profile.totalXp ?? 0) - (profile.spentXp ?? 0))
}

export function toUserProfile(profile: ProfileData): UserProfile {
  const { level, current, toNext } = getLevelFromMinutes(profile.totalMinutes)
  return {
    name: profile.name,
    handle: profile.handle,
    rank: getRankForLevel(level),
    level,
    progressMinutes: current,
    progressToNext: toNext,
    availableMinutes: Math.max(
      0,
      profile.totalMinutes - (profile.spentMinutes ?? 0),
    ),
    totalMinutes: profile.totalMinutes,
    availableXp: getAvailableXp(profile),
    totalXp: profile.totalXp ?? 0,
  }
}
