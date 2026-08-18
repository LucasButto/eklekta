import { useEffect, useState } from 'react'

/**
 * Tracks which section the reader is currently in so the nav can mark it.
 *
 * Deliberately position-based rather than IntersectionObserver ratios:
 * these sections have wildly different heights, and ranking by
 * intersection ratio always favours the shortest one in view, which
 * makes the highlight lag a section behind.
 */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (ids.length === 0) return

    let frame = 0

    const update = () => {
      frame = 0

      // Reading line sits just below the fixed header.
      const line = window.innerHeight * 0.3
      let current: string | null = null

      // ids are in document order, so the last section whose top has
      // crossed the line is the one being read.
      for (const id of ids) {
        const node = document.getElementById(id)
        if (node && node.getBoundingClientRect().top <= line) current = id
      }

      // The last section is often too short to ever cross the line.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8
      if (atBottom) current = ids[ids.length - 1] ?? current

      setActive(current)
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ids])

  return active
}
