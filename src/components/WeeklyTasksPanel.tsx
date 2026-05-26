import { useState, type FormEvent } from 'react'
import { playCompletionChime } from '../lib/audio'
import type { WeeklyTask } from '../types'
import './WeeklyTasksPanel.css'

type WeeklyTasksPanelProps = {
  tasks: WeeklyTask[]
  open: boolean
  title?: string
  xpReward?: number
  placeholder?: string
  emptyMessage?: string
  onOpenChange: (open: boolean) => void
  onToggle: (id: string) => void
  onAdd: (name: string) => void
  onRemove: (id: string) => void
}

export function WeeklyTasksPanel({
  tasks,
  open,
  title = 'Weekly tasks',
  xpReward = 10,
  placeholder = 'Add weekly task…',
  emptyMessage = 'No weekly tasks — add one when you need it.',
  onOpenChange,
  onToggle,
  onAdd,
  onRemove,
}: WeeklyTasksPanelProps) {
  const [name, setName] = useState('')
  const [xpPopId, setXpPopId] = useState<string | null>(null)
  const doneCount = tasks.filter((t) => t.done).length

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setName('')
  }

  function handleToggle(task: WeeklyTask) {
    onToggle(task.id)
    if (!task.done) {
      playCompletionChime()
      setXpPopId(task.id)
      setTimeout(() => setXpPopId(null), 900)
    }
  }

  return (
    <section className="weekly-panel">
      <button
        type="button"
        className="weekly-panel__toggle"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
      >
        <span className="weekly-panel__toggle-label">{title}</span>
        <span className="weekly-panel__toggle-meta">
          {doneCount}/{tasks.length} done
        </span>
        <span className={`weekly-panel__chevron${open ? ' weekly-panel__chevron--open' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="weekly-panel__body">
          <form className="weekly-panel__form" onSubmit={handleSubmit}>
            <input
              className="weekly-panel__input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={placeholder}
              maxLength={80}
              aria-label={`${title} item name`}
            />
            <button
              className="weekly-panel__add-btn"
              type="submit"
              disabled={!name.trim()}
            >
              Add
            </button>
          </form>

          {tasks.length === 0 ? (
            <p className="weekly-panel__empty">{emptyMessage}</p>
          ) : (
            <ul className="weekly-panel__list">
              {tasks.map((task) => (
                <li key={task.id} className="weekly-task">
                  <button
                    type="button"
                    className={`weekly-task__check${task.done ? ' weekly-task__check--done' : ''}`}
                    onClick={() => handleToggle(task)}
                    aria-pressed={task.done}
                    aria-label={task.done ? `Mark "${task.name}" incomplete` : `Mark "${task.name}" complete`}
                  />
                  <span
                    className={`weekly-task__name${task.done ? ' weekly-task__name--done' : ''}`}
                  >
                    {task.name}
                  </span>
                  {xpPopId === task.id ? (
                    <span className="weekly-task__xp-pop">+{xpReward} XP</span>
                  ) : null}
                  <button
                    type="button"
                    className="weekly-task__remove"
                    onClick={() => onRemove(task.id)}
                    aria-label={`Remove "${task.name}"`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  )
}
