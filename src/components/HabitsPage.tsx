import { useMemo, useState } from 'react'
import type {
  AppPreferences,
  CoreAspect,
  DashboardPrefs,
  Habit,
  HabitCategory,
  TimeRecord,
  WeeklyTask,
} from '../types'
import { HabitOverviewCard } from './HabitOverviewCard'
import { FocusTimer } from './FocusTimer'
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
  archivedHabits: Habit[]
  coreAspects: CoreAspect[]
  bountyTasks: WeeklyTask[]
  timeRecords: TimeRecord[]
  preferences: AppPreferences
  dashboard: DashboardPrefs
  streakSymbol: string
  streakSymbolImageUrl: string | null
  onToggle: (id: string) => void
  onRenameHabit: (habitId: string, name: string) => void
  onSetLinked: (habitId: string, linkedIds: string[]) => void
  onSetLinkedCoreAspects: (habitId: string, aspectIds: string[]) => void
  onArchiveHabit: (id: string) => void
  onDeleteHabit: (id: string) => void
  onRestoreHabit: (id: string) => void
  onUpdatePreferences: (patch: Partial<AppPreferences>) => void
  onSetCategoryCollapsed: (category: HabitCategory, collapsed: boolean) => void
  onResetToday: () => void
}

export function HabitsPage({
  habits,
  archivedHabits,
  coreAspects,
  bountyTasks,
  timeRecords,
  preferences,
  dashboard,
  streakSymbol,
  streakSymbolImageUrl,
  onToggle,
  onRenameHabit,
  onSetLinked,
  onSetLinkedCoreAspects,
  onArchiveHabit,
  onDeleteHabit,
  onRestoreHabit,
  onUpdatePreferences,
  onSetCategoryCollapsed,
  onResetToday,
}: HabitsPageProps) {
  const [selectedByCategory, setSelectedByCategory] = useState<
    Partial<Record<HabitCategory | 'bounty', string>>
  >({})
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [focusMinutes, setFocusMinutes] = useState(25)

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
  const resolvedSelection = useMemo(() => {
    const next: Partial<Record<HabitCategory | 'bounty', string>> = { ...selectedByCategory }
    ;(['daily', 'habit', 'hobby'] as HabitCategory[]).forEach((category) => {
      const items = byCategory[category]
      const selected = next[category]
      next[category] = items.some((item) => item.id === selected) ? selected : items[0]?.id
    })
    next.bounty = bountyTasks.some((item) => item.id === next.bounty)
      ? next.bounty
      : bountyTasks[0]?.id
    return next
  }, [bountyTasks, byCategory, selectedByCategory])
  const focusTarget = useMemo(() => {
    if (habits.length === 0) return null

    return [...habits].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      if (b.streak !== a.streak) return b.streak - a.streak
      return a.name.localeCompare(b.name)
    })[0] ?? null
  }, [habits])

  return (
    <main className="dashboard habits-page">
      <header className="dashboard__header">
        <h1 className="dashboard__title">Habits & Hobbies</h1>
        <p className="dashboard__subtitle">
          Track progress, link related items, and manage your testing resets
        </p>
      </header>

      {focusTarget ? (
        <section className="habits-page__focus-shell" aria-label="Focus timer">
          <div className="habits-page__focus-copy">
            <p className="habits-page__focus-kicker">Compact focus window</p>
            <h2 className="habits-page__focus-title">{focusTarget.name}</h2>
            <p className="habits-page__focus-subtitle">
              The timer now lives here, collapsed by default, and follows your highest-priority active card.
            </p>
          </div>
          <FocusTimer
            habitName={focusTarget.name}
            minutes={focusMinutes}
            onMinutesChange={setFocusMinutes}
          />
        </section>
      ) : null}

      {CATEGORIES.map(({ key, title, subtitle }) => {
        const items = byCategory[key]
        const collapsed = !!dashboard.collapsedCategories[key]
        return (
          <section key={key} className="habits-page__section" aria-label={title}>
            <header className="habits-page__section-header">
              <div>
                <h2 className="habits-page__section-title">{title}</h2>
                <p className="habits-page__section-subtitle">{subtitle}</p>
              </div>
              <div className="habits-page__section-actions">
                <span className="habits-page__count">{items.length} items</span>
                <button
                  type="button"
                  className="habits-page__collapse-btn"
                  onClick={() => onSetCategoryCollapsed(key, !collapsed)}
                >
                  {collapsed ? 'Show cards' : 'Hide cards'}
                </button>
              </div>
            </header>

            {collapsed ? (
              <p className="habits-page__collapsed-note">
                {title} cards are hidden. Use the toggle above to bring them back.
              </p>
            ) : items.length === 0 ? (
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
                    allCoreAspects={coreAspects}
                    timeRecords={timeRecords}
                    onToggle={onToggle}
                    onRename={onRenameHabit}
                    onSetLinked={onSetLinked}
                    onSetLinkedCoreAspects={onSetLinkedCoreAspects}
                    onArchive={onArchiveHabit}
                    onDelete={onDeleteHabit}
                    onRestore={onRestoreHabit}
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}

      {archivedHabits.length > 0 ? (
        <section className="habits-page__section" aria-label="Archived habits">
          <button
            type="button"
            className="habits-page__archive-toggle"
            onClick={() => setArchivedOpen((value) => !value)}
            aria-expanded={archivedOpen}
          >
            <div className="habits-page__section-header">
              <div>
                <h2 className="habits-page__section-title">Archived cards</h2>
                <p className="habits-page__section-subtitle">
                  Hidden from the active boards. Restore them whenever you want.
                </p>
              </div>
              <span className="habits-page__count">{archivedHabits.length} items</span>
            </div>
            <span
              className={`habits-page__archive-chevron${archivedOpen ? ' habits-page__archive-chevron--open' : ''}`}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>

          {archivedOpen ? (
            <div className="habits-page__grid">
              {archivedHabits.map((habit) => (
                <HabitOverviewCard
                  key={habit.id}
                  habit={habit}
                  streakSymbol={streakSymbol}
                  streakSymbolImageUrl={streakSymbolImageUrl}
                  rawXpEarned={habit.totalXpEarned ?? 0}
                  preferences={preferences}
                  allHabits={habits}
                  allCoreAspects={coreAspects}
                  timeRecords={timeRecords}
                  onToggle={onToggle}
                  onRename={onRenameHabit}
                  onSetLinked={onSetLinked}
                  onSetLinkedCoreAspects={onSetLinkedCoreAspects}
                  onArchive={onArchiveHabit}
                  onDelete={onDeleteHabit}
                  onRestore={onRestoreHabit}
                  archived
                />
              ))}
            </div>
          ) : (
            <div className="habits-page__collapsed-state">
              <span className="habits-page__collapsed-pill">Archived hidden</span>
              <span className="habits-page__collapsed-meta">
                {archivedHabits.length} saved for later
              </span>
              <button
                type="button"
                className="habits-page__collapse-btn"
                onClick={() => setArchivedOpen(true)}
              >
                Show archived
              </button>
            </div>
          )}
        </section>
      ) : null}

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
                      value={resolvedSelection[category] ?? ''}
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
                        preferences.itemCompletionXp[resolvedSelection[category] ?? ''] ?? 15
                      }
                      onChange={(e) => {
                        const selectedId = resolvedSelection[category]
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
                      value={preferences.itemBaseMinutes[resolvedSelection[category] ?? ''] ?? 0}
                      onChange={(e) => {
                        const selectedId = resolvedSelection[category]
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

          <div className="habits-page__master-row">
            <strong className="habits-page__master-label">main tasks</strong>
            {bountyTasks.length === 0 ? (
              <p className="habits-page__master-empty">No main tasks on the dashboard yet.</p>
            ) : (
              <>
                <label className="habits-page__master-field">
                  <span>Item</span>
                  <select
                    className="habits-page__master-input"
                    value={resolvedSelection.bounty ?? ''}
                    onChange={(e) =>
                      setSelectedByCategory((prev) => ({
                        ...prev,
                        bounty: e.target.value,
                      }))
                    }
                  >
                    {bountyTasks.map((item) => (
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
                    value={preferences.itemCompletionXp[resolvedSelection.bounty ?? ''] ?? 25}
                    onChange={(e) => {
                      const selectedId = resolvedSelection.bounty
                      if (!selectedId) return
                      onUpdatePreferences({
                        itemCompletionXp: {
                          [selectedId]: Math.max(0, Number(e.target.value) || 0),
                        },
                      })
                    }}
                  />
                </label>
              </>
            )}
          </div>
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
