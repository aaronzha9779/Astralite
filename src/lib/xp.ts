import { getRankForLevel, getRankTierForLevel } from '../data/ranks'
import type { AppPreferences, Habit, ProfileData, UserProfile } from '../types'

export type XpBreakdown = {
  base: number
  total: number
}

export function calculateTimeXp(
  habit: Habit,
  minutes: number,
  rate = 0.6,
): XpBreakdown {
  void habit
  const base = getFlatTimeXp(minutes, rate)
  return {
    base,
    total: base,
  }
}

export function calculateCompletionXp(
  habit: Habit,
  baseXp = 15,
): XpBreakdown {
  void habit
  const base = getFlatCompletionXp(baseXp)
  return {
    base,
    total: base,
  }
}

export function getFlatTimeXp(minutes: number, rate = 0.6): number {
  return Math.max(1, Math.round(minutes * Math.max(0, rate)))
}

export function getFlatCompletionXp(baseXp = 15): number {
  return Math.max(1, Math.round(baseXp))
}

function getLevelThreshold(
  level: number,
  baseXp = 250,
  incrementXp = 25,
) {
  const base = Math.max(25, Math.round(baseXp))
  const increment = Math.max(0, Math.round(incrementXp))
  return base + Math.max(0, level - 1) * increment
}

export function getLevelFromXp(
  totalXp: number,
  preferencesOrBaseXp?: AppPreferences | number,
  incrementXp = 25,
) {
  const total = Math.max(0, totalXp)
  const baseXp =
    typeof preferencesOrBaseXp === 'object' && preferencesOrBaseXp
      ? preferencesOrBaseXp.levelUpBaseXp
      : typeof preferencesOrBaseXp === 'number'
        ? preferencesOrBaseXp
        : 250
  const growthXp =
    typeof preferencesOrBaseXp === 'object' && preferencesOrBaseXp
      ? preferencesOrBaseXp.levelUpIncrementXp
      : incrementXp

  let level = 1
  let spent = 0
  let threshold = getLevelThreshold(level, baseXp, growthXp)

  while (spent + threshold <= total) {
    spent += threshold
    level += 1
    threshold = getLevelThreshold(level, baseXp, growthXp)
  }

  const current = total - spent
  return {
    level,
    current,
    toNext: threshold,
    percent: Math.round((current / threshold) * 100),
  }
}

export function getAvailableXp(profile: ProfileData): number {
  return Math.max(0, profile.shopXp ?? 0)
}

export function toUserProfile(
  profile: ProfileData,
  preferences: AppPreferences,
): UserProfile {
  const { level, current, toNext } = getLevelFromXp(
    profile.totalXp ?? 0,
    preferences,
  )
  const activeRank = getRankTierForLevel(level, preferences.ranks)
  return {
    name: profile.name,
    handle: profile.handle,
    avatarUrl: profile.avatarUrl,
    accentColor: profile.accentColor,
    streakSymbol: profile.streakSymbol,
    streakSymbolImageUrl: profile.streakSymbolImageUrl ?? null,
    rank: getRankForLevel(level, preferences.ranks),
    rankImageUrl: activeRank?.imageUrl ?? null,
    level,
    progressXp: current,
    progressToNext: toNext,
    availableMinutes: Math.max(
      0,
      profile.totalMinutes - (profile.spentMinutes ?? 0),
    ),
    totalMinutes: profile.totalMinutes,
    availableXp: getAvailableXp(profile),
    shopXp: profile.shopXp ?? 0,
    totalXp: profile.totalXp ?? 0,
  }
}
