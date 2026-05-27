import { useMemo } from 'react'
import type {
  AppPreferences,
  DashboardPrefs,
  Habit,
  HabitCategory,
  WeeklyTask,
} from '../types'
import { DailyInspiration } from './DailyInspiration'
import { TaskColumn } from './TaskColumn'
import { WeeklyTasksPanel } from './WeeklyTasksPanel'
import './Dashboard.css'

const COLUMNS: HabitCategory[] = ['daily', 'habit', 'hobby']

type DashboardProps = {
  habits: Habit[]
  bountyTasks: WeeklyTask[]
  checks: WeeklyTask[]
  weeklyTasks: WeeklyTask[]
  streakSymbol: string
  streakSymbolImageUrl: string | null
  preferences: AppPreferences
  rawXpByHabit: Record<string, number>
  dashboard: DashboardPrefs
  onToggle: (id: string) => void
  onIncrementHobby: (id: string) => void
  onAdd: (name: string, category: HabitCategory) => void
  onBountyToggle: (id: string) => void
  onBountyAdd: (name: string) => void
  onBountyRemove: (id: string) => void
  onBountiesOpenChange: (open: boolean) => void
  onCheckToggle: (id: string) => void
  onCheckAdd: (name: string) => void
  onCheckRemove: (id: string) => void
  onChecksOpenChange: (open: boolean) => void
  onWeeklyToggle: (id: string) => void
  onWeeklyAdd: (name: string) => void
  onWeeklyRemove: (id: string) => void
  onWeeklyOpenChange: (open: boolean) => void
  onSetDailyGoal: (goal: string) => void
  onAddQuote: (quote: string) => void
  onRemoveQuote: (index: number) => void
  onShuffleQuote: () => void
}

function getLinkedNames(habits: Habit[], habit: Habit): string[] {
  return (habit.linkedHabitIds ?? [])
    .map((id) => habits.find((h) => h.id === id)?.name)
    .filter(Boolean) as string[]
}

export function Dashboard({
  habits,
  bountyTasks,
  checks,
  weeklyTasks,
  streakSymbol,
  streakSymbolImageUrl,
  preferences,
  rawXpByHabit,
  dashboard,
  onToggle,
  onIncrementHobby,
  onAdd,
  onBountyToggle,
  onBountyAdd,
  onBountyRemove,
  onBountiesOpenChange,
  onCheckToggle,
  onCheckAdd,
  onCheckRemove,
  onChecksOpenChange,
  onWeeklyToggle,
  onWeeklyAdd,
  onWeeklyRemove,
  onWeeklyOpenChange,
  onSetDailyGoal,
  onAddQuote,
  onRemoveQuote,
  onShuffleQuote,
}: DashboardProps) {
  const byCategory = useMemo(() => {
    const map: Record<HabitCategory, Habit[]> = {
      daily: [],
      habit: [],
      hobby: [],
    }
    for (const h of habits) {
      const cat = h.category ?? 'habit'
      map[cat].push(h)
    }
    return map
  }, [habits])

  const dailyCount = byCategory.daily.length
  const completedDailies = byCategory.daily.filter((h) => h.doneToday).length

  return (
    <main className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Today</h1>
          <p className="dashboard__subtitle">
            {habits.length === 0
              ? 'Add tasks in any column to start grinding'
              : `${completedDailies} of ${dailyCount} dailies complete · linked items check off together`}
          </p>
        </div>
      </header>

      <DailyInspiration
        dashboard={dashboard}
        onSetDailyGoal={onSetDailyGoal}
        onAddQuote={onAddQuote}
        onRemoveQuote={onRemoveQuote}
        onShuffleQuote={onShuffleQuote}
      />

      <section className="dashboard__board" aria-label="Task board">
        {COLUMNS.map((category) => (
          <TaskColumn
            key={category}
            category={category}
            habits={byCategory[category]}
            allHabits={habits}
            preferences={preferences}
            rawXpByHabit={rawXpByHabit}
            streakSymbol={streakSymbol}
            streakSymbolImageUrl={streakSymbolImageUrl}
            onToggle={onToggle}
            onIncrementHobby={onIncrementHobby}
            onAdd={onAdd}
            getLinkedNames={getLinkedNames}
          />
        ))}
      </section>

      <WeeklyTasksPanel
        tasks={bountyTasks}
        title="Main tasks"
        xpReward={25}
        placeholder="Add main task…"
        emptyMessage="No main tasks yet — add a bounty when something matters most today."
        open={dashboard.bountiesOpen}
        onOpenChange={onBountiesOpenChange}
        onToggle={onBountyToggle}
        onAdd={onBountyAdd}
        onRemove={onBountyRemove}
      />

      <WeeklyTasksPanel
        tasks={checks}
        title="Checks"
        xpReward={2}
        placeholder="Add quick check…"
        emptyMessage="No checks yet — add a lightweight item when you want quick XP."
        open={dashboard.checksOpen}
        onOpenChange={onChecksOpenChange}
        onToggle={onCheckToggle}
        onAdd={onCheckAdd}
        onRemove={onCheckRemove}
      />

      <WeeklyTasksPanel
        tasks={weeklyTasks}
        xpReward={10}
        open={dashboard.weeklyOpen}
        onOpenChange={onWeeklyOpenChange}
        onToggle={onWeeklyToggle}
        onAdd={onWeeklyAdd}
        onRemove={onWeeklyRemove}
      />
    </main>
  )
}
