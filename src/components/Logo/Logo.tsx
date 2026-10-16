import Isotype from '@/assets/brand/isotype.svg?react'
import Wordmark from '@/assets/brand/wordmark.svg?react'
import './Logo.scss'

interface LogoProps {
  /** `lockup` is the mark plus the wordmark, the default for the header. */
  variant?: 'lockup' | 'wordmark' | 'isotype'
  className?: string
  /** Set on the element that carries the accessible name. */
  title?: string
  /**
   * Hides the logo from assistive tech and drops its name. For when the
   * name is already carried in text next to it — the hero's <h1> pairs
   * the wordmark with real sr-only copy, and without this a screen reader
   * would announce "eklekta" twice.
   */
  decorative?: boolean
}

export function Logo({
  variant = 'lockup',
  className,
  title = 'eklekta',
  decorative = false,
}: LogoProps) {
  const classes = ['logo', `logo--${variant}`, className].filter(Boolean).join(' ')
  const a11y = decorative
    ? ({ 'aria-hidden': true } as const)
    : ({ role: 'img', 'aria-label': title } as const)

  return (
    <span className={classes} {...a11y}>
      {variant !== 'wordmark' && <Isotype className="logo__isotype" />}
      {variant !== 'isotype' && <Wordmark className="logo__wordmark" />}
    </span>
  )
}
