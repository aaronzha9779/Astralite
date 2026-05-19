import { useState } from 'react'
import { rewards } from '../data/rewards'
import type { PurchasedReward, UserProfile } from '../types'
import './Shop.css'

type ShopProps = {
  profile: UserProfile
  purchasedRewards: PurchasedReward[]
  onPurchase: (rewardId: string) => boolean
}

export function Shop({ profile, purchasedRewards, onPurchase }: ShopProps) {
  const [message, setMessage] = useState<string | null>(null)

  function handlePurchase(rewardId: string) {
    const ok = onPurchase(rewardId)
    const reward = rewards.find((r) => r.id === rewardId)
    if (ok && reward) {
      setMessage(`Purchased ${reward.name}!`)
    } else if (!ok && reward) {
      const owned =
        reward.oneTime &&
        purchasedRewards.some((p) => p.rewardId === rewardId)
      setMessage(
        owned
          ? 'You already own this reward.'
          : 'Not enough XP to purchase.',
      )
    }
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <main className="dashboard shop">
      <header className="dashboard__header">
        <h1 className="dashboard__title">Rewards Shop</h1>
        <p className="dashboard__subtitle">
          Spend XP on perks and cosmetics ·{' '}
          <strong className="shop__balance">{profile.availableXp} XP</strong>{' '}
          available
        </p>
      </header>

      {message && (
        <p className="shop__toast" role="status">
          {message}
        </p>
      )}

      <ul className="shop__grid">
        {rewards.map((reward) => {
          const owned =
            reward.oneTime &&
            purchasedRewards.some((p) => p.rewardId === reward.id)
          const canAfford = profile.availableXp >= reward.cost

          return (
            <li key={reward.id} className="shop__card">
              <span className="shop__emoji" aria-hidden="true">
                {reward.emoji}
              </span>
              <div className="shop__info">
                <h2 className="shop__name">{reward.name}</h2>
                <p className="shop__desc">{reward.description}</p>
              </div>
              <div className="shop__footer">
                <span className="shop__cost">{reward.cost} XP</span>
                <button
                  type="button"
                  className="shop__buy"
                  disabled={owned || !canAfford}
                  onClick={() => handlePurchase(reward.id)}
                >
                  {owned ? 'Owned' : canAfford ? 'Buy' : 'Need more XP'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
