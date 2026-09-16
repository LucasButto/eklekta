import type { MouseEventHandler } from 'react'
import { useTheme } from '@/hooks/useTheme'
import './ThemeToggle.scss'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  // The hero's theme-change wipe (Hero.scss) expands from wherever this
  // button actually is, at any breakpoint — so record that position as
  // a % of the viewport straight on the root element before flipping
  // the theme. A plain DOM write rather than React state/context: it's
  // a one-off detail for a CSS animation, nothing renders from it.
  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100
    const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100
    document.documentElement.style.setProperty('--theme-origin-x', `${x}%`)
    document.documentElement.style.setProperty('--theme-origin-y', `${y}%`)
    toggleTheme()
  }

  return (
    <button
      type="button"
      className={['theme-toggle', className].filter(Boolean).join(' ')}
      onClick={handleClick}
      aria-pressed={isDark}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <span className="sr-only">
        {isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      </span>

      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__thumb" />

        <svg className="theme-toggle__icon theme-toggle__icon--sun" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4.4" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2" />
            <path d="M5.4 5.4 7 7M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />
          </g>
        </svg>

        <svg className="theme-toggle__icon theme-toggle__icon--moon" viewBox="0 0 24 24">
          <path
            d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z"
            fill="currentColor"
          />
        </svg>
      </span>
    </button>
  )
}
