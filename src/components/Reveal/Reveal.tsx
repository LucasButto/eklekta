import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react'
import './Reveal.scss'

interface RevealProps {
  children: ReactNode
  /** Milliseconds to hold before this element animates in. */
  delay?: number
  /** Renders as a different element when a div would be invalid markup. */
  as?: ElementType
  className?: string
}

/**
 * Fades and lifts its children into place the first time they reach
 * the viewport.
 *
 * The element renders hidden and the observer flips it to shown by
 * writing the attribute directly. Keeping it out of React state means
 * no cascading render, and starting hidden in the markup means there
 * is no frame where the content is painted before it is hidden.
 * Reduced-motion users get everything visible, enforced in CSS.
 */
export function Reveal({ children, delay = 0, as: Tag = 'div', className }: RevealProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (!('IntersectionObserver' in window)) {
      node.dataset.reveal = 'shown'
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.dataset.reveal = 'shown'
            observer.disconnect()
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={className}
      data-reveal="hidden"
      style={delay ? ({ '--reveal-delay': `${delay}ms` } as CSSProperties) : undefined}
    >
      {children}
    </Tag>
  )
}
