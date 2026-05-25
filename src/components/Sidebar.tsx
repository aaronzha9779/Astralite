import { useRef, useState } from 'react'
import { formatMinutes } from '../lib/time'
import type { AccountSummary, UserProfile } from '../types'
import './Sidebar.css'

type SidebarProps = {
  profile: UserProfile
  accounts: AccountSummary[]
  activeAccountId: string
  onSwitchAccount: (accountId: string) => void
  onCreateAccount: (name: string, handle?: string) => void
  onExportSaveFile: () => string
  onImportSaveFile: (raw: string) => boolean
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function Sidebar({
  profile,
  accounts,
  activeAccountId,
  onSwitchAccount,
  onCreateAccount,
  onExportSaveFile,
  onImportSaveFile,
}: SidebarProps) {
  const [accountName, setAccountName] = useState('')
  const [accountHandle, setAccountHandle] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const progressPercent = Math.round(
    (profile.progressMinutes / profile.progressToNext) * 100,
  )

  function handleCreateAccount() {
    if (!accountName.trim()) return
    onCreateAccount(accountName, accountHandle)
    setAccountName('')
    setAccountHandle('')
  }

  function handleExport() {
    const payload = onExportSaveFile()
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const safeName = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'account'
    link.href = url
    link.download = `habitup-${safeName}-save.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function handleImportFile(file: File | null) {
    if (!file) return
    const raw = await file.text()
    const success = onImportSaveFile(raw)
    if (!success) {
      window.alert('That save file could not be loaded.')
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <aside className="sidebar">
      <div className="profile-card">
        <div className="profile-card__avatar" aria-hidden="true">
          {profile.avatarUrl ? (
            <img
              className="profile-card__avatar-img"
              src={profile.avatarUrl}
              alt=""
            />
          ) : (
            getInitials(profile.name)
          )}
        </div>
        <div className="profile-card__info">
          <h2 className="profile-card__name">{profile.name}</h2>
          <p className="profile-card__handle">{profile.handle}</p>
        </div>
        <div className="profile-card__rank">
          <span className="profile-card__rank-label">Rank</span>
          <span className="profile-card__rank-value">{profile.rank}</span>
        </div>
        <div className="profile-card__level">
          <span>Level {profile.level}</span>
          <span>
            {formatMinutes(profile.progressMinutes)} /{' '}
            {formatMinutes(profile.progressToNext)}
          </span>
        </div>
        <p className="profile-card__wallet">
          <span className="profile-card__xp">{profile.availableXp} XP</span> to spend ·{' '}
          {formatMinutes(profile.totalMinutes)} tracked · Lv {profile.level}
        </p>
        <div
          className="profile-card__xp-bar"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress to next level"
        >
          <div
            className="profile-card__xp-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="profile-card__section">
          <div className="profile-card__section-head">
            <span className="profile-card__section-label">Accounts</span>
            <span className="profile-card__section-meta">{accounts.length}</span>
          </div>
          <select
            className="profile-card__select"
            value={activeAccountId}
            onChange={(e) => onSwitchAccount(e.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.handle})
              </option>
            ))}
          </select>
          <div className="profile-card__form">
            <input
              className="profile-card__input"
              type="text"
              placeholder="New account name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
            <input
              className="profile-card__input"
              type="text"
              placeholder="Handle (optional)"
              value={accountHandle}
              onChange={(e) => setAccountHandle(e.target.value)}
            />
            <button
              type="button"
              className="profile-card__btn"
              onClick={handleCreateAccount}
              disabled={!accountName.trim()}
            >
              Create account
            </button>
          </div>
        </div>

        <div className="profile-card__section">
          <div className="profile-card__section-head">
            <span className="profile-card__section-label">Savefile</span>
          </div>
          <div className="profile-card__actions">
            <button
              type="button"
              className="profile-card__btn"
              onClick={handleExport}
            >
              Export savefile
            </button>
            <button
              type="button"
              className="profile-card__btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Load savefile
            </button>
          </div>
          <input
            ref={fileInputRef}
            className="profile-card__file"
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              void handleImportFile(file)
            }}
          />
        </div>
      </div>
    </aside>
  )
}
