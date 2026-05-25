import { useMemo } from 'react'
import type { Habit, HabitCategory, TimeRecord } from '../types'
import { HabitOverviewCard } from './HabitOverviewCard'
import './HabitsPage.css'

const CATEGORIES: {
  key: HabitCategory
  title: string
  subtitle: string
}[] = [
  { key: 'daily', title: 'Dailies', subtitle: 'Every day essentials' },
  { key: 'habit', title: 'Habits', subtitle: 'Build consistency' },
  { key: 'hobby', title: 'Hobbies', subtitle: 'Grow mastery through time' },
]

type HabitsPageProps = {
  habits: Habit[]
  timeRecords: TimeRecord[]
  onToggle: (id: string) => void
  onSetLinked: (habitId: string, linkedIds: string[]) => void
  onResetToday: () => void
}

export function HabitsPage({
  habits,
  timeRecords,
  onToggle,
  onSetLinked,
  onResetToday,
}: HabitsPageProps) {
  const byCategory = useMemo(() => {
    const map: Record<HabitCategory, Habit[]> = {
      daily: [],
      habit: [],
      hobby: [],
    }
    for (const h of habits) {
      map[h.category ?? 'habit'].push(h)
    }
    return map
  }, [habits])

  return (
    <main className="dashboard habits-page">
      <header className="dashboard__header">
        <h1 className="dashboard__title">Habits & Hobbies</h1>
        <p className="dashboard__subtitle">
          Track progress, link related items, and manage your testing resets
        </p>
      </header>

      {CATEGORIES.map(({ key, title, subtitle }) => {
        const items = byCategory[key]
        return (
          <section key={key} className="habits-page__section" aria-label={title}>
            <header className="habits-page__section-header">
              <div>
                <h2 className="habits-page__section-title">{title}</h2>
                <p className="habits-page__section-subtitle">{subtitle}</p>
              </div>
              <span className="habits-page__count">{items.length} items</span>
            </header>

            {items.length === 0 ? (
              <p className="habits-page__empty">No {title.toLowerCase()} yet.</p>
            ) : (
              <div className="habits-page__grid">
                {items.map((habit) => (
                  <HabitOverviewCard
                    key={habit.id}
                    habit={habit}
                    allHabits={habits}
                    timeRecords={timeRecords}
                    onToggle={onToggle}
                    onSetLinked={onSetLinked}
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}

      <section className="habits-page__section" aria-label="Reset controls">
        <header className="habits-page__section-header">
          <div>
            <h2 className="habits-page__section-title">Reset controls</h2>
            <p className="habits-page__section-subtitle">
              Daily checkboxes also auto-reset when a new day starts.
            </p>
          </div>
        </header>

        <div className="habits-page__reset-card">
          <button
            type="button"
            className="habits-page__reset-btn"
            onClick={onResetToday}
          >
            Reset today&apos;s checkmarks
          </button>
        </div>
      </section>
    </main>
  )
}
