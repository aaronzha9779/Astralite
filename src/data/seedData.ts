import { getTodayISO } from '../lib/dates'
import { rewards } from './rewards'
import type { AppState, CompletionRecord, Habit } from '../types'

const today = getTodayISO()

const seedHabits: Habit[] = [
  {
    id: '1',
    name: 'Morning workout',
    category: 'daily',
    streak: 14,
    doneToday: false,
    lastCompletedDate: null,
    createdAt: today,
    totalMinutes: 420,
    difficulty: 4,
    priority: 4,
    linkedHabitIds: ['7'],
    tags: ['fitness'],
  },
  {
    id: '2',
    name: 'Read 30 minutes',
    category: 'hobby',
    streak: 9,
    doneToday: false,
    lastCompletedDate: null,
    createdAt: today,
    totalMinutes: 540,
    difficulty: 3,
    priority: 3,
    linkedHabitIds: [],
    tags: ['learning'],
  },
  {
    id: '3',
    name: 'No social media',
    category: 'habit',
    streak: 5,
    doneToday: false,
    lastCompletedDate: null,
    createdAt: today,
    totalMinutes: 0,
    difficulty: 5,
    priority: 5,
    linkedHabitIds: [],
    tags: [],
  },
  {
    id: '4',
    name: 'Journal',
    category: 'habit',
    streak: 21,
    doneToday: false,
    lastCompletedDate: null,
    createdAt: today,
    totalMinutes: 180,
    difficulty: 2,
    priority: 3,
    linkedHabitIds: [],
    tags: ['mindfulness'],
  },
  {
    id: '5',
    name: 'Drink 2L water',
    category: 'daily',
    streak: 7,
    doneToday: false,
    lastCompletedDate: null,
    createdAt: today,
    totalMinutes: 0,
    difficulty: 2,
    priority: 4,
    linkedHabitIds: [],
    tags: ['health'],
  },
  {
    id: '6',
    name: 'Guitar practice',
    category: 'hobby',
    streak: 3,
    doneToday: false,
    lastCompletedDate: null,
    createdAt: today,
    totalMinutes: 210,
    difficulty: 3,
    priority: 4,
    linkedHabitIds: [],
    tags: ['music'],
  },
  {
    id: '7',
    name: 'Fitness',
    category: 'hobby',
    streak: 14,
    doneToday: false,
    lastCompletedDate: null,
    createdAt: today,
    totalMinutes: 600,
    difficulty: 4,
    priority: 3,
    linkedHabitIds: ['1'],
    tags: ['fitness'],
  },
]

function toLocalISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toLocalISODateTime(d: Date): string {
  const date = toLocalISODate(d)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${date}T${hours}:${minutes}:${seconds}`
}

function buildSampleCompletions(habits: Habit[]): CompletionRecord[] {
  const records: CompletionRecord[] = []
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  for (let i = 60; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const date = toLocalISODate(d)
    const dayOfWeek = d.getDay()

    if (dayOfWeek === 0) continue

    const count = 1 + ((i + d.getDate()) % 3)
    for (let j = 0; j < count && j < habits.length; j++) {
      const habit = habits[j]
      records.push({
        id: `seed-${date}-${habit.id}`,
        habitId: habit.id,
        habitName: habit.name,
        date,
        completedAt: toLocalISODateTime(
          new Date(d.getFullYear(), d.getMonth(), d.getDate(), 7 + j, 15, 0),
        ),
      })
    }
  }

  return records
}

export const defaultAppState: AppState = {
  habits: seedHabits,
  weeklyTasks: [
    { id: 'w1', name: 'Meal prep Sunday', done: false },
    { id: 'w2', name: 'Review goals', done: true },
  ],
  dashboard: {
    quotes: [
      'Small steps every day beat big bursts once a month.',
      'You do not have to be extreme — just consistent.',
      'Discipline is choosing what you want most over what you want now.',
    ],
    dailyGoal: '',
    weeklyOpen: false,
    activeQuoteIndex: null,
  },
  profile: {
    name: 'Grinder',
    handle: '@you',
    avatarUrl: null,
    accentColor: '#a3e635',
    totalMinutes: 600,
    spentMinutes: 0,
    totalXp: 450,
    spentXp: 0,
  },
  rewards,
  lastActiveDate: today,
  completions: buildSampleCompletions(seedHabits),
  timeRecords: [],
  purchasedRewards: [],
}

export function createEmptyAppState(): AppState {
  return {
    habits: [],
    weeklyTasks: [],
    dashboard: {
      quotes: [
        'Small steps every day beat big bursts once a month.',
        'You do not have to be extreme — just consistent.',
        'Discipline is choosing what you want most over what you want now.',
      ],
      dailyGoal: '',
      weeklyOpen: false,
      activeQuoteIndex: null,
    },
    profile: {
      name: 'Grinder',
      handle: '@you',
      avatarUrl: null,
      accentColor: '#a3e635',
      totalMinutes: 0,
      spentMinutes: 0,
      totalXp: 0,
      spentXp: 0,
    },
    rewards: structuredClone(rewards),
    lastActiveDate: getTodayISO(),
    completions: [],
    timeRecords: [],
    purchasedRewards: [],
  }
}
