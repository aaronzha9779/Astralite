import { useMemo } from 'react'
import { getRecentHistory } from '../lib/statsPage'
import type { CompletionRecord, DashboardStat } from '../types'
import { ActivityHeatmap } from './ActivityHeatmap'
import './StatsPage.css'

type StatsPageProps = {
  completions: CompletionRecord[]
  stats: DashboardStat[]
}

export function StatsPage({ completions, stats }: StatsPageProps) {
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
        <h2 className="dashboard__section-title">Activity</h2>
        <p className="stats-page__hint">
          Click a day to see which habits you completed.
        </p>
        <ActivityHeatmap completions={completions} />
      </section>

      <section className="stats-page__section">
        <h2 className="dashboard__section-title">Recent history</h2>
        {history.length === 0 ? (
          <p className="dashboard__empty">No completions logged yet.</p>
        ) : (
          <ul className="stats-page__history">
            {history.map((entry) => (
              <li key={entry.id} className="stats-page__history-item">
                <span className="stats-page__history-date">{entry.date}</span>
                <span className="stats-page__history-name">{entry.habitName}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
