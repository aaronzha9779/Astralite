import { useMemo } from 'react'
import {
  formatHistoryDay,
  formatHistoryTime,
  getRecentHistory,
} from '../lib/statsPage'
import type { CompletionRecord, DashboardStat, Habit, TimeRecord } from '../types'
import { ActivityHeatmap } from './ActivityHeatmap'
import './StatsPage.css'

type StatsPageProps = {
  habits: Habit[]
  completions: CompletionRecord[]
  timeRecords: TimeRecord[]
  stats: DashboardStat[]
}

export function StatsPage({
  habits,
  completions,
  timeRecords,
  stats,
}: StatsPageProps) {
  const history = useMemo(
    () => getRecentHistory(completions, 25),
    [completions],
  )

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
