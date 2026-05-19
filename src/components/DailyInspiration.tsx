import { useMemo, useState, type FormEvent } from 'react'
import type { DashboardPrefs } from '../types'
import './DailyInspiration.css'

type DailyInspirationProps = {
  dashboard: DashboardPrefs
  onSetDailyGoal: (goal: string) => void
  onAddQuote: (quote: string) => void
  onRemoveQuote: (index: number) => void
  onShuffleQuote: () => void
}

function pickQuote(dashboard: DashboardPrefs): string | null {
  const { quotes, activeQuoteIndex } = dashboard
  if (quotes.length === 0) return null
  if (activeQuoteIndex !== null && quotes[activeQuoteIndex]) {
    return quotes[activeQuoteIndex]
  }
  return quotes[Math.floor(Math.random() * quotes.length)]
}

export function DailyInspiration({
  dashboard,
  onSetDailyGoal,
  onAddQuote,
  onRemoveQuote,
  onShuffleQuote,
}: DailyInspirationProps) {
  const [expanded, setExpanded] = useState(false)
  const [newQuote, setNewQuote] = useState('')
  const [goalDraft, setGoalDraft] = useState(dashboard.dailyGoal)

  const displayQuote = useMemo(() => pickQuote(dashboard), [dashboard])

  function handleQuoteSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = newQuote.trim()
    if (!trimmed) return
    onAddQuote(trimmed)
    setNewQuote('')
  }

  function handleGoalBlur() {
    if (goalDraft !== dashboard.dailyGoal) {
      onSetDailyGoal(goalDraft)
    }
  }

  const hasGoal = dashboard.dailyGoal.trim().length > 0

  return (
    <aside className="inspiration">
      <div className="inspiration__main">
        {hasGoal ? (
          <p className="inspiration__goal">
            <span className="inspiration__label">Today&apos;s focus</span>
            {dashboard.dailyGoal}
          </p>
        ) : displayQuote ? (
          <blockquote className="inspiration__quote">
            <span className="inspiration__label">Quote</span>
            {displayQuote}
          </blockquote>
        ) : (
          <p className="inspiration__placeholder">
            Set a daily goal or add a quote below.
          </p>
        )}

        <div className="inspiration__actions">
          {dashboard.quotes.length > 0 ? (
            <button
              type="button"
              className="inspiration__btn"
              onClick={onShuffleQuote}
              title="Pick a random quote"
            >
              Random
            </button>
          ) : null}
          <button
            type="button"
            className="inspiration__btn inspiration__btn--ghost"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? 'Less' : 'Edit'}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="inspiration__editor">
          <label className="inspiration__field">
            <span className="inspiration__field-label">Daily goal</span>
            <input
              className="inspiration__input"
              type="text"
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              onBlur={handleGoalBlur}
              placeholder="What matters most today?"
              maxLength={120}
            />
          </label>

          <form className="inspiration__quote-form" onSubmit={handleQuoteSubmit}>
            <input
              className="inspiration__input"
              type="text"
              value={newQuote}
              onChange={(e) => setNewQuote(e.target.value)}
              placeholder="Add a quote…"
              maxLength={200}
              aria-label="New quote"
            />
            <button
              type="submit"
              className="inspiration__btn"
              disabled={!newQuote.trim()}
            >
              Add
            </button>
          </form>

          {dashboard.quotes.length > 0 ? (
            <ul className="inspiration__quote-list">
              {dashboard.quotes.map((quote, index) => (
                <li key={`${index}-${quote.slice(0, 12)}`} className="inspiration__quote-item">
                  <span className="inspiration__quote-text">{quote}</span>
                  <button
                    type="button"
                    className="inspiration__quote-remove"
                    onClick={() => onRemoveQuote(index)}
                    aria-label="Remove quote"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </aside>
  )
}
