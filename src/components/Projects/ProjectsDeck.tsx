import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { Project } from "@/types";
import { ProjectTile } from "./ProjectTile";

interface ProjectsDeckProps {
  projects: Project[];
  /** True while the leaving set is fading out on a filter change. */
  swapping: boolean;
  /** Hands back the card that opened the sheet, so focus can return. */
  onOpen: (project: Project, trigger: HTMLElement) => void;
}

/** A release past this much travel sends the card away… */
const SWIPE_PX = 80;
/** …and so does a flick this fast (px per ms) in the direction of the drag. */
const SWIPE_SPEED = 0.5;
/** How far a press has to move sideways before it counts as a drag. */
const DRAG_SLOP_PX = 8;
/** The card follows the finger with `dx / TILT` degrees of lean. */
const TILT = 20;
const TILT_MAX_DEG = 14;
/** Where a card ends up when it flies off: past the edge, leaning outward. */
const FLY_X = 120; // %, of the card's own width
const FLY_DEG = 14;
const FLY_MS = 300;
/**
 * How long the cards behind take to move up a place — and so how long the
 * flight is held for, so the card that left is only handed back to the
 * stylesheet once it has settled in its new slot. Matches $deck-move.
 */
const MOVE_MS = 420;
const HOLD_MS = MOVE_MS + 40;
const FLY_EASE = "cubic-bezier(0.25, 0.6, 0.5, 1)";
const ARRIVE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** A card that was not sent away goes home with a little overshoot. */
const SPRING_MS = 460;
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

/** Cards past the third wait out of sight; see .projects-deck__card. */
const VISIBLE = 3;

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const pad = (n: number) => String(n).padStart(2, "0");

interface Drag {
  id: number;
  /** The front card, held for the whole gesture. */
  el: HTMLElement;
  x0: number;
  y0: number;
  dx: number;
  dragging: boolean;
  /** [time, clientX] of the last ~100ms, for the release speed. */
  samples: Array<[number, number]>;
}

/**
 * The phone's version of the feed (< $bp-sm): the same cards, but dealt as
 * a deck. One card is in front; the next two sit behind it, scaled down
 * and shifted so only their lower edge shows in their own tint. A card
 * is swept away with a swipe, the arrows beneath it, or the keyboard, and
 * goes to the back — the deck is circular.
 *
 * Where each card is, is a function of `front` alone and is written to
 * `data-pos`; the stylesheet turns that into a pose and the move between
 * poses into a transition. What this file adds on top is the part CSS
 * cannot know: the card that is leaving, or coming back, is flown over
 * the top of that with the Web Animations API (the same way the bento's
 * FLIP is done) so that it can start from wherever the finger let go.
 *
 * Only the front card is reachable: the rest are `inert` and
 * `aria-hidden`, so a screen reader or a tab key sees one card at a time,
 * and the counter beneath is the live region that says which.
 */
export function ProjectsDeck({ projects, swapping, onOpen }: ProjectsDeckProps) {
  const total = projects.length;
  // The deck is remounted by <Projects> on a filter change (it is keyed by
  // the tab), so this starts at the first card without any reset logic.
  const [front, setFront] = useState(0);
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());

  const stackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  // A drag that ends over the card must not also count as a tap on it.
  const moved = useRef(false);
  // Set by the keyboard: focus was on the front card, which is about to be
  // inert, so it has to follow the card that takes its place.
  const refocus = useRef(false);
  const settleTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    stackRef.current
      ?.querySelector<HTMLElement>('[data-pos="0"] .project-tile')
      ?.focus({ preventScroll: true });
  }, [front]);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  const frontCard = () =>
    stackRef.current?.querySelector<HTMLElement>('[data-pos="0"]') ?? null;

  /**
   * Moves the deck one card. `delta` +1 sends the front card to the back,
   * −1 brings the back one round to the front; `side` (−1 left, +1 right)
   * is the edge the card in flight leaves by or arrives from.
   */
  const step = (delta: 1 | -1, side: 1 | -1) => {
    if (total < 2) return;
    const outgoing = frontCard();
    const nextFront = (front + delta + total) % total;
    const incoming =
      stackRef.current?.querySelector<HTMLElement>(
        `[data-index="${nextFront}"]`,
      ) ?? null;

    // Where the card is right now, if a finger was holding it. The inline
    // pose belongs to the gesture: it is handed to the animation as its
    // start and cleared so the stylesheet can take the card over again.
    const from = outgoing?.style.transform || "none";
    if (outgoing) {
      outgoing.style.transition = "";
      outgoing.style.transform = "";
    }
    // A card still flying from an earlier step is the one coming forward
    // again (a two-card deck tapped twice quickly): let it go.
    incoming?.getAnimations().forEach((animation) => {
      if (animation.constructor === Animation) animation.cancel();
    });

    setFront(nextFront);
    if (prefersReducedMotion()) return;

    const away = `translateX(${side * FLY_X}%) rotate(${side * FLY_DEG}deg)`;
    if (delta === 1 && outgoing) {
      // Fly out, then hold off-screen until the cards behind have settled
      // and this one has reached the back: its own slot is decided by the
      // stylesheet and is already moving underneath. z-index is in the
      // keyframes, not the stylesheet, because it has to stay above the
      // card that is taking its place for the whole flight and then drop
      // away by itself when the animation ends.
      outgoing.animate(
        [
          {
            transform: from,
            opacity: 1,
            zIndex: "4",
            easing: FLY_EASE,
          },
          {
            transform: away,
            opacity: 1,
            zIndex: "4",
            offset: FLY_MS / HOLD_MS,
          },
          { transform: away, opacity: 1, zIndex: "4" },
        ],
        { duration: HOLD_MS },
      );
    } else if (delta === -1 && incoming) {
      incoming.animate(
        [
          { transform: away, opacity: 1, zIndex: "4" },
          { transform: "none", opacity: 1, zIndex: "4" },
        ],
        { duration: MOVE_MS, easing: ARRIVE_EASE },
      );
    }
  };

  const settle = (el: HTMLElement) => {
    if (prefersReducedMotion()) {
      el.style.transition = "";
      el.style.transform = "";
      return;
    }
    el.style.transition = `transform ${SPRING_MS}ms ${SPRING}`;
    el.style.transform = "";
    // The inline transition would otherwise outlive the spring and stop the
    // stylesheet's own (opacity included) from running on the card's next move.
    settleTimer.current = window.setTimeout(() => {
      el.style.transition = "";
    }, SPRING_MS + 20);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (total < 2 || drag.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const el = frontCard();
    if (!el) return;
    window.clearTimeout(settleTimer.current);
    moved.current = false;
    drag.current = {
      id: event.pointerId,
      el,
      x0: event.clientX,
      y0: event.clientY,
      dx: 0,
      dragging: false,
      samples: [[performance.now(), event.clientX]],
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || event.pointerId !== d.id) return;

    if (!d.dragging) {
      const dx = event.clientX - d.x0;
      const dy = event.clientY - d.y0;
      // Vertical motion is the page's: touch-action leaves it to the
      // browser, which will cancel this pointer if it takes it.
      if (Math.abs(dx) < DRAG_SLOP_PX || Math.abs(dx) < Math.abs(dy)) return;
      d.dragging = true;
      moved.current = true;
      // Counted from where the drag took hold, so the card does not jump
      // by the slop when it does.
      d.x0 += Math.sign(dx) * DRAG_SLOP_PX;
      event.currentTarget.setPointerCapture(event.pointerId);
      if (!prefersReducedMotion()) d.el.style.transition = "none";
    }

    d.dx = event.clientX - d.x0;
    const now = performance.now();
    d.samples.push([now, event.clientX]);
    d.samples = d.samples.filter(([t]) => now - t < 100);

    // With reduced motion the card stays put and the release decides.
    if (prefersReducedMotion()) return;
    const tilt = Math.max(-TILT_MAX_DEG, Math.min(TILT_MAX_DEG, d.dx / TILT));
    d.el.style.transform = `translateX(${d.dx}px) rotate(${tilt}deg)`;
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || event.pointerId !== d.id) return;
    drag.current = null;
    if (!d.dragging) return;
    // The click that follows a drag's pointerup is not a tap.
    window.setTimeout(() => {
      moved.current = false;
    }, 0);

    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const speed =
      first && last && last[0] > first[0]
        ? (last[1] - first[1]) / (last[0] - first[0])
        : 0;
    const side = (Math.sign(d.dx) || Math.sign(speed) || 1) as 1 | -1;
    const flicked =
      Math.abs(speed) > SWIPE_SPEED && Math.sign(speed) === Math.sign(d.dx);
    // A cancelled pointer (the browser took the gesture for a scroll) is
    // never a swipe, however far it had got.
    if (
      event.type !== "pointercancel" &&
      (Math.abs(d.dx) > SWIPE_PX || flicked)
    ) {
      step(1, side);
    } else {
      settle(d.el);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const delta =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    refocus.current = stackRef.current?.contains(event.target as Node) ?? false;
    step(delta, -1);
  };

  const open = (project: Project, trigger: HTMLElement) => {
    if (moved.current) return;
    onOpen(project, trigger);
  };

  const current = projects[front];

  return (
    <div
      className="projects-deck"
      role="group"
      aria-roledescription="mazo de tarjetas"
      aria-label="Proyectos"
      data-swapping={swapping ? "" : undefined}
      onKeyDown={onKeyDown}
    >
      <div
        className="projects-deck__stack"
        ref={stackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {projects.map((project, index) => {
          const place = (index - front + total) % total;
          const isFront = place === 0;
          return (
            <div
              className="projects-deck__card"
              key={project.id}
              data-index={index}
              data-pos={place < VISIBLE ? place : "hidden"}
              aria-hidden={isFront ? undefined : true}
              inert={!isFront}
            >
              <ProjectTile
                project={project}
                failed={failed.has(project.id)}
                onFail={() =>
                  setFailed((set) => new Set(set).add(project.id))
                }
                onOpen={open}
              />
            </div>
          );
        })}
      </div>

      <div className="projects-deck__controls">
        <p className="projects-deck__count" aria-live="polite" aria-atomic="true">
          <span className="sr-only">
            Proyecto {front + 1} de {total}: {current.title}
          </span>
          <span aria-hidden="true">
            {pad(front + 1)}
            <span className="projects-deck__total"> / {pad(total)}</span>
          </span>
        </p>

        <div className="projects-deck__buttons">
          <button
            type="button"
            className="projects-deck__btn"
            aria-label="Proyecto anterior"
            onClick={() => step(-1, -1)}
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
          </button>
          <button
            type="button"
            className="projects-deck__btn"
            aria-label="Proyecto siguiente"
            onClick={() => step(1, -1)}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path
                d="M8 4l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
