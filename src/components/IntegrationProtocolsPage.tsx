import { useEffect, useMemo, useRef, useState } from 'react'
import { playCompletionChime } from '../lib/audio'
import type { IntegrationProtocol, ProtocolStep, Reward } from '../types'
import {
  clearProtocolStepCompletion,
  findProtocolStepPathById,
  findProtocolStepById,
  getProtocolStepCount,
  getProtocolTrackerLabel,
  isProtocolComplete,
  normalizeProtocolCurrentStepId,
} from '../lib/protocols'
import './IntegrationProtocolsPage.css'

const PROTOCOLS_COLLAPSE_STORAGE_KEY = 'habitup-protocols-collapse-state-v1'

type ProtocolCollapseState = {
  archived: boolean
  completed: boolean
  settingsByProtocolId: Record<string, boolean>
  protocolsByProtocolId: Record<string, boolean>
}

function loadProtocolCollapseState(): ProtocolCollapseState {
  try {
    const raw = window.localStorage.getItem(PROTOCOLS_COLLAPSE_STORAGE_KEY)
    if (!raw) {
      return {
        archived: false,
        completed: false,
        settingsByProtocolId: {},
        protocolsByProtocolId: {},
      }
    }
    const parsed = JSON.parse(raw) as Partial<ProtocolCollapseState>
    return {
      archived: !!parsed.archived,
      completed: !!parsed.completed,
      settingsByProtocolId: parsed.settingsByProtocolId ?? {},
      protocolsByProtocolId: parsed.protocolsByProtocolId ?? {},
    }
  } catch {
    return {
      archived: false,
      completed: false,
      settingsByProtocolId: {},
      protocolsByProtocolId: {},
    }
  }
}

type IntegrationProtocolsPageProps = {
  protocols: IntegrationProtocol[]
  rewards: Reward[]
  selectedProtocolId: string | null
  onSelectProtocolId: (protocolId: string) => void
  onDeleteProtocol: (protocolId: string) => boolean
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

function formatDate(date: string | null): string | null {
  if (!date) return null
  try {
    const [year, month, day] = date.split('-').map((part) => Number(part))
    if (
      Number.isInteger(year) &&
      Number.isInteger(month) &&
      Number.isInteger(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(year, month - 1, day))
    }

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
  showCurrentPointer = false,
  readOnly = false,
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
  showCurrentPointer?: boolean
  readOnly?: boolean
  onToggle: (stepId: string) => void
  onRename: (stepId: string, title: string) => void
  onAddChild: (stepId: string) => void
  onRemove: (stepId: string) => void
  onDragStart: (stepId: string) => void
  onDragEnd: () => void
  onDropStep: (stepId: string) => void
}) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [step.title])

  return (
    <li className="protocol-step" style={{ ['--step-depth' as string]: depth }}>
      <div
        className={`protocol-step__row${step.done ? ' protocol-step__row--done' : ''}${step.id === currentStepId ? ' protocol-step__row--current' : ''}${step.id === currentStepId && showCurrentPointer ? ' protocol-step__row--current-pointer' : ''}`}
        onDragOver={
          readOnly
            ? undefined
            : (e) => e.preventDefault()
        }
        onDrop={readOnly ? undefined : () => onDropStep(step.id)}
      >
        {step.id === currentStepId && showCurrentPointer ? (
          <span className="protocol-step__pointer" aria-hidden="true">
            ➜
          </span>
        ) : null}
        {readOnly ? (
          <span className="protocol-step__drag protocol-step__drag--readonly" aria-hidden="true">
            ⋮⋮
          </span>
        ) : (
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
        )}
        {readOnly ? (
          <span
            className={`protocol-step__check${step.done ? ' protocol-step__check--done' : ''} protocol-step__check--readonly`}
            aria-hidden="true"
          >
            <span />
          </span>
        ) : (
          <button
            type="button"
            className={`protocol-step__check${step.done ? ' protocol-step__check--done' : ''}`}
            aria-pressed={step.done}
            aria-label={step.done ? `Mark ${step.title} incomplete` : `Mark ${step.title} complete`}
            onClick={() => onToggle(step.id)}
          >
            <span aria-hidden="true" />
          </button>
        )}
        {readOnly ? (
          <textarea
            ref={inputRef}
            className="protocol-step__input"
            rows={1}
            value={step.title}
            readOnly
            tabIndex={-1}
          />
        ) : (
          <textarea
            ref={inputRef}
            className="protocol-step__input"
            rows={1}
            value={step.title}
            onInput={(e) => {
              const target = e.currentTarget
              target.style.height = 'auto'
              target.style.height = `${target.scrollHeight}px`
            }}
            onChange={(e) => onRename(step.id, e.target.value)}
          />
        )}
        {readOnly ? null : (
          <div className="protocol-step__actions">
            <button type="button" className="protocol-step__action" onClick={() => onAddChild(step.id)}>
              +
            </button>
            <button type="button" className="protocol-step__action" onClick={() => onRemove(step.id)}>
              ×
            </button>
          </div>
        )}
      </div>
      {step.children.length > 0 ? (
        <ul className="protocol-step__children">
          {step.children.map((child) => (
            <ProtocolStepRow
              key={child.id}
              step={child}
              depth={depth + 1}
              currentStepId={currentStepId}
              showCurrentPointer={showCurrentPointer}
              readOnly={readOnly}
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
  selectedProtocolId,
  onSelectProtocolId,
  onDeleteProtocol,
  onUpdateProtocols,
}: IntegrationProtocolsPageProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null)
  const initialCollapseState = useMemo(() => loadProtocolCollapseState(), [])
  const protocolCardRefs = useRef<Record<string, HTMLElement | null>>({})
  const [collapsedSettings, setCollapsedSettings] = useState<Record<string, boolean>>(
    initialCollapseState.settingsByProtocolId,
  )
  const [collapsedProtocols, setCollapsedProtocols] = useState<Record<string, boolean>>(
    initialCollapseState.protocolsByProtocolId,
  )
  const [collapsedArchived, setCollapsedArchived] = useState(initialCollapseState.archived)
  const [collapsedCompleted, setCollapsedCompleted] = useState(initialCollapseState.completed)
  const [draftByProtocol, setDraftByProtocol] = useState<Record<string, string>>({})
  const [deletePhraseByProtocol, setDeletePhraseByProtocol] = useState<Record<string, string>>({})

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PROTOCOLS_COLLAPSE_STORAGE_KEY,
        JSON.stringify({
          archived: collapsedArchived,
          completed: collapsedCompleted,
          settingsByProtocolId: collapsedSettings,
          protocolsByProtocolId: collapsedProtocols,
        }),
      )
    } catch {
      // Ignore storage failures and keep the UI responsive.
    }
  }, [collapsedArchived, collapsedCompleted, collapsedSettings, collapsedProtocols])

  const selectedProtocol =
    protocols.find((protocol) => protocol.id === selectedProtocolId) ??
    protocols[0] ??
    null

  useEffect(() => {
    if (!selectedProtocol?.id) return
    const card = protocolCardRefs.current[selectedProtocol.id]
    if (!card) return
    card.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selectedProtocol?.id])

  const rewardMap = useMemo(
    () => new Map(rewards.map((reward) => [reward.id, reward])),
    [rewards],
  )
  const activeProtocols = useMemo(
    () => protocols.filter((protocol) => !protocol.archivedAt && !protocol.completedAt),
    [protocols],
  )
  const archivedProtocols = useMemo(
    () => protocols.filter((protocol) => protocol.archivedAt),
    [protocols],
  )
  const completedProtocols = useMemo(
    () => protocols.filter((protocol) => protocol.completedAt && !protocol.archivedAt),
    [protocols],
  )

  function updateAny(protocolId: string, updater: (protocol: IntegrationProtocol) => IntegrationProtocol) {
    onUpdateProtocols((prev) => updateProtocol(prev, protocolId, updater))
  }

  function toggleActive(protocolId: string) {
    onUpdateProtocols((prev) =>
      prev.map((protocol) => {
        if (protocol.id !== protocolId) return protocol

        const now = new Date().toISOString()
        if (protocol.active) {
          return {
            ...protocol,
            active: false,
            pausedAt: now,
            updatedAt: now,
          }
        }

        return {
          ...protocol,
          active: true,
          pausedAt: null,
          updatedAt: now,
        }
      }),
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
      stepXp: 10,
      completionXp: 25,
      recallStepXpAwardedIds: [],
      active: false,
      pausedAt: null,
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
    onSelectProtocolId(protocol.id)
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
        let nextCompletedAt = protocol.completedAt
        let nextActive = protocol.active
        let nextPausedAt = protocol.pausedAt
        let nextRecallLastReviewedAt = protocol.recallLastReviewedAt

        if (protocol.structure === 'recall') {
          const currentStepId = normalizeProtocolCurrentStepId(protocol)
          if (complete) {
            nextCompletedAt = null
            nextActive = true
            nextPausedAt = protocol.pausedAt
            nextRecallCurrentStepId = currentStepId
            nextRecallLastReviewedAt = now
          }
        } else if (complete) {
          nextCompletedAt = protocol.completedAt ?? now
          nextActive = false
          nextPausedAt = null
        }

        return {
          ...protocol,
          steps: nextSteps,
          completedAt: nextCompletedAt,
          active: nextActive,
          pausedAt: nextPausedAt,
          recallCurrentStepId: nextRecallCurrentStepId,
          recallLastReviewedAt: nextRecallLastReviewedAt,
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

  function handleDeleteProtocol(protocolId: string) {
    const deleted = onDeleteProtocol(protocolId)
    if (deleted) {
      setDeletePhraseByProtocol((prev) => {
        const next = { ...prev }
        delete next[protocolId]
        return next
      })
    }
    return deleted
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

  function handleDeadlineChange(protocolId: string, deadline: string) {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        deadline: deadline || null,
        updatedAt: new Date().toISOString(),
      })),
    )
  }

  function handleStepXpChange(protocolId: string, stepXp: number) {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        stepXp: Math.max(0, Math.round(stepXp)),
        updatedAt: new Date().toISOString(),
      })),
    )
  }

  function handleCompletionXpChange(protocolId: string, completionXp: number) {
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        completionXp: Math.max(0, Math.round(completionXp)),
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
        archivedAt,
        updatedAt: archivedAt,
      })),
    )
  }

  function handleRestore(protocolId: string) {
    const restoredAt = new Date().toISOString()
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => ({
        ...protocol,
        archivedAt: null,
        updatedAt: restoredAt,
      })),
    )
  }

  function handleRestoreCompleted(protocolId: string) {
    const restoredAt = new Date().toISOString()
    onUpdateProtocols((prev) =>
      updateProtocol(prev, protocolId, (protocol) => {
        const nextSteps = clearProtocolStepCompletion(protocol.steps)
        return {
          ...protocol,
          archivedAt: null,
          completedAt: null,
          active: true,
          pausedAt: null,
          recallCurrentStepId:
            protocol.structure === 'recall'
              ? normalizeProtocolCurrentStepId({
                  ...protocol,
                  steps: nextSteps,
                  completedAt: null,
                })
              : protocol.recallCurrentStepId,
          recallLastReviewedAt: protocol.structure === 'recall' ? restoredAt : protocol.recallLastReviewedAt,
          steps: nextSteps,
          updatedAt: restoredAt,
        }
      }),
    )
  }

  if (protocols.length === 0) {
    return (
      <main className="dashboard protocols-page">
        <header className="dashboard__header">
          <h1 className="protocols-page__page-title">INTEGRATION PROTOCOLS</h1>
          <button
            type="button"
            className="protocols-page__primary-btn"
            onClick={handleCreateProtocol}
            aria-label="Create protocol"
            title="Create protocol"
          >
            <span aria-hidden="true">+</span>
          </button>
        </header>
      </main>
    )
  }

  return (
    <main className="dashboard protocols-page">
      <header className="dashboard__header">
        <h1 className="protocols-page__page-title">INTEGRATION PROTOCOLS</h1>
        <button
          type="button"
          className="protocols-page__primary-btn"
          onClick={handleCreateProtocol}
          aria-label="Create protocol"
          title="Create protocol"
        >
          <span aria-hidden="true">+</span>
        </button>
      </header>

      <section className="protocols-page__board" aria-label="Protocols board">
        {activeProtocols.map((protocol) => {
          const stats = getProtocolStepCount(protocol.steps)
          const percent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
          const settingsOpen = !!collapsedSettings[protocol.id]
          const collapsed = !!collapsedProtocols[protocol.id]
          const reward = protocol.rewardId ? rewardMap.get(protocol.rewardId) ?? null : null
          const selected = protocol.id === selectedProtocol?.id
          const deadlineLabel = formatDate(protocol.deadline)
          const isStandardArc = protocol.structure === 'standard'
          const currentPointerPath =
            protocol.structure === 'recall'
              ? findProtocolStepPathById(
                  protocol.steps,
                  normalizeProtocolCurrentStepId(protocol),
                )?.path ?? null
              : findFirstIncompleteStep(protocol.steps)
          const currentPointerId = currentPointerPath?.[currentPointerPath.length - 1]?.id ?? null
          const currentPointerLabel = getProtocolTrackerLabel(protocol)

          return (
              <article
                key={protocol.id}
                className={`protocol-card${protocol.active ? ' protocol-card--active' : ''}${selected ? ' protocol-card--selected' : ''}${protocol.archivedAt ? ' protocol-card--archived' : ''}${protocol.completedAt ? ' protocol-card--completed' : ''}${collapsed ? ' protocol-card--collapsed' : ''}`}
              ref={(node) => {
                protocolCardRefs.current[protocol.id] = node
              }}
              onClick={() => onSelectProtocolId(protocol.id)}
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
                    onSelectProtocolId(protocol.id)
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
                  {deadlineLabel ? <span className="protocol-card__deadline">Due {deadlineLabel}</span> : null}
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
                <span className="protocol-card__current-step-label">Current</span>
                <span className="protocol-card__current-step-value">{currentPointerLabel}</span>
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
                  <span aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
                </button>
              </p>

              {!collapsed ? (
                <>
                  <div className="protocol-card__meta">
                    <button
                      type="button"
                      className={`protocol-card__active${protocol.active ? ' protocol-card__active--on' : ''}${protocol.pausedAt ? ' protocol-card__active--paused' : ''}`}
                      aria-label={
                        protocol.pausedAt
                          ? 'Resume paused contract'
                          : protocol.active
                            ? 'Pause activated contract'
                            : 'Activate contract'
                      }
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleActive(protocol.id)
                      }}
                    >
                      {protocol.pausedAt ? (
                        <>
                          <span className="protocol-card__active-label protocol-card__active-label--default">Paused</span>
                          <span className="protocol-card__active-label protocol-card__active-label--hover" aria-hidden="true">
                            Continue
                          </span>
                        </>
                      ) : protocol.active ? (
                        <>
                          <span className="protocol-card__active-label protocol-card__active-label--default">Activated</span>
                          <span className="protocol-card__active-label protocol-card__active-label--hover" aria-hidden="true">
                            Pause
                          </span>
                        </>
                      ) : (
                        'Activate'
                      )}
                    </button>
                    <span className="protocol-card__tag">{protocol.structure === 'recall' ? 'Recall arc' : 'Standard arc'}</span>
                    {protocol.completedAt ? <span className="protocol-card__tag protocol-card__tag--complete">Completed</span> : null}
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
                          showCurrentPointer={protocol.structure === 'recall'}
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
                      {reward ? (
                        <div className="protocol-card__reward-pill">
                          <span className="protocol-card__reward-kicker">Reward</span>
                          <span className="protocol-card__reward-row">
                            {reward.imageUrl ? (
                              <img className="protocol-card__reward-img" src={reward.imageUrl} alt="" />
                            ) : (
                              <span className="protocol-card__reward-emoji" aria-hidden="true">
                                {reward.emoji}
                              </span>
                            )}
                            <span className="protocol-card__reward-copy">
                              <span className="protocol-card__reward-name">{reward.name}</span>
                              <span className="protocol-card__reward-subtext">{protocol.completionXp} XP</span>
                            </span>
                          </span>
                        </div>
                      ) : protocol.rewardName ? (
                        <div className="protocol-card__reward-pill">
                          <span className="protocol-card__reward-kicker">Reward</span>
                          <span className="protocol-card__reward-row">
                            <span className="protocol-card__reward-emoji" aria-hidden="true">
                              ◈
                            </span>
                            <span className="protocol-card__reward-copy">
                              <span className="protocol-card__reward-name">{protocol.rewardName}</span>
                              <span className="protocol-card__reward-subtext">{protocol.completionXp} XP</span>
                            </span>
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="protocol-card__settings-toggle"
                      aria-label={settingsOpen ? 'Hide protocol settings' : 'Open protocol settings'}
                      onClick={(e) => {
                        e.stopPropagation()
                        setCollapsedSettings((prev) => ({
                          ...prev,
                          [protocol.id]: !prev[protocol.id],
                        }))
                      }}
                    >
                      ⚙
                    </button>
                  </footer>

                  {settingsOpen ? (
                    <section className="protocol-card__settings" onClick={(e) => e.stopPropagation()}>
                      <div className="protocol-card__field-group protocol-card__field-group--top">
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
                        {isStandardArc ? (
                          <label className="protocol-card__field">
                            <span>Base XP per step</span>
                            <input
                              className="protocol-card__select"
                              type="number"
                              min={0}
                              step={1}
                              value={protocol.stepXp}
                              onChange={(e) =>
                                handleStepXpChange(protocol.id, Number(e.target.value) || 0)
                              }
                            />
                          </label>
                        ) : null}
                      </div>
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
                          <span>Recall interval (hrs)</span>
                          <input
                            className="protocol-card__select"
                            type="number"
                            min={0.25}
                            step={0.25}
                            max={720}
                            value={protocol.intervalHours ?? 24}
                            onChange={(e) =>
                              handleIntervalChange(
                                protocol.id,
                                Math.max(0.25, Number(e.target.value) || 0.25),
                              )
                            }
                          />
                        </label>
                      ) : null}
                      {isStandardArc ? (
                        <label className="protocol-card__field protocol-card__field--compact">
                          <span>Reward</span>
                          <select
                            className="protocol-card__select protocol-card__select--compact"
                            value={protocol.rewardId ?? ''}
                            onChange={(e) => handleRewardSelect(protocol.id, e.target.value)}
                          >
                            <option value="">No reward attached</option>
                            {rewards.map((rewardOption) => (
                              <option key={rewardOption.id} value={rewardOption.id}>
                                {rewardOption.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      <label className="protocol-card__field">
                        <span>Final XP reward</span>
                        <input
                          className="protocol-card__select"
                          type="number"
                          min={0}
                          step={1}
                          value={protocol.completionXp}
                          onChange={(e) =>
                            handleCompletionXpChange(protocol.id, Number(e.target.value) || 0)
                          }
                        />
                      </label>
                      {!isStandardArc ? (
                        <label className="protocol-card__field protocol-card__field--compact">
                          <span>Reward</span>
                          <select
                            className="protocol-card__select protocol-card__select--compact"
                            value={protocol.rewardId ?? ''}
                            onChange={(e) => handleRewardSelect(protocol.id, e.target.value)}
                          >
                            <option value="">No reward attached</option>
                            {rewards.map((rewardOption) => (
                              <option key={rewardOption.id} value={rewardOption.id}>
                                {rewardOption.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      {!isStandardArc ? (
                        <div className="protocol-card__field-group protocol-card__field-group--xp">
                          <label className="protocol-card__field">
                            <span>Base XP per step</span>
                            <input
                              className="protocol-card__select"
                              type="number"
                              min={0}
                              step={1}
                              value={protocol.stepXp}
                              onChange={(e) =>
                                handleStepXpChange(protocol.id, Number(e.target.value) || 0)
                              }
                            />
                          </label>
                        </div>
                      ) : null}
                      <div className="protocol-card__field protocol-card__field--full protocol-card__field--danger protocol-card__field--danger-mini">
                        <div className="protocol-card__field-head-row">
                          <span>Delete</span>
                        </div>
                        <div className="protocol-card__danger-row">
                          <input
                            className="protocol-card__select protocol-card__select--compact protocol-card__select--safeguard"
                            type="text"
                            value={deletePhraseByProtocol[protocol.id] ?? ''}
                            placeholder="DELETE"
                            onChange={(e) =>
                              setDeletePhraseByProtocol((prev) => ({
                                ...prev,
                                [protocol.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="protocol-card__archive-btn protocol-card__archive-btn--danger protocol-card__archive-btn--tiny"
                            disabled={(deletePhraseByProtocol[protocol.id] ?? '') !== 'DELETE'}
                            onClick={() => {
                              if (handleDeleteProtocol(protocol.id)) {
                                setCollapsedSettings((prev) => ({
                                  ...prev,
                                  [protocol.id]: false,
                                }))
                                setCollapsedProtocols((prev) => {
                                  const next = { ...prev }
                                  delete next[protocol.id]
                                  return next
                                })
                              }
                            }}
                          >
                            X
                          </button>
                        </div>
                      </div>
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
                      <div className="protocol-card__settings-footer">
                        <button
                          type="button"
                          className="protocol-card__text-action"
                          onClick={() => handleArchive(protocol.id)}
                        >
                          archive
                        </button>
                      </div>
                    </section>
                  ) : null}
                </>
              ) : null}
            </article>
          )
        })}
      </section>
      {archivedProtocols.length > 0 ? (
        <section className="protocols-page__archive" aria-label="Archived protocols">
          <button
            type="button"
            className="protocols-page__archive-toggle"
            onClick={() => setCollapsedArchived((value) => !value)}
            aria-expanded={!collapsedArchived}
          >
            <div className="protocols-page__archive-head">
              <div>
                <h2 className="dashboard__section-title">Archived protocols</h2>
                <p className="protocols-page__archive-copy">
                  Hidden from the active board until you restore them.
                </p>
              </div>
              <span className="protocols-page__archive-count">{archivedProtocols.length} archived</span>
            </div>
            <span
              className={`protocols-page__archive-chevron${collapsedArchived ? '' : ' protocols-page__archive-chevron--open'}`}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>

          {!collapsedArchived ? (
            <div className="protocols-page__archive-grid">
              {archivedProtocols.map((protocol) => {
                const reward = protocol.rewardId ? rewardMap.get(protocol.rewardId) ?? null : null
                const settingsOpen = !!collapsedSettings[protocol.id]
                const deletePhrase = deletePhraseByProtocol[protocol.id] ?? ''
                const canDelete = deletePhrase === 'DELETE'
                const deadlineLabel = formatDate(protocol.deadline)
                return (
                  <article
                    key={protocol.id}
                    className="protocol-card protocol-card--archived protocol-card--archived-visible"
                    onClick={() => onSelectProtocolId(protocol.id)}
                  >
                    <header className="protocol-card__header">
                      <button
                        type="button"
                        className="protocol-card__drag"
                        aria-hidden="true"
                        tabIndex={-1}
                      >
                        ⋮⋮
                      </button>
                      <button type="button" className="protocol-card__thumbnail">
                        {protocol.thumbnailUrl ? (
                          <img className="protocol-card__thumbnail-img" src={protocol.thumbnailUrl} alt="" />
                        ) : (
                          <span className="protocol-card__thumbnail-label">{protocol.thumbnailLabel}</span>
                        )}
                      </button>
                      <div className="protocol-card__title-block">
                        <input className="protocol-card__title" type="text" value={protocol.title} readOnly />
                        {deadlineLabel ? (
                          <span className="protocol-card__deadline">Due {deadlineLabel}</span>
                        ) : null}
                      </div>
                      <div className="protocol-card__stars" aria-hidden="true">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <span key={index} className="protocol-card__star protocol-card__star--readonly">
                            ★
                          </span>
                        ))}
                      </div>
                    </header>
                    <p className="protocol-card__current-step">
                      <span className="protocol-card__current-step-label">Archived</span>
                      <span className="protocol-card__current-step-value">Hidden until restored</span>
                    </p>
                    <div className="protocol-card__meta">
                      <button
                        type="button"
                        className="protocol-card__active protocol-card__active--on"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRestore(protocol.id)
                        }}
                      >
                        Restore
                      </button>
                    </div>
                    <footer className="protocol-card__footer">
                      <div className="protocol-card__reward">
                        {reward ? (
                          <div className="protocol-card__reward-pill">
                            <span className="protocol-card__reward-kicker">Reward</span>
                            {reward.imageUrl ? (
                              <img className="protocol-card__reward-img" src={reward.imageUrl} alt="" />
                            ) : (
                              <span className="protocol-card__reward-emoji" aria-hidden="true">
                                {reward.emoji}
                              </span>
                            )}
                            <span className="protocol-card__reward-copy">
                              <span className="protocol-card__reward-name">{reward.name}</span>
                              <span className="protocol-card__reward-subtext">{protocol.completionXp} XP</span>
                            </span>
                          </div>
                        ) : protocol.rewardName ? (
                          <div className="protocol-card__reward-pill">
                            <span className="protocol-card__reward-kicker">Reward</span>
                            <span className="protocol-card__reward-emoji" aria-hidden="true">
                              ◈
                            </span>
                            <span className="protocol-card__reward-copy">
                              <span className="protocol-card__reward-name">{protocol.rewardName}</span>
                              <span className="protocol-card__reward-subtext">{protocol.completionXp} XP</span>
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="protocol-card__settings-toggle"
                        aria-label={settingsOpen ? 'Hide protocol settings' : 'Open protocol settings'}
                        onClick={(e) => {
                          e.stopPropagation()
                          setCollapsedSettings((prev) => ({
                            ...prev,
                            [protocol.id]: !prev[protocol.id],
                          }))
                        }}
                      >
                        ⚙
                      </button>
                    </footer>
                    {settingsOpen ? (
                      <section className="protocol-card__settings" onClick={(e) => e.stopPropagation()}>
                        <label className="protocol-card__field">
                          <span>Structure</span>
                          <select className="protocol-card__select" value={protocol.structure} disabled>
                            <option value="standard">Standard protocol</option>
                            <option value="recall">Recall protocol</option>
                          </select>
                        </label>
                        <div className="protocol-card__field protocol-card__field--full protocol-card__field--danger protocol-card__field--danger-mini">
                          <div className="protocol-card__field-head-row">
                            <span>Delete</span>
                            <button
                              type="button"
                              className="protocol-card__text-action"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRestore(protocol.id)
                              }}
                            >
                              Restore protocol
                            </button>
                          </div>
                          <div className="protocol-card__danger-row">
                            <input
                              className="protocol-card__select protocol-card__select--compact protocol-card__select--safeguard"
                              type="text"
                              value={deletePhrase}
                              placeholder="DELETE"
                              onChange={(e) =>
                                setDeletePhraseByProtocol((prev) => ({
                                  ...prev,
                                  [protocol.id]: e.target.value,
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="protocol-card__archive-btn protocol-card__archive-btn--danger protocol-card__archive-btn--tiny"
                              disabled={!canDelete}
                              onClick={() => {
                                if (handleDeleteProtocol(protocol.id)) {
                                  setCollapsedSettings((prev) => ({
                                    ...prev,
                                    [protocol.id]: false,
                                  }))
                                }
                              }}
                          >
                            X
                            </button>
                          </div>
                        </div>
                      </section>
                    ) : null}
                  </article>
                )
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {completedProtocols.length > 0 ? (
        <section className="protocols-page__archive protocols-page__completed" aria-label="Completed protocols">
          <button
            type="button"
            className="protocols-page__archive-toggle protocols-page__archive-toggle--static"
            onClick={() => setCollapsedCompleted((value) => !value)}
            aria-expanded={!collapsedCompleted}
          >
            <div className="protocols-page__archive-head">
              <div>
                <h2 className="dashboard__section-title">COMPLETED</h2>
                <p className="protocols-page__archive-copy">
                  Finished protocols and full step trees you can review or restore.
                </p>
              </div>
              <span className="protocols-page__archive-count">{completedProtocols.length} completed</span>
            </div>
            <span
              className={`protocols-page__archive-chevron${collapsedCompleted ? '' : ' protocols-page__archive-chevron--open'}`}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>

          {!collapsedCompleted ? (
            <div className="protocols-page__archive-grid">
              {completedProtocols.map((protocol) => {
                const reward = protocol.rewardId ? rewardMap.get(protocol.rewardId) ?? null : null
                const deadlineLabel = formatDate(protocol.deadline)
                return (
                  <article
                    key={protocol.id}
                    className="protocol-card protocol-card--completed protocol-card--archived-visible"
                    onClick={() => onSelectProtocolId(protocol.id)}
                  >
                  <header className="protocol-card__header">
                    <button
                      type="button"
                      className="protocol-card__drag"
                      aria-hidden="true"
                      tabIndex={-1}
                    >
                      ⋮⋮
                    </button>
                    <button type="button" className="protocol-card__thumbnail">
                      {protocol.thumbnailUrl ? (
                        <img className="protocol-card__thumbnail-img" src={protocol.thumbnailUrl} alt="" />
                      ) : (
                        <span className="protocol-card__thumbnail-label">{protocol.thumbnailLabel}</span>
                      )}
                    </button>
                    <div className="protocol-card__title-block">
                      <input className="protocol-card__title" type="text" value={protocol.title} readOnly />
                      {deadlineLabel ? <span className="protocol-card__deadline">Due {deadlineLabel}</span> : null}
                    </div>
                    <div className="protocol-card__stars" aria-hidden="true">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <span key={index} className="protocol-card__star protocol-card__star--readonly">
                          ★
                        </span>
                      ))}
                    </div>
                  </header>

                  <p className="protocol-card__current-step">
                    <span className="protocol-card__current-step-label">Completed</span>
                    <span className="protocol-card__current-step-value">
                      {protocol.completedAt ? `Cleared ${protocol.completedAt.slice(0, 10)}` : 'Ready to review'}
                    </span>
                  </p>

                  <div className="protocol-card__body protocol-card__body--readonly">
                    <ul className="protocol-card__steps">
                      {protocol.steps.map((step) => (
                        <ProtocolStepRow
                          key={step.id}
                          step={step}
                          depth={0}
                          currentStepId={null}
                          showCurrentPointer={false}
                          readOnly
                          onToggle={() => {}}
                          onRename={() => {}}
                          onAddChild={() => {}}
                          onRemove={() => {}}
                          onDragStart={() => {}}
                          onDragEnd={() => {}}
                          onDropStep={() => {}}
                        />
                      ))}
                    </ul>
                  </div>

                  <div className="protocol-card__meta">
                    <button
                      type="button"
                      className="protocol-card__active protocol-card__active--on protocol-card__active--restore"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRestoreCompleted(protocol.id)
                      }}
                    >
                      Restore
                    </button>
                  </div>

                  <footer className="protocol-card__footer">
                    <div className="protocol-card__reward">
                      {reward ? (
                        <div className="protocol-card__reward-pill">
                          <span className="protocol-card__reward-kicker">Reward</span>
                          {reward.imageUrl ? (
                            <img className="protocol-card__reward-img" src={reward.imageUrl} alt="" />
                          ) : (
                            <span className="protocol-card__reward-emoji" aria-hidden="true">
                              {reward.emoji}
                            </span>
                          )}
                          <span className="protocol-card__reward-copy">
                            <span className="protocol-card__reward-name">{reward.name}</span>
                            <span className="protocol-card__reward-subtext">{protocol.completionXp} XP</span>
                          </span>
                        </div>
                      ) : protocol.rewardName ? (
                        <div className="protocol-card__reward-pill">
                          <span className="protocol-card__reward-kicker">Reward</span>
                          <span className="protocol-card__reward-emoji" aria-hidden="true">
                            ◈
                          </span>
                          <span className="protocol-card__reward-copy">
                            <span className="protocol-card__reward-name">{protocol.rewardName}</span>
                            <span className="protocol-card__reward-subtext">{protocol.completionXp} XP</span>
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </footer>
                </article>
                )
              })}
            </div>
          ) : null}
        </section>
      ) : null}

    </main>
  )
}
