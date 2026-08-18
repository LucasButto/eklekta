import type { ReactNode } from 'react'
import { Reveal } from '@/components/Reveal/Reveal'
import './SectionHeading.scss'

interface SectionHeadingProps {
  eyebrow?: string
  title: ReactNode
  intro?: ReactNode
  align?: 'left' | 'center' | 'right'
  /** Heading level, so section order stays correct for screen readers. */
  as?: 'h2' | 'h3'
  id?: string
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'left',
  as: Tag = 'h2',
  id,
  className,
}: SectionHeadingProps) {
  const classes = ['section-heading', `section-heading--${align}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <Reveal className={classes}>
      {eyebrow && <p className="section-heading__eyebrow">{eyebrow}</p>}
      <Tag className="section-heading__title" id={id}>
        {title}
      </Tag>
      {intro && <p className="section-heading__intro">{intro}</p>}
    </Reveal>
  )
}
