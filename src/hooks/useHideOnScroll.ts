import { useEffect, useState } from 'react'

interface HideOnScrollOptions {
  /** Stay visible within this many px of the top. */
  offset?: number
  /** Down-travel past `offset` that hides it. */
  hideAfter?: number
  /** Up-travel that brings it back — small, so a nudge is enough. */
  revealAfter?: number
  /** Force it visible (menu open, just followed an in-page link…). */
  pinned?: boolean
}

/**
 * The auto-hiding header pattern: gone while the reader scrolls down,
 * back on a small scroll up. Returns true when the element should hide.
 *
 * Tracks net signed travel since the last direction change rather than a
 * raw delta, so a jittery trackpad never toggles it but a deliberate
 * nudge the other way always does. Scroll reads are coalesced to a frame.
 * While `pinned`, it reports visible and stops listening; the next
 * unpinned frame starts measuring afresh from wherever the page now is.
 */
export function useHideOnScroll({
  offset = 120,
  hideAfter = 10,
  revealAfter = 10,
  pinned = false,
}: HideOnScrollOptions = {}) {
  const [scrollHidden, setScrollHidden] = useState(false)

  useEffect(() => {
    if (pinned) return

    let last = window.scrollY
    let travel = 0
    let frame = 0

    const update = () => {
      frame = 0
      const y = window.scrollY
      const delta = y - last
      last = y
      if (delta === 0) return

      // Always show near the top.
      if (y <= offset) {
        travel = 0
        setScrollHidden(false)
        return
      }

      // Reset on a direction change so `travel` is a sustained move.
      if (Math.sign(delta) !== Math.sign(travel)) travel = 0
      travel += delta

      if (travel > hideAfter) setScrollHidden(true)
      else if (travel < -revealAfter) setScrollHidden(false)
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', schedule, { passive: true })
    return () => {
      window.removeEventListener('scroll', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [offset, hideAfter, revealAfter, pinned])

  return pinned ? false : scrollHidden
}
