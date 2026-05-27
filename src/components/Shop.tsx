import { useMemo, useRef, useState } from 'react'
import { playReward } from '../lib/audio'
import type { PurchasedReward, Reward, UserProfile } from '../types'
import './Shop.css'

type PurchaseResult = 'success' | 'owned' | 'insufficient' | 'missing'
type DailySpinResult =
  | { kind: 'uxp'; amount: number }
  | { kind: 'reward'; rewardId: string; rewardName: string }
  | { kind: 'used' }
  | { kind: 'empty' }

type ShopProps = {
  profile: UserProfile
  rewards: Reward[]
  purchasedRewards: PurchasedReward[]
  dailySpinUsed: boolean
  dailySpinOptions: {
    uxp: number[]
    rewards: Reward[]
  }
  onPurchase: (rewardId: string) => PurchaseResult
  onSpinDaily: () => DailySpinResult
  onAddReward: (reward: Omit<Reward, 'id'>) => void
  onUpdateReward: (rewardId: string, patch: Partial<Omit<Reward, 'id'>>) => void
  onRemoveReward: (rewardId: string) => void
  onReorderReward: (draggedId: string, targetId: string) => void
}

const EMPTY_REWARD: Omit<Reward, 'id'> = {
  name: '',
  description: '',
  cost: 50,
  emoji: '🎁',
  imageUrl: null,
  oneTime: false,
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function Shop({
  profile,
  rewards,
  purchasedRewards,
  dailySpinUsed,
  dailySpinOptions,
  onPurchase,
  onSpinDaily,
  onAddReward,
  onUpdateReward,
  onRemoveReward,
  onReorderReward,
}: ShopProps) {
  const [message, setMessage] = useState<string | null>(null)
  const [draft, setDraft] = useState<Omit<Reward, 'id'>>(EMPTY_REWARD)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [sparkleId, setSparkleId] = useState<string | null>(null)
  const [purchaseFlashId, setPurchaseFlashId] = useState<string | null>(null)
  const [balancePulse, setBalancePulse] = useState(false)
  const [spinOpen, setSpinOpen] = useState(false)
  const [spinRotation, setSpinRotation] = useState(0)
  const [spinResult, setSpinResult] = useState<DailySpinResult | null>(null)
  const [spinSpinning, setSpinSpinning] = useState(false)
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(
    rewards[0]?.id ?? null,
  )
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const selectedReward = useMemo(
    () => rewards.find((reward) => reward.id === selectedRewardId) ?? rewards[0] ?? null,
    [rewards, selectedRewardId],
  )
  const selectedOwned =
    !!selectedReward &&
    selectedReward.oneTime &&
    purchasedRewards.some((purchase) => purchase.rewardId === selectedReward.id)
  const selectedCanAfford = !!selectedReward && profile.availableXp >= selectedReward.cost
  const selectedProgress = selectedReward
    ? Math.min(
        100,
        Math.round((profile.availableXp / Math.max(1, selectedReward.cost)) * 100),
      )
    : 0
  const wheelOptions = useMemo(
    () => [
      ...dailySpinOptions.uxp.map((amount) => ({
        id: `uxp-${amount}`,
        label: `${amount} UXP`,
      })),
      ...dailySpinOptions.rewards.map((reward) => ({
        id: reward.id,
        label: reward.name,
      })),
    ],
    [dailySpinOptions.rewards, dailySpinOptions.uxp],
  )

  function showMessage(next: string) {
    setMessage(next)
    setTimeout(() => setMessage(null), 3000)
  }

  function loadRewardIntoEditor(reward: Reward) {
    setSelectedRewardId(reward.id)
    setEditingId(reward.id)
    setDraft({
      name: reward.name,
      description: reward.description,
      cost: reward.cost,
      emoji: reward.emoji,
      imageUrl: reward.imageUrl ?? null,
      oneTime: reward.oneTime,
    })
  }

  function resetEditor() {
    setEditingId(null)
    setDraft(EMPTY_REWARD)
  }

  function handlePurchase(rewardId: string) {
    const result = onPurchase(rewardId)
    const reward = rewards.find((item) => item.id === rewardId)
    if (!reward) return

    if (result === 'success') {
      playReward()
      setSparkleId(rewardId)
      setPurchaseFlashId(rewardId)
      setBalancePulse(true)
      setTimeout(() => setSparkleId(null), 1100)
      setTimeout(() => setPurchaseFlashId(null), 1400)
      setTimeout(() => setBalancePulse(false), 700)
      showMessage(`Purchased ${reward.name}!`)
    } else if (result === 'owned') {
      showMessage('You already own this reward.')
    } else if (result === 'insufficient') {
      showMessage('Not enough UXP to purchase.')
    }
  }

  function handleSpin() {
    if (spinSpinning || dailySpinUsed || wheelOptions.length === 0) return
    setSpinResult(null)
    setSpinSpinning(true)
    setSpinRotation((value) => value + 1080 + Math.floor(Math.random() * 360))

    window.setTimeout(() => {
      const result = onSpinDaily()
      setSpinResult(result)
      setSpinSpinning(false)

      if (result.kind === 'uxp') {
        playReward()
        setBalancePulse(true)
        window.setTimeout(() => setBalancePulse(false), 700)
        showMessage(`Daily spin won ${result.amount} UXP.`)
      } else if (result.kind === 'reward') {
        playReward()
        setSparkleId(result.rewardId)
        window.setTimeout(() => setSparkleId(null), 1100)
        showMessage(`Daily spin unlocked ${result.rewardName}.`)
      } else if (result.kind === 'used') {
        showMessage('Daily spin already used today.')
      } else {
        showMessage('Add daily spin items in settings first.')
      }
    }, 1400)
  }

  function handleSaveReward() {
    if (!draft.name.trim() || !draft.description.trim()) return

    if (editingId) {
      onUpdateReward(editingId, draft)
      showMessage(`Updated ${draft.name.trim()}.`)
    } else {
      onAddReward(draft)
      showMessage(`Added ${draft.name.trim()} to the shop.`)
    }

    resetEditor()
  }

  async function handleImageUpload(file: File | null) {
    if (!file) return
    const imageUrl = await readFileAsDataUrl(file)
    setDraft((prev) => ({ ...prev, imageUrl }))
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  return (
    <main className="dashboard shop">
      <header className="dashboard__header">
        <div className="shop__hero-head">
          <div>
            <h1 className="dashboard__title">Rewards Shop</h1>
            <p className="dashboard__subtitle">
              Spend UXP on perks and cosmetics and drag cards to change their order.{' '}
              <strong className={`shop__balance${balancePulse ? ' shop__balance--pulse' : ''}`}>{profile.availableXp} UXP</strong>{' '}
              available
            </p>
          </div>
          <button
            type="button"
            className="shop__spin-trigger"
            onClick={() => setSpinOpen(true)}
          >
            <span className="shop__spin-wheel" aria-hidden="true">◔</span>
            <span>{dailySpinUsed ? 'Spin used' : 'Daily spin'}</span>
          </button>
        </div>
      </header>

      {message ? (
        <p className="shop__toast" role="status">
          {message}
        </p>
      ) : null}

      {selectedReward ? (
        <section
          className={`shop__spotlight${purchaseFlashId === selectedReward.id ? ' shop__spotlight--success' : ''}`}
          aria-label="Selected reward"
        >
          {purchaseFlashId === selectedReward.id ? (
            <div className="shop__particles" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, index) => (
                <span
                  key={index}
                  className="shop__particle"
                  style={{ ['--particle-index' as string]: String(index) }}
                />
              ))}
            </div>
          ) : null}
          <div className="shop__spotlight-symbol">
            {selectedReward.imageUrl ? (
              <img className="shop__symbol-img" src={selectedReward.imageUrl} alt="" />
            ) : (
              <span className="shop__emoji" aria-hidden="true">
                {selectedReward.emoji}
              </span>
            )}
          </div>
          <div className="shop__spotlight-copy">
            <p className="shop__spotlight-kicker">Selected reward</p>
            <h2 className="shop__spotlight-title">{selectedReward.name}</h2>
            <p className="shop__spotlight-desc">{selectedReward.description}</p>
            <div className="shop__spotlight-meta">
              <span>{selectedReward.cost} UXP</span>
              <span>{selectedReward.oneTime ? 'One-time unlock' : 'Repeatable reward'}</span>
            </div>
            <div className="shop__spotlight-progress" aria-hidden="true">
              <span
                className="shop__spotlight-progress-fill"
                style={{ width: `${selectedProgress}%` }}
              />
            </div>
            <p className={`shop__spotlight-hint${purchaseFlashId === selectedReward.id ? ' shop__spotlight-hint--success' : ''}`}>
              {purchaseFlashId === selectedReward.id
                ? `${selectedReward.name} unlocked successfully.`
                : selectedOwned
                ? 'Already unlocked on this account.'
                : selectedCanAfford
                  ? 'You can afford this right now.'
                  : `${Math.max(0, selectedReward.cost - profile.availableXp)} UXP more to go.`}
            </p>
          </div>
          <div className="shop__spotlight-actions">
            <button
              type="button"
              className={`shop__buy${purchaseFlashId === selectedReward.id ? ' shop__buy--success' : ''}`}
              disabled={selectedOwned || !selectedCanAfford}
              onClick={() => handlePurchase(selectedReward.id)}
            >
              {purchaseFlashId === selectedReward.id
                ? 'Purchased!'
                : selectedOwned
                  ? 'Owned'
                  : selectedCanAfford
                    ? 'Buy reward'
                    : 'Need more UXP'}
            </button>
            <button
              type="button"
              className="shop__edit"
              onClick={() => loadRewardIntoEditor(selectedReward)}
            >
              Edit selected
            </button>
          </div>
        </section>
      ) : null}

      <ul className="shop__grid">
        {rewards.map((reward) => {
          const owned =
            reward.oneTime &&
            purchasedRewards.some((purchase) => purchase.rewardId === reward.id)
          const canAfford = profile.availableXp >= reward.cost

          return (
            <li
              key={reward.id}
              className={`shop__card${draggedId === reward.id ? ' shop__card--dragging' : ''}${sparkleId === reward.id ? ' shop__card--sparkle' : ''}${selectedRewardId === reward.id ? ' shop__card--selected' : ''}`}
              draggable
              onClick={() => setSelectedRewardId(reward.id)}
              onDragStart={() => setDraggedId(reward.id)}
              onDragEnd={() => setDraggedId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!draggedId) return
                onReorderReward(draggedId, reward.id)
                setDraggedId(null)
              }}
            >
              <div className="shop__card-top">
                <span className="shop__drag" aria-hidden="true">
                  ⋮⋮
                </span>
                {reward.imageUrl ? (
                  <img className="shop__symbol-img" src={reward.imageUrl} alt="" />
                ) : (
                  <span className="shop__emoji" aria-hidden="true">
                    {reward.emoji}
                  </span>
                )}
              </div>
              <div className="shop__info">
                <h2 className="shop__name">{reward.name}</h2>
                <p className="shop__desc">{reward.description}</p>
              </div>
              <div className="shop__meta">
                <span className="shop__cost">{reward.cost} UXP</span>
                <span className="shop__type">
                  {reward.oneTime ? 'One-time' : 'Repeatable'}
                </span>
              </div>
              <div className="shop__footer">
                <div className="shop__footer-actions">
                  <button
                    type="button"
                    className="shop__edit"
                    onClick={(e) => {
                      e.stopPropagation()
                      loadRewardIntoEditor(reward)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="shop__delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (editingId === reward.id) resetEditor()
                      onRemoveReward(reward.id)
                    }}
                  >
                    Delete
                  </button>
                </div>
                <button
                  type="button"
                  className="shop__buy"
                  disabled={owned || !canAfford}
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePurchase(reward.id)
                  }}
                >
                  {owned ? 'Owned' : canAfford ? 'Buy' : 'Need more UXP'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {spinOpen ? (
        <div className="shop__spin-modal" role="dialog" aria-modal="true" aria-label="Daily spin">
          <div className="shop__spin-card">
            <div className="shop__editor-head">
              <div>
                <h2 className="dashboard__section-title">Daily spin</h2>
                <p className="shop__editor-hint">
                  One spin per day. Set the wheel prizes in settings.
                </p>
              </div>
              <button type="button" className="shop__edit" onClick={() => setSpinOpen(false)}>
                Close
              </button>
            </div>

            <div className="shop__wheel-wrap">
              <div
                className={`shop__wheel${spinSpinning ? ' shop__wheel--spinning' : ''}`}
                style={{ transform: `rotate(${spinRotation}deg)` }}
              >
                {wheelOptions.length > 0 ? (
                  wheelOptions.map((option, index) => (
                    <span
                      key={option.id}
                      className="shop__wheel-slice"
                      style={{
                        ['--slice-index' as string]: String(index),
                        ['--slice-count' as string]: String(wheelOptions.length),
                      }}
                    >
                      {option.label}
                    </span>
                  ))
                ) : (
                  <span className="shop__wheel-empty">No spin items configured</span>
                )}
              </div>
              <span className="shop__wheel-pointer" aria-hidden="true">▲</span>
            </div>

            {spinResult ? (
              <p className="shop__spin-result">
                {spinResult.kind === 'uxp'
                  ? `Won ${spinResult.amount} UXP`
                  : spinResult.kind === 'reward'
                    ? `Unlocked ${spinResult.rewardName}`
                    : spinResult.kind === 'used'
                      ? 'You already used today’s spin.'
                      : 'No spin items are set yet.'}
              </p>
            ) : null}

            <button
              type="button"
              className="shop__buy shop__buy--success shop__buy--spin"
              disabled={dailySpinUsed || spinSpinning || wheelOptions.length === 0}
              onClick={handleSpin}
            >
              {dailySpinUsed ? 'Come back tomorrow' : spinSpinning ? 'Spinning…' : 'Spin once'}
            </button>
          </div>
        </div>
      ) : null}

      <section className="shop__editor" aria-label="Reward editor">
        <div className="shop__editor-head">
          <div>
            <h2 className="dashboard__section-title">
              {editingId ? 'Edit reward' : 'Add reward'}
            </h2>
            <p className="shop__editor-hint">
              One editor for both creation and editing, with a live preview while you type.
            </p>
          </div>
          {editingId ? (
            <button type="button" className="shop__edit" onClick={resetEditor}>
              New reward
            </button>
          ) : null}
        </div>

        <div className="shop__editor-grid">
          <div className="shop__symbol-panel">
            <div className="shop__symbol-preview">
              {draft.imageUrl ? (
                <img className="shop__symbol-img" src={draft.imageUrl} alt="" />
              ) : (
                <span className="shop__emoji" aria-hidden="true">
                  {draft.emoji || '🎁'}
                </span>
              )}
            </div>
            <div className="shop__symbol-actions">
              <label className="shop__field">
                <span>Fallback text symbol</span>
                <input
                  className="shop__input shop__input--symbol"
                  type="text"
                  maxLength={4}
                  value={draft.emoji}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, emoji: e.target.value }))
                  }
                />
              </label>
              <div className="shop__upload-actions">
                <button
                  type="button"
                  className="shop__save"
                  onClick={() => imageInputRef.current?.click()}
                >
                  Upload image
                </button>
                <button
                  type="button"
                  className="shop__delete"
                  onClick={() => setDraft((prev) => ({ ...prev, imageUrl: null }))}
                >
                  Clear image
                </button>
              </div>
              <input
                ref={imageInputRef}
                className="shop__file"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  void handleImageUpload(file)
                }}
              />
            </div>
          </div>

          <div className="shop__live-preview">
            <p className="shop__spotlight-kicker">Live preview</p>
            <article className="shop__preview-card">
              {draft.imageUrl ? (
                <img className="shop__symbol-img" src={draft.imageUrl} alt="" />
              ) : (
                <span className="shop__emoji" aria-hidden="true">
                  {draft.emoji || '🎁'}
                </span>
              )}
              <div className="shop__info">
                <h3 className="shop__name">{draft.name || 'Reward name'}</h3>
                <p className="shop__desc">
                  {draft.description || 'Reward description will preview here as you type.'}
                </p>
              </div>
              <div className="shop__meta">
                <span className="shop__cost">{draft.cost} UXP</span>
                <span className="shop__type">
                  {draft.oneTime ? 'One-time' : 'Repeatable'}
                </span>
              </div>
            </article>
          </div>

          <label className="shop__field">
            <span>Name</span>
            <input
              className="shop__input"
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            />
          </label>
          <label className="shop__field shop__field--wide">
            <span>Description</span>
            <textarea
              className="shop__input shop__input--textarea"
              rows={3}
              value={draft.description}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </label>
          <label className="shop__field">
            <span>UXP cost</span>
            <input
              className="shop__input"
              type="number"
              min={0}
              value={draft.cost}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, cost: Number(e.target.value) || 0 }))
              }
            />
          </label>
          <label className="shop__checkbox">
            <input
              type="checkbox"
              checked={draft.oneTime}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, oneTime: e.target.checked }))
              }
            />
            One-time reward
          </label>
        </div>

        <div className="shop__editor-actions">
          <button
            type="button"
            className="shop__save"
            onClick={handleSaveReward}
            disabled={!draft.name.trim() || !draft.description.trim()}
          >
            {editingId ? 'Save reward' : 'Add reward'}
          </button>
          <button type="button" className="shop__edit" onClick={resetEditor}>
            Clear editor
          </button>
        </div>
      </section>
    </main>
  )
}
