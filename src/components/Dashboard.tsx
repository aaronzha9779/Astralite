import { useMemo } from 'react'
import type {
  DashboardPrefs,
  DashboardStat,
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
  weeklyTasks: WeeklyTask[]
  dashboard: DashboardPrefs
  stats: DashboardStat[]
  onToggle: (id: string) => void
  onAdd: (name: string, category: HabitCategory) => void
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
  weeklyTasks,
  dashboard,
  stats,
  onToggle,
  onAdd,
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

  const completedCount = habits.filter((h) => h.doneToday).length

  return (
    <main className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Today</h1>
          <p className="dashboard__subtitle">
            {habits.length === 0
              ? 'Add tasks in any column to start grinding'
              : `${completedCount} of ${habits.length} complete · linked items check off together`}
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

      <section className="dashboard__stats" aria-label="Summary">
        {stats.map((stat) => (
          <article key={stat.id} className="stat-card">
            <span className="stat-card__label">{stat.label}</span>
            <span className="stat-card__value">{stat.value}</span>
          </article>
        ))}
      </section>

      <section className="dashboard__board" aria-label="Task board">
        {COLUMNS.map((category) => (
          <TaskColumn
            key={category}
            category={category}
            habits={byCategory[category]}
            allHabits={habits}
            onToggle={onToggle}
            onAdd={onAdd}
            getLinkedNames={getLinkedNames}
          />
        ))}
      </section>

      <WeeklyTasksPanel
        tasks={weeklyTasks}
        open={dashboard.weeklyOpen}
        onOpenChange={onWeeklyOpenChange}
        onToggle={onWeeklyToggle}
        onAdd={onWeeklyAdd}
        onRemove={onWeeklyRemove}
      />
    </main>
  )
}
