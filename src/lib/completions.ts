import type { CompletionRecord } from '../types'

export function addCompletion(
  completions: CompletionRecord[],
  habitId: string,
  habitName: string,
  date: string,
): CompletionRecord[] {
  const exists = completions.some(
    (c) => c.habitId === habitId && c.date === date,
  )
  if (exists) return completions

  return [
    ...completions,
    {
      id: crypto.randomUUID(),
      habitId,
      habitName,
      date,
    },
  ]
}

export function removeCompletion(
  completions: CompletionRecord[],
  habitId: string,
  date: string,
): CompletionRecord[] {
  return completions.filter((c) => !(c.habitId === habitId && c.date === date))
}

export function getCompletionsForDate(
  completions: CompletionRecord[],
  date: string,
): CompletionRecord[] {
  return completions.filter((c) => c.date === date)
}

export function groupCompletionsByDate(
  completions: CompletionRecord[],
): Map<string, CompletionRecord[]> {
  const map = new Map<string, CompletionRecord[]>()
  for (const record of completions) {
    const existing = map.get(record.date) ?? []
    existing.push(record)
    map.set(record.date, existing)
  }
  return map
}
