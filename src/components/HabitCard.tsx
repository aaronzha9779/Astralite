import { useState } from 'react'
import type { Habit } from '../types'
import './HabitCard.css'

const checkSound = new Audio('/sounds/check.mp3')
checkSound.volume = 0.35


type HabitCardProps = {
  habit: Habit
  linkedNames?: string[]
  onToggle: (id: string) => void
}

export function HabitCard({
  habit,
  linkedNames = [],
  onToggle,
}: HabitCardProps) {
  const [showXp, setShowXp] = useState(false)


  function playCompleteSound() {
    checkSound.currentTime = 0
    checkSound.play().catch(() => {})
  }

function handleToggle() {
  const wasIncomplete = !habit.doneToday

  onToggle(habit.id)

  if (wasIncomplete) {
    playCompleteSound()
    setShowXp(true)
    setTimeout(() => setShowXp(false), 900)
  }
}
  return (
    <li className={`habit-card${habit.category === 'hobby' ? ' habit-card--hobby' : ''}`}>
      <button
        type="button"
        className={`habit-card__btn${habit.doneToday ? ' habit-card__btn--done' : ''}`}
        onClick={handleToggle}
        aria-pressed={habit.doneToday}
      >
        <span
          className={`habit-card__check${habit.doneToday ? ' habit-card__check--done' : ''}`}
          aria-hidden="true"
        />
        <span className="habit-card__body">
          <span className="habit-card__name">{habit.name}</span>
          {linkedNames.length > 0 ? (
            <span className="habit-card__linked" title="Linked completions">
              ⇄ {linkedNames.join(', ')}
            </span>
          ) : null}
        </span>
        {habit.streak > 0 ? (
          <span className="habit-card__streak" title={`${habit.streak} day streak`}>
            <span className="habit-card__streak-fire" aria-hidden="true">
              🔥
            </span>
            <span className="habit-card__streak-count">{habit.streak}</span>
          </span>
        ) : (
          <span className="habit-card__meta">No streak</span>
        )}
        {showXp ? <span className="habit-card__xp-pop">+10 XP</span> : null}
      </button>
    </li>
  )
}
