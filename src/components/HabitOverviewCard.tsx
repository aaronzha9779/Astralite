import { useMemo, useState } from 'react'
import type { Habit, TimeRecord } from '../types'
import { getHabitMaturity } from '../lib/maturity'
import { formatMinutes, getHabitTimeBreakdown } from '../lib/time'
import './HabitOverviewCard.css'

type HabitOverviewCardProps = {
  habit: Habit
  allHabits: Habit[]
  timeRecords: TimeRecord[]
  onToggle: (id: string) => void
  onSetLinked: (habitId: string, linkedIds: string[]) => void
}

export function HabitOverviewCard({
  habit,
  allHabits,
  timeRecords,
  onToggle,
  onSetLinked,
}: HabitOverviewCardProps) {
  const [showLink, setShowLink] = useState(false)

  const maturity = getHabitMaturity(habit.totalMinutes)
  const timeStats = useMemo(
    () => getHabitTimeBreakdown(timeRecords, habit.id),
    [timeRecords, habit.id],
  )

  const linkOptions = allHabits.filter((h) => h.id !== habit.id)
  const linkedNames = (habit.linkedHabitIds ?? [])
    .map((id) => allHabits.find((h) => h.id === id)?.name)
    .filter(Boolean) as string[]

  function toggleLink(targetId: string) {
    const current = habit.linkedHabitIds ?? []
    const next = current.includes(targetId)
      ? current.filter((id) => id !== targetId)
      : [...current, targetId]
    onSetLinked(habit.id, next)
  }

  return (
    <article
      className={`habit-overview${habit.doneToday ? ' habit-overview--done' : ''}`}
    >
      <header className="habit-overview__header">
        <button
          type="button"
          className="habit-overview__check"
          onClick={() => onToggle(habit.id)}
          aria-pressed={habit.doneToday}
          aria-label={habit.doneToday ? 'Mark incomplete' : 'Mark complete'}
        >
          <span
            className={`habit-overview__check-box${habit.doneToday ? ' habit-overview__check-box--done' : ''}`}
          />
        </button>
        <div className="habit-overview__title-block">
          <h3 className="habit-overview__name">{habit.name}</h3>
          {habit.tags.length > 0 ? (
            <div className="habit-overview__tags">
              {habit.tags.map((tag) => (
                <span key={tag} className="habit-overview__tag">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {habit.streak > 0 ? (
          <span className="habit-overview__streak" title="Current streak">
            🔥 {habit.streak}
          </span>
        ) : null}
      </header>

      <div className="habit-overview__rank">
        <span className="habit-overview__rank-name">{maturity.rank}</span>
        <span className="habit-overview__level">Lv {maturity.level}</span>
        <div
          className="habit-overview__progress"
          role="progressbar"
          aria-valuenow={maturity.percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span
            className="habit-overview__progress-fill"
            style={{ width: `${maturity.percent}%` }}
          />
        </div>
        <span className="habit-overview__progress-label">
          {formatMinutes(maturity.minutes)} / {formatMinutes(maturity.minutesToNext)} to next
        </span>
      </div>

      <dl className="habit-overview__stats">
        <div>
          <dt>Today</dt>
          <dd>{formatMinutes(timeStats.todayMinutes)}</dd>
        </div>
        <div>
          <dt>This week</dt>
          <dd>{formatMinutes(timeStats.weekMinutes)}</dd>
        </div>
        <div>
          <dt>All time</dt>
          <dd>{formatMinutes(timeStats.totalMinutes || habit.totalMinutes)}</dd>
        </div>
      </dl>

      {linkedNames.length > 0 ? (
        <p className="habit-overview__linked">
          Linked with: {linkedNames.join(', ')}
        </p>
      ) : null}

      <div className="habit-overview__tools">
        <button
          type="button"
          className="habit-overview__tool-btn"
          onClick={() => setShowLink((s) => !s)}
        >
          {showLink ? 'Hide links' : 'Link habits'}
        </button>
      </div>

      {showLink ? (
        <ul className="habit-overview__link-list">
          {linkOptions.map((h) => (
            <li key={h.id}>
              <label>
                <input
                  type="checkbox"
                  checked={(habit.linkedHabitIds ?? []).includes(h.id)}
                  onChange={() => toggleLink(h.id)}
                />
                {h.name}
                <span className="habit-overview__link-cat">{h.category}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}
