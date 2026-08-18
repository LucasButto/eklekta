import { useTheme } from '@/hooks/useTheme'
import './ThemeToggle.scss'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className={['theme-toggle', className].filter(Boolean).join(' ')}
      onClick={toggleTheme}
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
