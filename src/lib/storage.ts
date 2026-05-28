import { createEmptyAppState } from '../data/seedData'
import { DEFAULT_RANKS, normalizeRanks } from '../data/ranks'
import { rewards as defaultRewards } from '../data/rewards'
import { getNowLocalISO, getTodayISO } from './dates'
import type {
  AccountSummary,
  AppPreferences,
  AppState,
  CoreAspect,
  DashboardPrefs,
  Habit,
  HabitCategory,
} from '../types'

const STORAGE_KEY = 'grind-app-v5'
const V3_KEY = 'grind-app-v3'
const V2_KEY = 'grind-app-v2'
const LEGACY_KEY = 'grind-app-v1'
const SINGLE_STATE_KEY = 'grind-app-v4'
const INDEXED_DB_NAME = 'habitup-storage'
const INDEXED_DB_VERSION = 1
const INDEXED_DB_STORE = 'app'
const INDEXED_DB_KEY = 'accounts'

type LegacyState = {
  habits: AppState['habits']
  profile: {
    name: string
    handle: string
    avatarUrl?: string | null
    accentColor?: string
    totalXp?: number
    totalMinutes?: number
  }
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
  avatarUrl?: string | null
  accentColor?: string
  streakSymbol?: string
  streakSymbolImageUrl?: string | null
  totalXp?: number
  spentXp?: number
  totalMinutes?: number
  spentMinutes?: number
}

type LegacyPreferences = Partial<AppPreferences> & {
  levelUpXp?: number
}

type StoredAccounts = {
  activeAccountId: string
  accounts: Record<string, AppState>
}

type LoadedAccounts = {
  activeAccountId: string
  accountsById: Record<string, AppState>
  accounts: AccountSummary[]
}

export type SaveFilePayload = {
  version: 1
  exportedAt: string
  accountName: string
  appState: AppState
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
      avatarUrl: legacy.profile?.avatarUrl ?? null,
      accentColor: legacy.profile?.accentColor ?? '#a3e635',
      streakSymbol: '🔥',
      streakSymbolImageUrl: null,
      totalMinutes:
        legacy.profile?.totalMinutes ??
        (legacy.profile as { totalXp?: number })?.totalXp ??
        0,
      spentMinutes: 0,
      totalXp: 0,
      shopXp: 0,
      spentXp: 0,
    },
    lastActiveDate: legacy.lastActiveDate ?? new Date().toISOString().slice(0, 10),
    preferences: defaultPreferences,
    rewards: defaultRewards,
    completions: [],
    timeRecords: [],
    purchasedRewards: [],
    lastDailySpinDate: null,
    coreAspects: [],
    bountyTasks: [],
    checks: [],
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
  bountiesOpen: false,
  checksOpen: false,
  weeklyOpen: false,
  collapsedCategories: {},
  activeQuoteIndex: null,
}

const defaultPreferences: AppPreferences = {
  itemCompletionXp: {},
  itemBaseMinutes: {},
  levelUpBaseXp: 250,
  levelUpIncrementXp: 25,
  ranks: DEFAULT_RANKS,
  dailySpinUxps: [25, 40, 60, 80, 100],
  dailySpinRewardIds: [],
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
    progressToday: (h as Habit).progressToday ?? 0,
    totalProgress: (h as Habit).totalProgress ?? 0,
    lastCompletedDate: h.lastCompletedDate ?? null,
    createdAt: h.createdAt ?? new Date().toISOString().slice(0, 10),
    totalMinutes: h.totalMinutes ?? legacyXp * 5 + legacyFocus,
    totalXpEarned:
      (h as Habit).totalXpEarned ??
      (h.totalMinutes ?? legacyXp * 5 + legacyFocus > 0
        ? legacyXp || Math.floor((h.totalMinutes ?? 0) * 0.6)
        : 0),
    difficulty: (h as Habit).difficulty ?? 3,
    priority: (h as Habit).priority ?? 3,
    linkedHabitIds: h.linkedHabitIds ?? [],
    linkedCoreAspectIds: (h as Habit).linkedCoreAspectIds ?? [],
    tags: h.tags ?? [],
  }
}

function normalizeCoreAspect(
  aspect: Partial<CoreAspect> | undefined,
  index: number,
): CoreAspect {
  return {
    id: aspect?.id ?? `core-aspect-${index + 1}`,
    name: aspect?.name?.trim() || `Core aspect ${index + 1}`,
    progressToday: Math.max(0, Math.round(aspect?.progressToday ?? 0)),
    totalProgress: Math.max(0, Math.round(aspect?.totalProgress ?? 0)),
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
    avatarUrl: profile.avatarUrl ?? null,
    accentColor: profile.accentColor ?? '#a3e635',
    streakSymbol: profile.streakSymbol ?? '🔥',
    streakSymbolImageUrl: profile.streakSymbolImageUrl ?? null,
    totalMinutes,
    spentMinutes,
    totalXp:
      (profile as AppState['profile']).totalXp ??
      (legacyTotalXp != null ? legacyTotalXp : Math.floor(totalMinutes / 5)),
    shopXp:
      (profile as AppState['profile']).shopXp ??
      Math.max(
        0,
        ((profile as AppState['profile']).shopXp ??
          (legacyTotalXp != null ? legacyTotalXp : Math.floor(totalMinutes / 5))) -
          ((profile as AppState['profile']).spentXp ?? legacySpentXp ?? 0),
      ),
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
    coreAspects: (state.coreAspects ?? []).map((aspect, index) =>
      normalizeCoreAspect(aspect, index),
    ),
    bountyTasks: state.bountyTasks ?? [],
    checks: state.checks ?? [],
    weeklyTasks: state.weeklyTasks ?? [],
    dashboard: {
      ...defaultDashboard,
      ...state.dashboard,
      collapsedCategories: {
        ...defaultDashboard.collapsedCategories,
        ...state.dashboard?.collapsedCategories,
      },
      quotes:
        state.dashboard?.quotes?.length
          ? state.dashboard.quotes
          : defaultDashboard.quotes,
    },
    preferences: {
      ...defaultPreferences,
      ...(state.preferences as LegacyPreferences),
      itemCompletionXp: {
        ...defaultPreferences.itemCompletionXp,
        ...state.preferences?.itemCompletionXp,
      },
      itemBaseMinutes: {
        ...defaultPreferences.itemBaseMinutes,
        ...state.preferences?.itemBaseMinutes,
      },
      levelUpBaseXp: Math.max(
        25,
        Math.round(
          (state.preferences as LegacyPreferences | undefined)?.levelUpBaseXp ??
            (state.preferences as LegacyPreferences | undefined)?.levelUpXp ??
            defaultPreferences.levelUpBaseXp,
        ),
      ),
      levelUpIncrementXp: Math.max(
        0,
        Math.round(
          (state.preferences as LegacyPreferences | undefined)?.levelUpIncrementXp ??
            0,
        ),
      ),
      ranks: normalizeRanks(state.preferences?.ranks),
      dailySpinUxps:
        state.preferences?.dailySpinUxps?.length
          ? state.preferences.dailySpinUxps
              .map((value) => Math.max(1, Math.round(value)))
              .filter((value, index, arr) => arr.indexOf(value) === index)
          : defaultPreferences.dailySpinUxps,
      dailySpinRewardIds: state.preferences?.dailySpinRewardIds ?? [],
    },
    profile,
    rewards: (state.rewards?.length ? state.rewards : defaultRewards).map((reward) => ({
      ...reward,
      imageUrl: reward.imageUrl ?? null,
    })),
    completions: (state.completions ?? []).map((completion) => ({
      ...completion,
      completedAt:
        completion.completedAt ?? `${completion.date}T12:00:00`,
    })),
    timeRecords: state.timeRecords ?? [],
    purchasedRewards: state.purchasedRewards ?? [],
    lastDailySpinDate: state.lastDailySpinDate ?? null,
  }
}

function loadLegacySingleState(): AppState | null {
  try {
    for (const key of [SINGLE_STATE_KEY, V3_KEY, V2_KEY, LEGACY_KEY]) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const migrated = migrate(JSON.parse(raw))
      if (migrated) {
        return migrated
      }
    }
    return null
  } catch {
    return null
  }
}

function buildAccountSummary(id: string, state: AppState): AccountSummary {
  const lastCompletionAt = state.completions.reduce(
    (latest, completion) =>
      completion.completedAt > latest ? completion.completedAt : latest,
    '',
  )
  const lastTimeRecordAt = state.timeRecords.reduce(
    (latest, record) =>
      `${record.date}T23:59:59` > latest ? `${record.date}T23:59:59` : latest,
    '',
  )

  return {
    id,
    name: state.profile.name,
    handle: state.profile.handle,
    avatarUrl: state.profile.avatarUrl,
    lastUpdatedAt:
      lastCompletionAt || lastTimeRecordAt || `${state.lastActiveDate}T00:00:00`,
  }
}

function normalizeStoredAccounts(raw: StoredAccounts): StoredAccounts {
  const accounts = Object.fromEntries(
    Object.entries(raw.accounts ?? {}).map(([id, state]) => [
      id,
      normalizeState(state),
    ]),
  )
  const activeAccountId =
    raw.activeAccountId && accounts[raw.activeAccountId]
      ? raw.activeAccountId
      : Object.keys(accounts)[0] ?? ''

  return { activeAccountId, accounts }
}

function readLegacyStoredAccounts(): StoredAccounts | null {
  try {
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing) {
      return normalizeStoredAccounts(JSON.parse(existing) as StoredAccounts)
    }
  } catch {
    void 0
  }

  const legacyState = loadLegacySingleState() ?? createEmptyAppState()
  const accountId = crypto.randomUUID()
  const stored: StoredAccounts = {
    activeAccountId: accountId,
    accounts: {
      [accountId]: normalizeState(legacyState),
    },
  }
  return stored
}

function buildLoadedAccounts(stored: StoredAccounts): LoadedAccounts {
  return {
    activeAccountId: stored.activeAccountId,
    accountsById: stored.accounts,
    accounts: Object.entries(stored.accounts)
      .map(([id, accountState]) => buildAccountSummary(id, accountState))
      .sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt)),
  }
}

function clearLegacyLocalStorage(): void {
  try {
    for (const key of [STORAGE_KEY, SINGLE_STATE_KEY, V3_KEY, V2_KEY, LEGACY_KEY]) {
      localStorage.removeItem(key)
    }
  } catch {
    void 0
  }
}

function saveAccountsToLocalStorage(stored: StoredAccounts): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    return true
  } catch {
    return false
  }
}

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
        db.createObjectStore(INDEXED_DB_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'))
  })
}

function readIndexedDbStoredAccounts(): Promise<StoredAccounts | null> {
  return new Promise((resolve, reject) => {
    void openIndexedDb()
      .then((db) => {
        const transaction = db.transaction(INDEXED_DB_STORE, 'readonly')
        const store = transaction.objectStore(INDEXED_DB_STORE)
        const request = store.get(INDEXED_DB_KEY)

        request.onsuccess = () => {
          db.close()
          const result = request.result
          resolve(result ? normalizeStoredAccounts(result as StoredAccounts) : null)
        }
        request.onerror = () => {
          db.close()
          reject(request.error ?? new Error('Failed to read IndexedDB data.'))
        }
      })
      .catch(reject)
  })
}

function writeIndexedDbStoredAccounts(stored: StoredAccounts): Promise<void> {
  return new Promise((resolve, reject) => {
    void openIndexedDb()
      .then((db) => {
        const transaction = db.transaction(INDEXED_DB_STORE, 'readwrite')
        const store = transaction.objectStore(INDEXED_DB_STORE)
        transaction.oncomplete = () => {
          db.close()
          resolve()
        }
        transaction.onerror = () => {
          db.close()
          reject(transaction.error ?? new Error('Failed to write IndexedDB data.'))
        }
        store.put(stored, INDEXED_DB_KEY)
      })
      .catch(reject)
  })
}

export function loadAccountsSnapshot(): LoadedAccounts {
  const fallbackId = 'default'
  return buildLoadedAccounts(
    readLegacyStoredAccounts() ?? {
      activeAccountId: fallbackId,
      accounts: {
        [fallbackId]: createEmptyAppState(),
      },
    },
  )
}

export async function loadAccounts(): Promise<LoadedAccounts> {
  try {
    const indexedDbStored = await readIndexedDbStoredAccounts()
    if (indexedDbStored) {
      return buildLoadedAccounts(indexedDbStored)
    }

    const legacyStored = readLegacyStoredAccounts()
    if (legacyStored) {
      await writeIndexedDbStoredAccounts(legacyStored)
      clearLegacyLocalStorage()
      return buildLoadedAccounts(legacyStored)
    }
  } catch (error) {
    console.error('Failed to load HabitUp account data from IndexedDB.', error)
  }

  const fallback = readLegacyStoredAccounts()
  return buildLoadedAccounts(
    fallback ?? {
      activeAccountId: 'default',
      accounts: {
        default: createEmptyAppState(),
      },
    },
  )
}

export async function saveAccounts(
  activeAccountId: string,
  accounts: Record<string, AppState>,
): Promise<boolean> {
  const normalized = Object.fromEntries(
    Object.entries(accounts).map(([id, state]) => [id, normalizeState(state)]),
  )
  const stored = { activeAccountId, accounts: normalized }

  try {
    await writeIndexedDbStoredAccounts(stored)
    clearLegacyLocalStorage()
    return true
  } catch (error) {
    console.error('Failed to save HabitUp account data to IndexedDB.', error)
    return saveAccountsToLocalStorage(stored)
  }
}

export function createAccountState(name: string, handle?: string): AppState {
  const base = createEmptyAppState()
  const cleanName = name.trim() || 'Grinder'
  const cleanHandle =
    handle?.trim() ||
    `@${cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 16) || 'you'}`

  return {
    ...base,
    profile: {
      ...base.profile,
      name: cleanName,
      handle: cleanHandle.startsWith('@') ? cleanHandle : `@${cleanHandle}`,
    },
    lastActiveDate: getTodayISO(),
  }
}

export function createSaveFilePayload(state: AppState): SaveFilePayload {
  return {
    version: 1,
    exportedAt: getNowLocalISO(),
    accountName: state.profile.name,
    appState: normalizeState(state),
  }
}

export function parseSaveFilePayload(raw: string): AppState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SaveFilePayload> | AppState
    if ('appState' in parsed && parsed.appState) {
      return normalizeState(parsed.appState)
    }
    if ('habits' in parsed && Array.isArray(parsed.habits)) {
      return normalizeState(parsed as AppState)
    }
    return null
  } catch {
    return null
  }
}
