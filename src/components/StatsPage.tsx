import { useMemo, useState, type FormEvent } from 'react'
import {
  formatHistoryDay,
  formatHistoryTime,
  getRecentHistory,
} from '../lib/statsPage'
import type { CompletionRecord, CoreAspect, DashboardStat, Habit, TimeRecord } from '../types'
import { ActivityHeatmap } from './ActivityHeatmap'
import './StatsPage.css'

type StatsPageProps = {
  habits: Habit[]
  coreAspects: CoreAspect[]
  completions: CompletionRecord[]
  timeRecords: TimeRecord[]
  stats: DashboardStat[]
  onAddCoreAspect: (name: string) => void
  onIncrementCoreAspect: (id: string) => void
}

export function StatsPage({
  habits,
  coreAspects,
  completions,
  timeRecords,
  stats,
  onAddCoreAspect,
  onIncrementCoreAspect,
}: StatsPageProps) {
  const [coreAspectName, setCoreAspectName] = useState('')
  const history = useMemo(
    () => getRecentHistory(completions, 25),
    [completions],
  )
  const linkedHabitNamesByAspect = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const habit of habits) {
      for (const aspectId of habit.linkedCoreAspectIds ?? []) {
        map[aspectId] = [...(map[aspectId] ?? []), habit.name]
      }
    }
    return map
  }, [habits])

  function handleCoreAspectSubmit(event: FormEvent) {
    event.preventDefault()
    if (!coreAspectName.trim()) return
    onAddCoreAspect(coreAspectName)
    setCoreAspectName('')
  }

  return (
    <main className="dashboard stats-page">
      <header className="dashboard__header">
        <h1 className="dashboard__title">Stats</h1>
        <p className="dashboard__subtitle">
          Your grind history and activity over time
        </p>
      </header>

      <section className="dashboard__stats" aria-label="All-time summary">
        {stats.map((stat) => (
          <article key={stat.id} className="stat-card">
            <span className="stat-card__label">{stat.label}</span>
            <span className="stat-card__value">{stat.value}</span>
          </article>
        ))}
      </section>

      <section className="stats-page__section">
        <div className="stats-page__section-head">
          <h2 className="dashboard__section-title">Core aspects</h2>
          <p className="stats-page__hint">
            Add them manually here or let linked dashboard items feed them automatically.
          </p>
        </div>

        <form className="stats-page__core-form" onSubmit={handleCoreAspectSubmit}>
          <input
            className="stats-page__core-input"
            type="text"
            value={coreAspectName}
            onChange={(e) => setCoreAspectName(e.target.value)}
            placeholder="Add core aspect…"
            maxLength={80}
          />
          <button
            type="submit"
            className="stats-page__core-add"
            disabled={!coreAspectName.trim()}
          >
            Add
          </button>
        </form>

        {coreAspects.length === 0 ? (
          <p className="dashboard__empty">No core aspects yet.</p>
        ) : (
          <div className="stats-page__core-grid">
            {coreAspects.map((aspect) => {
              const current = aspect.totalProgress % 100
              const level = Math.floor(aspect.totalProgress / 100) + 1
              const linkedNames = linkedHabitNamesByAspect[aspect.id] ?? []
              return (
                <article key={aspect.id} className="stats-page__core-card">
                  <button
                    type="button"
                    className="stats-page__core-plus"
                    onClick={() => onIncrementCoreAspect(aspect.id)}
                    aria-label={`Add progress to ${aspect.name}`}
                  >
                    +
                  </button>
                  <div className="stats-page__core-copy">
                    <div className="stats-page__core-head">
                      <h3 className="stats-page__core-name">{aspect.name}</h3>
                      <span className="stats-page__core-level">Lv {level}</span>
                    </div>
                    <div className="stats-page__core-progress" aria-hidden="true">
                      <span
                        className="stats-page__core-progress-fill"
                        style={{ width: `${current}%` }}
                      />
                    </div>
                    <p className="stats-page__core-meta">
                      {current}/100 today {aspect.progressToday > 0 ? `· ${aspect.progressToday} gained today` : ''}
                    </p>
                    {linkedNames.length > 0 ? (
                      <p className="stats-page__core-links">
                        Linked to: {linkedNames.join(', ')}
                      </p>
                    ) : (
                      <p className="stats-page__core-links">No linked dashboard items yet.</p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="stats-page__section">
        <div className="stats-page__section-head">
          <h2 className="dashboard__section-title">Activity</h2>
          <p className="stats-page__hint">
            Click a day to inspect completions, or filter the heatmap to one item.
          </p>
        </div>
        <ActivityHeatmap
          habits={habits}
          completions={completions}
          timeRecords={timeRecords}
        />
      </section>

      <section className="stats-page__section">
        <details className="stats-page__history-panel" open>
          <summary className="stats-page__history-summary">
            <span className="dashboard__section-title">Recent history</span>
            <span className="stats-page__history-meta">
              {history.length} recent day{history.length === 1 ? '' : 's'}
            </span>
          </summary>
        {history.length === 0 ? (
          <p className="dashboard__empty">No completions logged yet.</p>
        ) : (
          <div className="stats-page__history">
            {history.map((day) => (
              <details key={day.date} className="stats-page__history-day">
                <summary className="stats-page__history-day-summary">
                  <span className="stats-page__history-day-date">
                    {formatHistoryDay(day.date)}
                  </span>
                  <span className="stats-page__history-day-meta">
                    {day.count} completion{day.count === 1 ? '' : 's'}
                  </span>
                </summary>
                <ul className="stats-page__history-list">
                  {day.entries.map((entry) => (
                    <li key={entry.id} className="stats-page__history-item">
                      <span className="stats-page__history-time">
                        {formatHistoryTime(entry.completedAt)}
                      </span>
                      <span className="stats-page__history-name">
                        {entry.habitName}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}
        </details>
      </section>
    </main>
  )
}
