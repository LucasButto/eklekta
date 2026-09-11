import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { Button } from '@/components/Button/Button'
import { SectionHeading } from '@/components/SectionHeading/SectionHeading'
import projectsData from '@/data/projects.json'
import type { Project, ProjectGroup } from '@/types'
import { KonektaCard } from './KonektaCard'
import { ProjectCard } from './ProjectCard'
import './Projects.scss'

const groups = projectsData as ProjectGroup[]

/** The filter bar, in the JSON's order. `id` is the group's `kind`. */
const FILTERS = groups.map((group) => ({ id: group.kind, label: group.label }))

// Each group's projects, flagged tiles first. sort() is stable, so the
// rest keep the order they have in the JSON file.
const byKind = new Map<string, Project[]>(
  groups.map((group) => [
    group.kind,
    [...group.projects].sort((a, b) => Number(b.featured) - Number(a.featured)),
  ]),
)

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

/**
 * Groups the grid into the bento's rows of two. A trailing odd project
 * lands alone in the last row — see .projects__cell:only-child, which
 * gives it the full row width instead of the wide/narrow split below.
 */
function chunkPairs<T>(items: readonly T[]): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2))
  return rows
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

  const list = useMemo(() => byKind.get(shown) ?? [], [shown])
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

    // The card that was open. On close it becomes a grid poster again —
    // it no longer carries the screenshot (that lives on the opened
    // panel alone), so it rejoins the same scale move every other card
    // makes rather than a width/height one, and leads the re-forming
    // grid without a stagger.
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

      if (id === openId) {
        // Opening: the bento slot grows into the large left column.
        // Geometry (width/height), not scale, so the screenshot's
        // object-fit: cover re-crops as the frame reshapes rather than
        // the picture stretching. The screenshot fades up on its own
        // (projects-shot-reveal in the SCSS).
        el.animate(
          [
            {
              transform: `translate(${dx}px, ${dy}px)`,
              width: `${Math.round(before.width)}px`,
              height: `${Math.round(before.height)}px`,
              zIndex: '4',
            },
            {
              transform: 'none',
              width: `${Math.round(after.width)}px`,
              height: `${Math.round(after.height)}px`,
              zIndex: '4',
            },
          ],
          { duration: openMs, easing: EASE, delay: OPEN_DELAY_MS, fill: 'backwards' },
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
      // The returning card leads the grid re-forming — no stagger. On a
      // pure resize with no travel (the top-left card, whose slot shares
      // the opened panel's corner) the width/height branch used to leave
      // it motionless because flex-basis overrode the width; the scale
      // here moves regardless of dx/dy.
      const delay = id === returningId ? 0 : Math.min(i, 5) * staggerMs

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

  // A pointer down outside the readout closes the detail, the way
  // clicking a modal's backdrop dismisses it — the readout is the
  // panel's "content". Two spots inside the stage are held back from
  // counting as outside: the rail (its minis switch between projects)
  // and the filter bar (it runs its own open-aware close). Everything
  // else — the opened screenshot, the empty stage tracks, the rest of
  // the page — dismisses.
  useEffect(() => {
    if (!openId) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target) return
      if (readoutRef.current?.contains(target)) return
      if (target.closest('.projects__rail')) return
      if (target.closest('.projects__filters')) return
      select(null)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
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

  // The bar fades and lifts in the first time it reaches the viewport —
  // the same entrance the heading and the cards already get (the global
  // [data-reveal] rules in Reveal.scss). Inlined like ProjectCard's
  // reveal rather than a <Reveal> wrapper so barRef stays on the bar
  // itself for the marker maths. `offsetLeft`/`offsetWidth` ignore the
  // hidden state's opacity and transform, so the marker still lands
  // right while the bar is still down.
  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    if (!('IntersectionObserver' in window)) {
      bar.dataset.reveal = 'shown'
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            bar.dataset.reveal = 'shown'
            observer.disconnect()
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(bar)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="projects" id="proyectos">
      <div className="projects__inner">
        <SectionHeading
          title="Trabajo hecho, no casos hipotéticos."
          intro="Sitios, automatizaciones, CRM. Elegí un tipo de trabajo y abrí cualquiera para leer qué construimos."
          className="projects__heading"
        />

        <div className="projects__body">
          <div
            className="projects__filters"
            role="group"
            aria-label="Filtrar proyectos por tipo de trabajo"
            ref={barRef}
            data-reveal="hidden"
            style={{ '--reveal-delay': '80ms' } as CSSProperties}
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
              // Keyed by project id so picking a different project while
              // the detail is open remounts the readout — the title,
              // blurb and CTA replay the staggered fade-up (see
              // projects-readout-in) instead of the text swapping in
              // place. Matches the lead card, which already remounts on
              // its own `lead-${id}` key and re-runs its shot reveal.
              key={`readout-${leadProject.id}`}
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
            // Drives the short-filter layouts (see Projects.scss): one or
            // two projects still fill the full 2×2 bento height, and two
            // split the row evenly instead of wide/narrow. Only set for
            // the real grid — the rail and the konekta panel size
            // themselves.
            data-count={
              mode === 'grid' && shown !== 'crm'
                ? railProjects.length
                : undefined
            }
          >
            {shown === 'crm' ? (
              <KonektaCard />
            ) : mode === 'detail' ? (
              railProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  view="rail"
                  onSelect={select}
                  registerRef={registerRef}
                  noReveal={openedOnce.has(project.id)}
                />
              ))
            ) : (
              // Each row is its own flex container (see .projects__row) so
              // the grid's rows can share the section's remaining height
              // evenly, growing or shrinking together with the viewport.
              // Below $bp-lg .projects__row just wraps its (already
              // full-width or 50%-width) cells, so the phone/tablet wrap
              // is untouched.
              chunkPairs(railProjects).map((row, rowIndex) => (
                <div
                  className="projects__row"
                  role="presentation"
                  key={row[0].id}
                >
                  {row.map((project, i) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      index={rowIndex * 2 + i}
                      view="grid"
                      span={
                        // Two projects share the row evenly — no
                        // wide/narrow (see .projects__grid[data-count="2"]).
                        railProjects.length === 2 || row.length !== 2
                          ? undefined
                          : rowIndex % 2 === 0
                            ? i === 0
                              ? 'wide'
                              : 'narrow'
                            : i === 0
                              ? 'narrow'
                              : 'wide'
                      }
                      onSelect={select}
                      registerRef={registerRef}
                      noReveal={openedOnce.has(project.id)}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </div>
    </section>
  )
}
