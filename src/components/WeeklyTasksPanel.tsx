import { useState, type FormEvent } from 'react'
import type { WeeklyTask } from '../types'
import './WeeklyTasksPanel.css'

type WeeklyTasksPanelProps = {
  tasks: WeeklyTask[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggle: (id: string) => void
  onAdd: (name: string) => void
  onRemove: (id: string) => void
}

export function WeeklyTasksPanel({
  tasks,
  open,
  onOpenChange,
  onToggle,
  onAdd,
  onRemove,
}: WeeklyTasksPanelProps) {
  const [name, setName] = useState('')
  const doneCount = tasks.filter((t) => t.done).length

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setName('')
  }

  return (
    <section className="weekly-panel">
      <button
        type="button"
        className="weekly-panel__toggle"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
      >
        <span className="weekly-panel__toggle-label">Weekly tasks</span>
        <span className="weekly-panel__toggle-meta">
          {tasks.length > 0 ? `${doneCount}/${tasks.length} done` : 'None yet'}
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
              placeholder="Add weekly task…"
              maxLength={80}
              aria-label="Weekly task name"
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
            <p className="weekly-panel__empty">No weekly tasks — add one when you need it.</p>
          ) : (
            <ul className="weekly-panel__list">
              {tasks.map((task) => (
                <li key={task.id} className="weekly-task">
                  <button
                    type="button"
                    className={`weekly-task__check${task.done ? ' weekly-task__check--done' : ''}`}
                    onClick={() => onToggle(task.id)}
                    aria-pressed={task.done}
                    aria-label={task.done ? `Mark "${task.name}" incomplete` : `Mark "${task.name}" complete`}
                  />
                  <span
                    className={`weekly-task__name${task.done ? ' weekly-task__name--done' : ''}`}
                  >
                    {task.name}
                  </span>
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
