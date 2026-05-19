import type { Reward } from '../types'

export const rewards: Reward[] = [
  {
    id: 'rest-day',
    name: 'Rest Day Pass',
    description: 'Skip a day without breaking your streak (coming soon).',
    cost: 50,
    emoji: '🛋️',
    oneTime: false,
  },
  {
    id: 'gold-theme',
    name: 'Gold Accent',
    description: 'Unlock a gold accent theme for the app.',
    cost: 100,
    emoji: '✨',
    oneTime: true,
  },
  {
    id: 'focus-boost',
    name: 'Focus Boost',
    description: 'Bonus XP on your next 3 timer sessions.',
    cost: 75,
    emoji: '⚡',
    oneTime: false,
  },
  {
    id: 'badge-grinder',
    name: 'Grinder Badge',
    description: 'Show off an exclusive profile badge.',
    cost: 150,
    emoji: '🏅',
    oneTime: true,
  },
  {
    id: 'double-xp',
    name: 'Double Time Day',
    description: '2× XP on timer sessions for one day.',
    cost: 200,
    emoji: '💎',
    oneTime: false,
  },
  {
    id: 'legend-title',
    name: 'Legend Title',
    description: 'Unlock the "Legend" rank title on your profile.',
    cost: 300,
    emoji: '👑',
    oneTime: true,
  },
]
