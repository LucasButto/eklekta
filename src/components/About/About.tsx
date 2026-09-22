import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Reveal } from "@/components/Reveal/Reveal";
import { SectionHeading } from "@/components/SectionHeading/SectionHeading";
import processData from "@/data/process.json";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { ProcessStep } from "@/types";
import "./About.scss";

const steps = processData as ProcessStep[];

/**
 * Below $bp-lg the carousel is one photo and a panel of controls — no
 * peek slot, nothing to drag a card out of — so the photo itself is the
 * only surface a thumb has to work with. Matches the `down($bp-lg)` in
 * About.scss.
 */
const TOUCH_LAYOUT = "(max-width: 1023.98px)";

/** How far a drag has to travel across the photo to count as a swipe. */
const SWIPE_PX = 44;

/**
 * …and how much straighter than it is tall. A near-vertical drag is the
 * reader scrolling the page with their thumb over the photo, and must
 * never be read as a step change.
 */
const SWIPE_RATIO = 1.4;

// How long the moving photo takes to travel between the peek slot and
// the stage (either direction). Kept in sync by eye with $travel in
// About.scss, which runs the blur / opacity half of the same move as a
// CSS transition.
const TRAVEL_MS = 850;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// How long a step sits on stage before autoplay moves to the next one.
// Long enough to read the detail paragraph at a relaxed pace, not just
// a fast one.
const AUTOPLAY_MS = 9500;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Which of the four slots a slide occupies. `out` is the step that just
 * left: it holds the stage at opacity 0 while the new photo flies in
 * over it, so the old one fades in place instead of darting sideways.
 */
function slotFor(i: number, index: number, out: number | null, total: number) {
  if (i === index) return "active";
  if (i === out) return "out";
  if (i === (index + 1) % total) return "next";
  return "rest";
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M4 10h11M11 5.5 15.5 10 11 14.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function About() {
  const [index, setIndex] = useState(0);
  // Wrapped in an object so re-picking a step still hands the effect a
  // fresh value and restarts the park timer. Only used going forward —
  // see `go`.
  const [out, setOut] = useState<{ i: number } | null>(null);
  // Hovering or focusing anything in the carousel holds it on the
  // current step — reading the paragraph shouldn't race the timer.
  const [paused, setPaused] = useState(false);

  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const prevRects = useRef<Map<number, DOMRect>>(new Map());
  // Read by the layout effect right after `go` fires, to decide which
  // slide gets the FLIP this time — see the effect below.
  const directionRef = useRef<"forward" | "backward">("forward");
  // The same value again, as state, for the things that RENDER from it:
  // which edge the copy and the photo slide in from. The ref cannot do
  // that job — reading it while rendering is exactly what the compiler
  // flags, and a ref does not schedule the render that would pick it up.
  // Set in the same handler as `setIndex`, so it lands in one render.
  const [stepDirection, setStepDirection] = useState<"forward" | "backward">(
    "forward",
  );

  function go(next: number, direction: "forward" | "backward" = "forward") {
    if (next === index) return;
    directionRef.current = direction;
    setStepDirection(direction);

    if (!prefersReducedMotion()) {
      // Snapshot where every slide sits before React re-lays them out;
      // the layout effect below plays the difference back.
      prevRects.current.clear();
      slideRefs.current.forEach((el, i) => {
        if (el) prevRects.current.set(i, el.getBoundingClientRect());
      });
      // Forward pins the leaving slide to the stage box (`out`) so it
      // just cross-fades in place while the incoming photo flies in
      // from the peek. Going back reverses which slide actually
      // travels — the leaving photo is the one that should retreat
      // toward the peek, not the incoming one arriving from it — so
      // `out` stays unset and the leaving slide is left to fall into
      // its natural "next" slot instead (see `slotFor`); the layout
      // effect then skips animating the incoming slide and lets the
      // leaving one ride its own FLIP there.
      setOut(direction === "forward" ? { i: index } : null);
    }

    setIndex(next);
  }

  // Park the outgoing slide back with the rest of the deck once its
  // fade has run, so the next time it is picked it flies in from the
  // peek slot rather than fading up in place on the stage.
  useEffect(() => {
    if (!out) return;
    const timer = window.setTimeout(() => setOut(null), TRAVEL_MS);
    return () => window.clearTimeout(timer);
  }, [out]);

  // Autoplay: a fresh countdown starts every time the step changes —
  // by the timer itself or by a manual pick — so a click never fights a
  // pending auto-advance. Paused on hover/focus, and skipped outright
  // for reduced motion rather than just running motionless, since it is
  // still an unrequested content change.
  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const timer = window.setTimeout(() => {
      go((index + 1) % steps.length);
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused]);

  useLayoutEffect(() => {
    const prev = prevRects.current;
    if (prev.size === 0) return;
    const direction = directionRef.current;

    slideRefs.current.forEach((el, i) => {
      const before = prev.get(i);
      if (!el || !before) return;
      const after = el.getBoundingClientRect();
      // Below $bp-lg only the stage slide is laid out, so a slide
      // measures zero at one end of the move — nothing to play back.
      if (!before.width || !after.width) return;

      // Drop a travel still in flight from a quick previous pick. The
      // CSS reveal is a CSSTransition subclass, so it is left alone.
      for (const running of el.getAnimations()) {
        if (running.constructor === Animation) running.cancel();
      }

      // Going back, the incoming slide (now "active") was sitting
      // hidden a moment ago and just fades into place on its own — see
      // the CSS opacity transition on .about__slide. It's the *leaving*
      // slide that visibly travels this time, stage → peek, so the
      // motion reads as undoing the forward move rather than repeating
      // it. That slide falls through to this same loop on its own
      // iteration (it's no longer pinned via `out`), so nothing else
      // here needs to change for it.
      if (direction === "backward" && i === index) return;

      // The inline axis is stretch, which behaves as `start` the moment
      // the keyframe gives the slide a definite width, so dx is the
      // plain edge delta. The block axis is centred, so dy has to be the
      // *centre* delta or the slide starts half a height out.
      const dx = before.left - after.left;
      const dy =
        before.top + before.height / 2 - (after.top + after.height / 2);

      if (
        Math.abs(dx) < 1 &&
        Math.abs(dy) < 1 &&
        Math.abs(before.width - after.width) < 1
      ) {
        return;
      }

      // Geometry (width / height), not scale: the photo's object-fit
      // re-crops as the frame reshapes rather than the picture
      // stretching, and it is never upscaled mid-travel. zIndex in the
      // keyframes (not the element's permanent CSS) rides above the
      // panel only for the moving slide's own travel, whichever
      // direction it happens to be going — see .about__slide's z-index
      // comment for why that crossing has to stay on top.
      el.animate(
        [
          {
            transform: `translate(${dx}px, ${dy}px)`,
            width: `${Math.round(before.width)}px`,
            height: `${Math.round(before.height)}px`,
            zIndex: "4",
          },
          {
            transform: "none",
            width: `${Math.round(after.width)}px`,
            height: `${Math.round(after.height)}px`,
            zIndex: "4",
          },
        ],
        { duration: TRAVEL_MS, easing: EASE, fill: "backwards" },
      );
    });

    prev.clear();
  }, [index]);

  // ---- swipe --------------------------------------------------------
  // On a phone the arrows and dots are small targets and nothing on the
  // screen says the steps can be moved any other way. A horizontal drag
  // ANYWHERE on the carousel — the photo, the title, the paragraph, the
  // space between — walks the same two steps the arrows do. It used to be
  // wired to the photo alone, so a swipe that started on the text (which
  // is most of the carousel's height) did nothing. Pointer events, so one
  // path covers touch and pen; `touch-action: pan-y` on .about__feature
  // (About.scss) is what leaves the page's own vertical scroll alone.
  // A mouse is left out: on a narrow desktop window a drag is a text
  // selection, and it should stay one.
  const isTouchLayout = useMediaQuery(TOUCH_LAYOUT);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  // Set when a drag turned into a step change, and read by the click
  // handler on the very next event so the gesture does not ALSO fire
  // the photo's own "go back" tap.
  const swiped = useRef(false);

  function onPointerDown(event: ReactPointerEvent) {
    if (!isTouchLayout || !event.isPrimary || event.pointerType === "mouse") {
      return;
    }
    // A press that lands on an arrow or a dot is that control's own tap,
    // not the start of a swipe.
    if ((event.target as Element).closest("button")) return;
    dragStart.current = { x: event.clientX, y: event.clientY };
    swiped.current = false;
  }

  function onPointerCancel() {
    dragStart.current = null;
  }

  function onPointerUp(event: ReactPointerEvent) {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) {
      return;
    }

    swiped.current = true;
    // Dragging left pulls the next step in from the right, the same
    // direction the peek photo travels on desktop.
    if (dx < 0) go((index + 1) % steps.length);
    else go((index - 1 + steps.length) % steps.length, "backward");
  }

  const step = steps[index];

  return (
    <section className="about" id="nosotros">
      <div className="about__intro">
        <SectionHeading
          title={
            <>
              Diseñamos lo que tu negocio necesita{" "}
              <span className="text-slab">para avanzar.</span>
            </>
          }
          intro="Diseño, desarrollo y automatización trabajan en la misma mesa. Por eso el producto, la interfaz y el proceso terminan contándose la misma historia en lugar de pelearse entre sí."
        />
      </div>

      {/* The four steps of Proceso, walked one at a time — the same
          steps, but written up in more depth here (see the `detail`
          field in process.json); Proceso stays the short recap. Every
          slide lives in this one grid for the whole life of the
          section — only its slot changes — so the photo that flies from
          the peek into the stage is the same DOM node the whole way,
          and a plain FLIP carries it. Autoplay pauses on hover/focus
          anywhere in here. */}
      <Reveal
        className="about__feature"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {steps.map((entry, i) => {
          const slot = slotFor(i, index, out?.i ?? null, steps.length);
          // Both visible photos double as controls — the peek one on the
          // right advances (same as the next arrow); the big one on the
          // left sends you back (same as the prev arrow), sliding over
          // to the peek side the way that arrow already does. The hidden
          // rest slides have nothing useful to do on click, so they're
          // left alone.
          const isNext = slot === "next";
          const isActive = slot === "active";
          const prevIndex = (index - 1 + steps.length) % steps.length;

          return (
            <figure
              className="about__slide"
              data-slot={slot}
              data-direction={stepDirection}
              key={entry.id}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              {...(isNext
                ? {
                    role: "button" as const,
                    tabIndex: 0,
                    "aria-label": `Ir al paso ${entry.step}: ${entry.title}`,
                    onClick: () => go(i),
                    onKeyDown: (event: KeyboardEvent) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      go(i);
                    },
                  }
                : isActive
                  ? {
                      role: "button" as const,
                      tabIndex: 0,
                      "aria-label": `Volver al paso ${steps[prevIndex].step}: ${steps[prevIndex].title}`,
                      onClick: () => {
                        // A swipe that just changed the step must not
                        // also count as the tap that goes back.
                        if (swiped.current) {
                          swiped.current = false;
                          return;
                        }
                        go(prevIndex, "backward" as const);
                      },
                      onKeyDown: (event: KeyboardEvent) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        go(prevIndex, "backward");
                      },
                    }
                  : {})}
            >
              <img
                src={entry.image}
                alt=""
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                width={1200}
                height={900}
              />
            </figure>
          );
        })}

        <div className="about__panel">
          {/* The live region is the stable wrapper; the copy inside is
              keyed so each step remounts and replays about-copy-in. */}
          <div className="about__copy-slot" aria-live="polite">
            {/* Below $bp-lg: an invisible copy of EVERY step, stacked in the
                same grid cell as the real one (see .about__copy-slot). The
                cell is then as tall as the longest of them, at this exact
                width, so the arrows and dots under it stay put instead of
                rising and falling with the word count. Not rendered from
                $bp-lg up, where the slot reserves its own height. */}
            {isTouchLayout &&
              steps.map((entry) => (
                <div
                  className="about__copy about__copy--sizer"
                  aria-hidden="true"
                  key={entry.id}
                >
                  <h3 className="about__title">{entry.title}</h3>
                  <p className="about__body">{entry.detail}</p>
                </div>
              ))}
            <div
              className="about__copy"
              data-direction={stepDirection}
              key={step.id}
            >
              <h3 className="about__title">{step.title}</h3>
              <p className="about__body">{step.detail}</p>
            </div>
          </div>

          <div className="about__nav">
            <button
              type="button"
              className="about__nav-btn about__nav-btn--prev"
              onClick={() =>
                go((index - 1 + steps.length) % steps.length, "backward")
              }
            >
              <span className="sr-only">Paso anterior</span>
              <ArrowIcon />
            </button>

            <ul className="about__dots">
              {steps.map((entry, i) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="about__dot"
                    aria-current={i === index ? "step" : undefined}
                    // A dot ahead of the current step plays forward; one
                    // behind it plays back — same two FLIPs as the arrow
                    // buttons, just picked by where the dot sits rather
                    // than which arrow was pressed.
                    onClick={() => go(i, i < index ? "backward" : "forward")}
                  >
                    <span className="sr-only">
                      Paso {entry.step}: {entry.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Small icon-only circles, no visible label. The next one
                does the same thing as clicking the peek photo itself
                (see isNext above) — hovering either one lifts and
                sharpens that photo (see the :has rule in About.scss) so
                the link between the two reads before the first click. */}
            <button
              type="button"
              className="about__nav-btn about__nav-btn--next"
              onClick={() => go((index + 1) % steps.length)}
            >
              <span className="sr-only">Siguiente paso</span>
              <ArrowIcon />
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
