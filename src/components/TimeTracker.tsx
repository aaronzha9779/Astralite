import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Habit } from '../types'
import { formatMinutes } from '../lib/time'
import './TimeTracker.css'

type TimeTrackerProps = {
  habits: Habit[]
  onSessionComplete: (habitId: string, minutes: number) => void
  onManualTime: (habitId: string, minutes: number) => void
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TimeTracker({
  habits,
  onSessionComplete,
  onManualTime,
}: TimeTrackerProps) {
  const [habitId, setHabitId] = useState(habits[0]?.id ?? '')
  const [durationMin, setDurationMin] = useState(25)
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [manualMin, setManualMin] = useState('30')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selected = habits.find((h) => h.id === habitId)

  useEffect(() => {
    if (!running) {
      setRemaining(durationMin * 60)
    }
  }, [durationMin, habitId, running])

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false)
          setDone(true)
          return 0
        }
        return r - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  const completedRef = useRef(false)
  useEffect(() => {
    if (done && habitId && !completedRef.current) {
      completedRef.current = true
      onSessionComplete(habitId, durationMin)
    }
    if (!done) completedRef.current = false
  }, [done, habitId, durationMin, onSessionComplete])

  function handleStart() {
    setDone(false)
    setRunning(true)
  }

  function handlePause() {
    setRunning(false)
  }

  function handleReset() {
    setRunning(false)
    setDone(false)
    setRemaining(durationMin * 60)
  }

  function handleManualAdd() {
    const m = parseInt(manualMin, 10)
    if (m > 0 && habitId) onManualTime(habitId, m)
  }

  const progress =
    durationMin > 0
      ? ((durationMin * 60 - remaining) / (durationMin * 60)) * 100
      : 0

  if (habits.length === 0) return null

  return (
    <section className="time-tracker" aria-label="Time tracker">
      <div className="time-tracker__header">
        <h2 className="time-tracker__title">Track time</h2>
        <p className="time-tracker__subtitle">
          Timer sessions and manual logs count toward daily, weekly, and total hours.
        </p>
      </div>

      <div className="time-tracker__body">
        <div className="time-tracker__controls">
          <label className="time-tracker__field">
            <span>Activity</span>
            <select
              className="time-tracker__select"
              value={habitId}
              onChange={(e) => {
                setHabitId(e.target.value)
                setRunning(false)
                setDone(false)
              }}
            >
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.category})
                </option>
              ))}
            </select>
          </label>

          <label className="time-tracker__field">
            <span>Timer ({durationMin} min)</span>
            <input
              type="range"
              min={5}
              max={120}
              step={5}
              value={durationMin}
              disabled={running}
              onChange={(e) => setDurationMin(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="time-tracker__timer">
          <div
            className="time-tracker__ring"
            style={{ '--progress': `${progress}%` } as CSSProperties}
          >
            <span className="time-tracker__countdown">
              {done ? 'Done!' : formatCountdown(remaining)}
            </span>
          </div>

          <div className="time-tracker__btns">
            {!running ? (
              <button type="button" className="time-tracker__btn time-tracker__btn--primary" onClick={handleStart}>
                {done ? 'Again' : 'Start'}
              </button>
            ) : (
              <button type="button" className="time-tracker__btn" onClick={handlePause}>
                Pause
              </button>
            )}
            <button type="button" className="time-tracker__btn" onClick={handleReset}>
              Reset
            </button>
          </div>

          {selected ? (
            <p className="time-tracker__hint">
              Total on {selected.name}: {formatMinutes(selected.totalMinutes)}
            </p>
          ) : null}
        </div>

        <div className="time-tracker__manual">
          <label className="time-tracker__field">
            <span>Manual add (min)</span>
            <input
              type="number"
              className="time-tracker__input"
              min={1}
              max={600}
              value={manualMin}
              onChange={(e) => setManualMin(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="time-tracker__btn time-tracker__btn--primary"
            onClick={handleManualAdd}
          >
            Log time
          </button>
        </div>
      </div>
    </section>
  )
}
