import type { TimeRecord } from '../types'

export function addTimeRecord(
  records: TimeRecord[],
  habitId: string,
  habitName: string,
  date: string,
  minutes: number,
  source: TimeRecord['source'] = 'manual',
): TimeRecord[] {
  const clamped = Math.max(1, Math.round(minutes))
  return [
    ...records,
    {
      id: crypto.randomUUID(),
      habitId,
      habitName,
      date,
      minutes: clamped,
      source,
    },
  ]
}
