import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import './Button.scss'

interface BaseProps {
  children: ReactNode
  variant?: 'solid' | 'outline' | 'ghost'
  size?: 'sm' | 'md'
  /** The trailing arrow from the mockup's call-to-action pills. */
  withArrow?: boolean
  className?: string
}

type LinkProps = BaseProps & { href: string } & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    'className' | 'children'
  >

type ActionProps = BaseProps & { href?: undefined } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'className' | 'children'
  >

export type ButtonProps = LinkProps | ActionProps

function Arrow() {
  return (
    <svg className="button__arrow" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M4 10h11M11 5.5 15.5 10 11 14.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Button(props: ButtonProps) {
  const {
    children,
    variant = 'solid',
    size = 'md',
    withArrow = true,
    className,
    ...rest
  } = props

  const classes = ['button', `button--${variant}`, `button--${size}`, className]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      <span className="button__label">{children}</span>
      {withArrow && <Arrow />}
    </>
  )

  if (typeof props.href === 'string') {
    const { href, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement>
    const external = /^https?:\/\//.test(props.href)

    return (
      <a
        className={classes}
        href={href}
        {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : null)}
        {...anchorRest}
      >
        {content}
      </a>
    )
  }

  const buttonRest = rest as ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <button className={classes} type={buttonRest.type ?? 'button'} {...buttonRest}>
      {content}
    </button>
  )
}
