import type { NavItem } from '../types'
import './Header.css'

type HeaderProps = {
  mainNavItems: NavItem[]
  shopNavItem: NavItem
  activeNavId: string
  availableXp: number
  onNavClick: (id: string) => void
}

export function Header({
  mainNavItems,
  shopNavItem,
  activeNavId,
  availableXp,
  onNavClick,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header__logo" aria-label="GRIND home">
        ASTRALITE
      </div>

      <nav className="header__nav header__nav--center" aria-label="Main">
        {mainNavItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`header__nav-btn${activeNavId === item.id ? ' header__nav-btn--active' : ''}`}
            onClick={() => onNavClick(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="header__shop-wrap">
        <button
          type="button"
          className={`header__nav-btn header__shop-btn${activeNavId === shopNavItem.id ? ' header__nav-btn--active' : ''}`}
          onClick={() => onNavClick(shopNavItem.id)}
        >
          <span>{shopNavItem.label}</span>
          <span className="header__shop-xp">{availableXp} XP</span>
        </button>
      </div>
    </header>
  )
}

