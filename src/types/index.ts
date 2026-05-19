export type NavItem = {
  id: string
  label: string
}

export type UserProfile = {
  name: string
  handle: string
  rank: string
  level: number
  /** Minutes toward next level (rank is time-based). */
  progressMinutes: number
  progressToNext: number
  availableMinutes: number
  totalMinutes: number
  /** Spendable XP for the shop (secondary currency). */
  availableXp: number
  totalXp: number
}

export type HabitCategory = 'daily' | 'hobby' | 'habit'

export type Habit = {
  id: string
  name: string
  category: HabitCategory
  streak: number
  doneToday: boolean
  lastCompletedDate: string | null
  createdAt: string
  /** Lifetime minutes logged for this item. */
  totalMinutes: number
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
  weeklyOpen: boolean
  /** Index into quotes when showing a fixed quote; null = random on load. */
  activeQuoteIndex: number | null
}

export type CompletionRecord = {
  id: string
  habitId: string
  habitName: string
  date: string
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
  totalMinutes: number
  spentMinutes: number
  totalXp: number
  spentXp: number
}

export type AppState = {
  habits: Habit[]
  weeklyTasks: WeeklyTask[]
  dashboard: DashboardPrefs
  profile: ProfileData
  lastActiveDate: string
  completions: CompletionRecord[]
  timeRecords: TimeRecord[]
  purchasedRewards: PurchasedReward[]
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
