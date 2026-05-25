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
  parseSaveFilePayload,
  saveAccounts,
} from '../lib/storage'
import { getDashboardStats } from '../lib/stats'
import { getStatsPageSummary } from '../lib/statsPage'
import { addTimeRecord } from '../lib/timeRecords'
import {
  calculateCompletionXp,
  calculateTimeXp,
  toUserProfile,
  type XpBreakdown,
} from '../lib/xp'
import type {
  AccountSummary,
  AppState,
  CompletionRecord,
  DashboardPrefs,
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

function prepareState(base: AppState): AppState {
  const today = getTodayISO()
  const habits = applyDailyReset(base.habits, base.lastActiveDate)

  return {
    ...base,
    habits,
    lastActiveDate: today,
  }
}

const WEEKLY_TASK_XP = 10

function sanitizeAccentColor(color: string | undefined): string {
  const trimmed = color?.trim() ?? ''
  return /^#(?:[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : '#a3e635'
}

export function useAppState() {
  const [accountsState, setAccountsState] = useState<AccountsState>(() => {
    const loaded = loadAccounts()
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

  const state =
    accountsState.accountsById[accountsState.activeAccountId] ?? defaultAppState

  useEffect(() => {
    saveAccounts(accountsState.activeAccountId, accountsState.accountsById)
  }, [accountsState])

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
          lastActiveDate: today,
        }
      })
    }

    syncDayBoundary()
    const intervalId = window.setInterval(syncDayBoundary, 60_000)
    return () => window.clearInterval(intervalId)
  }, [updateCurrentState])

  const profile = useMemo(() => toUserProfile(state.profile), [state.profile])
  const accounts = useMemo<AccountSummary[]>(
    () =>
      Object.entries(accountsState.accountsById)
        .map(([id, accountState]) => ({
          id,
          name: accountState.profile.name,
          handle: accountState.profile.handle,
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
    () => getStatsPageSummary(state.habits, state.completions, state.timeRecords),
    [state.habits, state.completions, state.timeRecords],
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
      let nextHabits = habits.map((habit) => {
        if (!targetIds.has(habit.id)) return habit

        if (completing) {
          if (habit.doneToday) return habit
          nextCompletions = addCompletion(
            nextCompletions,
            habit.id,
            habit.name,
            today,
          )
          return completeHabit(habit, today)
        }

        if (!habit.doneToday) return habit
        nextCompletions = removeCompletion(nextCompletions, habit.id, today)
        return uncompleteHabit(habit, today)
      })

      return { habits: nextHabits, completions: nextCompletions }
    },
    [],
  )

  const toggleHabit = useCallback((id: string) => {
    const today = getTodayISO()

    updateCurrentState((prev) => {
      const habit = prev.habits.find((h) => h.id === id)
      if (!habit) return prev

      const completing = !habit.doneToday
      const { habits, completions } = applyHabitToggle(
        prev.habits,
        prev.completions,
        id,
        completing,
        today,
      )

      let profile = prev.profile
      if (completing) {
        const xp = calculateCompletionXp(habit)
        profile = {
          ...profile,
          totalXp: (profile.totalXp ?? 0) + xp.total,
        }
      }

      return {
        ...prev,
        habits,
        completions,
        profile,
        lastActiveDate: today,
      }
    })
  }, [applyHabitToggle, updateCurrentState])

  const addManualCompletion = useCallback((habitId: string, date: string) => {
    if (!date) return

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
          xpGain = calculateCompletionXp(h).total
        }
        completions = addCompletion(completions, h.id, h.name, date)
        return applyCompletionOnDate(h, date)
      })

      const profile =
        xpGain > 0
          ? { ...prev.profile, totalXp: (prev.profile.totalXp ?? 0) + xpGain }
          : prev.profile

      return { ...prev, habits, completions, profile }
    })
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
            ? { ...h, totalMinutes: h.totalMinutes + clamped }
            : h,
        )

        const profile = {
          ...prev.profile,
          totalMinutes: prev.profile.totalMinutes + clamped,
          totalXp: (prev.profile.totalXp ?? 0) + xp.total,
        }

        return { ...prev, habits, timeRecords, profile }
      })

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


  const toggleWeeklyTask = useCallback((id: string) => {
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
            }
          : prev.profile
  
      return {
        ...prev,
        weeklyTasks,
        profile,
      }
    })
  }, [updateCurrentState])

  const removeWeeklyTask = useCallback((id: string) => {
    updateCurrentState((prev) => ({
      ...prev,
      weeklyTasks: prev.weeklyTasks.filter((t) => t.id !== id),
    }))
  }, [updateCurrentState])

  const setWeeklyOpen = useCallback((open: boolean) => {
    updateCurrentState((prev) => ({
      ...prev,
      dashboard: { ...prev.dashboard, weeklyOpen: open },
    }))
  }, [updateCurrentState])

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

  const resetToday = useCallback(() => {
    const today = getTodayISO()
    updateCurrentState((prev) => {
      const habits = prev.habits.map((habit) =>
        habit.doneToday ? uncompleteHabit(habit, today) : habit,
      )
      const completions = prev.completions.filter((entry) => entry.date !== today)

      return {
        ...prev,
        habits,
        completions,
        lastActiveDate: today,
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

      const available =
        (prev.profile.totalXp ?? 0) - (prev.profile.spentXp ?? 0)
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

  const addReward = useCallback((input: Omit<Reward, 'id'>) => {
    const name = input.name.trim()
    const description = input.description.trim()
    const emoji = input.emoji.trim() || '🎁'
    const cost = Math.max(0, Math.round(input.cost))
    if (!name || !description) return

    updateCurrentState((prev) => ({
      ...prev,
      rewards: [
        ...prev.rewards,
        {
          id: crypto.randomUUID(),
          name,
          description,
          emoji,
          cost,
          oneTime: input.oneTime,
        },
      ],
    }))
  }, [updateCurrentState])

  const updateReward = useCallback((rewardId: string, patch: Partial<Omit<Reward, 'id'>>) => {
    updateCurrentState((prev) => ({
      ...prev,
      rewards: prev.rewards.map((reward) => {
        if (reward.id !== rewardId) return reward
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
  }, [updateCurrentState])

  const removeReward = useCallback((rewardId: string) => {
    updateCurrentState((prev) => ({
      ...prev,
      rewards: prev.rewards.filter((reward) => reward.id !== rewardId),
      purchasedRewards: prev.purchasedRewards.filter((purchase) => purchase.rewardId !== rewardId),
    }))
  }, [updateCurrentState])

  const reorderReward = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return

    updateCurrentState((prev) => {
      const from = prev.rewards.findIndex((reward) => reward.id === draggedId)
      const to = prev.rewards.findIndex((reward) => reward.id === targetId)
      if (from === -1 || to === -1) return prev

      const next = [...prev.rewards]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)

      return {
        ...prev,
        rewards: next,
      }
    })
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
    weeklyTasks: state.weeklyTasks,
    dashboard: state.dashboard,
    completions: state.completions,
    timeRecords: state.timeRecords,
    rewards: state.rewards,
    purchasedRewards: state.purchasedRewards,
    profile,
    stats,
    statsPageSummary,
    toggleHabit,
    addManualCompletion,
    addManualTime,
    logTimerSession,
    setLinkedHabits,
    setHabitTags,
    setHabitWeights,
    addHabit,
    addWeeklyTask,
    toggleWeeklyTask,
    removeWeeklyTask,
    setWeeklyOpen,
    setDailyGoal,
    resetToday,
    fullReset,
    addQuote,
    removeQuote,
    shuffleQuote,
    purchaseReward,
    addReward,
    updateReward,
    removeReward,
    reorderReward,
    updateProfile,
    createAccount,
    switchAccount,
    exportSaveFile,
    importSaveFile,
  }
}
