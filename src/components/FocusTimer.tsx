import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import './FocusTimer.css'

type FocusTimerProps = {
  habitName: string
  minutes: number
  onMinutesChange: (minutes: number) => void
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function FocusTimer({
  habitName,
  minutes,
  onMinutesChange,
}: FocusTimerProps) {
  const inputId = useId()
  const totalSeconds = minutes * 60
  const [remaining, setRemaining] = useState(totalSeconds)
  const [running, setRunning] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    setRemaining(totalSeconds)
    setRunning(false)
    clearTimer()
  }, [totalSeconds, clearTimer])

  useEffect(() => {
    if (!running) {
      clearTimer()
      return
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTimer()
          setRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return clearTimer
  }, [running, clearTimer])

  useEffect(() => () => clearTimer(), [clearTimer])

  const progress =
    totalSeconds === 0 ? 0 : ((totalSeconds - remaining) / totalSeconds) * 100
  const done = remaining === 0 && !running

  const ringStyle = { '--progress': `${progress}%` } as CSSProperties

  function handleStartPause() {
    if (done) {
      setRemaining(totalSeconds)
    }
    setRunning((r) => !r)
  }

  function handleReset() {
    setRunning(false)
    setRemaining(totalSeconds)
  }

  return (
    <div className="focus-timer">
      <button
        type="button"
        className={`focus-timer__toggle${expanded ? ' focus-timer__toggle--open' : ''}`}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <span className="focus-timer__toggle-icon" aria-hidden="true">
          ⏱
        </span>
        Focus {minutes}m
      </button>

      {expanded && (
        <div className="focus-timer__panel">
          <p className="focus-timer__label">Focus on {habitName}</p>

          <div className="focus-timer__ring" style={ringStyle}>
            <span className="focus-timer__time">{formatTime(remaining)}</span>
          </div>

          {done && <p className="focus-timer__done">Session complete!</p>}

          <div className="focus-timer__duration">
            <label className="focus-timer__duration-label" htmlFor={inputId}>
              Duration
            </label>
            <input
              id={inputId}
              type="range"
              min={5}
              max={60}
              step={5}
              value={minutes}
              disabled={running}
              onChange={(e) => onMinutesChange(Number(e.target.value))}
            />
            <span className="focus-timer__duration-value">{minutes} min</span>
          </div>

          <div className="focus-timer__actions">
            <button
              type="button"
              className="focus-timer__btn focus-timer__btn--primary"
              onClick={handleStartPause}
            >
              {running ? 'Pause' : done ? 'Restart' : 'Start'}
            </button>
            <button
              type="button"
              className="focus-timer__btn"
              onClick={handleReset}
              disabled={running && remaining === totalSeconds}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
