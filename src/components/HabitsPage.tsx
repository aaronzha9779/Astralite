import { useEffect, useMemo, useState } from 'react'
import type {
  AppPreferences,
  Habit,
  HabitCategory,
  TimeRecord,
} from '../types'
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
  preferences: AppPreferences
  streakSymbol: string
  streakSymbolImageUrl: string | null
  onToggle: (id: string) => void
  onSetLinked: (habitId: string, linkedIds: string[]) => void
  onUpdatePreferences: (patch: Partial<AppPreferences>) => void
  onResetToday: () => void
}

export function HabitsPage({
  habits,
  timeRecords,
  preferences,
  streakSymbol,
  streakSymbolImageUrl,
  onToggle,
  onSetLinked,
  onUpdatePreferences,
  onResetToday,
}: HabitsPageProps) {
  const [selectedByCategory, setSelectedByCategory] = useState<
    Partial<Record<HabitCategory, string>>
  >({})

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

  useEffect(() => {
    setSelectedByCategory((prev) => {
      const next: Partial<Record<HabitCategory, string>> = { ...prev }
      ;(['daily', 'habit', 'hobby'] as HabitCategory[]).forEach((category) => {
        const items = byCategory[category]
        const selected = next[category]
        if (!items.some((item) => item.id === selected)) {
          next[category] = items[0]?.id
        }
      })
      return next
    })
  }, [byCategory])

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
                    streakSymbol={streakSymbol}
                    streakSymbolImageUrl={streakSymbolImageUrl}
                    rawXpEarned={habit.totalXpEarned ?? 0}
                    preferences={preferences}
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
            <h2 className="habits-page__section-title">Master edit panel</h2>
            <p className="habits-page__section-subtitle">
              Pick an item inside each category and set its flat completion XP and auto-logged base minutes.
            </p>
          </div>
        </header>

        <div className="habits-page__master-card">
          {(['daily', 'habit', 'hobby'] as HabitCategory[]).map((category) => (
            <div key={category} className="habits-page__master-row">
              <strong className="habits-page__master-label">{category}</strong>
              {byCategory[category].length === 0 ? (
                <p className="habits-page__master-empty">No items in this category yet.</p>
              ) : (
                <>
                  <label className="habits-page__master-field">
                    <span>Item</span>
                    <select
                      className="habits-page__master-input"
                      value={selectedByCategory[category] ?? ''}
                      onChange={(e) =>
                        setSelectedByCategory((prev) => ({
                          ...prev,
                          [category]: e.target.value,
                        }))
                      }
                    >
                      {byCategory[category].map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="habits-page__master-field">
                    <span>Completion XP</span>
                    <input
                      className="habits-page__master-input"
                      type="number"
                      min={0}
                      step={1}
                      value={
                        preferences.itemCompletionXp[selectedByCategory[category] ?? ''] ?? 15
                      }
                      onChange={(e) => {
                        const selectedId = selectedByCategory[category]
                        if (!selectedId) return
                        onUpdatePreferences({
                          itemCompletionXp: {
                            [selectedId]: Math.max(0, Number(e.target.value) || 0),
                          },
                        })
                      }}
                    />
                  </label>
                  <label className="habits-page__master-field">
                    <span>Base minutes on checkoff</span>
                    <input
                      className="habits-page__master-input"
                      type="number"
                      min={0}
                      step={1}
                      value={preferences.itemBaseMinutes[selectedByCategory[category] ?? ''] ?? 0}
                      onChange={(e) => {
                        const selectedId = selectedByCategory[category]
                        if (!selectedId) return
                        onUpdatePreferences({
                          itemBaseMinutes: {
                            [selectedId]: Math.max(0, Number(e.target.value) || 0),
                          },
                        })
                      }}
                    />
                  </label>
                </>
              )}
            </div>
          ))}
        </div>

      </section>

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
