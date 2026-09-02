import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button } from '@/components/Button/Button'
import { SectionHeading } from '@/components/SectionHeading/SectionHeading'
import projectsData from '@/data/projects.json'
import type { Project } from '@/types'
import { KonektaCard } from './KonektaCard'
import { ProjectCard } from './ProjectCard'
import './Projects.scss'

const projects = projectsData as Project[]

// The wide tiles go to the flagged projects. sort() is stable, so
// everything else keeps the order it has in the JSON file.
const ordered = [...projects].sort(
  (a, b) => Number(b.featured) - Number(a.featured),
)

/** The filter bar, in display order. `id` matches `Project.kind`. */
const FILTERS = [
  { id: 'sitio-web', label: 'Sitios web' },
  { id: 'automatizacion', label: 'Automatización' },
  { id: 'crm', label: 'CRM' },
] as const

// Long enough for the last card's stagger (index * 30ms) plus the
// card-out keyframe (see Projects.scss). Kept in sync by eye.
const SWAP_MS = 420

// The FLIP between the grid and the master-detail layout. One curve;
// every card travels from its old box to its new one — the rail cards
// on a slow stagger, the opened cover growing into the left column
// alongside them.
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const MOVE_MS = 980
const OPEN_MS = 900
const STAGGER_MS = 75
const OPEN_DELAY_MS = 0

// Picking a different filter while a project is open closes it first —
// the cards FLIP home — and only then runs the section swap. That close
// runs quicker than a deliberate one (it is a hand-off, not a
// destination): FAST_CLOSE scales its durations, and CLOSE_MS is when
// the swap picks up, a hair before the shortened FLIP fully settles.
const FAST_CLOSE = 0.6
const CLOSE_MS = Math.round(MOVE_MS * FAST_CLOSE) + 80

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Writes the active tab's box to the bar so the marker pill lands on it. */
function placeMarker(bar: HTMLElement) {
  const active = bar.querySelector<HTMLElement>('[aria-current="true"]')
  if (!active) return
  bar.style.setProperty('--marker-x', `${active.offsetLeft}px`)
  bar.style.setProperty('--marker-w', `${active.offsetWidth}px`)
}

export function Projects() {
  // `filter` is the tab the reader picked; `shown` is the set actually
  // on screen and lags it — held through the exit so the leaving cards
  // can animate out before they unmount.
  const [filter, setFilter] = useState<string>(FILTERS[0].id)
  const [shown, setShown] = useState<string>(FILTERS[0].id)
  const swapping = filter !== shown

  const swapTimer = useRef<number | undefined>(undefined)
  const latest = useRef(filter)

  // The opened project, or null for the plain grid.
  const [openId, setOpenId] = useState<string | null>(null)

  const list = useMemo(
    () => ordered.filter((project) => project.kind === shown),
    [shown],
  )
  const leadProject = useMemo(
    () => (openId ? (list.find((p) => p.id === openId) ?? null) : null),
    [openId, list],
  )
  const mode = leadProject ? 'detail' : 'grid'
  const railProjects = useMemo(
    () => (leadProject ? list.filter((p) => p.id !== leadProject.id) : list),
    [leadProject, list],
  )

  // --- the layout FLIP ------------------------------------------------
  // Every card hands its cell up here keyed by project id. Before a
  // layout change we record where each one sits; right after React has
  // re-laid them out we play the difference back as a transform.
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map())
  const prevRects = useRef<Map<string, DOMRect>>(new Map())
  const restoreFocus = useRef<string | null>(null)
  // The most recently opened project — the card that gets the geometry
  // FLIP back into the grid on close (independent of focus handling).
  const lastOpenedId = useRef<string | null>(null)
  const readoutRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  // Projects opened at least once: their grid card rides the FLIP back
  // from the detail instead of re-running the scroll-reveal fade.
  const [openedOnce, setOpenedOnce] = useState<ReadonlySet<string>>(
    () => new Set(),
  )

  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) cellRefs.current.set(id, el)
    else cellRefs.current.delete(id)
  }, [])

  const snapshot = useCallback(() => {
    prevRects.current.clear()
    for (const [id, el] of cellRefs.current) {
      prevRects.current.set(id, el.getBoundingClientRect())
    }
  }, [])

  // Set for one close only, when a filter change is what triggered it —
  // the next FLIP runs on the shortened FAST_CLOSE timing.
  const flipFast = useRef(false)

  const select = useCallback(
    (id: string | null, fast = false) => {
      if (fast && id === null) flipFast.current = true
      setOpenId((current) => {
        if (current === id) return current
        if (id) {
          restoreFocus.current = id
          lastOpenedId.current = id
          setOpenedOnce((seen) =>
            seen.has(id) ? seen : new Set(seen).add(id),
          )
          // Pin the detail layout to the height the full bento has right
          // now, so opening a project never shortens the section.
          const grid = stageRef.current?.querySelector<HTMLElement>(
            '.projects__grid',
          )
          if (grid) {
            stageRef.current?.style.setProperty(
              '--detail-h',
              `${Math.round(grid.getBoundingClientRect().height)}px`,
            )
          }
        }
        if (!prefersReducedMotion()) snapshot()
        return id
      })
    },
    [snapshot],
  )

  useLayoutEffect(() => {
    const prev = prevRects.current
    if (prev.size === 0) return
    const reduce = prefersReducedMotion()

    // A filter-triggered close runs quicker (see FAST_CLOSE); consumed here.
    const fast = flipFast.current
    flipFast.current = false
    const moveMs = fast ? Math.round(MOVE_MS * FAST_CLOSE) : MOVE_MS
    const openMs = fast ? Math.round(OPEN_MS * FAST_CLOSE) : OPEN_MS
    const staggerMs = fast ? STAGGER_MS * FAST_CLOSE : STAGGER_MS

    // On close, the cover that was open becomes a grid card again and
    // gets the big geometry move back into its slot.
    const returningId = openId ? null : lastOpenedId.current

    for (const [id, el] of cellRefs.current) {
      const before = prev.get(id)
      if (!before || reduce) continue
      const after = el.getBoundingClientRect()

      // Drop a FLIP still in flight from a fast previous pick, but leave
      // the CSS reveal transition alone (that is a CSSTransition subclass).
      for (const running of el.getAnimations()) {
        if (running.constructor === Animation) running.cancel()
      }

      const dx = before.left - after.left
      const dy = before.top - after.top

      if (id === openId || id === returningId) {
        // The cover travels between its bento slot and the large left
        // column — the same move both ways. It animates geometry
        // (width/height), not scale, so the object-fit: cover image
        // re-crops as the frame changes shape instead of the picture
        // stretching. Opening also blends opacity up from the grid card
        // it replaced; closing stays opaque — it is the same card going
        // home.
        const opening = id === openId
        el.animate(
          [
            {
              transform: `translate(${dx}px, ${dy}px)`,
              width: `${Math.round(before.width)}px`,
              height: `${Math.round(before.height)}px`,
              opacity: opening ? 0.35 : 1,
              zIndex: '4',
            },
            { opacity: 1, offset: 0.45 },
            {
              transform: 'none',
              width: `${Math.round(after.width)}px`,
              height: `${Math.round(after.height)}px`,
              opacity: 1,
              zIndex: '4',
            },
          ],
          {
            duration: openMs,
            easing: EASE,
            delay: opening ? OPEN_DELAY_MS : 0,
            fill: 'backwards',
          },
        )
        continue
      }

      const sx = after.width ? before.width / after.width : 1
      const sy = after.height ? before.height / after.height : 1

      if (
        Math.abs(dx) < 1 &&
        Math.abs(dy) < 1 &&
        Math.abs(sx - 1) < 0.02 &&
        Math.abs(sy - 1) < 0.02
      ) {
        continue
      }

      const bigResize = sx < 0.72 || sx > 1.4 || sy < 0.72 || sy > 1.4
      const i = parseInt(el.style.getPropertyValue('--i'), 10) || 0
      const delay = Math.min(i, 5) * staggerMs

      // `zIndex` on the keyframes (not inline) so it rides above the
      // opened cover and readout for the whole travel — delay included
      // (`fill: backwards`) — and clears itself when the flip ends. The
      // rail drops its clip in CSS so a card sliding in from the far
      // left is never cut at its edge.
      el.animate(
        [
          {
            transformOrigin: 'top left',
            transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
            opacity: bigResize ? 0.3 : 1,
            zIndex: '5',
          },
          {
            transformOrigin: 'top left',
            transform: 'none',
            opacity: 1,
            zIndex: '5',
          },
        ],
        { duration: moveMs, easing: EASE, delay, fill: 'backwards' },
      )
    }

    prev.clear()
  }, [openId])

  // Focus follows the disclosure: into the readout on open, back to the
  // card that was open on close.
  useLayoutEffect(() => {
    if (openId) {
      readoutRef.current?.focus()
    } else if (restoreFocus.current) {
      const cell = cellRefs.current.get(restoreFocus.current)
      cell?.querySelector<HTMLElement>('button')?.focus()
      restoreFocus.current = null
    }
  }, [openId])

  // Escape closes the detail.
  useEffect(() => {
    if (!openId) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        select(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId, select])

  const filterAfterClose = useRef<number | undefined>(undefined)

  const selectFilter = useCallback(
    (next: string) => {
      if (next === latest.current) return
      latest.current = next

      // Runs the section swap: the leaving cards stagger out
      // (`data-swapping`), then `shown` catches up and the new set mounts.
      const swapSection = () => {
        if (latest.current !== next) return
        setFilter(next)
        window.clearTimeout(swapTimer.current)
        swapTimer.current = window.setTimeout(() => {
          if (latest.current === next) setShown(next)
        }, SWAP_MS)
      }

      window.clearTimeout(filterAfterClose.current)
      // Focus belongs on the filter the reader just clicked, not back on
      // the project card the close would otherwise return it to.
      restoreFocus.current = null

      if (openId !== null && !prefersReducedMotion()) {
        // Close the open project first — the cards FLIP home (quicker
        // than a deliberate close) — and only once they have landed does
        // the section start swapping.
        select(null, true)
        filterAfterClose.current = window.setTimeout(swapSection, CLOSE_MS)
      } else {
        setOpenId(null)
        swapSection()
      }
    },
    [openId, select],
  )

  useEffect(
    () => () => {
      window.clearTimeout(swapTimer.current)
      window.clearTimeout(filterAfterClose.current)
    },
    [],
  )

  // The segmented-control marker. Its box is written straight to the
  // bar's style as custom properties — no state, no re-render — the way
  // Reveal writes its attribute. Buttons are natural width, so the
  // marker is measured, not stepped.
  const barRef = useRef<HTMLDivElement>(null)

  // Initial placement + corrections (resize, font swap): snapped, no slide.
  useLayoutEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const snap = () => {
      bar.setAttribute('data-static', '')
      placeMarker(bar)
      requestAnimationFrame(() => bar.removeAttribute('data-static'))
    }
    snap()
    window.addEventListener('resize', snap)
    document.fonts?.ready.then(snap)
    return () => window.removeEventListener('resize', snap)
  }, [])

  // The slide: only when the reader picks a different tab.
  const firstFilter = useRef(true)
  useLayoutEffect(() => {
    if (firstFilter.current) {
      firstFilter.current = false
      return
    }
    if (barRef.current) placeMarker(barRef.current)
  }, [filter])

  return (
    <section className="projects" id="proyectos">
      <div className="projects__inner">
        <SectionHeading
          title="Trabajo hecho, no casos hipotéticos."
          intro="Sitios, automatizaciones, CRM. Elegí un tipo de trabajo y abrí cualquiera para leer qué construimos."
          className="projects__heading"
        />

        <div
          className="projects__filters"
          role="group"
          aria-label="Filtrar proyectos por tipo de trabajo"
          ref={barRef}
        >
          <span className="projects__filter-marker" aria-hidden="true" />
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="projects__filter"
              aria-current={f.id === filter ? 'true' : undefined}
              onClick={() => selectFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="projects__stage" data-mode={mode} ref={stageRef}>
          {leadProject && (
            <ProjectCard
              key={`lead-${leadProject.id}`}
              project={leadProject}
              index={0}
              view="lead"
              onSelect={select}
              registerRef={registerRef}
            />
          )}

          {leadProject && (
            <div
              className="projects__readout"
              ref={readoutRef}
              tabIndex={-1}
              role="group"
              aria-label={`Detalle de ${leadProject.title}`}
            >
              <button
                type="button"
                className="projects__back"
                onClick={() => select(null)}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path
                    d="M12 4 6 10l6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Volver
              </button>

              <p className="projects__readout-eyebrow">
                {leadProject.categories.join(' · ')}
              </p>
              <h3 className="projects__readout-title">{leadProject.title}</h3>
              <p className="projects__readout-sub">
                {leadProject.client} · {leadProject.subtitle}
              </p>
              <p className="projects__readout-body">{leadProject.summary}</p>

              {leadProject.url ? (
                <Button
                  href={leadProject.url}
                  size="sm"
                  className="projects__readout-cta"
                >
                  Ver sitio
                </Button>
              ) : (
                <p className="projects__readout-note">
                  Trabajo interno — sin sitio público.
                </p>
              )}
            </div>
          )}

          <div
            className={mode === 'detail' ? 'projects__rail' : 'projects__grid'}
            role="list"
            data-swapping={mode === 'grid' && swapping ? '' : undefined}
          >
            {shown === 'crm' ? (
              <KonektaCard />
            ) : (
              railProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  view={mode === 'detail' ? 'rail' : 'grid'}
                  onSelect={select}
                  registerRef={registerRef}
                  noReveal={openedOnce.has(project.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
