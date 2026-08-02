import { useEffect, useMemo, useState } from 'react'
import type { GoalGroup } from '../types'
import './ManualGoalProgressLog.css'

type ManualGoalProgressLogProps = {
  goalGroups: GoalGroup[]
  onLog: (goalId: string, amount: number) => void
}

function formatGoalLabel(groupName: string, goalName: string, target: number) {
  return `${groupName} · ${goalName} (target ${target})`
}

export function ManualGoalProgressLog({ goalGroups, onLog }: ManualGoalProgressLogProps) {
  const goals = useMemo(
    () =>
      goalGroups.flatMap((group) =>
        group.goals.map((goal) => ({
          goal,
          groupName: group.name,
          label: formatGoalLabel(group.name, goal.name, goal.target),
        })),
      ),
    [goalGroups],
  )
  const [goalId, setGoalId] = useState(goals[0]?.goal.id ?? '')
  const [amount, setAmount] = useState('5')
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (goals.length === 0) return
    if (goals.some((entry) => entry.goal.id === goalId)) return
    setGoalId(goals[0].goal.id)
  }, [goalId, goals])

  if (goals.length === 0) {
    return (
      <p className="manual-goal-progress-log__empty">
        Add goals first, then log progress here when a goal needs more than a single +1.
      </p>
    )
  }

  function handleSubmit() {
    const numericAmount = Math.round(Number(amount))
    if (!goalId || numericAmount <= 0) return

    const selectedGoal = goals.find((entry) => entry.goal.id === goalId)
    onLog(goalId, numericAmount)
    setFeedback(
      selectedGoal
        ? `+${numericAmount} progress on ${selectedGoal.goal.name}`
        : `+${numericAmount} progress`,
    )
    setTimeout(() => setFeedback(null), 3500)
  }

  return (
    <section className="manual-goal-progress-log" aria-label="Log goal progress">
      <h3 className="manual-goal-progress-log__title">Log goal progress</h3>
      <p className="manual-goal-progress-log__subtitle">
        Backfill a goal with any amount of progress instead of tapping +1 over and over.
      </p>

      <div className="manual-goal-progress-log__row">
        <label className="manual-goal-progress-log__field">
          <span>Goal</span>
          <select
            className="manual-goal-progress-log__select"
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
          >
            {goals.map((entry) => (
              <option key={entry.goal.id} value={entry.goal.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <label className="manual-goal-progress-log__field manual-goal-progress-log__field--short">
          <span>Amount</span>
          <input
            type="number"
            className="manual-goal-progress-log__input"
            min={1}
            max={1000}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <button
          type="button"
          className="manual-goal-progress-log__btn"
          onClick={handleSubmit}
        >
          Add progress
        </button>
      </div>

      {feedback ? (
        <p className="manual-goal-progress-log__feedback" role="status">
          {feedback}
        </p>
      ) : null}
    </section>
  )
}
