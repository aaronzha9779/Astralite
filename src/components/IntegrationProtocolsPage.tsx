import { useMemo, useState } from 'react'
import { playCompletionChime } from '../lib/audio'
import type { IntegrationProtocol, ProtocolStep, Reward } from '../types'
import {
  findProtocolStepPathById,
  findProtocolStepById,
  flattenProtocolSteps,
  getProtocolStepCount,
  isProtocolComplete,
  normalizeProtocolCurrentStepId,
} from '../lib/protocols'
import './IntegrationProtocolsPage.css'

type IntegrationProtocolsPageProps = {
  protocols: IntegrationProtocol[]
  rewards: Reward[]
  onUpdateProtocols: (
    updater: (protocols: IntegrationProtocol[]) => IntegrationProtocol[],
  ) => void
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function normalizePriority(priority: number): number {
  return Math.min(5, Math.max(1, Math.round(priority * 2) / 2))
}

function formatPriority(priority: number): string {
  return Number.isInteger(priority) ? String(priority) : priority.toFixed(1)
}

function getHalfFill(star: number, priority: number): number {
  return Math.max(0, Math.min(1, priority - (star - 1)))
}

function createThumbnailLabel(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 3).toUpperCase())

  return cleaned.length > 0 ? cleaned.join(' ') : 'QUEST'
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image.'))
    reader.readAsDataURL(file)
  })
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

function insertStepBeforeTarget(
  steps: ProtocolStep[],
  targetId: string,
  stepToInsert: ProtocolStep,
): ProtocolStep[] {
  const index = steps.findIndex((step) => step.id === targetId)
  if (index >= 0) {
    const next = [...steps]
    next.splice(index, 0, stepToInsert)
    return next
  }

  return steps.map((step) => ({
    ...step,
    children: insertStepBeforeTarget(step.children, targetId, stepToInsert),
  }))
}

function moveStepInTree(
  steps: ProtocolStep[],
  draggedId: string,
  targetId: string,
): ProtocolStep[] {
  if (draggedId === targetId) return steps
  const dragged = findProtocolStepById(steps, draggedId)
  if (!dragged) return steps
  const withoutDragged = removeStepFromTree(steps, draggedId)
  return insertStepBeforeTarget(withoutDragged, targetId, dragged)
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
  currentStepId,
  onToggle,
  onRename,
  onAddChild,
  onRemove,
  onDragStart,
  onDragEnd,
  onDropStep,
}: {
  step: ProtocolStep
  depth: number
  currentStepId: string | null
  onToggle: (stepId: string) => void
  onRename: (stepId: string, title: string) => void
  onAddChild: (stepId: string) => void
  onRemove: (stepId: string) => void
  onDragStart: (stepId: string) => void
  onDragEnd: () => void
  onDropStep: (stepId: string) => void
}) {
  return (
    <li className="protocol-step" style={{ ['--step-depth' as string]: depth }}>
      <div
        className={`protocol-step__row${step.done ? ' protocol-step__row--done' : ''}${step.id === currentStepId ? ' protocol-step__row--current' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onDropStep(step.id)}
      >
        <button
          type="button"
          className="protocol-step__drag"
          draggable
          aria-label={`Drag ${step.title}`}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move'
            onDragStart(step.id)
          }}
          onDragEnd={onDragEnd}
          onClick={(e) => e.stopPropagation()}
        >
          ⋮⋮
        </button>
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
              currentStepId={currentStepId}
              onToggle={onToggle}
              onRename={onRename}
              onAddChild={onAddChild}
              onRemove={onRemove}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDropStep={onDropStep}
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
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null)
  const [collapsedSettings, setCollapsedSettings] = useState<Record<string, boolean>>({})
  const [collapsedProtocols, setCollapsedProtocols] = useState<Record<string, boolean>>({})
  const [draftByProtocol, setDraftByProtocol] = useState<Record<string, string>>({})

  const selectedProtocol =
    protocols.find((protocol) => protocol.id === selectedProtocolId) ??
    protocols[0] ??
    null

  const rewardMap = useMemo(
    () => new Map(rewards.map((reward) => [reward.id, reward])),
    [rewards],
  )

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
    const firstStepId = 'step-' + crypto.randomUUID()
    const protocol = {
      id: createId('protocol'),
      title: 'New protocol',
      summary: '',
      thumbnailLabel: 'NEW',
      thumbnailUrl: null,
      priority: 3,
      active: false,
      archivedAt: null,
      completedAt: null,
      structure: 'standard' as const,
      intervalHours: null,
      deadline: null,
      rewardId: null,
      rewardName: null,
      recallCurrentStepId: null,
      recallLastReviewedAt: null,
      steps: [
        {
          id: firstStepId,
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
      updateProtocol(prev, protocolId, (protocol) => {
        const nextSteps = addRootStep(protocol.steps, draft)
        return {
          ...protocol,
          steps: nextSteps,
          recallCurrentStepId:
            protocol.structure === 'recall'
              ? normalizeProtocolCurrentStepId({
                  ...protocol,
                  steps: nextSteps,
                })
              : protocol.recallCurrentStepId,
          updatedAt: new Date().toISOString(),
        }
      }),
    )
    setDraftByProtocol((prev) => ({ ...prev, [protocolId]: '' }))
  }

  function handleToggleStep(protocolId: string, stepId: string) {
    const protocol = protocols.find((item) => item.id === protocolId)
    const step = protocol ? findProtocolStepById(protocol.steps, stepId) : null
    const wasIncomplete = step ? !step.done : false

    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => {
        const now = new Date().toISOString()
        const nextSteps = updateStepTree(protocol.steps, stepId, (step) => ({
          ...step,
          done: !step.done,
        }))
        const complete = isProtocolComplete(nextSteps)
        let nextRecallCurrentStepId = protocol.recallCurrentStepId
        if (protocol.structure === 'recall') {
          const currentStepId = normalizeProtocolCurrentStepId(protocol)
          if (stepId === currentStepId && !protocol.completedAt) {
            const flattened = flattenProtocolSteps(nextSteps)
            const currentIndex = flattened.findIndex(({ step }) => step.id === stepId)
            const nextStep = flattened[currentIndex + 1]?.step ?? flattened[currentIndex]?.step ?? null
            nextRecallCurrentStepId = nextStep?.id ?? currentStepId
          }
        }

        return {
          ...protocol,
          steps: nextSteps,
          completedAt: complete ? protocol.completedAt ?? now : null,
          recallCurrentStepId: nextRecallCurrentStepId,
          updatedAt: now,
        }
      }),
    )

    if (wasIncomplete) {
      playCompletionChime()
    }
  }

  function handleRenameStep(protocolId: string, stepId: string, title: string) {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => {
        const nextSteps = updateStepTree(protocol.steps, stepId, (step) => ({
          ...step,
          title,
        }))
        return {
          ...protocol,
          steps: nextSteps,
          recallCurrentStepId:
            protocol.structure === 'recall'
              ? normalizeProtocolCurrentStepId({
                  ...protocol,
                  steps: nextSteps,
                })
              : protocol.recallCurrentStepId,
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }

  function handleAddChildStep(protocolId: string, stepId: string) {
    const childTitle = 'Branch step'
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => {
        const nextSteps = addChildStep(protocol.steps, stepId, childTitle)
        return {
          ...protocol,
          steps: nextSteps,
          recallCurrentStepId:
            protocol.structure === 'recall'
              ? normalizeProtocolCurrentStepId({
                  ...protocol,
                  steps: nextSteps,
                })
              : protocol.recallCurrentStepId,
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }

  function handleStepDragStart(stepId: string) {
    setDraggedStepId(stepId)
  }

  function handleStepDrop(protocolId: string, targetStepId: string) {
    if (!draggedStepId || draggedStepId === targetStepId) {
      setDraggedStepId(null)
      return
    }

    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => {
        const nextSteps = moveStepInTree(protocol.steps, draggedStepId, targetStepId)
        return {
          ...protocol,
          steps: nextSteps,
          recallCurrentStepId:
            protocol.structure === 'recall'
              ? normalizeProtocolCurrentStepId({
                  ...protocol,
                  steps: nextSteps,
                })
              : protocol.recallCurrentStepId,
          updatedAt: new Date().toISOString(),
        }
      }),
    )
    setDraggedStepId(null)
  }

  function handleRemoveStep(protocolId: string, stepId: string) {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => {
        const nextSteps = removeStepFromTree(protocol.steps, stepId)
        return {
          ...protocol,
          steps: nextSteps,
          recallCurrentStepId:
            protocol.structure === 'recall'
              ? normalizeProtocolCurrentStepId({
                  ...protocol,
                  steps: nextSteps,
                })
              : protocol.recallCurrentStepId,
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }

  function handleStructureChange(protocolId: string, structure: 'standard' | 'recall') {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        structure,
        intervalHours: structure === 'recall' ? protocol.intervalHours ?? 24 : null,
        recallCurrentStepId:
          structure === 'recall'
            ? normalizeProtocolCurrentStepId({
                ...protocol,
                structure,
                intervalHours: protocol.intervalHours ?? 24,
              })
            : protocol.recallCurrentStepId,
        recallLastReviewedAt: structure === 'recall' ? protocol.recallLastReviewedAt ?? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      })),
    )
  }

  function handlePriorityChange(protocolId: string, priority: number) {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        priority: normalizePriority(priority),
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

  async function handleThumbnailUpload(protocolId: string, file: File | null) {
    if (!file) return
    const imageUrl = await readFileAsDataUrl(file)
    const label = createThumbnailLabel(file.name.replace(/\.[^.]+$/, ''))

    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        thumbnailUrl: imageUrl,
        thumbnailLabel: label,
        updatedAt: new Date().toISOString(),
      })),
    )
  }

  function handleThumbnailLabelChange(protocolId: string, thumbnailLabel: string) {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        thumbnailLabel: thumbnailLabel || 'QUEST',
        updatedAt: new Date().toISOString(),
      })),
    )
  }

  function handleClearThumbnail(protocolId: string) {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        thumbnailUrl: null,
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

  function handleIntervalChange(protocolId: string, intervalHours: number) {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        intervalHours,
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
          <h1 className="protocols-page__page-title">INTEGRATION PROTOCOLS</h1>
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
        <h1 className="protocols-page__page-title">INTEGRATION PROTOCOLS</h1>
        <button type="button" className="protocols-page__primary-btn" onClick={handleCreateProtocol}>
          New protocol
        </button>
      </header>

      <section className="protocols-page__board" aria-label="Protocols board">
        {protocols.map((protocol) => {
          const stats = getProtocolStepCount(protocol.steps)
          const percent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
          const settingsOpen = !!collapsedSettings[protocol.id]
          const collapsed = !!collapsedProtocols[protocol.id]
          const reward = protocol.rewardId ? rewardMap.get(protocol.rewardId) ?? null : null
          const selected = protocol.id === selectedProtocol?.id
          const currentPointerPath =
            protocol.structure === 'recall'
              ? findProtocolStepPathById(
                  protocol.steps,
                  normalizeProtocolCurrentStepId(protocol),
                )?.path ?? null
              : findFirstIncompleteStep(protocol.steps)
          const currentPointerId = currentPointerPath?.[currentPointerPath.length - 1]?.id ?? null

          return (
            <article
              key={protocol.id}
              className={`protocol-card${protocol.active ? ' protocol-card--active' : ''}${selected ? ' protocol-card--selected' : ''}${protocol.archivedAt ? ' protocol-card--archived' : ''}${protocol.completedAt ? ' protocol-card--completed' : ''}${collapsed ? ' protocol-card--collapsed' : ''}`}
              onClick={() => setSelectedProtocolId(protocol.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!draggedId || draggedId === protocol.id) return
                onUpdateProtocols((prev) => reorderProtocolList(prev, draggedId, protocol.id))
                setDraggedId(null)
              }}
            >
              <header className="protocol-card__header">
                <button
                  type="button"
                  className="protocol-card__drag"
                  draggable
                  aria-label={`Drag ${protocol.title}`}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move'
                    setDraggedId(protocol.id)
                  }}
                  onDragEnd={() => setDraggedId(null)}
                >
                  ⋮⋮
                </button>
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
                    const fill = getHalfFill(star, protocol.priority)
                    return (
                      <button
                        key={star}
                        type="button"
                        className="protocol-card__star"
                        onClick={(e) => {
                          e.stopPropagation()
                          const bounds = e.currentTarget.getBoundingClientRect()
                          const half = (e.clientX - bounds.left) / bounds.width < 0.5 ? 0.5 : 1
                          handlePriorityChange(protocol.id, star - 1 + half)
                        }}
                        aria-label={`Set priority to ${formatPriority(star - 1 + 0.5)}`}
                      >
                        <span className="protocol-card__star-base" aria-hidden="true">
                          ★
                        </span>
                        <span
                          className="protocol-card__star-fill"
                          style={{ width: `${fill * 100}%` }}
                          aria-hidden="true"
                        >
                          ★
                        </span>
                      </button>
                    )
                  })}
                </div>
              </header>

              <p className="protocol-card__current-step">
                <span className="protocol-card__current-step-label">Current step</span>
                <span className="protocol-card__current-step-value">
                  {currentPointerPath ? currentPointerPath.map((step) => step.title).join(' / ') : 'All visible steps complete'}
                </span>
                <button
                  type="button"
                  className="protocol-card__collapse-toggle"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCollapsedProtocols((prev) => ({
                      ...prev,
                      [protocol.id]: !prev[protocol.id],
                    }))
                  }}
                >
                  {collapsed ? 'Expand' : 'Collapse'}
                </button>
              </p>

              {!collapsed ? (
                <>
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
                    {protocol.completedAt ? <span className="protocol-card__tag protocol-card__tag--complete">Completed</span> : null}
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
                          currentStepId={currentPointerId}
                          onToggle={(stepId) => handleToggleStep(protocol.id, stepId)}
                          onRename={(stepId, title) => handleRenameStep(protocol.id, stepId, title)}
                          onAddChild={(stepId) => handleAddChildStep(protocol.id, stepId)}
                          onRemove={(stepId) => handleRemoveStep(protocol.id, stepId)}
                          onDragStart={handleStepDragStart}
                          onDragEnd={() => setDraggedStepId(null)}
                          onDropStep={(stepId) => handleStepDrop(protocol.id, stepId)}
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
                          <span>Recall interval (hours)</span>
                          <input
                            className="protocol-card__select"
                            type="number"
                            min={1}
                            max={720}
                            value={protocol.intervalHours ?? 24}
                            onChange={(e) => handleIntervalChange(protocol.id, Math.max(1, Number(e.target.value) || 1))}
                          />
                        </label>
                      ) : null}
                      <label className="protocol-card__field">
                        <span>Thumbnail image</span>
                        <input
                          className="protocol-card__select"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            void handleThumbnailUpload(protocol.id, e.target.files?.[0] ?? null)
                            e.currentTarget.value = ''
                          }}
                        />
                      </label>
                      <label className="protocol-card__field">
                        <span>Thumbnail label</span>
                        <input
                          className="protocol-card__select"
                          type="text"
                          value={protocol.thumbnailLabel}
                          onChange={(e) => handleThumbnailLabelChange(protocol.id, e.target.value)}
                        />
                      </label>
                      <label className="protocol-card__field protocol-card__field--full">
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
                      <button
                        type="button"
                        className="protocol-card__archive-btn protocol-card__archive-btn--secondary"
                        onClick={() => handleClearThumbnail(protocol.id)}
                      >
                        Clear thumbnail image
                      </button>
                    </section>
                  ) : null}
                </>
              ) : null}
            </article>
          )
        })}
      </section>

    </main>
  )
}
