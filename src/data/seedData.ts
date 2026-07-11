import { getTodayISO } from '../lib/dates'
import { DEFAULT_RANKS } from './ranks'
import { rewards } from './rewards'
import type {
  AppPreferences,
  AppState,
  CompletionRecord,
  CoreAspect,
  Habit,
  IntegrationProtocol,
  ProtocolStep,
} from '../types'

const today = getTodayISO()
const defaultPreferences: AppPreferences = {
  itemCompletionXp: {},
  itemBaseMinutes: {},
  levelUpBaseXp: 250,
  levelUpIncrementXp: 25,
  bountyDailyIncreaseXp: 0,
  ranks: DEFAULT_RANKS,
  dailySpinUxps: [25, 40, 60, 80, 100],
  dailySpinRewardIds: [],
}

const seedHabits: Habit[] = [
  {
    id: '1',
    name: 'Morning workout',
    category: 'daily',
    archivedAt: null,
    streak: 14,
    doneToday: false,
    progressToday: 0,
    totalProgress: 0,
    lastCompletedDate: null,
    createdAt: today,
    totalMinutes: 420,
    totalXpEarned: 0,
    difficulty: 4,
    priority: 4,
    linkedHabitIds: ['7'],
    linkedCoreAspectIds: ['ca1'],
    tags: ['fitness'],
  },
  {
    id: '2',
    name: 'Read 30 minutes',
    category: 'hobby',
    archivedAt: null,
    streak: 9,
    doneToday: false,
    progressToday: 18,
    totalProgress: 218,
    lastCompletedDate: null,
    createdAt: today,
    totalMinutes: 540,
    totalXpEarned: 145,
    difficulty: 3,
    priority: 3,
    linkedHabitIds: [],
    linkedCoreAspectIds: ['ca2'],
    tags: ['learning'],
  },
  {
    id: '3',
    name: 'No social media',
    category: 'habit',
    archivedAt: null,
    streak: 5,
    doneToday: false,
    progressToday: 0,
    totalProgress: 0,
    lastCompletedDate: null,
    createdAt: today,
    totalMinutes: 0,
    totalXpEarned: 0,
    difficulty: 5,
    priority: 5,
    linkedHabitIds: [],
    linkedCoreAspectIds: [],
    tags: [],
  },
  {
    id: '4',
    name: 'Journal',
    category: 'habit',
    archivedAt: null,
    streak: 21,
    doneToday: false,
    progressToday: 0,
    totalProgress: 0,
    lastCompletedDate: null,
    createdAt: today,
    totalMinutes: 180,
    totalXpEarned: 64,
    difficulty: 2,
    priority: 3,
    linkedHabitIds: [],
    linkedCoreAspectIds: ['ca3'],
    tags: ['mindfulness'],
  },
  {
    id: '5',
    name: 'Drink 2L water',
    category: 'daily',
    archivedAt: null,
    streak: 7,
    doneToday: false,
    progressToday: 0,
    totalProgress: 0,
    lastCompletedDate: null,
    createdAt: today,
    totalMinutes: 0,
    totalXpEarned: 0,
    difficulty: 2,
    priority: 4,
    linkedHabitIds: [],
    linkedCoreAspectIds: ['ca4'],
    tags: ['health'],
  },
  {
    id: '6',
    name: 'Guitar practice',
    category: 'hobby',
    archivedAt: null,
    streak: 3,
    doneToday: false,
    progressToday: 42,
    totalProgress: 142,
    lastCompletedDate: null,
    createdAt: today,
    totalMinutes: 210,
    totalXpEarned: 92,
    difficulty: 3,
    priority: 4,
    linkedHabitIds: [],
    linkedCoreAspectIds: ['ca5'],
    tags: ['music'],
  },
  {
    id: '7',
    name: 'Fitness',
    category: 'hobby',
    archivedAt: null,
    streak: 14,
    doneToday: false,
    progressToday: 67,
    totalProgress: 367,
    lastCompletedDate: null,
    createdAt: today,
    totalMinutes: 600,
    totalXpEarned: 220,
    difficulty: 4,
    priority: 3,
    linkedHabitIds: ['1'],
    linkedCoreAspectIds: ['ca1'],
    tags: ['fitness'],
  },
]

const seedCoreAspects: CoreAspect[] = [
  { id: 'ca1', name: 'Vitality', progressToday: 12, totalProgress: 212 },
  { id: 'ca2', name: 'Learning', progressToday: 8, totalProgress: 134 },
  { id: 'ca3', name: 'Mindset', progressToday: 4, totalProgress: 84 },
  { id: 'ca4', name: 'Health', progressToday: 10, totalProgress: 190 },
  { id: 'ca5', name: 'Creativity', progressToday: 6, totalProgress: 106 },
]

function createProtocolStep(
  id: string,
  title: string,
  children: ProtocolStep[] = [],
): ProtocolStep {
  return { id, title, done: false, children }
}

const seedProtocols: IntegrationProtocol[] = [
  {
    id: 'ip1',
    title: 'Health Core Loop',
    summary: 'Build a clean daily baseline that unlocks the rest of the tree.',
    thumbnailLabel: 'VITAL',
    thumbnailUrl: null,
    priority: 5,
    active: true,
    pausedAt: null,
    archivedAt: null,
    completedAt: null,
    structure: 'standard',
    intervalHours: null,
    deadline: null,
    rewardId: null,
    rewardName: 'Streak Badge',
    recallCurrentStepId: null,
    recallLastReviewedAt: null,
    steps: [
      createProtocolStep('ip1-s1', 'Hydrate before coffee'),
      createProtocolStep('ip1-s2', 'Workout / mobility block', [
        createProtocolStep('ip1-s2a', 'Warm up'),
        createProtocolStep('ip1-s2b', 'Main set'),
      ]),
      createProtocolStep('ip1-s3', 'Skincare and reset the space'),
    ],
    updatedAt: today,
  },
  {
    id: 'ip2',
    title: 'Anti-Regression Protocol',
    summary: 'Use spaced recall to keep old wins from sliding back.',
    thumbnailLabel: 'RECALL',
    thumbnailUrl: null,
    priority: 4,
    active: false,
    pausedAt: null,
    archivedAt: null,
    completedAt: null,
    structure: 'recall',
    intervalHours: 48,
    deadline: null,
    rewardId: null,
    rewardName: 'Recall Token',
    recallCurrentStepId: 'ip2-s1',
    recallLastReviewedAt: today,
    steps: [
      createProtocolStep('ip2-s1', 'Review the previous layer'),
      createProtocolStep('ip2-s2', 'Repeat the default replacement'),
      createProtocolStep('ip2-s3', 'Log the friction point'),
    ],
    updatedAt: today,
  },
  {
    id: 'ip3',
    title: 'Skill Ascension',
    summary: 'Stack deliberate practice into a clean mastery ladder.',
    thumbnailLabel: 'SKILL',
    thumbnailUrl: null,
    priority: 3,
    active: false,
    pausedAt: null,
    archivedAt: null,
    completedAt: null,
    structure: 'standard',
    intervalHours: null,
    deadline: null,
    rewardId: null,
    rewardName: 'Mastery Chest',
    recallCurrentStepId: null,
    recallLastReviewedAt: null,
    steps: [
      createProtocolStep('ip3-s1', 'Choose the smallest possible rep'),
      createProtocolStep('ip3-s2', 'Execute one clean set'),
      createProtocolStep('ip3-s3', 'Capture the next adjustment'),
    ],
    updatedAt: today,
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
  coreAspects: seedCoreAspects,
  bountyTasks: [
    { id: 'b1', name: 'Ship the important thing', done: false },
  ],
  checks: [
    { id: 'c1', name: 'Morning meds', done: false },
    { id: 'c2', name: 'Inbox zero', done: true },
  ],
  weeklyTasks: [
    { id: 'w1', name: 'Meal prep Sunday', done: false },
    { id: 'w2', name: 'Review goals', done: true },
  ],
  protocols: structuredClone(seedProtocols),
  dashboard: {
    quotes: [
      'Small steps every day beat big bursts once a month.',
      'You do not have to be extreme — just consistent.',
      'Discipline is choosing what you want most over what you want now.',
    ],
    dailyGoal: '',
    bountiesOpen: false,
    checksOpen: false,
    weeklyOpen: false,
    sidebarOpen: true,
    settingsSections: {
      accounts: true,
      visuals: true,
      progression: true,
      danger: true,
    },
    collapsedCategories: {},
    activeQuoteIndex: null,
    activeQuoteDate: today,
  },
  profile: {
    name: 'Grinder',
    handle: '@you',
    avatarUrl: null,
    accentColor: '#a3e635',
    streakSymbol: '🔥',
    streakSymbolImageUrl: null,
    totalMinutes: 600,
    spentMinutes: 0,
    totalXp: 450,
    shopXp: 450,
    spentXp: 0,
  },
  preferences: structuredClone(defaultPreferences),
  rewards,
  lastActiveDate: today,
  completions: buildSampleCompletions(seedHabits),
  timeRecords: [],
  purchasedRewards: [],
  lastDailySpinDate: null,
}

export function createEmptyAppState(): AppState {
  return {
    habits: [],
    coreAspects: [],
    bountyTasks: [],
    checks: [],
    weeklyTasks: [],
    protocols: [],
    dashboard: {
      quotes: [
        'Small steps every day beat big bursts once a month.',
        'You do not have to be extreme — just consistent.',
        'Discipline is choosing what you want most over what you want now.',
      ],
      dailyGoal: '',
      bountiesOpen: false,
      checksOpen: false,
      weeklyOpen: false,
      sidebarOpen: true,
      settingsSections: {
        accounts: true,
        visuals: true,
        progression: true,
        danger: true,
      },
      collapsedCategories: {},
      activeQuoteIndex: null,
      activeQuoteDate: getTodayISO(),
    },
    profile: {
      name: 'Grinder',
      handle: '@you',
      avatarUrl: null,
      accentColor: '#a3e635',
      streakSymbol: '🔥',
      streakSymbolImageUrl: null,
      totalMinutes: 0,
      spentMinutes: 0,
      totalXp: 0,
      shopXp: 0,
      spentXp: 0,
    },
    preferences: structuredClone(defaultPreferences),
    rewards: structuredClone(rewards),
    lastActiveDate: getTodayISO(),
    completions: [],
    timeRecords: [],
    purchasedRewards: [],
    lastDailySpinDate: null,
  }
}
