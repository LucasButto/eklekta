import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Button } from '@/components/Button/Button'
import { Logo } from '@/components/Logo/Logo'
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle'
import { useActiveSection } from '@/hooks/useActiveSection'
import { useScrolled } from '@/hooks/useScrolled'
import site from '@/data/site.json'
import type { SiteData } from '@/types'
import './Navbar.scss'

const data = site as SiteData

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const scrolled = useScrolled(32)

  const sectionIds = useMemo(() => data.nav.map((item) => item.id), [])
  const active = useActiveSection(sectionIds)

  const close = useCallback(() => setMenuOpen(false), [])

  // Escape closes the mobile panel, and the page underneath stays put
  // while it is open.
  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen, close])

  return (
    <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="navbar__inner">
        <a className="navbar__brand" href="#inicio" aria-label="eklekta, ir al inicio">
          <span className="navbar__mark">
            <Logo variant="isotype" title="eklekta" />
          </span>
          <Logo variant="wordmark" className="navbar__wordmark" title="eklekta" />
        </a>

        <nav className="navbar__nav" aria-label="Principal">
          <ul className="navbar__list">
            {data.nav.map((item) => (
              <li key={item.id}>
                <a
                  className="navbar__link"
                  href={item.href}
                  aria-current={active === item.id ? 'true' : undefined}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="navbar__actions">
          <ThemeToggle />
          <Button href={data.cta.href} size="sm" className="navbar__cta">
            {data.cta.label}
          </Button>

          <button
            type="button"
            className="navbar__burger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="menu-movil"
          >
            <span className="sr-only">{menuOpen ? 'Cerrar menú' : 'Abrir menú'}</span>
            <span className="navbar__burger-lines" aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      <div
        id="menu-movil"
        className={`navbar__panel${menuOpen ? ' navbar__panel--open' : ''}`}
        hidden={!menuOpen}
      >
        <ul className="navbar__panel-list">
          {data.nav.map((item, index) => (
            <li key={item.id} style={{ '--i': index } as CSSProperties}>
              <a className="navbar__panel-link" href={item.href} onClick={close}>
                <span className="navbar__panel-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <Button href={data.cta.href} onClick={close} className="navbar__panel-cta">
          {data.cta.label}
        </Button>
      </div>
    </header>
  )
}
