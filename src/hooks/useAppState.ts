import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createEmptyAppState, defaultAppState } from '../data/seedData'
import { addCompletion, removeCompletion } from '../lib/completions'
import { getTodayISO } from '../lib/dates'
import {
  applyCompletionOnDate,
  applyDailyReset,
  collectLinkedIds,
  completeHabit,
  createHabit,
  uncompleteHabit,
} from '../lib/habits'
import {
  createAccountState,
  createSaveFilePayload,
  loadAccounts,
  loadAccountsSnapshot,
  parseSaveFilePayload,
  saveAccounts,
} from '../lib/storage'
import { getDashboardStats } from '../lib/stats'
import { getStatsPageSummary } from '../lib/statsPage'
import { addTimeRecord } from '../lib/timeRecords'
import {
  calculateCompletionXp,
  calculateTimeXp,
  getLevelFromXp,
  toUserProfile,
  type XpBreakdown,
} from '../lib/xp'
import type {
  AccountSummary,
  AppPreferences,
  AppState,
  CompletionRecord,
  CoreAspect,
  DashboardPrefs,
  Habit,
  HabitCategory,
  Reward,
} from '../types'

type AccountsState = {
  activeAccountId: string
  accountsById: Record<string, AppState>
}

export type PurchaseRewardResult =
  | 'success'
  | 'owned'
  | 'insufficient'
  | 'missing'

export type UxpBurst = {
  id: string
  amount: number
  reason: string
}

export type DailySpinResult =
  | { kind: 'uxp'; amount: number }
  | { kind: 'reward'; rewardId: string; rewardName: string }
  | { kind: 'used' }
  | { kind: 'empty' }

function getHobbyLevel(totalProgress: number) {
  return Math.floor(Math.max(0, totalProgress) / 100) + 1
}

const LEVEL_UP_UXP_MIN = 25
const LEVEL_UP_UXP_MAX = 100

function getRandomUxpBonus(min = LEVEL_UP_UXP_MIN, max = LEVEL_UP_UXP_MAX) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getLevelUpUxpReward(
  prev: AppState,
  nextHabits: Habit[],
  nextProfile: AppState['profile'],
  touchedIds: string[],
) {
  const prevMainLevel = getLevelFromXp(
    prev.profile.totalXp ?? 0,
    prev.preferences,
  ).level
  const nextMainLevel = getLevelFromXp(
    nextProfile.totalXp ?? 0,
    prev.preferences,
  ).level

  let amount = 0
  if (nextMainLevel > prevMainLevel) {
    for (let level = prevMainLevel + 1; level <= nextMainLevel; level += 1) {
      void level
      amount += getRandomUxpBonus()
    }
  }

  for (const habitId of touchedIds) {
    const before = prev.habits.find((habit) => habit.id === habitId)
    const after = nextHabits.find((habit) => habit.id === habitId)
    if (!before || !after) continue

    const prevLevel =
      before.category === 'hobby'
        ? getHobbyLevel(before.totalProgress)
        : getLevelFromXp(
            before.totalXpEarned,
            prev.preferences,
          ).level
    const nextLevel =
      after.category === 'hobby'
        ? getHobbyLevel(after.totalProgress)
        : getLevelFromXp(
            after.totalXpEarned,
            prev.preferences,
          ).level

    if (nextLevel > prevLevel) {
      for (let level = prevLevel + 1; level <= nextLevel; level += 1) {
        void level
        amount += getRandomUxpBonus()
      }
    }
  }

  return amount
}

function prepareState(base: AppState): AppState {
  const today = getTodayISO()
  const habits = applyDailyReset(base.habits, base.lastActiveDate)
  const coreAspects =
    base.lastActiveDate === today
      ? base.coreAspects
      : base.coreAspects.map((aspect) => ({ ...aspect, progressToday: 0 }))
  const bountyTasks =
    base.lastActiveDate === today
      ? base.bountyTasks
      : base.bountyTasks.map((item) => ({ ...item, done: false }))
  const checks =
    base.lastActiveDate === today
      ? base.checks
      : base.checks.map((item) => ({ ...item, done: false }))
  const weeklyTasks =
    base.lastActiveDate === today
      ? base.weeklyTasks
      : base.weeklyTasks.map((item) => ({ ...item, done: false }))

  return {
    ...base,
    habits,
    coreAspects,
    bountyTasks,
    checks,
    weeklyTasks,
    lastActiveDate: today,
  }
}

const WEEKLY_TASK_XP = 10
const BOUNTY_TASK_XP = 25
const CHECK_TASK_XP = 2

function sanitizeAccentColor(color: string | undefined): string {
  const trimmed = color?.trim() ?? ''
  return /^#(?:[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : '#a3e635'
}

function applyCoreAspectIncrements(
  coreAspects: CoreAspect[],
  aspectCounts: Record<string, number>,
): CoreAspect[] {
  return coreAspects.map((aspect) => {
    const increment = aspectCounts[aspect.id] ?? 0
    if (increment <= 0) return aspect
    return {
      ...aspect,
      progressToday: aspect.progressToday + increment,
      totalProgress: aspect.totalProgress + increment,
    }
  })
}

function getCoreAspectCountsForHabits(
  habits: Habit[],
  habitIds: string[],
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const habitId of habitIds) {
    const habit = habits.find((entry) => entry.id === habitId)
    if (!habit) continue
    for (const aspectId of habit.linkedCoreAspectIds ?? []) {
      counts[aspectId] = (counts[aspectId] ?? 0) + 1
    }
  }
  return counts
}

function applyCompletionRewards(
  prev: AppState,
  targetIds: string[],
  today: string,
) {
  let totalBaseMinutes = 0
  let totalCompletionXp = 0
  let totalTimeXp = 0
  let timeRecords = prev.timeRecords
  const awardedByHabit: Record<
    string,
    { baseMinutes: number; completionXp: number; timeXp: number; totalXp: number }
  > = {}

  for (const completedId of targetIds) {
    const completedHabit = prev.habits.find((entry) => entry.id === completedId)
    if (!completedHabit) continue

    const completionXpValue = prev.preferences.itemCompletionXp[completedId] ?? 15
    const baseMinutes = Math.max(
      0,
      Math.round(prev.preferences.itemBaseMinutes[completedId] ?? 0),
    )

    const completionXp = calculateCompletionXp(completedHabit, completionXpValue)
    const timeXp =
      baseMinutes > 0 ? calculateTimeXp(completedHabit, baseMinutes) : null

    totalCompletionXp += completionXp.total
    totalBaseMinutes += baseMinutes
    totalTimeXp += timeXp?.total ?? 0
    awardedByHabit[completedId] = {
      baseMinutes,
      completionXp: completionXp.total,
      timeXp: timeXp?.total ?? 0,
      totalXp: completionXp.total + (timeXp?.total ?? 0),
    }

    if (baseMinutes > 0) {
      timeRecords = addTimeRecord(
        timeRecords,
        completedHabit.id,
        completedHabit.name,
        today,
        baseMinutes,
        'manual',
      )
    }
  }

  return {
    totalBaseMinutes,
    totalCompletionXp,
    totalTimeXp,
    timeRecords,
    awardedByHabit,
  }
}

export function useAppState() {
  const [accountsState, setAccountsState] = useState<AccountsState>(() => {
    const loaded = loadAccountsSnapshot()
    const accountsById = Object.fromEntries(
      Object.entries(loaded.accountsById).map(([id, accountState]) => [
        id,
        prepareState(accountState),
      ]),
    )

    if (!accountsById[loaded.activeAccountId]) {
      accountsById[loaded.activeAccountId] = prepareState(defaultAppState)
    }

    return {
      activeAccountId: loaded.activeAccountId,
      accountsById,
    }
  })
  const [uxpBurst, setUxpBurst] = useState<UxpBurst | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [storageHydrated, setStorageHydrated] = useState(false)

  const state =
    accountsState.accountsById[accountsState.activeAccountId] ?? defaultAppState

  useEffect(() => {
    if (!uxpBurst) return
    const timeoutId = window.setTimeout(() => setUxpBurst(null), 1400)
    return () => window.clearTimeout(timeoutId)
  }, [uxpBurst])

  useEffect(() => {
    let cancelled = false

    void loadAccounts()
      .then((loaded) => {
        if (cancelled) return
        const accountsById = Object.fromEntries(
          Object.entries(loaded.accountsById).map(([id, accountState]) => [
            id,
            prepareState(accountState),
          ]),
        )

        if (!accountsById[loaded.activeAccountId]) {
          accountsById[loaded.activeAccountId] = prepareState(defaultAppState)
        }

        setAccountsState({
          activeAccountId: loaded.activeAccountId,
          accountsById,
        })
        setSaveError(null)
        setStorageHydrated(true)
      })
      .catch((error) => {
        console.error('Failed to hydrate HabitUp account data.', error)
        if (cancelled) return
        setStorageHydrated(true)
        setSaveError('Changes may not persist because browser storage is unavailable.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!storageHydrated) return

    void saveAccounts(accountsState.activeAccountId, accountsState.accountsById).then(
      (saved) => {
        setSaveError(
          saved ? null : 'Changes may not persist because browser storage is unavailable.',
        )
      },
    )
  }, [accountsState, storageHydrated])

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--accent',
      sanitizeAccentColor(state.profile.accentColor),
    )
  }, [state.profile.accentColor])

  const updateCurrentState = useCallback(
    (updater: (prev: AppState) => AppState) => {
      setAccountsState((prev) => ({
        ...prev,
        accountsById: {
          ...prev.accountsById,
          [prev.activeAccountId]: updater(
            prev.accountsById[prev.activeAccountId] ?? defaultAppState,
          ),
        },
      }))
    },
    [],
  )

  useEffect(() => {
    const syncDayBoundary = () => {
      const today = getTodayISO()
      updateCurrentState((prev) => {
        if (prev.lastActiveDate === today) return prev
        return {
          ...prev,
          habits: applyDailyReset(prev.habits, prev.lastActiveDate),
          coreAspects: prev.coreAspects.map((aspect) =>
            aspect.progressToday > 0 ? { ...aspect, progressToday: 0 } : aspect,
          ),
          bountyTasks: prev.bountyTasks.map((item) =>
            item.done ? { ...item, done: false } : item,
          ),
          checks: prev.checks.map((item) =>
            item.done ? { ...item, done: false } : item,
          ),
          weeklyTasks: prev.weeklyTasks.map((item) =>
            item.done ? { ...item, done: false } : item,
          ),
          lastActiveDate: today,
        }
      })
    }

    syncDayBoundary()
    const intervalId = window.setInterval(syncDayBoundary, 60_000)
    return () => window.clearInterval(intervalId)
  }, [updateCurrentState])

  const profile = useMemo(
    () => toUserProfile(state.profile, state.preferences),
    [state.preferences, state.profile],
  )
  const preferences = useMemo(() => state.preferences, [state.preferences])
  const accounts = useMemo<AccountSummary[]>(
    () =>
      Object.entries(accountsState.accountsById)
        .map(([id, accountState]) => ({
          id,
          name: accountState.profile.name,
          handle: accountState.profile.handle,
          avatarUrl: accountState.profile.avatarUrl,
          lastUpdatedAt: [
            ...accountState.completions.map((completion) => completion.completedAt),
            ...accountState.timeRecords.map((record) => `${record.date}T23:59:59`),
            `${accountState.lastActiveDate}T00:00:00`,
          ]
            .sort()
            .at(-1) ?? `${accountState.lastActiveDate}T00:00:00`,
        }))
        .sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt)),
    [accountsState.accountsById],
  )
  const stats = useMemo(
    () => getDashboardStats(state.habits),
    [state.habits],
  )
  const statsPageSummary = useMemo(
    () =>
      getStatsPageSummary(
        state.habits,
        state.completions,
        state.timeRecords,
        state.preferences,
        state.profile.totalXp ?? 0,
        state.profile.totalMinutes ?? 0,
      ),
    [
      state.habits,
      state.completions,
      state.timeRecords,
      state.preferences,
      state.profile.totalXp,
    ],
  )

  const applyHabitToggle = useCallback(
    (
      habits: AppState['habits'],
      completions: CompletionRecord[],
      id: string,
      completing: boolean,
      today: string,
    ) => {
      const linked = collectLinkedIds(habits, id)
      const targetIds = new Set([id, ...linked])

      let nextCompletions = completions
      const completedHabitIds: string[] = []
      let nextHabits = habits.map((habit) => {
        if (!targetIds.has(habit.id)) return habit

        if (completing) {
          if (habit.doneToday) return habit
          completedHabitIds.push(habit.id)
          nextCompletions = addCompletion(
            nextCompletions,
            habit.id,
            habit.name,
            today,
          )
          return completeHabit(habit, today)
        }

        if (!habit.doneToday) return habit
        if (habit.category === 'hobby' && habit.progressToday > 0) return habit
        nextCompletions = removeCompletion(nextCompletions, habit.id, today)
        return uncompleteHabit(habit, today)
      })

      return { habits: nextHabits, completions: nextCompletions, completedHabitIds }
    },
    [],
  )

  const toggleHabit = useCallback((id: string) => {
    const today = getTodayISO()
    let levelUpBonus = 0

    updateCurrentState((prev) => {
      const habit = prev.habits.find((h) => h.id === id)
      if (!habit) return prev

      const completing = !habit.doneToday
      const { habits, completions, completedHabitIds } = applyHabitToggle(
        prev.habits,
        prev.completions,
        id,
        completing,
        today,
      )

      let profile = prev.profile
      let timeRecords = prev.timeRecords
      let awardedByHabit: Record<
        string,
        { baseMinutes: number; completionXp: number; timeXp: number; totalXp: number }
      > = {}
      if (completing) {
        const rewards = applyCompletionRewards(prev, completedHabitIds, today)
        const { totalBaseMinutes, totalCompletionXp, totalTimeXp } = rewards
        timeRecords = rewards.timeRecords
        awardedByHabit = rewards.awardedByHabit

        profile = {
          ...profile,
          totalMinutes: profile.totalMinutes + totalBaseMinutes,
          shopXp:
            (profile.shopXp ?? 0) + totalCompletionXp + totalTimeXp,
          totalXp:
            (profile.totalXp ?? 0) + totalCompletionXp + totalTimeXp,
        }
      }

      const nextHabits =
        completing
          ? habits.map((entry) =>
              completedHabitIds.includes(entry.id)
                ? {
                    ...entry,
                    progressToday:
                      entry.category === 'hobby'
                        ? entry.progressToday + 1
                        : entry.progressToday,
                    totalProgress:
                      entry.category === 'hobby'
                        ? entry.totalProgress + 1
                        : entry.totalProgress,
                    totalMinutes:
                      entry.totalMinutes +
                      Math.max(
                        0,
                        Math.round(prev.preferences.itemBaseMinutes[entry.id] ?? 0),
                      ),
                    totalXpEarned:
                      entry.totalXpEarned +
                      (awardedByHabit[entry.id]?.totalXp ?? 0),
                  }
                : entry,
            )
          : habits
      const nextCoreAspects = completing
        ? applyCoreAspectIncrements(
            prev.coreAspects,
            getCoreAspectCountsForHabits(prev.habits, completedHabitIds),
          )
        : prev.coreAspects

      levelUpBonus = completing
        ? getLevelUpUxpReward(prev, nextHabits, profile, completedHabitIds)
        : 0
      const nextProfile =
        levelUpBonus > 0
          ? {
              ...profile,
              shopXp: (profile.shopXp ?? 0) + levelUpBonus,
            }
          : profile

      return {
        ...prev,
        habits: nextHabits,
        coreAspects: nextCoreAspects,
        completions,
        profile: nextProfile,
        timeRecords,
        lastActiveDate: today,
      }
    })

    if (levelUpBonus > 0) {
      setUxpBurst({
        id: crypto.randomUUID(),
        amount: levelUpBonus,
        reason: 'Level up',
      })
    }
  }, [applyHabitToggle, updateCurrentState])

  const addManualCompletion = useCallback((habitId: string, date: string) => {
    if (!date) return
    let levelUpBonus = 0

    updateCurrentState((prev) => {
      const exists = prev.completions.some(
        (c) => c.habitId === habitId && c.date === date,
      )
      if (exists) return prev

      const habit = prev.habits.find((h) => h.id === habitId)
      if (!habit) return prev

      const linked = collectLinkedIds(prev.habits, habitId)
      const targetIds = new Set([habitId, ...linked])

      let completions = prev.completions
      let xpGain = 0
      const habits = prev.habits.map((h) => {
        if (!targetIds.has(h.id)) return h
        if (h.id === habitId) {
          const baseXp = prev.preferences.itemCompletionXp[h.id] ?? 15
          xpGain = calculateCompletionXp(h, baseXp).total
        }
        completions = addCompletion(completions, h.id, h.name, date)
        return {
          ...applyCompletionOnDate(h, date),
          totalXpEarned:
            h.totalXpEarned + (h.id === habitId ? xpGain : 0),
        }
      })

      const profile =
        xpGain > 0
          ? {
              ...prev.profile,
              totalXp: (prev.profile.totalXp ?? 0) + xpGain,
              shopXp: (prev.profile.shopXp ?? 0) + xpGain,
            }
          : prev.profile
      levelUpBonus = xpGain > 0 ? getLevelUpUxpReward(prev, habits, profile, [habitId]) : 0
      const nextProfile =
        levelUpBonus > 0
          ? { ...profile, shopXp: (profile.shopXp ?? 0) + levelUpBonus }
          : profile

      return {
        ...prev,
        habits,
        coreAspects: applyCoreAspectIncrements(
          prev.coreAspects,
          getCoreAspectCountsForHabits(prev.habits, [...targetIds]),
        ),
        completions,
        profile: nextProfile,
      }
    })

    if (levelUpBonus > 0) {
      setUxpBurst({
        id: crypto.randomUUID(),
        amount: levelUpBonus,
        reason: 'Level up',
      })
    }
  }, [updateCurrentState])

  const grantXpRef = useRef<XpBreakdown | null>(null)

  const addManualTime = useCallback(
    (
      habitId: string,
      minutes: number,
      date?: string,
      source: 'manual' | 'timer' = 'manual',
    ): XpBreakdown | null => {
      const clamped = Math.min(600, Math.max(1, Math.round(minutes)))
      const logDate = date ?? getTodayISO()
      grantXpRef.current = null
      let levelUpBonus = 0

      updateCurrentState((prev) => {
        const habit = prev.habits.find((h) => h.id === habitId)
        if (!habit) return prev

        const xp = calculateTimeXp(habit, clamped)
        grantXpRef.current = xp

        const timeRecords = addTimeRecord(
          prev.timeRecords,
          habitId,
          habit.name,
          logDate,
          clamped,
          source,
        )

        const habits = prev.habits.map((h) =>
          h.id === habitId
            ? {
                ...h,
                totalMinutes: h.totalMinutes + clamped,
                totalXpEarned: h.totalXpEarned + xp.total,
              }
            : h,
        )

        const profile = {
          ...prev.profile,
          totalMinutes: prev.profile.totalMinutes + clamped,
          shopXp: (prev.profile.shopXp ?? 0) + xp.total,
          totalXp: (prev.profile.totalXp ?? 0) + xp.total,
        }
        levelUpBonus = getLevelUpUxpReward(prev, habits, profile, [habitId])
        const nextProfile =
          levelUpBonus > 0
            ? { ...profile, shopXp: (profile.shopXp ?? 0) + levelUpBonus }
            : profile

        return { ...prev, habits, timeRecords, profile: nextProfile }
      })

      if (levelUpBonus > 0) {
        setUxpBurst({
          id: crypto.randomUUID(),
          amount: levelUpBonus,
          reason: 'Level up',
        })
      }

      return grantXpRef.current
    },
    [updateCurrentState],
  )

  const logTimerSession = useCallback(
    (habitId: string, minutes: number): XpBreakdown | null => {
      return addManualTime(habitId, minutes, undefined, 'timer')
    },
    [addManualTime],
  )

  const setLinkedHabits = useCallback((habitId: string, linkedIds: string[]) => {
    const cleaned = linkedIds.filter((id) => id !== habitId)

    updateCurrentState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => {
        if (h.id === habitId) {
          return { ...h, linkedHabitIds: cleaned }
        }
        if (cleaned.includes(h.id) && !(h.linkedHabitIds ?? []).includes(habitId)) {
          return { ...h, linkedHabitIds: [...(h.linkedHabitIds ?? []), habitId] }
        }
        if (!cleaned.includes(h.id) && (h.linkedHabitIds ?? []).includes(habitId)) {
          return {
            ...h,
            linkedHabitIds: (h.linkedHabitIds ?? []).filter((id) => id !== habitId),
          }
        }
        return h
      }),
    }))
  }, [updateCurrentState])

  const setLinkedCoreAspects = useCallback((habitId: string, aspectIds: string[]) => {
    const cleaned = aspectIds.filter((id, index, arr) => arr.indexOf(id) === index)
    updateCurrentState((prev) => ({
      ...prev,
      habits: prev.habits.map((habit) =>
        habit.id === habitId
          ? { ...habit, linkedCoreAspectIds: cleaned }
          : habit,
      ),
    }))
  }, [updateCurrentState])

  const incrementHobby = useCallback((id: string) => {
    const today = getTodayISO()
    let levelUpBonus = 0

    updateCurrentState((prev) => {
      const hobby = prev.habits.find((entry) => entry.id === id)
      if (!hobby || hobby.category !== 'hobby') return prev

      const linked = collectLinkedIds(prev.habits, id)
      const targetIds = [id, ...linked].filter((targetId, index, arr) => arr.indexOf(targetId) === index)
      const completedTodayIds: string[] = []
      let completions = prev.completions

      const habits = prev.habits.map((entry) => {
        if (!targetIds.includes(entry.id)) return entry
        if (entry.category !== 'hobby') return entry

        const nextProgress = (entry.progressToday ?? 0) + 1
        let nextEntry: Habit = {
          ...entry,
          progressToday: nextProgress,
          totalProgress: entry.totalProgress + 1,
        }

        if (!entry.doneToday) {
          nextEntry = completeHabit(nextEntry, today)
          completions = addCompletion(completions, entry.id, entry.name, today)
          completedTodayIds.push(entry.id)
        }

        return nextEntry
      })

      const rewards = applyCompletionRewards(prev, targetIds, today)
      const profile = {
        ...prev.profile,
        totalMinutes: prev.profile.totalMinutes + rewards.totalBaseMinutes,
        shopXp:
          (prev.profile.shopXp ?? 0) +
          rewards.totalCompletionXp +
          rewards.totalTimeXp,
        totalXp:
          (prev.profile.totalXp ?? 0) +
          rewards.totalCompletionXp +
          rewards.totalTimeXp,
      }

      const nextHabits = habits.map((entry) =>
        targetIds.includes(entry.id)
          ? {
              ...entry,
              totalMinutes:
                entry.totalMinutes +
                Math.max(
                  0,
                  Math.round(prev.preferences.itemBaseMinutes[entry.id] ?? 0),
                ),
              totalXpEarned:
                entry.totalXpEarned +
                (rewards.awardedByHabit[entry.id]?.totalXp ?? 0),
            }
          : entry,
      )
      const nextCoreAspects = applyCoreAspectIncrements(
        prev.coreAspects,
        getCoreAspectCountsForHabits(prev.habits, targetIds),
      )
      levelUpBonus = getLevelUpUxpReward(prev, nextHabits, profile, targetIds)
      const nextProfile =
        levelUpBonus > 0
          ? {
              ...profile,
              shopXp: (profile.shopXp ?? 0) + levelUpBonus,
            }
          : profile

      return {
        ...prev,
        habits: nextHabits,
        coreAspects: nextCoreAspects,
        completions,
        profile: nextProfile,
        timeRecords: rewards.timeRecords,
        lastActiveDate: today,
      }
    })

    if (levelUpBonus > 0) {
      setUxpBurst({
        id: crypto.randomUUID(),
        amount: levelUpBonus,
        reason: 'Level up',
      })
    }
  }, [updateCurrentState])

  const setHabitWeights = useCallback(
    (habitId: string, difficulty: number, priority: number) => {
      const d = Math.min(5, Math.max(1, Math.round(difficulty)))
      const p = Math.min(5, Math.max(1, Math.round(priority)))
      updateCurrentState((prev) => ({
        ...prev,
        habits: prev.habits.map((h) =>
          h.id === habitId ? { ...h, difficulty: d, priority: p } : h,
        ),
      }))
    },
    [updateCurrentState],
  )

  const setHabitTags = useCallback((habitId: string, tags: string[]) => {
    updateCurrentState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) =>
        h.id === habitId ? { ...h, tags } : h,
      ),
    }))
  }, [updateCurrentState])

  const addHabit = useCallback((name: string, category: HabitCategory = 'habit') => {
    const trimmed = name.trim()
    if (!trimmed) return

    const today = getTodayISO()
    const habit = createHabit(trimmed, category)

    updateCurrentState((prev) => ({
      ...prev,
      habits: [...prev.habits, habit],
      lastActiveDate: today,
    }))
  }, [updateCurrentState])

  const addWeeklyTask = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return

    updateCurrentState((prev) => ({
      ...prev,
      weeklyTasks: [
        ...prev.weeklyTasks,
        { id: crypto.randomUUID(), name: trimmed, done: false },
      ],
    }))
  }, [updateCurrentState])

  const addBountyTask = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return

    updateCurrentState((prev) => ({
      ...prev,
      bountyTasks: [
        ...prev.bountyTasks,
        { id: crypto.randomUUID(), name: trimmed, done: false },
      ],
    }))
  }, [updateCurrentState])

  const addCoreAspect = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return

    updateCurrentState((prev) => ({
      ...prev,
      coreAspects: [
        ...prev.coreAspects,
        {
          id: crypto.randomUUID(),
          name: trimmed,
          progressToday: 0,
          totalProgress: 0,
        },
      ],
    }))
  }, [updateCurrentState])

  const addCheck = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return

    updateCurrentState((prev) => ({
      ...prev,
      checks: [
        ...prev.checks,
        { id: crypto.randomUUID(), name: trimmed, done: false },
      ],
    }))
  }, [updateCurrentState])

  const toggleWeeklyTask = useCallback((id: string) => {
    let levelUpBonus = 0
    updateCurrentState((prev) => {
      let xpGain = 0
  
      const weeklyTasks = prev.weeklyTasks.map((t) => {
        if (t.id !== id) return t
  
        const nextDone = !t.done
  
        if (nextDone) {
          xpGain = WEEKLY_TASK_XP
        }
  
        return {
          ...t,
          done: nextDone,
        }
      })
  
      const profile =
        xpGain > 0
          ? {
              ...prev.profile,
              totalXp: (prev.profile.totalXp ?? 0) + xpGain,
              shopXp: (prev.profile.shopXp ?? 0) + xpGain,
            }
          : prev.profile
      levelUpBonus = xpGain > 0 ? getLevelUpUxpReward(prev, prev.habits, profile, []) : 0
      const nextProfile =
        levelUpBonus > 0
          ? { ...profile, shopXp: (profile.shopXp ?? 0) + levelUpBonus }
          : profile
  
      return {
        ...prev,
        weeklyTasks,
        profile: nextProfile,
      }
    })
    if (levelUpBonus > 0) {
      setUxpBurst({
        id: crypto.randomUUID(),
        amount: levelUpBonus,
        reason: 'Level up',
      })
    }
  }, [updateCurrentState])

  const toggleBountyTask = useCallback((id: string) => {
    let levelUpBonus = 0
    updateCurrentState((prev) => {
      let xpGain = 0

      const task = prev.bountyTasks.find((entry) => entry.id === id)
      if (!task) return prev
      xpGain = prev.preferences.itemCompletionXp[task.id] ?? BOUNTY_TASK_XP
      const bountyTasks = prev.bountyTasks.filter((entry) => entry.id !== id)

      const profile =
        xpGain > 0
          ? {
              ...prev.profile,
              totalXp: (prev.profile.totalXp ?? 0) + xpGain,
              shopXp: (prev.profile.shopXp ?? 0) + xpGain,
            }
          : prev.profile
      levelUpBonus =
        xpGain > 0 ? getLevelUpUxpReward(prev, prev.habits, profile, []) : 0
      const nextProfile =
        levelUpBonus > 0
          ? { ...profile, shopXp: (profile.shopXp ?? 0) + levelUpBonus }
          : profile

      return {
        ...prev,
        bountyTasks,
        profile: nextProfile,
      }
    })
    if (levelUpBonus > 0) {
      setUxpBurst({
        id: crypto.randomUUID(),
        amount: levelUpBonus,
        reason: 'Level up',
      })
    }
  }, [updateCurrentState])

  const toggleCheck = useCallback((id: string) => {
    let levelUpBonus = 0
    updateCurrentState((prev) => {
      let xpGain = 0

      const checks = prev.checks.map((item) => {
        if (item.id !== id) return item
        const nextDone = !item.done
        if (nextDone) xpGain = CHECK_TASK_XP
        return { ...item, done: nextDone }
      })

      const profile =
        xpGain > 0
          ? {
              ...prev.profile,
              totalXp: (prev.profile.totalXp ?? 0) + xpGain,
              shopXp: (prev.profile.shopXp ?? 0) + xpGain,
            }
          : prev.profile
      levelUpBonus = xpGain > 0 ? getLevelUpUxpReward(prev, prev.habits, profile, []) : 0
      const nextProfile =
        levelUpBonus > 0
          ? { ...profile, shopXp: (profile.shopXp ?? 0) + levelUpBonus }
          : profile

      return {
        ...prev,
        checks,
        profile: nextProfile,
      }
    })
    if (levelUpBonus > 0) {
      setUxpBurst({
        id: crypto.randomUUID(),
        amount: levelUpBonus,
        reason: 'Level up',
      })
    }
  }, [updateCurrentState])

  const incrementCoreAspect = useCallback((id: string) => {
    updateCurrentState((prev) => ({
      ...prev,
      coreAspects: prev.coreAspects.map((aspect) =>
        aspect.id === id
          ? {
              ...aspect,
              progressToday: aspect.progressToday + 1,
              totalProgress: aspect.totalProgress + 1,
            }
          : aspect,
      ),
    }))
  }, [updateCurrentState])

  const removeWeeklyTask = useCallback((id: string) => {
    updateCurrentState((prev) => ({
      ...prev,
      weeklyTasks: prev.weeklyTasks.filter((t) => t.id !== id),
    }))
  }, [updateCurrentState])

  const removeBountyTask = useCallback((id: string) => {
    updateCurrentState((prev) => ({
      ...prev,
      bountyTasks: prev.bountyTasks.filter((task) => task.id !== id),
    }))
  }, [updateCurrentState])

  const removeCheck = useCallback((id: string) => {
    updateCurrentState((prev) => ({
      ...prev,
      checks: prev.checks.filter((item) => item.id !== id),
    }))
  }, [updateCurrentState])

  const setChecksOpen = useCallback((open: boolean) => {
    updateCurrentState((prev) => ({
      ...prev,
      dashboard: { ...prev.dashboard, checksOpen: open },
    }))
  }, [updateCurrentState])

  const setBountiesOpen = useCallback((open: boolean) => {
    updateCurrentState((prev) => ({
      ...prev,
      dashboard: { ...prev.dashboard, bountiesOpen: open },
    }))
  }, [updateCurrentState])

  const setWeeklyOpen = useCallback((open: boolean) => {
    updateCurrentState((prev) => ({
      ...prev,
      dashboard: { ...prev.dashboard, weeklyOpen: open },
    }))
  }, [updateCurrentState])

  const setCategoryCollapsed = useCallback(
    (category: HabitCategory, collapsed: boolean) => {
      updateCurrentState((prev) => ({
        ...prev,
        dashboard: {
          ...prev.dashboard,
          collapsedCategories: {
            ...prev.dashboard.collapsedCategories,
            [category]: collapsed,
          },
        },
      }))
    },
    [updateCurrentState],
  )

  const updateDashboard = useCallback(
    (patch: Partial<DashboardPrefs>) => {
      updateCurrentState((prev) => ({
        ...prev,
        dashboard: { ...prev.dashboard, ...patch },
      }))
    },
    [updateCurrentState],
  )

  const setDailyGoal = useCallback((dailyGoal: string) => {
    updateDashboard({ dailyGoal })
  }, [updateDashboard])

  const updatePreferences = useCallback(
    (patch: Partial<AppPreferences>) => {
      updateCurrentState((prev) => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          ...patch,
          itemCompletionXp: {
            ...prev.preferences.itemCompletionXp,
            ...patch.itemCompletionXp,
          },
          itemBaseMinutes: {
            ...prev.preferences.itemBaseMinutes,
            ...patch.itemBaseMinutes,
          },
          levelUpBaseXp:
            patch.levelUpBaseXp == null
              ? prev.preferences.levelUpBaseXp
              : Math.max(25, Math.round(patch.levelUpBaseXp)),
          levelUpIncrementXp:
            patch.levelUpIncrementXp == null
              ? prev.preferences.levelUpIncrementXp
              : Math.max(0, Math.round(patch.levelUpIncrementXp)),
          ranks: patch.ranks ?? prev.preferences.ranks,
          dailySpinUxps:
            patch.dailySpinUxps ?? prev.preferences.dailySpinUxps,
          dailySpinRewardIds:
            patch.dailySpinRewardIds ?? prev.preferences.dailySpinRewardIds,
        },
      }))
    },
    [updateCurrentState],
  )

  const resetToday = useCallback(() => {
    const today = getTodayISO()
    updateCurrentState((prev) => {
      const habits = prev.habits.map((habit) =>
        habit.doneToday ? uncompleteHabit(habit, today) : habit,
      )
      const coreAspects = prev.coreAspects.map((aspect) =>
        aspect.progressToday > 0 ? { ...aspect, progressToday: 0 } : aspect,
      )
      const completions = prev.completions.filter((entry) => entry.date !== today)
      const checks = prev.checks.map((item) =>
        item.done ? { ...item, done: false } : item,
      )
      const bountyTasks = prev.bountyTasks.map((item) =>
        item.done ? { ...item, done: false } : item,
      )
      const weeklyTasks = prev.weeklyTasks.map((item) =>
        item.done ? { ...item, done: false } : item,
      )

      return {
        ...prev,
        habits,
        coreAspects,
        bountyTasks,
        checks,
        weeklyTasks,
        completions,
        lastActiveDate: today,
      }
    })
  }, [updateCurrentState])

  const softReset = useCallback(() => {
    updateCurrentState((prev) => {
      const empty = createEmptyAppState()
      return {
        ...empty,
        profile: {
          ...empty.profile,
          name: prev.profile.name,
          handle: prev.profile.handle,
          avatarUrl: prev.profile.avatarUrl,
          accentColor: prev.profile.accentColor,
          streakSymbol: prev.profile.streakSymbol,
          streakSymbolImageUrl: prev.profile.streakSymbolImageUrl,
        },
        preferences: prev.preferences,
        rewards: prev.rewards,
        dashboard: {
          ...empty.dashboard,
          quotes: prev.dashboard.quotes,
          activeQuoteIndex: prev.dashboard.activeQuoteIndex,
        },
      }
    })
  }, [updateCurrentState])

  const fullReset = useCallback(() => {
    updateCurrentState(() => createEmptyAppState())
  }, [updateCurrentState])

  const addQuote = useCallback((quote: string) => {
    const trimmed = quote.trim()
    if (!trimmed) return
    updateCurrentState((prev) => ({
      ...prev,
      dashboard: {
        ...prev.dashboard,
        quotes: [...prev.dashboard.quotes, trimmed],
      },
    }))
  }, [updateCurrentState])

  const removeQuote = useCallback((index: number) => {
    updateCurrentState((prev) => {
      const quotes = prev.dashboard.quotes.filter((_, i) => i !== index)
      let activeQuoteIndex = prev.dashboard.activeQuoteIndex
      if (activeQuoteIndex !== null) {
        if (activeQuoteIndex === index) activeQuoteIndex = null
        else if (activeQuoteIndex > index) activeQuoteIndex -= 1
      }
      return {
        ...prev,
        dashboard: { ...prev.dashboard, quotes, activeQuoteIndex },
      }
    })
  }, [updateCurrentState])

  const shuffleQuote = useCallback(() => {
    updateCurrentState((prev) => {
      const { quotes } = prev.dashboard
      if (quotes.length === 0) {
        return {
          ...prev,
          dashboard: { ...prev.dashboard, activeQuoteIndex: null },
        }
      }
      const next =
        quotes.length === 1
          ? 0
          : (() => {
              let idx = Math.floor(Math.random() * quotes.length)
              const current = prev.dashboard.activeQuoteIndex
              if (current !== null && quotes.length > 1) {
                while (idx === current) {
                  idx = Math.floor(Math.random() * quotes.length)
                }
              }
              return idx
            })()
      return {
        ...prev,
        dashboard: { ...prev.dashboard, activeQuoteIndex: next },
      }
    })
  }, [updateCurrentState])

  const purchaseReward = useCallback((rewardId: string): PurchaseRewardResult => {
    let result: PurchaseRewardResult = 'missing'

    updateCurrentState((prev) => {
      const reward = prev.rewards.find((r) => r.id === rewardId)
      if (!reward) return prev

      const available = prev.profile.shopXp ?? 0
      if (available < reward.cost) {
        result = 'insufficient'
        return prev
      }

      if (
        reward.oneTime &&
        prev.purchasedRewards.some((p) => p.rewardId === rewardId)
      ) {
        result = 'owned'
        return prev
      }

      result = 'success'
      const today = getTodayISO()

      return {
        ...prev,
        profile: {
          ...prev.profile,
          shopXp: Math.max(0, (prev.profile.shopXp ?? 0) - reward.cost),
          spentXp: (prev.profile.spentXp ?? 0) + reward.cost,
        },
        purchasedRewards: [
          ...prev.purchasedRewards,
          { rewardId, purchasedAt: today },
        ],
      }
    })

    return result
  }, [updateCurrentState])

  const spinDailyReward = useCallback((): DailySpinResult => {
    const today = getTodayISO()
    let result: DailySpinResult = { kind: 'empty' }

    updateCurrentState((prev) => {
      if (prev.lastDailySpinDate === today) {
        result = { kind: 'used' }
        return prev
      }

      const rewardPool = prev.rewards.filter((reward) => {
        if (!prev.preferences.dailySpinRewardIds.includes(reward.id)) return false
        if (!reward.oneTime) return true
        return !prev.purchasedRewards.some((purchase) => purchase.rewardId === reward.id)
      })
      const uxpPool = prev.preferences.dailySpinUxps
        .map((value) => Math.max(1, Math.round(value)))
        .filter((value) => Number.isFinite(value))

      const options = [
        ...uxpPool.map((amount) => ({ kind: 'uxp' as const, amount })),
        ...rewardPool.map((reward) => ({ kind: 'reward' as const, reward })),
      ]

      if (options.length === 0) {
        result = { kind: 'empty' }
        return prev
      }

      const picked = options[Math.floor(Math.random() * options.length)]

      if (picked.kind === 'uxp') {
        result = { kind: 'uxp', amount: picked.amount }
        return {
          ...prev,
          lastDailySpinDate: today,
          profile: {
            ...prev.profile,
            shopXp: (prev.profile.shopXp ?? 0) + picked.amount,
          },
        }
      }

      result = {
        kind: 'reward',
        rewardId: picked.reward.id,
        rewardName: picked.reward.name,
      }
      return {
        ...prev,
        lastDailySpinDate: today,
        purchasedRewards: [
          ...prev.purchasedRewards,
          { rewardId: picked.reward.id, purchasedAt: today },
        ],
      }
    })

    if ('amount' in result && typeof result.amount === 'number') {
      setUxpBurst({
        id: crypto.randomUUID(),
        amount: result.amount,
        reason: 'Daily spin',
      })
    }

    return result
  }, [updateCurrentState])

  const addReward = useCallback((input: Omit<Reward, 'id'>) => {
    const name = input.name.trim()
    const description = input.description.trim()
    const emoji = input.emoji.trim() || '🎁'
    const cost = Math.max(0, Math.round(input.cost))
    if (!name || !description) return false

    updateCurrentState((prev) => ({
      ...prev,
      rewards: [
        ...prev.rewards,
        {
          id: crypto.randomUUID(),
          name,
          description,
          emoji,
          imageUrl: input.imageUrl ?? null,
          cost,
          oneTime: input.oneTime,
        },
      ],
    }))
    return true
  }, [updateCurrentState])

  const updateReward = useCallback((rewardId: string, patch: Partial<Omit<Reward, 'id'>>) => {
    let updated = false
    updateCurrentState((prev) => ({
      ...prev,
      rewards: prev.rewards.map((reward) => {
        if (reward.id !== rewardId) return reward
        updated = true
        return {
          ...reward,
          ...patch,
          name: patch.name?.trim() ?? reward.name,
          description: patch.description?.trim() ?? reward.description,
          emoji: patch.emoji?.trim() || reward.emoji,
          imageUrl:
            patch.imageUrl === undefined ? reward.imageUrl ?? null : patch.imageUrl,
          cost:
            patch.cost == null
              ? reward.cost
              : Math.max(0, Math.round(patch.cost)),
        }
      }),
    }))
    return updated
  }, [updateCurrentState])

  const removeReward = useCallback((rewardId: string) => {
    let removed = false
    updateCurrentState((prev) => {
      if (!prev.rewards.some((reward) => reward.id === rewardId)) return prev
      removed = true
      return {
        ...prev,
        rewards: prev.rewards.filter((reward) => reward.id !== rewardId),
        purchasedRewards: prev.purchasedRewards.filter((purchase) => purchase.rewardId !== rewardId),
      }
    })
    return removed
  }, [updateCurrentState])

  const reorderReward = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return false

    let reordered = false
    updateCurrentState((prev) => {
      const from = prev.rewards.findIndex((reward) => reward.id === draggedId)
      const to = prev.rewards.findIndex((reward) => reward.id === targetId)
      if (from === -1 || to === -1) return prev

      const next = [...prev.rewards]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      reordered = true

      return {
        ...prev,
        rewards: next,
      }
    })
    return reordered
  }, [updateCurrentState])

  const updateProfile = useCallback(
    (patch: Partial<AppState['profile']>) => {
      updateCurrentState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          ...patch,
          name: patch.name?.trim() || prev.profile.name,
          handle: patch.handle
            ? patch.handle.trim().startsWith('@')
              ? patch.handle.trim()
              : `@${patch.handle.trim()}`
            : prev.profile.handle,
          avatarUrl:
            patch.avatarUrl === undefined ? prev.profile.avatarUrl : patch.avatarUrl,
          accentColor:
            patch.accentColor === undefined
              ? prev.profile.accentColor
              : sanitizeAccentColor(patch.accentColor),
          streakSymbol:
            patch.streakSymbol?.trim() || prev.profile.streakSymbol,
          streakSymbolImageUrl:
            patch.streakSymbolImageUrl === undefined
              ? prev.profile.streakSymbolImageUrl
              : patch.streakSymbolImageUrl,
        },
      }))
    },
    [updateCurrentState],
  )

  const createAccount = useCallback((name: string, handle?: string) => {
    const accountId = crypto.randomUUID()
    const accountState = createAccountState(name, handle)
    setAccountsState((prev) => ({
      activeAccountId: accountId,
      accountsById: {
        ...prev.accountsById,
        [accountId]: accountState,
      },
    }))
  }, [])

  const switchAccount = useCallback((accountId: string) => {
    setAccountsState((prev) =>
      prev.accountsById[accountId]
        ? { ...prev, activeAccountId: accountId }
        : prev,
    )
  }, [])

  const deleteAccount = useCallback((accountId: string) => {
    setAccountsState((prev) => {
      const accountIds = Object.keys(prev.accountsById)
      if (!prev.accountsById[accountId] || accountIds.length <= 1) return prev

      const nextAccounts = { ...prev.accountsById }
      delete nextAccounts[accountId]

      const fallbackId =
        prev.activeAccountId === accountId
          ? Object.keys(nextAccounts)
              .sort(
                (a, b) =>
                  nextAccounts[b].lastActiveDate.localeCompare(
                    nextAccounts[a].lastActiveDate,
                  ),
              )[0]
          : prev.activeAccountId

      return {
        activeAccountId: fallbackId,
        accountsById: nextAccounts,
      }
    })
  }, [])

  const importSaveFile = useCallback((raw: string) => {
    const parsed = parseSaveFilePayload(raw)
    if (!parsed) return false

    const accountId = crypto.randomUUID()
    setAccountsState((prev) => ({
      activeAccountId: accountId,
      accountsById: {
        ...prev.accountsById,
        [accountId]: prepareState(parsed),
      },
    }))
    return true
  }, [])

  const exportSaveFile = useCallback(() => {
    return JSON.stringify(createSaveFilePayload(state), null, 2)
  }, [state])

  return {
    activeAccountId: accountsState.activeAccountId,
    accounts,
    habits: state.habits,
    coreAspects: state.coreAspects,
    bountyTasks: state.bountyTasks,
    checks: state.checks,
    weeklyTasks: state.weeklyTasks,
    dashboard: state.dashboard,
    preferences,
    completions: state.completions,
    timeRecords: state.timeRecords,
    rewards: state.rewards,
    purchasedRewards: state.purchasedRewards,
    dailySpinUsed: state.lastDailySpinDate === getTodayISO(),
    profile,
    uxpBurst,
    stats,
    statsPageSummary,
    toggleHabit,
    addManualCompletion,
    addManualTime,
    logTimerSession,
    setLinkedHabits,
    setLinkedCoreAspects,
    setHabitTags,
    setHabitWeights,
    addHabit,
    addCoreAspect,
    addBountyTask,
    incrementHobby,
    incrementCoreAspect,
    addCheck,
    addWeeklyTask,
    toggleBountyTask,
    toggleCheck,
    toggleWeeklyTask,
    removeBountyTask,
    removeCheck,
    removeWeeklyTask,
    setBountiesOpen,
    setChecksOpen,
    setCategoryCollapsed,
    setWeeklyOpen,
    setDailyGoal,
    updatePreferences,
    resetToday,
    softReset,
    fullReset,
    addQuote,
    removeQuote,
    shuffleQuote,
    purchaseReward,
    spinDailyReward,
    addReward,
    updateReward,
    removeReward,
    reorderReward,
    updateProfile,
    createAccount,
    switchAccount,
    deleteAccount,
    exportSaveFile,
    importSaveFile,
    saveError,
  }
}
