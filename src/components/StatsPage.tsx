import {
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
  type SyntheticEvent,
} from 'react'
import {
  formatHistoryDay,
  groupRecentHistoryByMonth,
  formatHistoryTime,
  getRecentHistory,
} from '../lib/statsPage'
import type {
  CompletionRecord,
  CoreAspect,
  DashboardStat,
  DashboardPrefs,
  GoalGroup,
  Habit,
  IntegrationProtocol,
  TimeRecord,
} from '../types'
import { getProtocolStepTitles } from '../lib/protocols'
import { ActivityHeatmap } from './ActivityHeatmap'
import './StatsPage.css'

type StatsPageProps = {
  habits: Habit[]
  coreAspects: CoreAspect[]
  goalGroups: GoalGroup[]
  protocols: IntegrationProtocol[]
  completions: CompletionRecord[]
  timeRecords: TimeRecord[]
  stats: DashboardStat[]
  dashboard: DashboardPrefs
  onAddCoreAspect: (name: string) => void
  onIncrementCoreAspect: (id: string) => void
  onAddGoalGroup: (name: string) => void
  onAddGoal: (groupId: string, name: string, target: number) => void
  onIncrementGoal: (id: string) => void
  onRenameGoalGroup: (groupId: string, name: string) => void
  onToggleGoalGroupCollapsed: (groupId: string) => void
  onReorderGoalGroup: (draggedId: string, targetId: string) => boolean
  onRenameGoal: (groupId: string, goalId: string, name: string) => void
  onReorderGoal: (
    goalId: string,
    fromGroupId: string,
    toGroupId: string,
    targetGoalId?: string | null,
  ) => boolean
  onSetHistoryOpen: (open: boolean) => void
  onSetHistoryMonthOpen: (monthKey: string, open: boolean) => void
}

export function StatsPage({
  habits,
  coreAspects,
  goalGroups,
  protocols,
  completions,
  timeRecords,
  stats,
  dashboard,
  onAddCoreAspect,
  onIncrementCoreAspect,
  onAddGoalGroup,
  onAddGoal,
  onIncrementGoal,
  onRenameGoalGroup,
  onToggleGoalGroupCollapsed,
  onReorderGoalGroup,
  onRenameGoal,
  onReorderGoal,
  onSetHistoryOpen,
  onSetHistoryMonthOpen,
}: StatsPageProps) {
  const [coreAspectName, setCoreAspectName] = useState('')
  const [goalGroupName, setGoalGroupName] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [groupRenameDraft, setGroupRenameDraft] = useState('')
  const [editingGoal, setEditingGoal] = useState<{ groupId: string; goalId: string } | null>(null)
  const [goalRenameDraft, setGoalRenameDraft] = useState('')
  const [goalDrafts, setGoalDrafts] = useState<Record<string, { name: string; target: string }>>({})
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null)
  const [draggedGoal, setDraggedGoal] = useState<{ groupId: string; goalId: string } | null>(null)
  const history = useMemo(
    () => getRecentHistory(completions, 25),
    [completions],
  )
  const historyByMonth = useMemo(
    () => groupRecentHistoryByMonth(history),
    [history],
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
  const completedProtocols = useMemo(
    () =>
      protocols
        .filter((protocol) => protocol.completedAt && !protocol.archivedAt)
        .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt)),
    [protocols],
  )
  const trophyDetailsById = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const protocol of completedProtocols) {
      map[protocol.id] = getProtocolStepTitles(protocol.steps)
    }
    return map
  }, [completedProtocols])

  function handleCoreAspectSubmit(event: FormEvent) {
    event.preventDefault()
    if (!coreAspectName.trim()) return
    onAddCoreAspect(coreAspectName)
    setCoreAspectName('')
  }

  function handleGoalGroupSubmit(event: FormEvent) {
    event.preventDefault()
    if (!goalGroupName.trim()) return
    onAddGoalGroup(goalGroupName)
    setGoalGroupName('')
  }

  function updateGoalDraft(groupId: string, patch: Partial<{ name: string; target: string }>) {
    setGoalDrafts((prev) => ({
      ...prev,
      [groupId]: {
        name: patch.name ?? prev[groupId]?.name ?? '',
        target: patch.target ?? prev[groupId]?.target ?? '10',
      },
    }))
  }

  function handleGoalSubmit(groupId: string, event: FormEvent) {
    event.preventDefault()
    const draft = goalDrafts[groupId] ?? { name: '', target: '10' }
    const target = Math.max(1, Number(draft.target) || 0)
    if (!draft.name.trim()) return
    onAddGoal(groupId, draft.name, target)
    setGoalDrafts((prev) => ({
      ...prev,
      [groupId]: { name: '', target: '10' },
    }))
  }

  function beginGroupRename(groupId: string, name: string) {
    setEditingGoal(null)
    setGoalRenameDraft('')
    setEditingGroupId(groupId)
    setGroupRenameDraft(name)
  }

  function saveGroupRename(groupId: string) {
    if (!groupRenameDraft.trim()) return
    onRenameGoalGroup(groupId, groupRenameDraft)
    setEditingGroupId(null)
    setGroupRenameDraft('')
  }

  function cancelGroupRename() {
    setEditingGroupId(null)
    setGroupRenameDraft('')
  }

  function beginGoalRename(groupId: string, goalId: string, name: string) {
    setEditingGroupId(null)
    setGroupRenameDraft('')
    setEditingGoal({ groupId, goalId })
    setGoalRenameDraft(name)
  }

  function saveGoalRename(groupId: string, goalId: string) {
    if (!goalRenameDraft.trim()) return
    onRenameGoal(groupId, goalId, goalRenameDraft)
    setEditingGoal(null)
    setGoalRenameDraft('')
  }

  function cancelGoalRename() {
    setEditingGoal(null)
    setGoalRenameDraft('')
  }

  function handleGroupDragStart(groupId: string) {
    setDraggedGoal(null)
    setDraggedGroupId(groupId)
  }

  function handleGoalDragStart(groupId: string, goalId: string) {
    setDraggedGroupId(null)
    setDraggedGoal({ groupId, goalId })
  }

  function clearDragState() {
    setDraggedGroupId(null)
    setDraggedGoal(null)
  }

  function handleGroupDrop(targetGroupId: string) {
    if (draggedGroupId) {
      onReorderGoalGroup(draggedGroupId, targetGroupId)
      clearDragState()
      return
    }
    if (draggedGoal) {
      onReorderGoal(draggedGoal.goalId, draggedGoal.groupId, targetGroupId)
      clearDragState()
    }
  }

  function handleGoalDrop(targetGroupId: string, targetGoalId: string) {
    if (!draggedGoal) return
    onReorderGoal(
      draggedGoal.goalId,
      draggedGoal.groupId,
      targetGroupId,
      targetGoalId,
    )
    clearDragState()
  }

  function handleGroupDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault()
  }

  function handleGoalDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault()
  }

  function handleHistoryToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    onSetHistoryOpen(event.currentTarget.open)
  }

  function handleMonthToggle(monthKey: string, event: SyntheticEvent<HTMLDetailsElement>) {
    onSetHistoryMonthOpen(monthKey, event.currentTarget.open)
  }

  return (
    <main className="dashboard stats-page">
      <header className="dashboard__header">
        <h1 className="dashboard__title">Stats</h1>
        <p className="dashboard__subtitle">
          Your activity history over time
        </p>
      </header>

      <section className="dashboard__stats" aria-label="All-time summary">
        {stats.map((stat) => (
          <article key={stat.id} className="stat-card">
            <span className="stat-card__label">{stat.label}</span>
            <span className="stat-card__value">{stat.value}</span>
            {stat.detail ? <span className="stat-card__detail">{stat.detail}</span> : null}
          </article>
        ))}
      </section>

      <section className="stats-page__section">
        <div className="stats-page__section-head">
          <h2 className="dashboard__section-title">Core aspects</h2>
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
          <h2 className="dashboard__section-title">Goals</h2>
          <p className="stats-page__hint">
            Create folders for each goal set, then add goals inside the folder. Each goal keeps the same + progress mechanic.
          </p>
        </div>

        <form className="stats-page__group-form" onSubmit={handleGoalGroupSubmit}>
          <input
            className="stats-page__group-input"
            type="text"
            value={goalGroupName}
            onChange={(e) => setGoalGroupName(e.target.value)}
            placeholder="Add goal folder…"
            maxLength={80}
          />
          <button
            type="submit"
            className="stats-page__group-add"
            disabled={!goalGroupName.trim()}
          >
            Add folder
          </button>
        </form>

        {goalGroups.length === 0 ? (
          <p className="dashboard__empty">No goal folders yet. Start with something like Financials.</p>
        ) : (
          <div className="stats-page__goal-group-grid">
            {goalGroups.map((group) => {
              const draft = goalDrafts[group.id] ?? { name: '', target: '10' }
              const isEditingGroup = editingGroupId === group.id
              const isCollapsed = group.collapsed
              return (
                <article
                  key={group.id}
                  className={`stats-page__goal-group-card${draggedGroupId === group.id ? ' stats-page__goal-group-card--dragging' : ''}`}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move'
                    handleGroupDragStart(group.id)
                  }}
                  onDragEnd={clearDragState}
                  onDragOver={handleGroupDragOver}
                  onDrop={() => handleGroupDrop(group.id)}
                >
                  <div className="stats-page__goal-group-head">
                    <span className="stats-page__goal-group-drag" aria-hidden="true">
                      ⋮⋮
                    </span>
                    <div className="stats-page__goal-group-copy">
                      {isEditingGroup ? (
                        <div className="stats-page__goal-group-edit">
                          <input
                            className="stats-page__goal-group-edit-input"
                            type="text"
                            value={groupRenameDraft}
                            onChange={(e) => setGroupRenameDraft(e.target.value)}
                            autoFocus
                            maxLength={80}
                          />
                          <div className="stats-page__goal-group-edit-actions">
                            <button
                              type="button"
                              className="stats-page__goal-group-save"
                              onClick={() => saveGroupRename(group.id)}
                              disabled={!groupRenameDraft.trim()}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="stats-page__goal-group-cancel"
                              onClick={cancelGroupRename}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="stats-page__goal-group-name-button"
                            onClick={() => beginGroupRename(group.id, group.name)}
                          >
                            <h3 className="stats-page__goal-group-name">{group.name}</h3>
                          </button>
                          <p className="stats-page__goal-group-meta">
                            {group.goals.length} goal{group.goals.length === 1 ? '' : 's'}
                          </p>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      className="stats-page__goal-group-collapse"
                      onClick={() => onToggleGoalGroupCollapsed(group.id)}
                      aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${group.name}`}
                    >
                      <span aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
                    </button>
                  </div>

                  {!isCollapsed ? (
                    <>
                      <form
                        className="stats-page__goal-inline-form"
                        onSubmit={(event) => handleGoalSubmit(group.id, event)}
                      >
                        <input
                          className="stats-page__goal-inline-input stats-page__goal-inline-input--name"
                          type="text"
                          value={draft.name}
                          onChange={(e) => updateGoalDraft(group.id, { name: e.target.value })}
                          placeholder={`Add goal to ${group.name}…`}
                          maxLength={80}
                        />
                        <input
                          className="stats-page__goal-inline-input stats-page__goal-inline-input--target"
                          type="number"
                          min={1}
                          step={1}
                          value={draft.target}
                          onChange={(e) => updateGoalDraft(group.id, { target: e.target.value })}
                          aria-label={`${group.name} target number`}
                        />
                        <button
                          type="submit"
                          className="stats-page__goal-inline-add"
                          disabled={!draft.name.trim()}
                        >
                          Add
                        </button>
                      </form>

                      {group.goals.length === 0 ? (
                        <p className="stats-page__goal-group-empty">No goals in this folder yet.</p>
                      ) : (
                        <div className="stats-page__goal-stack">
                          {group.goals.map((goal) => {
                            const current = goal.totalProgress
                            const target = Math.max(1, goal.target)
                            const percent = Math.min((current / target) * 100, 100)
                            const isEditing = editingGoal?.groupId === group.id && editingGoal.goalId === goal.id
                            return (
                              <article
                                key={goal.id}
                                className={`stats-page__goal-card${draggedGoal?.groupId === group.id && draggedGoal.goalId === goal.id ? ' stats-page__goal-card--dragging' : ''}`}
                                draggable
                                onDragStart={(event) => {
                                  event.dataTransfer.effectAllowed = 'move'
                                  handleGoalDragStart(group.id, goal.id)
                                }}
                                onDragEnd={clearDragState}
                                onDragOver={handleGoalDragOver}
                                onDrop={() => handleGoalDrop(group.id, goal.id)}
                              >
                                <span className="stats-page__goal-drag" aria-hidden="true">
                                  ⋮⋮
                                </span>
                                <div className="stats-page__goal-copy">
                                  {isEditing ? (
                                    <div className="stats-page__goal-edit">
                                      <input
                                        className="stats-page__goal-edit-input"
                                        type="text"
                                        value={goalRenameDraft}
                                        onChange={(e) => setGoalRenameDraft(e.target.value)}
                                        autoFocus
                                        maxLength={80}
                                      />
                                  <div className="stats-page__goal-edit-actions">
                                    <button
                                      type="button"
                                      className="stats-page__goal-edit-save"
                                      onClick={() => saveGoalRename(group.id, goal.id)}
                                          disabled={!goalRenameDraft.trim()}
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          className="stats-page__goal-edit-cancel"
                                          onClick={cancelGoalRename}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="stats-page__goal-head">
                                      <button
                                        type="button"
                                        className="stats-page__goal-name-button"
                                        onClick={() => beginGoalRename(group.id, goal.id, goal.name)}
                                      >
                                        <h4 className="stats-page__goal-name">{goal.name}</h4>
                                      </button>
                                      <span className="stats-page__goal-target">Target {target}</span>
                                    </div>
                                    <div className="stats-page__goal-progress" aria-hidden="true">
                                      <span
                                        className="stats-page__goal-progress-fill"
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                    <p className="stats-page__goal-meta">
                                      {current}/{target} total {goal.progressToday > 0 ? `· ${goal.progressToday} gained today` : ''}
                                    </p>
                                  </>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="stats-page__goal-action stats-page__goal-action--primary"
                                  onClick={() => onIncrementGoal(goal.id)}
                                  aria-label={`Add progress to ${goal.name}`}
                                >
                                  +
                                </button>
                              </article>
                            )
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="stats-page__goal-group-empty">Folder collapsed.</p>
                  )}
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
        <div className="stats-page__section-head">
          <h2 className="dashboard__section-title">Trophy room</h2>
          <p className="stats-page__hint">
            Hover a badge to reveal the completed subquests and the quest identity behind it.
          </p>
        </div>

        {completedProtocols.length === 0 ? (
          <p className="dashboard__empty">No completed protocols yet.</p>
        ) : (
          <div className="stats-page__trophy-grid">
            {completedProtocols.map((protocol) => (
              <article key={protocol.id} className="stats-page__trophy-card" tabIndex={0}>
                <div className="stats-page__trophy-badge">
                  {protocol.thumbnailUrl ? (
                    <img
                      className="stats-page__trophy-badge-img"
                      src={protocol.thumbnailUrl}
                      alt=""
                    />
                  ) : (
                    <span className="stats-page__trophy-badge-label">{protocol.thumbnailLabel}</span>
                  )}
                </div>
                <div className="stats-page__trophy-hover" aria-hidden="true">
                  <div className="stats-page__trophy-hover-copy">
                    <h3 className="stats-page__trophy-title">{protocol.title}</h3>
                    <p className="stats-page__trophy-meta">
                      {protocol.rewardName ?? 'No reward attached'} ·{' '}
                      {protocol.completedAt ? `Cleared ${protocol.completedAt.slice(0, 10)}` : 'Recently cleared'}
                    </p>
                  </div>
                  <p className="stats-page__trophy-hover-title">Completed steps</p>
                  <ul className="stats-page__trophy-list">
                    {trophyDetailsById[protocol.id]?.map((title, index) => (
                      <li key={`${protocol.id}-${index}`} className="stats-page__trophy-step">
                        {title}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="stats-page__section">
        <details
          className="stats-page__history-panel"
          open={dashboard.historyOpen}
          onToggle={handleHistoryToggle}
        >
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
              {historyByMonth.map((month, monthIndex) => {
                const defaultOpen = monthIndex === 0
                const isOpen = dashboard.historyMonthOpen[month.monthKey] ?? defaultOpen
                return (
                  <details
                    key={month.monthKey}
                    className="stats-page__history-month"
                    open={isOpen}
                    onToggle={(event) => handleMonthToggle(month.monthKey, event)}
                  >
                    <summary className="stats-page__history-month-summary">
                      <span className="stats-page__history-month-label">
                        {month.label}
                      </span>
                      <span className="stats-page__history-month-meta">
                        {month.days.length} day{month.days.length === 1 ? '' : 's'} · {month.count} completion{month.count === 1 ? '' : 's'}
                      </span>
                    </summary>
                    <div className="stats-page__history-month-body">
                      {month.days.map((day) => (
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
                  </details>
                )
              })}
            </div>
          )}
        </details>
      </section>
    </main>
  )
}
