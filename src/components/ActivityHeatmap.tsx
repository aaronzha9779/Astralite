import { useMemo, useState } from 'react'
import { buildHeatmapDays, formatHeatmapDate } from '../lib/heatmap'
import { getCompletionsForDate } from '../lib/completions'
import type { CompletionRecord, HeatmapDay } from '../types'
import './ActivityHeatmap.css'

type ActivityHeatmapProps = {
  completions: CompletionRecord[]
}

const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

export function ActivityHeatmap({ completions }: ActivityHeatmapProps) {
  const days = useMemo(() => buildHeatmapDays(completions), [completions])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const weeks = useMemo(() => {
    const cols: HeatmapDay[][] = []
    let current: HeatmapDay[] = []

    for (const day of days) {
      const dow = new Date(day.date + 'T12:00:00').getDay()
      if (current.length === 0 && dow !== 0) {
        for (let i = 0; i < dow; i++) {
          current.push({ date: '', count: 0, level: 0 })
        }
      }
      current.push(day)
      if (current.length === 7) {
        cols.push(current)
        current = []
      }
    }
    if (current.length > 0) {
      while (current.length < 7) {
        current.push({ date: '', count: 0, level: 0 })
      }
      cols.push(current)
    }
    return cols
  }, [days])

  const selectedEntries = selectedDate
    ? getCompletionsForDate(completions, selectedDate)
    : []

  return (
    <section className="heatmap" aria-label="Activity heatmap">
      <div className="heatmap__grid-wrap">
        <div className="heatmap__weekdays" aria-hidden="true">
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i} className="heatmap__weekday">
              {label}
            </span>
          ))}
        </div>

        <div className="heatmap__grid" role="grid" aria-label="Daily activity">
          {weeks.map((week, wi) => (
            <div key={wi} className="heatmap__week" role="row">
              {week.map((day, di) => {
                if (!day.date) {
                  return (
                    <span
                      key={`${wi}-${di}`}
                      className="heatmap__cell heatmap__cell--empty"
                    />
                  )
                }

                const selected = selectedDate === day.date
                return (
                  <button
                    key={day.date}
                    type="button"
                    role="gridcell"
                    className={`heatmap__cell heatmap__cell--l${day.level}${selected ? ' heatmap__cell--selected' : ''}`}
                    title={`${formatHeatmapDate(day.date)}: ${day.count} completion${day.count === 1 ? '' : 's'}`}
                    aria-label={`${formatHeatmapDate(day.date)}, ${day.count} completions`}
                    aria-pressed={selected}
                    onClick={() =>
                      setSelectedDate((d) => (d === day.date ? null : day.date))
                    }
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="heatmap__legend" aria-hidden="true">
        <span className="heatmap__legend-label">Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`heatmap__cell heatmap__cell--l${l}`} />
        ))}
        <span className="heatmap__legend-label">More</span>
      </div>

      {selectedDate && (
        <aside className="heatmap__day-log" aria-live="polite">
          <header className="heatmap__day-log-header">
            <h3 className="heatmap__day-log-title">
              {formatHeatmapDate(selectedDate)}
            </h3>
            <button
              type="button"
              className="heatmap__day-log-close"
              onClick={() => setSelectedDate(null)}
              aria-label="Close day log"
            >
              ×
            </button>
          </header>
          {selectedEntries.length === 0 ? (
            <p className="heatmap__day-log-empty">No habits completed this day.</p>
          ) : (
            <ul className="heatmap__day-log-list">
              {selectedEntries.map((entry) => (
                <li key={entry.id} className="heatmap__day-log-item">
                  <span className="heatmap__day-log-check" aria-hidden="true">
                    ✓
                  </span>
                  {entry.habitName}
                </li>
              ))}
            </ul>
          )}
          <p className="heatmap__day-log-count">
            {selectedEntries.length} habit
            {selectedEntries.length === 1 ? '' : 's'} completed
          </p>
        </aside>
      )}
    </section>
  )
}
