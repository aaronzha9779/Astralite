import type { AppState, DashboardPrefs, Habit, HabitCategory } from '../types'

const STORAGE_KEY = 'grind-app-v4'
const V3_KEY = 'grind-app-v3'
const V2_KEY = 'grind-app-v2'
const LEGACY_KEY = 'grind-app-v1'

type LegacyState = {
  habits: AppState['habits']
  profile: { name: string; handle: string; totalXp?: number; totalMinutes?: number }
  lastActiveDate: string
}

type LegacyHabit = Habit & {
  focusMinutes?: number
  xp?: number
  totalXp?: number
}

type LegacyProfile = {
  name: string
  handle: string
  totalXp?: number
  spentXp?: number
  totalMinutes?: number
  spentMinutes?: number
}

function migrate(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null

  const data = raw as Record<string, unknown>

  if (Array.isArray(data.habits)) {
    return normalizeState(data as AppState)
  }

  const legacy = data as LegacyState
  return normalizeState({
    habits: (legacy.habits ?? []).map((h, i) =>
      normalizeHabit(h as LegacyHabit, i),
    ),
    profile: {
      name: legacy.profile?.name ?? 'Grinder',
      handle: legacy.profile?.handle ?? '@you',
      totalMinutes:
        legacy.profile?.totalMinutes ??
        (legacy.profile as { totalXp?: number })?.totalXp ??
        0,
      spentMinutes: 0,
      totalXp: 0,
      spentXp: 0,
    },
    lastActiveDate: legacy.lastActiveDate ?? new Date().toISOString().slice(0, 10),
    completions: [],
    timeRecords: [],
    purchasedRewards: [],
    weeklyTasks: [],
    dashboard: defaultDashboard,
  } as AppState)
}

const defaultDashboard: DashboardPrefs = {
  quotes: [
    'Small steps every day beat big bursts once a month.',
    'You do not have to be extreme — just consistent.',
    'Discipline is choosing what you want most over what you want now.',
  ],
  dailyGoal: '',
  weeklyOpen: false,
  activeQuoteIndex: null,
}

function normalizeHabit(h: LegacyHabit, index: number): Habit {
  const legacy = h as LegacyHabit & { category?: HabitCategory }
  let category = legacy.category ?? 'habit'
  if (!legacy.category) {
    const name = h.name.toLowerCase()
    if (name.includes('workout') || name.includes('water')) category = 'daily'
    else if (name.includes('read')) category = 'hobby'
    else if (index % 3 === 0) category = 'daily'
    else if (index % 3 === 1) category = 'hobby'
  }

  const legacyXp = (h as { xp?: number }).xp ?? 0
  const legacyFocus = h.focusMinutes ?? 0

  return {
    id: h.id,
    name: h.name,
    category,
    streak: h.streak ?? 0,
    doneToday: h.doneToday ?? false,
    lastCompletedDate: h.lastCompletedDate ?? null,
    createdAt: h.createdAt ?? new Date().toISOString().slice(0, 10),
    totalMinutes: h.totalMinutes ?? legacyXp * 5 + legacyFocus,
    difficulty: (h as Habit).difficulty ?? 3,
    priority: (h as Habit).priority ?? 3,
    linkedHabitIds: h.linkedHabitIds ?? [],
    tags: h.tags ?? [],
  }
}

function normalizeProfile(profile: LegacyProfile): AppState['profile'] {
  const totalMinutes =
    profile.totalMinutes ??
    (profile.totalXp != null ? profile.totalXp * 5 : 0)
  const spentMinutes =
    profile.spentMinutes ??
    (profile.spentXp != null ? profile.spentXp * 5 : 0)
  const legacyTotalXp = profile.totalXp
  const legacySpentXp = profile.spentXp
  return {
    name: profile.name ?? 'Grinder',
    handle: profile.handle ?? '@you',
    totalMinutes,
    spentMinutes,
    totalXp:
      (profile as AppState['profile']).totalXp ??
      (legacyTotalXp != null ? legacyTotalXp : Math.floor(totalMinutes / 5)),
    spentXp:
      (profile as AppState['profile']).spentXp ??
      (legacySpentXp != null ? legacySpentXp : Math.floor(spentMinutes / 5)),
  }
}

function normalizeState(state: AppState): AppState {
  const profile = normalizeProfile(state.profile as LegacyProfile)
  return {
    ...state,
    habits: state.habits.map((h, i) => normalizeHabit(h as LegacyHabit, i)),
    weeklyTasks: state.weeklyTasks ?? [],
    dashboard: {
      ...defaultDashboard,
      ...state.dashboard,
      quotes:
        state.dashboard?.quotes?.length
          ? state.dashboard.quotes
          : defaultDashboard.quotes,
    },
    profile,
    completions: state.completions ?? [],
    timeRecords: state.timeRecords ?? [],
    purchasedRewards: state.purchasedRewards ?? [],
  }
}

export function loadState(): AppState | null {
  try {
    for (const key of [STORAGE_KEY, V3_KEY, V2_KEY, LEGACY_KEY]) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const migrated = migrate(JSON.parse(raw))
      if (migrated) {
        if (key !== STORAGE_KEY) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
        }
        return migrated
      }
    }
    return null
  } catch {
    return null
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
