import { useMemo, useState } from 'react'
import type { IntegrationProtocol, ProtocolStep, Reward } from '../types'
import './IntegrationProtocolsPage.css'

type IntegrationProtocolsPageProps = {
  protocols: IntegrationProtocol[]
  rewards: Reward[]
  onUpdateProtocols: (
    updater: (protocols: IntegrationProtocol[]) => IntegrationProtocol[],
  ) => void
}

type StepStats = {
  total: number
  completed: number
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function countStepStats(steps: ProtocolStep[]): StepStats {
  return steps.reduce<StepStats>(
    (acc, step) => {
      const childStats = countStepStats(step.children)
      acc.total += 1 + childStats.total
      acc.completed += (step.done ? 1 : 0) + childStats.completed
      return acc
    },
    { total: 0, completed: 0 },
  )
}

function findFirstIncompleteStep(
  steps: ProtocolStep[],
  path: ProtocolStep[] = [],
): ProtocolStep[] | null {
  for (const step of steps) {
    const nextPath = [...path, step]
    if (!step.done) {
      const branch = findFirstIncompleteStep(step.children, nextPath)
      return branch ?? nextPath
    }
    const child = findFirstIncompleteStep(step.children, nextPath)
    if (child) return child
  }
  return null
}

function updateStepTree(
  steps: ProtocolStep[],
  stepId: string,
  updater: (step: ProtocolStep) => ProtocolStep,
): ProtocolStep[] {
  return steps.map((step) => {
    if (step.id === stepId) {
      return updater(step)
    }

    return {
      ...step,
      children: updateStepTree(step.children, stepId, updater),
    }
  })
}

function removeStepFromTree(steps: ProtocolStep[], stepId: string): ProtocolStep[] {
  return steps
    .filter((step) => step.id !== stepId)
    .map((step) => ({
      ...step,
      children: removeStepFromTree(step.children, stepId),
    }))
}

function addChildStep(
  steps: ProtocolStep[],
  parentId: string,
  title: string,
): ProtocolStep[] {
  return steps.map((step) => {
    if (step.id === parentId) {
      return {
        ...step,
        children: [
          ...step.children,
          {
            id: createId('step'),
            title,
            done: false,
            children: [],
          },
        ],
      }
    }

    return {
      ...step,
      children: addChildStep(step.children, parentId, title),
    }
  })
}

function addRootStep(steps: ProtocolStep[], title: string): ProtocolStep[] {
  return [
    ...steps,
    {
      id: createId('step'),
      title,
      done: false,
      children: [],
    },
  ]
}

function setStepDoneTree(step: ProtocolStep, done: boolean): ProtocolStep {
  return {
    ...step,
    done,
    children: step.children.map((child) => setStepDoneTree(child, done)),
  }
}

function reorderStepTree(
  steps: ProtocolStep[],
  stepId: string,
  direction: -1 | 1,
): ProtocolStep[] {
  const index = steps.findIndex((step) => step.id === stepId)
  if (index >= 0) {
    const target = index + direction
    if (target < 0 || target >= steps.length) return steps
    const next = [...steps]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    return next
  }

  return steps.map((step) => ({
    ...step,
    children: reorderStepTree(step.children, stepId, direction),
  }))
}

function updateProtocol(
  protocols: IntegrationProtocol[],
  protocolId: string,
  updater: (protocol: IntegrationProtocol) => IntegrationProtocol,
) {
  return protocols.map((protocol) =>
    protocol.id === protocolId ? updater(protocol) : protocol,
  )
}

function reorderProtocolList(
  protocols: IntegrationProtocol[],
  draggedId: string,
  targetId: string,
): IntegrationProtocol[] {
  const fromIndex = protocols.findIndex((protocol) => protocol.id === draggedId)
  const toIndex = protocols.findIndex((protocol) => protocol.id === targetId)
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return protocols

  const next = [...protocols]
  const [moved] = next.splice(fromIndex, 1)
  const adjustedTarget = fromIndex < toIndex ? toIndex - 1 : toIndex
  next.splice(adjustedTarget, 0, moved)
  return next
}

function formatDate(date: string | null): string {
  if (!date) return 'No deadline'
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date))
  } catch {
    return date
  }
}

function ProtocolStepRow({
  step,
  depth,
  onToggle,
  onRename,
  onAddChild,
  onMove,
  onRemove,
}: {
  step: ProtocolStep
  depth: number
  onToggle: (stepId: string) => void
  onRename: (stepId: string, title: string) => void
  onAddChild: (stepId: string) => void
  onMove: (stepId: string, direction: -1 | 1) => void
  onRemove: (stepId: string) => void
}) {
  return (
    <li className="protocol-step" style={{ ['--step-depth' as string]: depth }}>
      <div className={`protocol-step__row${step.done ? ' protocol-step__row--done' : ''}`}>
        <button
          type="button"
          className={`protocol-step__check${step.done ? ' protocol-step__check--done' : ''}`}
          aria-pressed={step.done}
          aria-label={step.done ? `Mark ${step.title} incomplete` : `Mark ${step.title} complete`}
          onClick={() => onToggle(step.id)}
        >
          <span aria-hidden="true" />
        </button>
        <input
          className="protocol-step__input"
          type="text"
          value={step.title}
          onChange={(e) => onRename(step.id, e.target.value)}
        />
        <div className="protocol-step__actions">
          <button type="button" className="protocol-step__action" onClick={() => onAddChild(step.id)}>
            + branch
          </button>
          <button type="button" className="protocol-step__action" onClick={() => onMove(step.id, -1)}>
            ↑
          </button>
          <button type="button" className="protocol-step__action" onClick={() => onMove(step.id, 1)}>
            ↓
          </button>
          <button type="button" className="protocol-step__action" onClick={() => onRemove(step.id)}>
            ×
          </button>
        </div>
      </div>
      {step.children.length > 0 ? (
        <ul className="protocol-step__children">
          {step.children.map((child) => (
            <ProtocolStepRow
              key={child.id}
              step={child}
              depth={depth + 1}
              onToggle={onToggle}
              onRename={onRename}
              onAddChild={onAddChild}
              onMove={onMove}
              onRemove={onRemove}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function IntegrationProtocolsPage({
  protocols,
  rewards,
  onUpdateProtocols,
}: IntegrationProtocolsPageProps) {
  const [selectedProtocolId, setSelectedProtocolId] = useState(protocols[0]?.id ?? '')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [collapsedSettings, setCollapsedSettings] = useState<Record<string, boolean>>({})
  const [draftByProtocol, setDraftByProtocol] = useState<Record<string, string>>({})

  const selectedProtocol =
    protocols.find((protocol) => protocol.id === selectedProtocolId) ??
    protocols[0] ??
    null
  const activeProtocol =
    protocols.find((protocol) => protocol.active) ?? selectedProtocol

  const rewardMap = useMemo(
    () => new Map(rewards.map((reward) => [reward.id, reward])),
    [rewards],
  )

  const activeStats = activeProtocol ? countStepStats(activeProtocol.steps) : null
  const nextStepPath = activeProtocol
    ? findFirstIncompleteStep(activeProtocol.steps)
    : null
  const activeCount = protocols.filter((protocol) => protocol.active).length
  const recallCount = protocols.filter((protocol) => protocol.structure === 'recall').length

  function updateAny(protocolId: string, updater: (protocol: IntegrationProtocol) => IntegrationProtocol) {
    onUpdateProtocols((prev) => updateProtocol(prev, protocolId, updater))
  }

  function toggleActive(protocolId: string) {
    onUpdateProtocols((prev) =>
      prev.map((protocol) => ({
        ...protocol,
        active: protocol.id === protocolId ? !protocol.active : protocol.active,
        updatedAt: new Date().toISOString(),
      })),
    )
  }

  function handleCreateProtocol() {
    const now = new Date().toISOString()
    const protocol = {
      id: createId('protocol'),
      title: 'New protocol',
      summary: 'Break the goal into a clear first step.',
      thumbnailLabel: 'NEW',
      thumbnailUrl: null,
      priority: 3,
      active: false,
      archivedAt: null,
      structure: 'standard' as const,
      intervalDays: null,
      deadline: null,
      rewardId: null,
      rewardName: null,
      steps: [
        {
          id: createId('step'),
          title: 'Define the first win',
          done: false,
          children: [],
        },
      ],
      updatedAt: now,
    }

    onUpdateProtocols((prev) => [protocol, ...prev])
    setSelectedProtocolId(protocol.id)
  }

  function setStepDraft(protocolId: string, value: string) {
    setDraftByProtocol((prev) => ({ ...prev, [protocolId]: value }))
  }

  function handleAddRootStep(protocolId: string) {
    const draft = draftByProtocol[protocolId]?.trim() || 'New step'
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        steps: addRootStep(protocol.steps, draft),
        updatedAt: new Date().toISOString(),
      })),
    )
    setDraftByProtocol((prev) => ({ ...prev, [protocolId]: '' }))
  }

  function handleToggleStep(protocolId: string, stepId: string) {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => {
        return {
          ...protocol,
          steps: updateStepTree(protocol.steps, stepId, (step) =>
            setStepDoneTree(step, !step.done),
          ),
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }

  function handleRenameStep(protocolId: string, stepId: string, title: string) {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        steps: updateStepTree(protocol.steps, stepId, (step) => ({
          ...step,
          title,
        })),
        updatedAt: new Date().toISOString(),
      })),
    )
  }

  function handleAddChildStep(protocolId: string, stepId: string) {
    const childTitle = 'Branch step'
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        steps: addChildStep(protocol.steps, stepId, childTitle),
        updatedAt: new Date().toISOString(),
      })),
    )
  }

  function handleMoveStep(protocolId: string, stepId: string, direction: -1 | 1) {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        steps: reorderStepTree(protocol.steps, stepId, direction),
        updatedAt: new Date().toISOString(),
      })),
    )
  }

  function handleRemoveStep(protocolId: string, stepId: string) {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        steps: removeStepFromTree(protocol.steps, stepId),
        updatedAt: new Date().toISOString(),
      })),
    )
  }

  function handleStructureChange(protocolId: string, structure: 'standard' | 'recall') {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        structure,
        intervalDays: structure === 'recall' ? protocol.intervalDays ?? 1 : null,
        updatedAt: new Date().toISOString(),
      })),
    )
  }

  function handlePriorityChange(protocolId: string, priority: number) {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        priority,
        updatedAt: new Date().toISOString(),
      })),
    )
  }

  function handleThumbnailSelect(protocolId: string, rewardId: string) {
    const reward = rewardMap.get(rewardId)
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        rewardId,
        rewardName: reward?.name ?? null,
        thumbnailUrl: reward?.imageUrl ?? null,
        thumbnailLabel: reward?.name?.slice(0, 6).toUpperCase() ?? protocol.thumbnailLabel,
        updatedAt: new Date().toISOString(),
      })),
    )
  }

  function handleRewardSelect(protocolId: string, rewardId: string) {
    const reward = rewardMap.get(rewardId)
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        rewardId,
        rewardName: reward?.name ?? null,
        updatedAt: new Date().toISOString(),
      })),
    )
  }

  function handleDeadlineChange(protocolId: string, deadline: string) {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        deadline: deadline || null,
        updatedAt: new Date().toISOString(),
      })),
    )
  }

  function handleIntervalChange(protocolId: string, intervalDays: number) {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        intervalDays,
        updatedAt: new Date().toISOString(),
      })),
    )
  }

  function handleArchive(protocolId: string) {
    const archivedAt = new Date().toISOString()
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        archivedAt: protocol.archivedAt ? null : archivedAt,
        active: protocol.archivedAt ? protocol.active : false,
        updatedAt: archivedAt,
      })),
    )
  }

  if (protocols.length === 0) {
    return (
      <main className="dashboard protocols-page">
        <header className="dashboard__header">
          <div>
            <h1 className="dashboard__title">Integration Protocols</h1>
            <p className="dashboard__subtitle">
              No protocols yet. Start by creating the first questline.
            </p>
          </div>
          <button type="button" className="protocols-page__primary-btn" onClick={handleCreateProtocol}>
            Create protocol
          </button>
        </header>
      </main>
    )
  }

  return (
    <main className="dashboard protocols-page">
      <header className="dashboard__header">
        <div className="protocols-page__header-copy">
          <p className="protocols-page__kicker">Integration protocols</p>
          <h1 className="dashboard__title">Questlines that behave like contracts</h1>
          <p className="dashboard__subtitle">
            Build a main quest, branch it into subtasks, give it a deadline, and keep the next step visible at all times.
          </p>
        </div>
        <button type="button" className="protocols-page__primary-btn" onClick={handleCreateProtocol}>
          New protocol
        </button>
      </header>

      <section className="protocols-page__hero">
        <div className="protocols-page__hero-copy">
          <span className="protocols-page__hero-label">Quest loop</span>
          <h2 className="protocols-page__hero-title">
            Clear goal, immediate next action, visible reward, repeat.
          </h2>
          <p className="protocols-page__hero-copy-text">
            This page is tuned for the parts of a loop that keep people engaged:
            clear contracts, short feedback cycles, and a persistent sense that
            every completed step is unlocking the next layer.
          </p>
          <div className="protocols-page__stats">
            <div className="protocols-page__stat">
              <strong>{protocols.length}</strong>
              <span>protocols</span>
            </div>
            <div className="protocols-page__stat">
              <strong>{activeCount}</strong>
              <span>active</span>
            </div>
            <div className="protocols-page__stat">
              <strong>{recallCount}</strong>
              <span>recall arcs</span>
            </div>
            <div className="protocols-page__stat">
              <strong>{activeStats ? `${activeStats.completed}/${activeStats.total}` : '0/0'}</strong>
              <span>steps done</span>
            </div>
          </div>
        </div>

        <aside className="protocols-page__tracker" aria-label="Active quest tracker">
          <p className="protocols-page__tracker-label">Current contract</p>
          <h3 className="protocols-page__tracker-title">{activeProtocol?.title ?? 'No active protocol'}</h3>
          <p className="protocols-page__tracker-summary">{activeProtocol?.summary ?? 'Activate a protocol to see the next objective.'}</p>
          {nextStepPath ? (
            <div className="protocols-page__tracker-step">
              <span className="protocols-page__tracker-arrow" aria-hidden="true">➜</span>
              <div>
                <p className="protocols-page__tracker-step-label">Next step</p>
                <p className="protocols-page__tracker-step-title">
                  {nextStepPath.map((step) => step.title).join(' / ')}
                </p>
              </div>
            </div>
          ) : (
            <p className="protocols-page__tracker-empty">All visible steps are complete. Add a new branch or start another protocol.</p>
          )}
          <div className="protocols-page__tracker-meta">
            <span>{activeProtocol?.structure === 'recall' ? `Recall every ${activeProtocol.intervalDays ?? 1} day(s)` : 'Standard contract'}</span>
            <span>{formatDate(activeProtocol?.deadline ?? null)}</span>
          </div>
        </aside>
      </section>

      <section className="protocols-page__board" aria-label="Protocols board">
        {protocols.map((protocol) => {
          const stats = countStepStats(protocol.steps)
          const percent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
          const settingsOpen = !!collapsedSettings[protocol.id]
          const reward = protocol.rewardId ? rewardMap.get(protocol.rewardId) ?? null : null
          const selected = protocol.id === selectedProtocol?.id

          return (
            <article
              key={protocol.id}
              className={`protocol-card${protocol.active ? ' protocol-card--active' : ''}${selected ? ' protocol-card--selected' : ''}${protocol.archivedAt ? ' protocol-card--archived' : ''}`}
              onClick={() => setSelectedProtocolId(protocol.id)}
              draggable
              onDragStart={() => setDraggedId(protocol.id)}
              onDragEnd={() => setDraggedId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!draggedId || draggedId === protocol.id) return
                onUpdateProtocols((prev) => reorderProtocolList(prev, draggedId, protocol.id))
                setDraggedId(null)
              }}
            >
              <header className="protocol-card__header">
                <div className="protocol-card__drag" aria-hidden="true">
                  ⋮⋮
                </div>
                <button
                  type="button"
                  className="protocol-card__thumbnail"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedProtocolId(protocol.id)
                  }}
                >
                  {protocol.thumbnailUrl ? (
                    <img className="protocol-card__thumbnail-img" src={protocol.thumbnailUrl} alt="" />
                  ) : (
                    <span className="protocol-card__thumbnail-label">{protocol.thumbnailLabel}</span>
                  )}
                </button>
                <div className="protocol-card__title-block">
                  <input
                    className="protocol-card__title"
                    type="text"
                    value={protocol.title}
                    onChange={(e) =>
                      updateAny(protocol.id, (current) => ({
                        ...current,
                        title: e.target.value,
                        updatedAt: new Date().toISOString(),
                      }))
                    }
                  />
                  <p className="protocol-card__summary">{protocol.summary}</p>
                </div>
                <div className="protocol-card__stars" aria-label={`Priority ${protocol.priority} of 5`}>
                  {Array.from({ length: 5 }).map((_, index) => {
                    const star = index + 1
                    return (
                      <button
                        key={star}
                        type="button"
                        className={`protocol-card__star${star <= protocol.priority ? ' protocol-card__star--on' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePriorityChange(protocol.id, star)
                        }}
                        aria-label={`Set priority to ${star}`}
                      >
                        ★
                      </button>
                    )
                  })}
                </div>
              </header>

              <div className="protocol-card__meta">
                <button
                  type="button"
                  className={`protocol-card__active${protocol.active ? ' protocol-card__active--on' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleActive(protocol.id)
                  }}
                >
                  {protocol.active ? 'Active contract' : 'Start contract'}
                </button>
                <span className="protocol-card__tag">{protocol.structure === 'recall' ? 'Recall arc' : 'Standard arc'}</span>
                <span className="protocol-card__tag">{formatDate(protocol.deadline)}</span>
              </div>

              <div className="protocol-card__progress" aria-hidden="true">
                <span className="protocol-card__progress-fill" style={{ width: `${percent}%` }} />
              </div>
              <p className="protocol-card__progress-copy">
                {stats.completed}/{stats.total} steps cleared
              </p>

              <div className="protocol-card__body">
                <ul className="protocol-card__steps">
                  {protocol.steps.map((step) => (
                    <ProtocolStepRow
                      key={step.id}
                      step={step}
                      depth={0}
                      onToggle={(stepId) => handleToggleStep(protocol.id, stepId)}
                      onRename={(stepId, title) => handleRenameStep(protocol.id, stepId, title)}
                      onAddChild={(stepId) => handleAddChildStep(protocol.id, stepId)}
                      onMove={(stepId, direction) => handleMoveStep(protocol.id, stepId, direction)}
                      onRemove={(stepId) => handleRemoveStep(protocol.id, stepId)}
                    />
                  ))}
                </ul>

                <div className="protocol-card__composer">
                  <input
                    className="protocol-card__composer-input"
                    type="text"
                    placeholder="Add a new step..."
                    value={draftByProtocol[protocol.id] ?? ''}
                    onChange={(e) => setStepDraft(protocol.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    type="button"
                    className="protocol-card__composer-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddRootStep(protocol.id)
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <footer className="protocol-card__footer">
                <div className="protocol-card__reward">
                  <span className="protocol-card__footer-label">Reward</span>
                  <select
                    className="protocol-card__select"
                    value={protocol.rewardId ?? ''}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleRewardSelect(protocol.id, e.target.value)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">Choose a reward</option>
                    {rewards.map((rewardOption) => (
                      <option key={rewardOption.id} value={rewardOption.id}>
                        {rewardOption.name}
                      </option>
                    ))}
                  </select>
                  {reward ? (
                    <div className="protocol-card__reward-pill">
                      {reward.imageUrl ? (
                        <img className="protocol-card__reward-img" src={reward.imageUrl} alt="" />
                      ) : (
                        <span className="protocol-card__reward-emoji" aria-hidden="true">
                          {reward.emoji}
                        </span>
                      )}
                      <span>{reward.name}</span>
                    </div>
                  ) : protocol.rewardName ? (
                    <div className="protocol-card__reward-pill">
                      <span className="protocol-card__reward-emoji" aria-hidden="true">
                        ◈
                      </span>
                      <span>{protocol.rewardName}</span>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="protocol-card__settings-toggle"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCollapsedSettings((prev) => ({
                      ...prev,
                      [protocol.id]: !prev[protocol.id],
                    }))
                  }}
                >
                  {settingsOpen ? 'Hide settings' : 'Settings'}
                </button>
              </footer>

              {settingsOpen ? (
                <section className="protocol-card__settings" onClick={(e) => e.stopPropagation()}>
                  <label className="protocol-card__field">
                    <span>Structure</span>
                    <select
                      className="protocol-card__select"
                      value={protocol.structure}
                      onChange={(e) => handleStructureChange(protocol.id, e.target.value === 'recall' ? 'recall' : 'standard')}
                    >
                      <option value="standard">Standard protocol</option>
                      <option value="recall">Recall protocol</option>
                    </select>
                  </label>
                  <label className="protocol-card__field">
                    <span>Deadline</span>
                    <input
                      className="protocol-card__select"
                      type="date"
                      value={protocol.deadline ?? ''}
                      onChange={(e) => handleDeadlineChange(protocol.id, e.target.value)}
                    />
                  </label>
                  {protocol.structure === 'recall' ? (
                    <label className="protocol-card__field">
                      <span>Recall interval (days)</span>
                      <input
                        className="protocol-card__select"
                        type="number"
                        min={1}
                        max={30}
                        value={protocol.intervalDays ?? 1}
                        onChange={(e) => handleIntervalChange(protocol.id, Math.max(1, Number(e.target.value) || 1))}
                      />
                    </label>
                  ) : null}
                  <label className="protocol-card__field">
                    <span>Thumbnail reward</span>
                    <select
                      className="protocol-card__select"
                      value={protocol.rewardId ?? ''}
                      onChange={(e) => handleThumbnailSelect(protocol.id, e.target.value)}
                    >
                      <option value="">Use label only</option>
                      {rewards.map((rewardOption) => (
                        <option key={rewardOption.id} value={rewardOption.id}>
                          {rewardOption.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="protocol-card__archive-btn"
                    onClick={() => handleArchive(protocol.id)}
                  >
                    {protocol.archivedAt ? 'Restore protocol' : 'Archive protocol'}
                  </button>
                </section>
              ) : null}
            </article>
          )
        })}
      </section>

      <section className="protocols-page__legend" aria-label="Design notes">
        <div>
          <h2 className="protocols-page__legend-title">Why this structure works</h2>
          <p className="protocols-page__legend-copy">
            Each protocol keeps the goal visible, the next action obvious, and the reward attached. That combination is what makes a loop feel playable instead of just administrative.
          </p>
        </div>
        <ul className="protocols-page__legend-list">
          <li>Small visible step lists reduce friction.</li>
          <li>Priority stars make the hierarchy legible.</li>
          <li>Active contracts and recall intervals create long-term stickiness.</li>
        </ul>
      </section>
    </main>
  )
}
