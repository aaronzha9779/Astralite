import type { UserProfile } from '../types'
import { formatMinutes } from '../lib/time'
import './Sidebar.css'

type SidebarProps = {
  profile: UserProfile
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function Sidebar({ profile }: SidebarProps) {
  const progressPercent = Math.round(
    (profile.progressMinutes / profile.progressToNext) * 100,
  )

  return (
    <aside className="sidebar">
      <div className="profile-card">
        <div className="profile-card__avatar" aria-hidden="true">
          {getInitials(profile.name)}
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
      </div>
    </aside>
  )
}
