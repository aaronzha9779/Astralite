import { useEffect, useRef, useState } from 'react'
import type { Habit } from '../types'
import type { XpBreakdown } from '../lib/xp'
import { formatMinutes } from '../lib/time'
import { ManualTimeLog } from './ManualTimeLog'
import './TimerPage.css'

type TimerPageProps = {
  habits: Habit[]
  onSessionComplete: (habitId: string, minutes: number) => XpBreakdown | null
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
  onSessionComplete,
  onManualTime,
}: TimerPageProps) {
  const [habitId, setHabitId] = useState(habits[0]?.id ?? '')
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [xpToast, setXpToast] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selected = habits.find((h) => h.id === habitId)

  useEffect(() => {
    if (!habits.some((h) => h.id === habitId)) {
      setHabitId(habits[0]?.id ?? '')
    }
  }, [habits, habitId])

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  function showXpToast(breakdown: XpBreakdown | null) {
    if (!breakdown || breakdown.total <= 0) return
    const bonus =
      breakdown.bonus > 0
        ? ` (+${breakdown.bonus} ${breakdown.bonusLabel ?? 'bonus'}!)`
        : ''
    setXpToast(`+${breakdown.total} XP${bonus}`)
    setTimeout(() => setXpToast(null), 3500)
  }

  function handleStart() {
    setRunning(true)
  }

  function handleReset() {
    setRunning(false)
    if (elapsed >= 60 && habitId) {
      const minutes = Math.round(elapsed / 60)
      const result = onSessionComplete(habitId, minutes)
      showXpToast(result)
    }
    setElapsed(0)
  }

  return (
    <main className="dashboard timer-page">
      <header className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Timer</h1>
          <p className="dashboard__subtitle">
            Live stopwatch for any skill · reset saves sessions over 1 minute
          </p>
        </div>
      </header>

      {xpToast ? (
        <p className="timer-page__toast" role="status">
          {xpToast}
        </p>
      ) : null}

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
              onChange={(e) => setHabitId(e.target.value)}
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
              onClick={handleStart}
            >
              Start
            </button>
            <button type="button" className="timer-page__btn" onClick={handleReset}>
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
