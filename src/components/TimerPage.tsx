import type { Habit } from '../types'
import type { XpBreakdown } from '../lib/xp'
import { formatMinutes } from '../lib/time'
import { ManualTimeLog } from './ManualTimeLog'
import './TimerPage.css'

type TimerPageProps = {
  habits: Habit[]
  habitId: string
  elapsed: number
  running: boolean
  onHabitIdChange: (habitId: string) => void
  onStart: () => void
  onStop: () => void
  onReset: () => void
  onManualTime: (habitId: string, minutes: number) => XpBreakdown | null
}

function formatStopwatch(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TimerPage({
  habits,
  habitId,
  elapsed,
  running,
  onHabitIdChange,
  onStart,
  onStop,
  onReset,
  onManualTime,
}: TimerPageProps) {
  const selected = habits.find((h) => h.id === habitId)

  return (
    <main className="dashboard timer-page">
      <header className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Timer</h1>
          <p className="dashboard__subtitle">
            Live stopwatch for any skill · stop pauses, reset saves sessions over 1 minute
          </p>
        </div>
      </header>

      {habits.length === 0 ? (
        <p className="timer-page__empty">
          Add habits on the dashboard to start timing sessions.
        </p>
      ) : (
        <section className="timer-page__stopwatch" aria-label="Stopwatch">
          <label className="timer-page__field">
            <span>Skill / habit</span>
            <select
              className="timer-page__select"
              value={habitId}
              disabled={running}
              onChange={(e) => onHabitIdChange(e.target.value)}
            >
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.category})
                </option>
              ))}
            </select>
          </label>

          <div className="timer-page__display" aria-live="polite">
            {formatStopwatch(elapsed)}
          </div>

          <div className="timer-page__btns">
            <button
              type="button"
              className="timer-page__btn timer-page__btn--primary"
              disabled={running}
              onClick={onStart}
            >
              Start
            </button>
            <button
              type="button"
              className="timer-page__btn"
              disabled={!running && elapsed === 0}
              onClick={onStop}
            >
              Stop
            </button>
            <button type="button" className="timer-page__btn" onClick={onReset}>
              Reset
            </button>
          </div>

          {selected ? (
            <p className="timer-page__hint">
              {selected.name}: {formatMinutes(selected.totalMinutes)} tracked
            </p>
          ) : null}
        </section>
      )}

      <ManualTimeLog habits={habits} onLog={onManualTime} />
    </main>
  )
}
