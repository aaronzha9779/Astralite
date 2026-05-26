import { useEffect, useMemo, useRef, useState } from 'react'
import type { AccountSummary, AppPreferences, RankTier, UserProfile } from '../types'
import './SettingsPage.css'

type SettingsPageProps = {
  profile: UserProfile
  accounts: AccountSummary[]
  activeAccountId: string
  preferences: AppPreferences
  onUpdateProfile: (patch: {
    name?: string
    handle?: string
    avatarUrl?: string | null
    accentColor?: string
    streakSymbolImageUrl?: string | null
  }) => void
  onCreateAccount: (name: string, handle?: string) => void
  onDeleteAccount: (accountId: string) => void
  onUpdatePreferences: (patch: Partial<AppPreferences>) => void
  onSoftReset: () => void
  onFullReset: () => void
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function SettingsPage({
  profile,
  accounts,
  activeAccountId,
  preferences,
  onUpdateProfile,
  onCreateAccount,
  onDeleteAccount,
  onUpdatePreferences,
  onSoftReset,
  onFullReset,
}: SettingsPageProps) {
  const [name, setName] = useState(profile.name)
  const [handle, setHandle] = useState(profile.handle)
  const [accentColor, setAccentColor] = useState(profile.accentColor)
  const [accountName, setAccountName] = useState('')
  const [accountHandle, setAccountHandle] = useState('')
  const [accountDeleteId, setAccountDeleteId] = useState<string | null>(null)
  const [accountDeletePhrase, setAccountDeletePhrase] = useState('')
  const [softResetPhrase, setSoftResetPhrase] = useState('')
  const [resetPhrase, setResetPhrase] = useState('')
  const [levelUpXp, setLevelUpXp] = useState(String(preferences.levelUpXp))
  const [ranks, setRanks] = useState<RankTier[]>(preferences.ranks)
  const [draggedRankId, setDraggedRankId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const streakInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setName(profile.name)
    setHandle(profile.handle)
    setAccentColor(profile.accentColor)
  }, [profile])

  useEffect(() => {
    setLevelUpXp(String(preferences.levelUpXp))
    setRanks(preferences.ranks)
  }, [preferences.levelUpXp, preferences.ranks])

  const canReset = resetPhrase === 'DELETE'
  const accentPreview = useMemo(
    () => (/^#(?:[0-9a-fA-F]{6})$/.test(accentColor) ? accentColor : '#a3e635'),
    [accentColor],
  )

  function showMessage(next: string) {
    setMessage(next)
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleAvatarUpload(file: File | null) {
    if (!file) return
    const dataUrl = await readFileAsDataUrl(file)
    onUpdateProfile({ avatarUrl: dataUrl })
    showMessage('Profile picture updated.')
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  async function handleStreakUpload(file: File | null) {
    if (!file) return
    const dataUrl = await readFileAsDataUrl(file)
    onUpdateProfile({ streakSymbolImageUrl: dataUrl })
    showMessage('Streak symbol image updated.')
    if (streakInputRef.current) streakInputRef.current.value = ''
  }

  function handleCreateAccount() {
    if (!accountName.trim()) return
    onCreateAccount(accountName, accountHandle)
    setAccountName('')
    setAccountHandle('')
    showMessage('New account created.')
  }

  function formatUpdatedAt(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  async function handleRankImageUpload(rankId: string, file: File | null) {
    if (!file) return
    const dataUrl = await readFileAsDataUrl(file)
    setRanks((prev) =>
      prev.map((rank) =>
        rank.id === rankId ? { ...rank, imageUrl: dataUrl } : rank,
      ),
    )
  }

  function updateRank(rankId: string, patch: Partial<RankTier>) {
    setRanks((prev) =>
      prev.map((rank) => (rank.id === rankId ? { ...rank, ...patch } : rank)),
    )
  }

  function addRank() {
    setRanks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: `Rank ${prev.length + 1}`,
        minLevel: prev.at(-1)?.minLevel ? prev.at(-1)!.minLevel + 2 : 1,
        imageUrl: null,
      },
    ])
  }

  function removeRank(rankId: string) {
    setRanks((prev) => (prev.length <= 1 ? prev : prev.filter((rank) => rank.id !== rankId)))
  }

  function saveProgression() {
    onUpdatePreferences({
      levelUpXp: Math.max(25, Number(levelUpXp) || preferences.levelUpXp),
      ranks,
    })
    showMessage('Level thresholds and ranks updated.')
  }

  return (
    <main className="dashboard settings-page">
      <header className="dashboard__header">
        <h1 className="dashboard__title">Settings</h1>
        <p className="dashboard__subtitle">
          Update your profile, tune the app accent, and manage destructive actions safely.
        </p>
      </header>

      {message ? (
        <p className="settings-page__toast" role="status">
          {message}
        </p>
      ) : null}

      <section className="settings-page__card">
        <div className="settings-page__section-head">
          <h2 className="dashboard__section-title">Profile</h2>
          <p className="settings-page__hint">
            Change the displayed username, handle, and profile picture for this account.
          </p>
        </div>

        <div className="settings-page__profile">
          <div className="settings-page__avatar">
            {profile.avatarUrl ? (
              <img
                className="settings-page__avatar-img"
                src={profile.avatarUrl}
                alt={`${profile.name} avatar`}
              />
            ) : (
              <span>{profile.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="settings-page__profile-actions">
            <button
              type="button"
              className="settings-page__btn"
              onClick={() => avatarInputRef.current?.click()}
            >
              Upload profile pic
            </button>
            <button
              type="button"
              className="settings-page__btn"
              onClick={() => {
                onUpdateProfile({ avatarUrl: null })
                showMessage('Profile picture removed.')
              }}
            >
              Remove photo
            </button>
            <input
              ref={avatarInputRef}
              className="settings-page__file"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                void handleAvatarUpload(file)
              }}
            />
          </div>
        </div>

        <div className="settings-page__grid">
          <label className="settings-page__field">
            <span>Username</span>
            <input
              className="settings-page__input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="settings-page__field">
            <span>Handle</span>
            <input
              className="settings-page__input"
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </label>
        </div>

        <button
          type="button"
          className="settings-page__save"
          onClick={() => {
            onUpdateProfile({ name, handle })
            showMessage('Profile details saved.')
          }}
        >
          Save profile
        </button>
      </section>

      <section className="settings-page__card">
        <div className="settings-page__section-head">
          <h2 className="dashboard__section-title">Accounts</h2>
          <p className="settings-page__hint">
            Create another profile here while keeping account switching in the sidebar.
          </p>
        </div>

        <div className="settings-page__grid">
          <label className="settings-page__field">
            <span>Account name</span>
            <input
              className="settings-page__input"
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </label>
          <label className="settings-page__field">
            <span>Handle</span>
            <input
              className="settings-page__input"
              type="text"
              value={accountHandle}
              onChange={(e) => setAccountHandle(e.target.value)}
              placeholder="@optional"
            />
          </label>
        </div>

        <p className="settings-page__hint">
          {accounts.length} account{accounts.length === 1 ? '' : 's'} total.
        </p>

        <button
          type="button"
          className="settings-page__save"
          disabled={!accountName.trim()}
          onClick={handleCreateAccount}
        >
          Create account
        </button>

        <div className="settings-page__account-list">
          {accounts.map((account) => (
            <article
              key={account.id}
              className={`settings-page__account-card${account.id === activeAccountId ? ' settings-page__account-card--active' : ''}`}
            >
              <div>
                <h3 className="settings-page__account-name">{account.name}</h3>
                <p className="settings-page__account-handle">{account.handle}</p>
                <p className="settings-page__account-meta">
                  Last updated {formatUpdatedAt(account.lastUpdatedAt)}
                </p>
              </div>
              <div className="settings-page__account-actions">
                {account.id === activeAccountId ? (
                  <span className="settings-page__account-badge">Active</span>
                ) : null}
                <button
                  type="button"
                  className="settings-page__btn settings-page__btn--danger"
                  disabled={accounts.length <= 1}
                  onClick={() =>
                    setAccountDeleteId((current) =>
                      current === account.id ? null : account.id,
                    )
                  }
                >
                  Delete profile
                </button>
              </div>
              {accountDeleteId === account.id ? (
                <div className="settings-page__account-delete">
                  <label className="settings-page__field">
                    <span>Type DELETE to unlock profile removal</span>
                    <input
                      className="settings-page__input"
                      type="text"
                      value={accountDeletePhrase}
                      onChange={(e) => setAccountDeletePhrase(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="settings-page__save settings-page__save--danger"
                    disabled={accountDeletePhrase !== 'DELETE' || accounts.length <= 1}
                    onClick={() => {
                      onDeleteAccount(account.id)
                      setAccountDeleteId(null)
                      setAccountDeletePhrase('')
                      showMessage(`${account.name} was deleted.`)
                    }}
                  >
                    Confirm delete
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="settings-page__card">
        <div className="settings-page__section-head">
          <h2 className="dashboard__section-title">Streak symbol</h2>
          <p className="settings-page__hint">
            Upload a PNG for streaks under 31 days, or fall back to the default emoji.
          </p>
        </div>

        <div className="settings-page__streak-row">
          <div className="settings-page__streak-preview">
            {profile.streakSymbolImageUrl ? (
              <img
                className="settings-page__streak-img"
                src={profile.streakSymbolImageUrl}
                alt="Current streak symbol"
              />
            ) : (
              <span className="settings-page__streak-emoji" aria-hidden="true">
                {profile.streakSymbol}
              </span>
            )}
          </div>
          <div className="settings-page__profile-actions">
            <button
              type="button"
              className="settings-page__btn"
              onClick={() => streakInputRef.current?.click()}
            >
              Upload streak PNG
            </button>
            <button
              type="button"
              className="settings-page__btn"
              onClick={() => {
                onUpdateProfile({ streakSymbolImageUrl: null })
                showMessage('Streak symbol image removed.')
              }}
            >
              Use emoji fallback
            </button>
            <input
              ref={streakInputRef}
              className="settings-page__file"
              type="file"
              accept="image/png"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                void handleStreakUpload(file)
              }}
            />
          </div>
        </div>
      </section>

      <section className="settings-page__card">
        <div className="settings-page__section-head">
          <h2 className="dashboard__section-title">Progression</h2>
          <p className="settings-page__hint">
            Tune how much XP each level needs, reorder ranks, and upload PNG rank badges.
          </p>
        </div>

        <label className="settings-page__field settings-page__field--threshold">
          <span>XP needed per level</span>
          <input
            className="settings-page__input"
            type="number"
            min={25}
            step={5}
            value={levelUpXp}
            onChange={(e) => setLevelUpXp(e.target.value)}
          />
        </label>

        <div className="settings-page__rank-list">
          {ranks.map((rank) => (
            <article
              key={rank.id}
              className={`settings-page__rank-card${draggedRankId === rank.id ? ' settings-page__rank-card--dragging' : ''}`}
              draggable
              onDragStart={() => setDraggedRankId(rank.id)}
              onDragEnd={() => setDraggedRankId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!draggedRankId || draggedRankId === rank.id) return
                setRanks((prev) => {
                  const from = prev.findIndex((item) => item.id === draggedRankId)
                  const to = prev.findIndex((item) => item.id === rank.id)
                  if (from === -1 || to === -1) return prev
                  const next = [...prev]
                  const [moved] = next.splice(from, 1)
                  next.splice(to, 0, moved)
                  return next
                })
                setDraggedRankId(null)
              }}
            >
              <div className="settings-page__rank-head">
                <span className="settings-page__rank-drag" aria-hidden="true">
                  ⋮⋮
                </span>
                <div className="settings-page__rank-preview">
                  {rank.imageUrl ? (
                    <img
                      className="settings-page__rank-preview-img"
                      src={rank.imageUrl}
                      alt=""
                    />
                  ) : (
                    <span className="settings-page__rank-preview-fallback">
                      {rank.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <strong>{rank.name}</strong>
                  <p className="settings-page__hint">Unlocks at level {rank.minLevel}</p>
                </div>
              </div>

              <div className="settings-page__grid">
                <label className="settings-page__field">
                  <span>Rank name</span>
                  <input
                    className="settings-page__input"
                    type="text"
                    value={rank.name}
                    onChange={(e) => updateRank(rank.id, { name: e.target.value })}
                  />
                </label>
                <label className="settings-page__field">
                  <span>Starts at level</span>
                  <input
                    className="settings-page__input"
                    type="number"
                    min={1}
                    step={1}
                    value={rank.minLevel}
                    onChange={(e) =>
                      updateRank(rank.id, {
                        minLevel: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                </label>
              </div>

              <div className="settings-page__profile-actions">
                <label className="settings-page__btn settings-page__btn--file">
                  Upload PNG
                  <input
                    className="settings-page__file"
                    type="file"
                    accept="image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      void handleRankImageUpload(rank.id, file)
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="settings-page__btn"
                  onClick={() => updateRank(rank.id, { imageUrl: null })}
                >
                  Clear badge
                </button>
                <button
                  type="button"
                  className="settings-page__btn settings-page__btn--danger"
                  disabled={ranks.length <= 1}
                  onClick={() => removeRank(rank.id)}
                >
                  Delete rank
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="settings-page__profile-actions">
          <button type="button" className="settings-page__btn" onClick={addRank}>
            Add rank
          </button>
          <button type="button" className="settings-page__save" onClick={saveProgression}>
            Save progression
          </button>
        </div>
      </section>

      <section className="settings-page__card">
        <div className="settings-page__section-head">
          <h2 className="dashboard__section-title">Color scheme</h2>
          <p className="settings-page__hint">
            Set the app accent with a hex code or the color picker square.
          </p>
        </div>

        <div className="settings-page__color-row">
          <label className="settings-page__field settings-page__field--color">
            <span>Color</span>
            <input
              className="settings-page__picker"
              type="color"
              value={accentPreview}
              onChange={(e) => setAccentColor(e.target.value)}
            />
          </label>
          <label className="settings-page__field">
            <span>Hex code</span>
            <input
              className="settings-page__input"
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              placeholder="#a3e635"
            />
          </label>
          <div className="settings-page__swatch-wrap">
            <span className="settings-page__swatch-label">Preview</span>
            <span
              className="settings-page__swatch"
              style={{ background: accentPreview }}
            />
          </div>
        </div>

        <button
          type="button"
          className="settings-page__save"
          onClick={() => {
            onUpdateProfile({ accentColor })
            showMessage('Accent color updated.')
          }}
        >
          Apply color
        </button>
      </section>

      <section className="settings-page__card settings-page__card--danger">
        <div className="settings-page__section-head">
          <h2 className="dashboard__section-title">Danger zone</h2>
          <p className="settings-page__hint">
            Clear all data for the active account only after typing the confirmation phrase.
          </p>
        </div>

        <label className="settings-page__field">
          <span>Type KEEP to clear task data but preserve profile customizations</span>
          <input
            className="settings-page__input"
            type="text"
            value={softResetPhrase}
            onChange={(e) => setSoftResetPhrase(e.target.value)}
          />
        </label>

        <button
          type="button"
          className="settings-page__save"
          disabled={softResetPhrase !== 'KEEP'}
          onClick={() => {
            onSoftReset()
            setSoftResetPhrase('')
            showMessage('Habit data was cleared and profile customizations were kept.')
          }}
        >
          Clear progress only
        </button>

        <label className="settings-page__field">
          <span>Type DELETE to unlock reset</span>
          <input
            className="settings-page__input"
            type="text"
            value={resetPhrase}
            onChange={(e) => setResetPhrase(e.target.value)}
          />
        </label>

        <button
          type="button"
          className="settings-page__save settings-page__save--danger"
          disabled={!canReset}
          onClick={() => {
            onFullReset()
            setResetPhrase('')
            showMessage('All app data for this account was cleared.')
          }}
        >
          Clear all app data
        </button>
      </section>
    </main>
  )
}
