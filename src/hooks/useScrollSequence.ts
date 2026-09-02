import { useEffect, useRef, useState } from 'react'

/** Progress hits 0 when an item's top crosses this fraction of the viewport. */
const ENTER = 0.9
/** Progress hits 1 when an item's bottom crosses this fraction. */
const EXIT = 0.15

/**
 * Fallback reading line, as a fraction of the viewport, for when there
 * is no marker to measure (or it is hidden, as the panel is on mobile).
 */
const READ_LINE = 0.5

/**
 * Drives a sticky-media sequence: each item gets its own scroll
 * progress, and whichever item is nearest the reading line becomes the
 * active one so the pinned media can swap to match.
 *
 * Per-frame values are written straight onto the nodes as custom
 * properties instead of going through state — five items re-rendering
 * on every scroll frame is exactly the cascade Reveal avoids. Only the
 * active index is React state, and that changes when the reader crosses
 * an item, not when they move a pixel.
 *
 * Items are found by `data-seq-item` under the returned ref rather than
 * through an array of callback refs, so adding or reordering entries in
 * the JSON needs no wiring here.
 */
export function useScrollSequence<
  T extends HTMLElement,
  M extends HTMLElement = HTMLElement,
>(count: number) {
  const trackRef = useRef<T | null>(null)
  /**
   * Optional element whose centre becomes the reading line. Point it at
   * the pinned panel and an item goes active exactly as it draws level
   * with the panel, instead of at a viewport fraction that happens to
   * sit some tens of pixels off it.
   */
  const markerRef = useRef<M | null>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const items = Array.from(
      track.querySelectorAll<HTMLElement>('[data-seq-item]'),
    )
    if (items.length === 0) return

    // Reduced motion keeps every item at rest and fully legible; the
    // media still swaps, since that is a content change and not motion.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')

    let frame = 0

    const update = () => {
      frame = 0

      const viewport = window.innerHeight

      // The marker is display:none below $bp-lg, where a hidden element
      // measures 0 and would drag the line to the top of the page.
      const marker = markerRef.current?.getBoundingClientRect()
      const line =
        marker && marker.height > 0
          ? marker.top + marker.height / 2
          : viewport * READ_LINE

      let nearest = 0
      let nearestDistance = Infinity

      items.forEach((node, index) => {
        const box = node.getBoundingClientRect()

        // Distance the item travels between its own 0 and 1, which is
        // why taller items are not rushed through their fade.
        const travel = (ENTER - EXIT) * viewport + box.height
        const raw = (ENTER * viewport - box.top) / travel
        const progress = Math.min(1, Math.max(0, raw))

        if (!still.matches) {
          // The first item is already on screen when the section
          // arrives, so it starts solid instead of fading up from zero.
          const fadeIn = index === 0 ? 1 : Math.min(1, progress / 0.3)
          // The last item gets the mirror of that exemption. Its fade
          // used to bottom out at zero within a few pixels of the rail
          // unpinning, so the sequence's closing move was content
          // dissolving into a blank column exactly as the next section
          // arrived. It holds instead, and simply scrolls away.
          const fadeOut =
            index === items.length - 1
              ? 1
              : 1 - Math.max(0, (progress - 0.7) / 0.3)

          node.style.setProperty(
            '--seq-opacity',
            Math.min(fadeIn, fadeOut).toFixed(3),
          )
          // Unitless: the stylesheet multiplies it by a rem length, so
          // the travel scales with the large-display root ramp.
          node.style.setProperty('--seq-shift', (1 - progress * 2).toFixed(3))
        }

        const middle = box.top + box.height / 2
        const distance = Math.abs(middle - line)
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearest = index
        }
      })

      // Same value bails out of a re-render, so this is cheap per frame.
      setActive((previous) => (previous === nearest ? previous : nearest))
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    const clear = () => {
      for (const node of items) {
        node.style.removeProperty('--seq-opacity')
        node.style.removeProperty('--seq-shift')
      }
    }

    const onPreferenceChange = () => {
      clear()
      schedule()
    }

    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    still.addEventListener('change', onPreferenceChange)

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      still.removeEventListener('change', onPreferenceChange)
      if (frame) cancelAnimationFrame(frame)
      clear()
    }
  }, [count])

  return { trackRef, markerRef, active }
}
