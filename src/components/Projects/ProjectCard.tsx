import { useCallback, useEffect, useRef, type CSSProperties } from 'react'
import { preload } from 'react-dom'
import type { Project } from '@/types'
import { coverSet, COVER_LARGE_WIDTHS, COVER_WIDTHS } from './coverSet'

export type CardView = 'grid' | 'lead' | 'rail'

interface ProjectCardProps {
  project: Project
  index: number
  /** Where this card sits: the bento, the opened cover, or the side rail. */
  view: CardView
  /** grid / rail → open this project; lead → close back to the grid. */
  onSelect: (id: string | null) => void
  /** Hands the cell element up so <Projects> can FLIP it between layouts. */
  registerRef: (id: string, el: HTMLElement | null) => void
  /**
   * Skip the scroll-reveal fade. Set once a project has been opened —
   * its grid card then rides the FLIP back from the detail rather than
   * re-fading in underneath it.
   */
  noReveal?: boolean
}

const GRID_SIZES = '(min-width: 1024px) 42vw, (min-width: 768px) 50vw, 100vw'
const RAIL_SIZES = '(min-width: 1024px) 13vw, (min-width: 768px) 45vw, 46vw'
const LEAD_SIZES = '(min-width: 1024px) 34vw, 92vw'

/**
 * One project cover — an iOS App Store "Today" tile: the image fills it,
 * the category and title sit in the top-left over a scrim.
 *
 * The grid tile and the rail mini show the landscape `cover`; opening the
 * project swaps to the portrait `coverLarge` crop (automation work has
 * none, so it keeps `cover` — those are already portrait). Both are
 * served responsively (see coverSet). It is a <button>, not a link — in
 * the grid it opens the inline detail, as the opened cover it closes.
 */
export function ProjectCard({
  project,
  index,
  view,
  onSelect,
  registerRef,
  noReveal = false,
}: ProjectCardProps) {
  const cellRef = useRef<HTMLDivElement | null>(null)
  const category = project.categories[0]
  const isLead = view === 'lead'
  const settled = isLead || noReveal

  const leadStem = project.coverLarge ?? project.cover
  const leadWidths = project.coverLarge ? COVER_LARGE_WIDTHS : COVER_WIDTHS
  const set = isLead
    ? coverSet(leadStem, leadWidths)
    : coverSet(project.cover, COVER_WIDTHS)
  const sizes = isLead
    ? LEAD_SIZES
    : view === 'rail'
      ? RAIL_SIZES
      : GRID_SIZES

  // Warm the opened-cover image on hover / focus so the FLIP into the
  // detail isn't waiting on a fetch. Only meaningful before it opens.
  const warm = useCallback(() => {
    if (isLead) return
    const large = coverSet(leadStem, leadWidths)
    preload(large.src, {
      as: 'image',
      imageSrcSet: large.webp,
      imageSizes: LEAD_SIZES,
    })
  }, [isLead, leadStem, leadWidths])

  // Register on a stable callback ref, not an effect: the ref fires
  // during commit, before <Projects>'s FLIP layout effect reads the
  // map, so every card's box is current when the animation is set up.
  const setCell = useCallback(
    (el: HTMLDivElement | null) => {
      cellRef.current = el
      registerRef(project.id, el)
    },
    [project.id, registerRef],
  )

  // The same reveal-on-scroll as <Reveal>, inlined so the cell element
  // is ours to hand to the FLIP. The opened cover and any card that has
  // already been opened skip it — their entrance comes from the FLIP.
  useEffect(() => {
    const node = cellRef.current
    if (!node || settled || node.dataset.reveal === 'shown') return

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
  }, [settled])

  return (
    <div
      ref={setCell}
      className="projects__cell"
      data-view={view}
      data-reveal={settled ? 'shown' : 'hidden'}
      role="listitem"
      style={{ '--i': index } as CSSProperties}
    >
      <button
        type="button"
        className="project-card"
        onClick={() => onSelect(isLead ? null : project.id)}
        onPointerEnter={isLead ? undefined : warm}
        onFocus={isLead ? undefined : warm}
        aria-label={
          isLead
            ? `Cerrar ${project.title}`
            : `${project.title} — ver el proyecto de ${project.client}`
        }
      >
        <span className="project-card__media">
          <picture>
            <source type="image/webp" srcSet={set.webp} sizes={sizes} />
            <img
              src={set.src}
              srcSet={set.jpg}
              sizes={sizes}
              alt=""
              loading={isLead ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={isLead ? 'high' : undefined}
              data-align={project.alignImg ?? 'center'}
            />
          </picture>
          <span className="project-card__scrim" aria-hidden="true" />

          <span className="project-card__head">
            {category && (
              <span className="project-card__category">{category}</span>
            )}
            <span className="project-card__title">{project.title}</span>
          </span>

          {isLead && (
            <span className="project-card__close" aria-hidden="true">
              <svg viewBox="0 0 20 20" focusable="false">
                <path
                  d="M6 6l8 8M14 6l-8 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          )}
        </span>
      </button>
    </div>
  )
}
