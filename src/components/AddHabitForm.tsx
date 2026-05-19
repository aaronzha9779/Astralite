import { useState, type FormEvent } from 'react'
import './AddHabitForm.css'

type AddHabitFormProps = {
  onAdd: (name: string) => void
  placeholder?: string
  compact?: boolean
}

export function AddHabitForm({
  onAdd,
  placeholder = 'New task…',
  compact = false,
}: AddHabitFormProps) {
  const [name, setName] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setName('')
  }

  return (
    <form
      className={`add-habit${compact ? ' add-habit--compact' : ''}`}
      onSubmit={handleSubmit}
    >
      <input
        className="add-habit__input"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        maxLength={80}
        aria-label="Task name"
      />
      <button className="add-habit__btn" type="submit" disabled={!name.trim()}>
        Add
      </button>
    </form>
  )
}
