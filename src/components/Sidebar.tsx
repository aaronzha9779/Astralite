import { useEffect, useRef, useState } from 'react'
import type { AccountSummary, UserProfile } from '../types'
import './Sidebar.css'

type ActiveProtocolTrackerItem = {
  id: string
  title: string
  thumbnailUrl: string | null
  thumbnailLabel: string
  currentTask: string
  completedSteps: number
  totalSteps: number
}

type SidebarProps = {
  profile: UserProfile
  accounts: AccountSummary[]
  activeProtocols: ActiveProtocolTrackerItem[]
  activeAccountId: string
  open: boolean
  onOpenChange: (open: boolean) => void
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
  activeProtocols,
  activeAccountId,
  open,
  onOpenChange,
  onSwitchAccount,
  onExportSaveFile,
  onImportSaveFile,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [xpPulse, setXpPulse] = useState(false)
  const prevLevelRef = useRef<number | null>(null)
  const progressPercent = Math.round(
    (profile.progressXp / profile.progressToNext) * 100,
  )

  useEffect(() => {
    if (prevLevelRef.current !== null && prevLevelRef.current !== profile.level) {
      setXpPulse(true)
      const timeoutId = window.setTimeout(() => setXpPulse(false), 700)
      prevLevelRef.current = profile.level
      return () => window.clearTimeout(timeoutId)
    }
    prevLevelRef.current = profile.level
    return undefined
  }, [profile.level])

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
        <button
          type="button"
          className="profile-card__toggle"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          title={open ? 'Minimize profile panel' : 'Expand profile panel'}
        >
          <div className="profile-card__toggle-copy">
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
          </div>
          <span className={`profile-card__toggle-icon${open ? ' profile-card__toggle-icon--open' : ''}`} aria-hidden="true">
            ▾
          </span>
        </button>

        {open ? (
          <>
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
              <span className="profile-card__xp">{profile.availableXp} UXP</span> ·{' '}
              {profile.totalXp} lifetime XP
            </p>
            <div className="profile-card__xp-meter">
              <div
                className="profile-card__xp-bar"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progress to next level"
              >
                <div
                  className={`profile-card__xp-fill${xpPulse ? ' profile-card__xp-fill--pulse' : ''}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
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
                      <span className="profile-card__account-badge" aria-label="Active account">
                        ★
                      </span>
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
          </>
        ) : null}
      </div>

      {activeProtocols.length > 0 ? (
        <section className="profile-card profile-card__tracker" aria-label="Current quests">
          <div className="profile-card__section-head">
            <span className="profile-card__section-label">ACTIVE QUESTS</span>
            <span className="profile-card__section-meta">{activeProtocols.length}</span>
          </div>
          <div className="profile-card__quests">
            {activeProtocols.map((quest) => (
              <article key={quest.id} className="profile-card__quest">
                <span className="profile-card__quest-progress">
                  {quest.completedSteps}/{quest.totalSteps}
                </span>
                <div className="profile-card__quest-thumb" aria-hidden="true">
                  {quest.thumbnailUrl ? (
                    <img className="profile-card__quest-thumb-img" src={quest.thumbnailUrl} alt="" />
                  ) : (
                    <span className="profile-card__quest-thumb-label">{quest.thumbnailLabel}</span>
                  )}
                </div>
                <div className="profile-card__quest-copy">
                  <p className="profile-card__quest-task">
                    <span className="profile-card__quest-title-row">
                      <span className="profile-card__quest-name">{quest.title}</span>
                    </span>
                    <span className="profile-card__quest-step">{quest.currentTask}</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  )
}
