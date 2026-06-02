import { useMemo, useState } from 'react'
import { playCompletionChime } from '../lib/audio'
import type { AppPreferences, CoreAspect, Habit, TimeRecord } from '../types'
import { getHabitMaturity, getHobbyMaturity } from '../lib/maturity'
import { formatMinutes, getHabitTimeBreakdown } from '../lib/time'
import './HabitOverviewCard.css'

type HabitOverviewCardProps = {
  habit: Habit
  streakSymbol: string
  streakSymbolImageUrl: string | null
  rawXpEarned: number
  preferences: AppPreferences
  allHabits: Habit[]
  allCoreAspects: CoreAspect[]
  timeRecords: TimeRecord[]
  onToggle: (id: string) => void
  onRename: (habitId: string, name: string) => void
  onSetLinked: (habitId: string, linkedIds: string[]) => void
  onSetLinkedCoreAspects: (habitId: string, aspectIds: string[]) => void
}

export function HabitOverviewCard({
  habit,
  streakSymbol,
  streakSymbolImageUrl,
  rawXpEarned,
  preferences,
  allHabits,
  allCoreAspects,
  timeRecords,
  onToggle,
  onRename,
  onSetLinked,
  onSetLinkedCoreAspects,
}: HabitOverviewCardProps) {
  const [showLink, setShowLink] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [draftName, setDraftName] = useState(habit.name)
  const displayStreakSymbol = habit.streak > 30 ? '❤️‍🔥' : streakSymbol

  const isHobby = habit.category === 'hobby'
  const maturity = isHobby
    ? getHobbyMaturity(habit.totalProgress)
    : getHabitMaturity(rawXpEarned, preferences)
  const timeStats = useMemo(
    () => getHabitTimeBreakdown(timeRecords, habit.id),
    [timeRecords, habit.id],
  )

  const linkOptions = allHabits.filter((h) => h.id !== habit.id)
  const linkedNames = (habit.linkedHabitIds ?? [])
    .map((id) => allHabits.find((h) => h.id === id)?.name)
    .filter(Boolean) as string[]
  const linkedCoreAspectNames = (habit.linkedCoreAspectIds ?? [])
    .map((id) => allCoreAspects.find((aspect) => aspect.id === id)?.name)
    .filter(Boolean) as string[]

  function toggleLink(targetId: string) {
    const current = habit.linkedHabitIds ?? []
    const next = current.includes(targetId)
      ? current.filter((id) => id !== targetId)
      : [...current, targetId]
    onSetLinked(habit.id, next)
  }

  function toggleCoreAspectLink(targetId: string) {
    const current = habit.linkedCoreAspectIds ?? []
    const next = current.includes(targetId)
      ? current.filter((id) => id !== targetId)
      : [...current, targetId]
    onSetLinkedCoreAspects(habit.id, next)
  }

  function handleToggle() {
    const wasIncomplete = !habit.doneToday
    onToggle(habit.id)
    if (wasIncomplete) playCompletionChime()
  }

  function handleNameSave() {
    const trimmed = draftName.trim()
    if (!trimmed) {
      setDraftName(habit.name)
      setIsEditingName(false)
      return
    }
    onRename(habit.id, trimmed)
    setDraftName(trimmed)
    setIsEditingName(false)
  }

  return (
    <article
      className={`habit-overview${habit.doneToday ? ' habit-overview--done' : ''}`}
    >
      <header className="habit-overview__header">
        <button
          type="button"
          className="habit-overview__check"
          onClick={handleToggle}
          aria-pressed={habit.doneToday}
          aria-label={habit.doneToday ? 'Mark incomplete' : 'Mark complete'}
        >
          <span
            className={`habit-overview__check-box${habit.doneToday ? ' habit-overview__check-box--done' : ''}`}
          />
        </button>
        <div className="habit-overview__title-block">
          {isEditingName ? (
            <div className="habit-overview__name-editor">
              <input
                className="habit-overview__name-input"
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave()
                  if (e.key === 'Escape') {
                    setDraftName(habit.name)
                    setIsEditingName(false)
                  }
                }}
                autoFocus
              />
              <div className="habit-overview__name-actions">
                <button
                  type="button"
                  className="habit-overview__name-btn"
                  onClick={handleNameSave}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="habit-overview__name-btn"
                  onClick={() => {
                    setDraftName(habit.name)
                    setIsEditingName(false)
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="habit-overview__name-row">
              <h3 className="habit-overview__name">{habit.name}</h3>
              <button
                type="button"
                className="habit-overview__rename-btn"
                onClick={() => {
                  setDraftName(habit.name)
                  setIsEditingName(true)
                }}
              >
                Edit name
              </button>
            </div>
          )}
          {habit.tags.length > 0 ? (
            <div className="habit-overview__tags">
              {habit.tags.map((tag) => (
                <span key={tag} className="habit-overview__tag">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {habit.streak > 0 ? (
          <span className="habit-overview__streak" title="Current streak">
            {habit.streak > 30 || !streakSymbolImageUrl ? (
              <>{displayStreakSymbol}</>
            ) : (
              <img className="habit-overview__streak-image" src={streakSymbolImageUrl} alt="" />
            )}{' '}
            {habit.streak}
          </span>
        ) : null}
      </header>

      <div className="habit-overview__rank">
        <span className="habit-overview__rank-name">{maturity.rank}</span>
        <span className="habit-overview__level">Lv {maturity.level}</span>
        <div
          className="habit-overview__progress"
          role="progressbar"
          aria-valuenow={maturity.percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span
            className="habit-overview__progress-fill"
            style={{ width: `${maturity.percent}%` }}
          />
        </div>
        <span className="habit-overview__progress-label">
          {isHobby
            ? `${maturity.minutes} / ${maturity.minutesToNext} progress`
            : `${maturity.minutes} / ${maturity.minutesToNext} XP to next`}
        </span>
      </div>

      <dl className="habit-overview__stats">
        <div>
          <dt>Today</dt>
          <dd>{formatMinutes(timeStats.todayMinutes)}</dd>
        </div>
        <div>
          <dt>This week</dt>
          <dd>{formatMinutes(timeStats.weekMinutes)}</dd>
        </div>
        <div>
          <dt>All time</dt>
          <dd>{formatMinutes(timeStats.totalMinutes || habit.totalMinutes)}</dd>
        </div>
      </dl>

      {linkedNames.length > 0 ? (
        <p className="habit-overview__linked">
          Linked with: {linkedNames.join(', ')}
        </p>
      ) : null}

      {linkedCoreAspectNames.length > 0 ? (
        <p className="habit-overview__linked">
          Core aspects: {linkedCoreAspectNames.join(', ')}
        </p>
      ) : null}

      <div className="habit-overview__tools">
        <button
          type="button"
          className="habit-overview__tool-btn"
          onClick={() => setShowLink((s) => !s)}
        >
          {showLink ? 'Hide links' : 'Manage links'}
        </button>
      </div>

      {showLink ? (
        <div className="habit-overview__link-groups">
          <div>
            <p className="habit-overview__link-title">Linked habits</p>
            <ul className="habit-overview__link-list">
              {linkOptions.map((h) => (
                <li key={h.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={(habit.linkedHabitIds ?? []).includes(h.id)}
                      onChange={() => toggleLink(h.id)}
                    />
                    {h.name}
                    <span className="habit-overview__link-cat">{h.category}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="habit-overview__link-title">Core aspects</p>
            <ul className="habit-overview__link-list">
              {allCoreAspects.length === 0 ? (
                <li className="habit-overview__link-empty">No core aspects yet.</li>
              ) : (
                allCoreAspects.map((aspect) => (
                  <li key={aspect.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={(habit.linkedCoreAspectIds ?? []).includes(aspect.id)}
                        onChange={() => toggleCoreAspectLink(aspect.id)}
                      />
                      {aspect.name}
                      <span className="habit-overview__link-cat">
                        {aspect.progressToday}/100
                      </span>
                    </label>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}

      <p className="habit-overview__xp-earned">{rawXpEarned} XP earned</p>
    </article>
  )
}
