export type NavItem = {
  id: string
  label: string
}

export type RankTier = {
  id: string
  name: string
  minLevel: number
  imageUrl: string | null
}

export type UserProfile = {
  name: string
  handle: string
  avatarUrl: string | null
  accentColor: string
  streakSymbol: string
  streakSymbolImageUrl: string | null
  rank: string
  rankImageUrl?: string | null
  level: number
  /** XP progress inside the current level. */
  progressXp: number
  progressToNext: number
  availableMinutes: number
  totalMinutes: number
  /** Spendable XP for the shop only. */
  availableXp: number
  shopXp: number
  totalXp: number
}

export type HabitCategory = 'daily' | 'hobby' | 'habit'

export type Habit = {
  id: string
  name: string
  category: HabitCategory
  streak: number
  doneToday: boolean
  progressToday: number
  totalProgress: number
  lastCompletedDate: string | null
  createdAt: string
  /** Lifetime minutes logged for this item. */
  totalMinutes: number
  totalXpEarned: number
  /** 1 (easy) – 5 (hard); affects baseline XP. */
  difficulty: number
  /** 1 (low) – 5 (high); affects baseline XP. */
  priority: number
  /** Other habits/hobbies that complete together with this one. */
  linkedHabitIds: string[]
  tags: string[]
}

export type WeeklyTask = {
  id: string
  name: string
  done: boolean
}

export type DashboardPrefs = {
  quotes: string[]
  dailyGoal: string
  bountiesOpen: boolean
  checksOpen: boolean
  weeklyOpen: boolean
  collapsedCategories: Partial<Record<HabitCategory, boolean>>
  /** Index into quotes when showing a fixed quote; null = random on load. */
  activeQuoteIndex: number | null
}

export type AppPreferences = {
  itemCompletionXp: Record<string, number>
  itemBaseMinutes: Record<string, number>
  levelUpBaseXp: number
  levelUpIncrementXp: number
  ranks: RankTier[]
  dailySpinUxps: number[]
  dailySpinRewardIds: string[]
}

export type CompletionRecord = {
  id: string
  habitId: string
  habitName: string
  date: string
  completedAt: string
}

export type TimeRecord = {
  id: string
  habitId: string
  habitName: string
  date: string
  minutes: number
  source: 'timer' | 'manual'
}

export type PurchasedReward = {
  rewardId: string
  purchasedAt: string
}

export type ProfileData = {
  name: string
  handle: string
  avatarUrl: string | null
  accentColor: string
  streakSymbol: string
  streakSymbolImageUrl: string | null
  totalMinutes: number
  spentMinutes: number
  totalXp: number
  shopXp: number
  spentXp: number
}

export type AppState = {
  habits: Habit[]
  bountyTasks: WeeklyTask[]
  checks: WeeklyTask[]
  weeklyTasks: WeeklyTask[]
  dashboard: DashboardPrefs
  profile: ProfileData
  preferences: AppPreferences
  rewards: Reward[]
  lastActiveDate: string
  completions: CompletionRecord[]
  timeRecords: TimeRecord[]
  purchasedRewards: PurchasedReward[]
  lastDailySpinDate: string | null
}

export type AccountSummary = {
  id: string
  name: string
  handle: string
  avatarUrl: string | null
  lastUpdatedAt: string
}

export type DashboardStat = {
  id: string
  label: string
  value: string
}

export type Reward = {
  id: string
  name: string
  description: string
  cost: number
  emoji: string
  imageUrl?: string | null
  oneTime: boolean
}

export type HeatmapDay = {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

export type HabitTimeStats = {
  todayMinutes: number
  weekMinutes: number
  totalMinutes: number
}
