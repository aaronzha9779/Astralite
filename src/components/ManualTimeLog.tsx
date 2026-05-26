import { useState } from 'react'
import type { Habit } from '../types'
import type { XpBreakdown } from '../lib/xp'
import './ManualTimeLog.css'

type ManualTimeLogProps = {
  habits: Habit[]
  onLog: (habitId: string, minutes: number) => XpBreakdown | null
}

export function ManualTimeLog({ habits, onLog }: ManualTimeLogProps) {
  const [habitId, setHabitId] = useState(habits[0]?.id ?? '')
  const [minutes, setMinutes] = useState('30')
  const [feedback, setFeedback] = useState<string | null>(null)

  if (habits.length === 0) {
    return (
      <p className="manual-time-log__empty">
        Add habits on the dashboard first, then log missed time here.
      </p>
    )
  }

  function handleSubmit() {
    const m = parseInt(minutes, 10)
    if (!habitId || m <= 0) return

    const result = onLog(habitId, m)
    if (result) {
      setFeedback(`+${result.total} XP`)
      setTimeout(() => setFeedback(null), 3500)
    }
  }

  return (
    <section className="manual-time-log" aria-label="Log missed time">
      <h3 className="manual-time-log__title">Log missed time</h3>
      <p className="manual-time-log__subtitle">
        One place to backfill time on any habit or hobby with flat, predictable XP.
      </p>

      <div className="manual-time-log__row">
        <label className="manual-time-log__field">
          <span>Habit / skill</span>
          <select
            className="manual-time-log__select"
            value={habitId}
            onChange={(e) => setHabitId(e.target.value)}
          >
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.category})
              </option>
            ))}
          </select>
        </label>

        <label className="manual-time-log__field manual-time-log__field--short">
          <span>Minutes</span>
          <input
            type="number"
            className="manual-time-log__input"
            min={1}
            max={600}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </label>

        <button
          type="button"
          className="manual-time-log__btn"
          onClick={handleSubmit}
        >
          Log time
        </button>
      </div>

      {feedback ? (
        <p className="manual-time-log__feedback" role="status">
          {feedback}
        </p>
      ) : null}
    </section>
  )
}
