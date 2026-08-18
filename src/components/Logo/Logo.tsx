import Isotype from '@/assets/brand/isotype.svg?react'
import Wordmark from '@/assets/brand/wordmark.svg?react'
import './Logo.scss'

interface LogoProps {
  /** `lockup` is the mark plus the wordmark, the default for the header. */
  variant?: 'lockup' | 'wordmark' | 'isotype'
  className?: string
  /** Set on the element that carries the accessible name. */
  title?: string
}

export function Logo({ variant = 'lockup', className, title = 'eklekta' }: LogoProps) {
  const classes = ['logo', `logo--${variant}`, className].filter(Boolean).join(' ')

  return (
    <span className={classes} role="img" aria-label={title}>
      {variant !== 'wordmark' && <Isotype className="logo__isotype" />}
      {variant !== 'isotype' && <Wordmark className="logo__wordmark" />}
    </span>
  )
}
