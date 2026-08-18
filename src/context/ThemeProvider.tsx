import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { THEME_STORAGE_KEY, ThemeContext, type ThemeContextValue } from './theme-context'
import type { Theme } from '@/types'

/**
 * Light is the product default, so we never fall back to the OS
 * preference — only to an explicit choice the visitor made before.
 * The matching inline script in index.html applies this before the
 * first paint to avoid a flash of the wrong theme.
 */
function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Storage can be unavailable (private mode, blocked cookies).
      // The theme still applies for this session.
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(
    () => setThemeState((current) => (current === 'dark' ? 'light' : 'dark')),
    [],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
