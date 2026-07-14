import type { IntegrationProtocol, ProtocolStep } from '../types'

export type ProtocolStepPath = {
  step: ProtocolStep
  path: ProtocolStep[]
}

export function flattenProtocolSteps(
  steps: ProtocolStep[],
  path: ProtocolStep[] = [],
): ProtocolStepPath[] {
  const result: ProtocolStepPath[] = []
  for (const step of steps) {
    const nextPath = [...path, step]
    result.push({ step, path: nextPath })
    result.push(...flattenProtocolSteps(step.children, nextPath))
  }
  return result
}

export function getProtocolStepCount(steps: ProtocolStep[]): {
  total: number
  completed: number
} {
  return steps.reduce(
    (acc, step) => {
      const childStats = getProtocolStepCount(step.children)
      acc.total += 1 + childStats.total
      acc.completed += (step.done ? 1 : 0) + childStats.completed
      return acc
    },
    { total: 0, completed: 0 },
  )
}

export function clearProtocolStepCompletion(steps: ProtocolStep[]): ProtocolStep[] {
  return steps.map((step) => ({
    ...step,
    done: false,
    children: clearProtocolStepCompletion(step.children),
  }))
}

export function findProtocolStepPathById(
  steps: ProtocolStep[],
  stepId: string | null,
): ProtocolStepPath | null {
  if (!stepId) return null
  return flattenProtocolSteps(steps).find(({ step }) => step.id === stepId) ?? null
}

export function findProtocolStepById(
  steps: ProtocolStep[],
  stepId: string | null,
): ProtocolStep | null {
  return findProtocolStepPathById(steps, stepId)?.step ?? null
}

export function getProtocolStepTitles(steps: ProtocolStep[]): string[] {
  return flattenProtocolSteps(steps).map(({ step }) => step.title)
}

export function isProtocolComplete(steps: ProtocolStep[]): boolean {
  const stats = getProtocolStepCount(steps)
  return stats.total > 0 && stats.total === stats.completed
}

export function getProtocolStepIndex(
  steps: ProtocolStep[],
  stepId: string | null,
): number {
  if (!stepId) return -1
  return flattenProtocolSteps(steps).findIndex(({ step }) => step.id === stepId)
}

export function getProtocolTrackerPath(
  protocol: IntegrationProtocol,
): ProtocolStep[] | null {
  return protocol.structure === 'recall'
    ? findProtocolStepPathById(protocol.steps, normalizeProtocolCurrentStepId(protocol))?.path ?? null
    : flattenProtocolSteps(protocol.steps).find(({ step }) => !step.done)?.path ?? null
}

function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / (1000 * 60)))
  return `${totalMinutes}m`
}

export function getProtocolRecallCountdown(
  protocol: IntegrationProtocol,
  now = new Date(),
): string | null {
  if (protocol.structure !== 'recall' || protocol.completedAt || !protocol.recallLastReviewedAt) {
    return null
  }

  if (!isProtocolComplete(protocol.steps)) return null

  const intervalHours = Math.max(0.25, protocol.intervalHours ?? 24)
  const nextCheckAt = new Date(protocol.recallLastReviewedAt).getTime() + intervalHours * 60 * 60 * 1000
  const remainingMs = nextCheckAt - now.getTime()
  return formatCountdown(Math.max(0, remainingMs))
}

export function getProtocolTrackerLabel(
  protocol: IntegrationProtocol,
  now = new Date(),
): string {
  const countdown = getProtocolRecallCountdown(protocol, now)
  if (countdown) return `Next check in ${countdown}`

  const path = getProtocolTrackerPath(protocol)
  return path?.map((step) => step.title).join(' / ') ?? 'All visible steps complete'
}

export function normalizeProtocolCurrentStepId(
  protocol: IntegrationProtocol,
): string | null {
  const flat = flattenProtocolSteps(protocol.steps)
  if (flat.length === 0) return null
  if (protocol.recallCurrentStepId && flat.some(({ step }) => step.id === protocol.recallCurrentStepId)) {
    return protocol.recallCurrentStepId
  }
  return flat[0]?.step.id ?? null
}
