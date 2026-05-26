import type { AppPreferences, Habit, HabitCategory } from '../types'
import { AddHabitForm } from './AddHabitForm'
import { HabitCard } from './HabitCard'
import './TaskColumn.css'

const COLUMN_META: Record<
  HabitCategory,
  { title: string; subtitle: string; placeholder: string }
> = {
  daily: {
    title: 'Dailies',
    subtitle: 'Every day essentials',
    placeholder: 'Add daily…',
  },
  habit: {
    title: 'Habits',
    subtitle: 'Build consistency',
    placeholder: 'Add habit…',
  },
  hobby: {
    title: 'Hobbies',
    subtitle: 'Grow mastery through time',
    placeholder: 'Add hobby…',
  },
}

type TaskColumnProps = {
  category: HabitCategory
  habits: Habit[]
  allHabits: Habit[]
  preferences: AppPreferences
  rawXpByHabit: Record<string, number>
  streakSymbol: string
  streakSymbolImageUrl: string | null
  onToggle: (id: string) => void
  onIncrementHobby: (id: string) => void
  onAdd: (name: string, category: HabitCategory) => void
  getLinkedNames: (all: Habit[], habit: Habit) => string[]
}

export function TaskColumn({
  category,
  habits,
  allHabits,
  preferences,
  rawXpByHabit,
  streakSymbol,
  streakSymbolImageUrl,
  onToggle,
  onIncrementHobby,
  onAdd,
  getLinkedNames,
}: TaskColumnProps) {
  const meta = COLUMN_META[category]
  const completed = habits.filter((h) => h.doneToday).length

  return (
    <section className="task-column" aria-label={meta.title}>
      <header className="task-column__header">
        <div>
          <h2 className="task-column__title">{meta.title}</h2>
          <p className="task-column__subtitle">{meta.subtitle}</p>
        </div>
        {habits.length > 0 ? (
          <span className="task-column__count">
            {completed}/{habits.length}
          </span>
        ) : null}
      </header>

      <AddHabitForm
        compact
        placeholder={meta.placeholder}
        onAdd={(name) => onAdd(name, category)}
      />

      {habits.length === 0 ? (
        <p className="task-column__empty">Nothing here yet.</p>
      ) : null}

      {habits.length > 0 ? (
        <ul className="task-column__list">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              completionXp={preferences.itemCompletionXp[habit.id] ?? 15}
              rawXpEarned={rawXpByHabit[habit.id] ?? 0}
              streakSymbol={streakSymbol}
              streakSymbolImageUrl={streakSymbolImageUrl}
              onIncrement={onIncrementHobby}
              linkedNames={getLinkedNames(allHabits, habit)}
              onToggle={onToggle}
            />
          ))}
        </ul>
      ) : null}
    </section>
  )
}
