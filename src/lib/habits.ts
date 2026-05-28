import { getTodayISO, getYesterdayISO } from './dates'
import type { Habit, HabitCategory } from '../types'

export function applyDailyReset(habits: Habit[], lastActiveDate: string): Habit[] {
  const today = getTodayISO()
  if (lastActiveDate === today) return habits

  const yesterday = getYesterdayISO()

  return habits.map((habit) => {
    const keptStreak =
      habit.lastCompletedDate === yesterday ||
      habit.lastCompletedDate === today

    return {
      ...habit,
      doneToday: false,
      progressToday: 0,
      streak: keptStreak ? habit.streak : 0,
    }
  })
}

export function completeHabit(habit: Habit, today: string): Habit {
  const yesterday = getYesterdayISO()
  let streak = habit.streak

  if (habit.lastCompletedDate === today) {
    return habit
  }

  if (habit.lastCompletedDate === yesterday) {
    streak += 1
  } else {
    streak = 1
  }

  return {
    ...habit,
    doneToday: true,
    progressToday: habit.category === 'hobby' ? Math.max(1, habit.progressToday) : habit.progressToday,
    streak,
    lastCompletedDate: today,
  }
}

export function uncompleteHabit(habit: Habit, today: string): Habit {
  if (!habit.doneToday) return habit
  if (habit.category === 'hobby' && habit.progressToday > 0) {
    return habit
  }

  let { streak, lastCompletedDate } = habit

  if (lastCompletedDate === today) {
    const yesterday = getYesterdayISO()
    if (streak > 1) {
      streak -= 1
      lastCompletedDate = yesterday
    } else {
      streak = 0
      lastCompletedDate = null
    }
  }

  return {
    ...habit,
    doneToday: false,
    progressToday: habit.category === 'hobby' ? habit.progressToday : 0,
    streak,
    lastCompletedDate,
  }
}

/** Backfill a completion on a specific date. */
export function applyCompletionOnDate(habit: Habit, date: string): Habit {
  let { streak, lastCompletedDate } = habit

  if (lastCompletedDate === date) {
    const today = getTodayISO()
    return date === today ? { ...habit, doneToday: true } : habit
  }

  if (lastCompletedDate) {
    const prev = new Date(lastCompletedDate + 'T12:00:00')
    const target = new Date(date + 'T12:00:00')
    const diffDays = Math.round(
      (target.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
    )
    if (diffDays === 1) streak += 1
    else if (diffDays > 1) streak = 1
    else streak = Math.max(streak, 1)
  } else {
    streak = Math.max(streak, 1)
  }

  if (!lastCompletedDate || date > lastCompletedDate) {
    lastCompletedDate = date
  }

  const today = getTodayISO()
  return {
    ...habit,
    streak,
    lastCompletedDate,
    doneToday: date === today ? true : habit.doneToday,
    progressToday:
      habit.category === 'hobby' && date === today
        ? Math.max(1, habit.progressToday)
        : habit.progressToday,
  }
}

export function createHabit(name: string, category: HabitCategory = 'habit'): Habit {
  const today = getTodayISO()
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    category,
    streak: 0,
    doneToday: false,
    progressToday: 0,
    totalProgress: 0,
    lastCompletedDate: null,
    createdAt: today,
    totalMinutes: 0,
    totalXpEarned: 0,
    difficulty: 3,
    priority: 3,
    linkedHabitIds: [],
    linkedCoreAspectIds: [],
    tags: [],
  }
}

export function collectLinkedIds(
  habits: Habit[],
  startId: string,
  visited = new Set<string>(),
): string[] {
  if (visited.has(startId)) return []
  visited.add(startId)
  const habit = habits.find((h) => h.id === startId)
  if (!habit) return []

  const ids: string[] = []
  for (const linkedId of habit.linkedHabitIds ?? []) {
    if (linkedId === startId || visited.has(linkedId)) continue
    ids.push(linkedId)
    ids.push(...collectLinkedIds(habits, linkedId, visited))
  }
  return ids
}
