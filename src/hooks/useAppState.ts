import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { rewards } from '../data/rewards'
import { defaultAppState } from '../data/seedData'
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
import { loadState, saveState } from '../lib/storage'
import { getDashboardStats } from '../lib/stats'
import { getStatsPageSummary } from '../lib/statsPage'
import { addTimeRecord } from '../lib/timeRecords'
import {
  calculateCompletionXp,
  calculateTimeXp,
  toUserProfile,
  type XpBreakdown,
} from '../lib/xp'
import type { AppState, CompletionRecord, DashboardPrefs, HabitCategory } from '../types'

function initState(): AppState {
  const saved = loadState()
  const base = saved ?? defaultAppState
  const today = getTodayISO()
  const habits = applyDailyReset(base.habits, base.lastActiveDate)

  return {
    ...base,
    habits,
    lastActiveDate: today,
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(initState)

  useEffect(() => {
    saveState(state)
  }, [state])

  const profile = useMemo(() => toUserProfile(state.profile), [state.profile])
  const stats = useMemo(
    () => getDashboardStats(state.habits),
    [state.habits],
  )
  const statsPageSummary = useMemo(
    () => getStatsPageSummary(state.habits, state.completions),
    [state.habits, state.completions],
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

    setState((prev) => {
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
  }, [applyHabitToggle])

  const addManualCompletion = useCallback((habitId: string, date: string) => {
    if (!date) return

    setState((prev) => {
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
  }, [])

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

      setState((prev) => {
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
    [],
  )

  const logTimerSession = useCallback(
    (habitId: string, minutes: number): XpBreakdown | null => {
      return addManualTime(habitId, minutes, undefined, 'timer')
    },
    [addManualTime],
  )

  const setLinkedHabits = useCallback((habitId: string, linkedIds: string[]) => {
    const cleaned = linkedIds.filter((id) => id !== habitId)

    setState((prev) => ({
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
  }, [])

  const setHabitWeights = useCallback(
    (habitId: string, difficulty: number, priority: number) => {
      const d = Math.min(5, Math.max(1, Math.round(difficulty)))
      const p = Math.min(5, Math.max(1, Math.round(priority)))
      setState((prev) => ({
        ...prev,
        habits: prev.habits.map((h) =>
          h.id === habitId ? { ...h, difficulty: d, priority: p } : h,
        ),
      }))
    },
    [],
  )

  const setHabitTags = useCallback((habitId: string, tags: string[]) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) =>
        h.id === habitId ? { ...h, tags } : h,
      ),
    }))
  }, [])

  const addHabit = useCallback((name: string, category: HabitCategory = 'habit') => {
    const trimmed = name.trim()
    if (!trimmed) return

    const today = getTodayISO()
    const habit = createHabit(trimmed, category)

    setState((prev) => ({
      ...prev,
      habits: [...prev.habits, habit],
      lastActiveDate: today,
    }))
  }, [])

  const addWeeklyTask = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return

    setState((prev) => ({
      ...prev,
      weeklyTasks: [
        ...prev.weeklyTasks,
        { id: crypto.randomUUID(), name: trimmed, done: false },
      ],
    }))
  }, [])

  const toggleWeeklyTask = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      weeklyTasks: prev.weeklyTasks.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t,
      ),
    }))
  }, [])

  const removeWeeklyTask = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      weeklyTasks: prev.weeklyTasks.filter((t) => t.id !== id),
    }))
  }, [])

  const setWeeklyOpen = useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      dashboard: { ...prev.dashboard, weeklyOpen: open },
    }))
  }, [])

  const updateDashboard = useCallback(
    (patch: Partial<DashboardPrefs>) => {
      setState((prev) => ({
        ...prev,
        dashboard: { ...prev.dashboard, ...patch },
      }))
    },
    [],
  )

  const setDailyGoal = useCallback((dailyGoal: string) => {
    updateDashboard({ dailyGoal })
  }, [updateDashboard])

  const addQuote = useCallback((quote: string) => {
    const trimmed = quote.trim()
    if (!trimmed) return
    setState((prev) => ({
      ...prev,
      dashboard: {
        ...prev.dashboard,
        quotes: [...prev.dashboard.quotes, trimmed],
      },
    }))
  }, [])

  const removeQuote = useCallback((index: number) => {
    setState((prev) => {
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
  }, [])

  const shuffleQuote = useCallback(() => {
    setState((prev) => {
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
  }, [])

  const purchaseReward = useCallback((rewardId: string) => {
    const reward = rewards.find((r) => r.id === rewardId)
    if (!reward) return false

    let success = false

    setState((prev) => {
      const available =
        (prev.profile.totalXp ?? 0) - (prev.profile.spentXp ?? 0)
      if (available < reward.cost) return prev

      if (
        reward.oneTime &&
        prev.purchasedRewards.some((p) => p.rewardId === rewardId)
      ) {
        return prev
      }

      success = true
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

    return success
  }, [])

  return {
    habits: state.habits,
    weeklyTasks: state.weeklyTasks,
    dashboard: state.dashboard,
    completions: state.completions,
    timeRecords: state.timeRecords,
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
    addQuote,
    removeQuote,
    shuffleQuote,
    purchaseReward,
  }
}
