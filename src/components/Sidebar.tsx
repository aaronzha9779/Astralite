import { useRef } from 'react'
import { formatMinutes } from '../lib/time'
import type { AccountSummary, UserProfile } from '../types'
import './Sidebar.css'

type SidebarProps = {
  profile: UserProfile
  accounts: AccountSummary[]
  activeAccountId: string
  onSwitchAccount: (accountId: string) => void
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
  onExportSaveFile,
  onImportSaveFile,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const progressPercent = Math.round(
    (profile.progressXp / profile.progressToNext) * 100,
  )

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
          <span className="profile-card__rank-value">
            {profile.rankImageUrl ? (
              <img className="profile-card__rank-image" src={profile.rankImageUrl} alt="" />
            ) : null}
            {profile.rank}
          </span>
        </div>
        <div className="profile-card__level">
          <span>Level {profile.level}</span>
          <span>
            {profile.progressXp} / {profile.progressToNext} XP
          </span>
        </div>
        <p className="profile-card__wallet">
          <span className="profile-card__xp">{profile.availableXp} shop XP</span> ·{' '}
          {formatMinutes(profile.totalMinutes)} tracked · {profile.totalXp} lifetime XP
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
          <div className="profile-card__accounts">
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                className={`profile-card__account${account.id === activeAccountId ? ' profile-card__account--active' : ''}`}
                onClick={() => onSwitchAccount(account.id)}
              >
                <span className="profile-card__account-avatar" aria-hidden="true">
                  {account.avatarUrl ? (
                    <img className="profile-card__account-avatar-img" src={account.avatarUrl} alt="" />
                  ) : (
                    getInitials(account.name)
                  )}
                </span>
                <span className="profile-card__account-copy">
                  <span className="profile-card__account-name">{account.name}</span>
                  <span className="profile-card__account-handle">{account.handle}</span>
                </span>
                {account.id === activeAccountId ? (
                  <span className="profile-card__account-badge">Active</span>
                ) : null}
              </button>
            ))}
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
