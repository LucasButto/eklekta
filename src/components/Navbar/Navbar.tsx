import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'
import { Button } from '@/components/Button/Button'
import { Logo } from '@/components/Logo/Logo'
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle'
import { useActiveSection } from '@/hooks/useActiveSection'
import { useHideOnScroll } from '@/hooks/useHideOnScroll'
import { useScrolled } from '@/hooks/useScrolled'
import site from '@/data/site.json'
import type { SiteData } from '@/types'
import './Navbar.scss'

const data = site as SiteData

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const scrolled = useScrolled(32)

  // Auto-hide on a real wheel / trackpad scroll down, back on a nudge
  // up. Pinned visible while the menu is open, and — the point of the
  // `navScroll` machinery — for as long as a nav link's smooth-scroll
  // keeps running, so a jump to a lower section is never mistaken for
  // the reader scrolling down.
  const [pinned, setPinned] = useState(false)
  const [navScroll, setNavScroll] = useState(0)
  const hidden = useHideOnScroll({ pinned: pinned || menuOpen })

  const pinForNav = useCallback(() => {
    setPinned(true)
    setNavScroll((n) => n + 1)
  }, [])

  // Hold the pin until the jump has settled — no scroll events for a
  // beat, however long the smooth-scroll took — then release it.
  // useHideOnScroll re-baselines from wherever the page landed, so the
  // programmatic travel never counts toward hiding.
  useEffect(() => {
    if (navScroll === 0) return

    let timer = window.setTimeout(release, 250)
    function release() {
      window.removeEventListener('scroll', bump)
      setPinned(false)
    }
    function bump() {
      window.clearTimeout(timer)
      timer = window.setTimeout(release, 150)
    }

    window.addEventListener('scroll', bump, { passive: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', bump)
    }
  }, [navScroll])

  // Mirror the auto-hide state onto the root so CSS outside the navbar
  // can react to it. The Services pinned rail reads it to close the gap
  // the vacated pill would otherwise leave above the panel. `hidden` is
  // already false whenever the bar is pinned or the menu is open, so a
  // nav jump never flips this.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.navHidden = String(hidden)
    return () => {
      delete root.dataset.navHidden
    }
  }, [hidden])

  const sectionIds = useMemo(() => data.nav.map((item) => item.id), [])
  const active = useActiveSection(sectionIds)

  const close = useCallback(() => setMenuOpen(false), [])
  const closeAndPin = useCallback(() => {
    setMenuOpen(false)
    pinForNav()
  }, [pinForNav])

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
    <header
      className={`navbar${scrolled ? ' navbar--scrolled' : ''}${
        hidden ? ' navbar--hidden' : ''
      }`}
    >
      <div className="navbar__inner">
        <a
          className="navbar__brand"
          href="#inicio"
          aria-label="eklekta, ir al inicio"
          onClick={pinForNav}
        >
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
                  onClick={pinForNav}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="navbar__actions">
          <ThemeToggle />
          <Button
            href={data.cta.href}
            size="sm"
            className="navbar__cta"
            onClick={pinForNav}
          >
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
              <a
                className="navbar__panel-link"
                href={item.href}
                onClick={closeAndPin}
              >
                <span className="navbar__panel-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <Button
          href={data.cta.href}
          onClick={closeAndPin}
          className="navbar__panel-cta"
        >
          {data.cta.label}
        </Button>
      </div>
    </header>
  )
}
