import { useState } from 'react'
import { playCompletionChime } from '../lib/audio'
import { getHabitMaturity } from '../lib/maturity'
import type { Habit } from '../types'
import './HabitCard.css'

type HabitCardProps = {
  habit: Habit
  streakSymbol: string
  streakSymbolImageUrl: string | null
  completionXp: number
  rawXpEarned: number
  linkedNames?: string[]
  onToggle: (id: string) => void
  onIncrement: (id: string) => void
}

export function HabitCard({
  habit,
  streakSymbol,
  streakSymbolImageUrl,
  completionXp,
  rawXpEarned,
  linkedNames = [],
  onToggle,
  onIncrement,
}: HabitCardProps) {
  const [showXp, setShowXp] = useState(false)
  const displayStreakSymbol = habit.streak > 30 ? '❤️‍🔥' : streakSymbol
  const maturity = getHabitMaturity(rawXpEarned)
  const isHobby = habit.category === 'hobby'
  const backgroundProgress = isHobby ? Math.min(100, habit.progressToday) : habit.doneToday ? 100 : 0

  function handleToggle() {
    const wasIncomplete = !habit.doneToday

    onToggle(habit.id)

    if (wasIncomplete) {
      playCompletionChime()
      setShowXp(true)
      setTimeout(() => setShowXp(false), 900)
    }
  }

  function handleIncrement() {
    onIncrement(habit.id)
    playCompletionChime()
    setShowXp(true)
    setTimeout(() => setShowXp(false), 900)
  }

  return (
    <li className={`habit-card${isHobby ? ' habit-card--hobby' : ''}`}>
      <div className={`habit-card__btn${habit.doneToday ? ' habit-card__btn--done' : ''}`} style={{ ['--card-progress' as string]: `${backgroundProgress}%` }}>
        {!isHobby ? (
          <button
            type="button"
            className={`habit-card__check-button${habit.doneToday ? ' habit-card__check-button--done' : ''}`}
            onClick={handleToggle}
            aria-pressed={habit.doneToday}
            aria-label={habit.doneToday ? `Mark ${habit.name} incomplete` : `Mark ${habit.name} complete`}
          >
            <span
              className={`habit-card__check${habit.doneToday ? ' habit-card__check--done' : ''}`}
              aria-hidden="true"
            />
          </button>
        ) : (
          <button
            type="button"
            className="habit-card__check-button habit-card__check-button--plus"
            onClick={handleIncrement}
            aria-label={`Add progress to ${habit.name}`}
          >
            +
          </button>
        )}
        <span className="habit-card__body">
          <span className="habit-card__title-row">
            <span className="habit-card__name">{habit.name}</span>
            {linkedNames.length > 0 ? (
              <span className="habit-card__linked" title="Linked completions">
                ⇄ {linkedNames.join(', ')}
              </span>
            ) : null}
          </span>
          <span className="habit-card__progress-row">
            <span className="habit-card__progress-track" aria-hidden="true">
              <span
                className="habit-card__progress-fill"
                style={{ width: `${isHobby ? Math.min(100, habit.progressToday) : maturity.percent}%` }}
              />
            </span>
            <span className="habit-card__progress-label">
              {isHobby
                ? `${habit.progressToday}/100`
                : `${maturity.minutes}/${maturity.minutesToNext} XP`}
            </span>
          </span>
        </span>
        {habit.streak > 0 ? (
          <span className="habit-card__streak" title={`${habit.streak} day streak`}>
            {habit.streak > 30 || !streakSymbolImageUrl ? (
              <span className="habit-card__streak-fire" aria-hidden="true">
                {displayStreakSymbol}
              </span>
            ) : (
              <img
                className="habit-card__streak-image"
                src={streakSymbolImageUrl}
                alt=""
              />
            )}
            <span className="habit-card__streak-count">{habit.streak}</span>
          </span>
        ) : (
          <span className="habit-card__meta">No streak</span>
        )}
        {showXp ? <span className="habit-card__xp-pop">+{completionXp} XP</span> : null}
      </div>
    </li>
  )
}
