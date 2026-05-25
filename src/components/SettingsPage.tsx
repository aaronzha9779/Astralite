import { useEffect, useMemo, useRef, useState } from 'react'
import type { UserProfile } from '../types'
import './SettingsPage.css'

type SettingsPageProps = {
  profile: UserProfile
  onUpdateProfile: (patch: {
    name?: string
    handle?: string
    avatarUrl?: string | null
    accentColor?: string
  }) => void
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
  onUpdateProfile,
  onFullReset,
}: SettingsPageProps) {
  const [name, setName] = useState(profile.name)
  const [handle, setHandle] = useState(profile.handle)
  const [accentColor, setAccentColor] = useState(profile.accentColor)
  const [resetPhrase, setResetPhrase] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setName(profile.name)
    setHandle(profile.handle)
    setAccentColor(profile.accentColor)
  }, [profile])

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
