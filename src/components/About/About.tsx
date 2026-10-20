import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Reveal } from "@/components/Reveal/Reveal";
import { SectionHeading } from "@/components/SectionHeading/SectionHeading";
import processData from "@/data/process.json";
import { useEndlessRail, withClones } from "@/hooks/useEndlessRail";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { ProcessStep } from "@/types";
import "./About.scss";

const steps = processData as ProcessStep[];

/**
 * Each step's photo is a path stem with two cuts behind it (see
 * scripts/make-section-photos.mjs):
 *   `${image}-{800,1200,1480}.{webp,jpg}`          the landscape original
 *   `${image}-notebook-{640,960,1254}.{webp,jpg}`  a square recut
 * The square one only serves the laptop band, $bp-lg to $bp-3xl, where
 * the stage is too narrow for a landscape frame to stay tall enough.
 * Phones and 1080p up keep the original. Either way the frame holds that
 * photo's ratio (About.scss), so a resize scales the photo, never
 * re-crops it.
 */
const PHOTO_WIDTHS = [800, 1200, 1480];
const NOTEBOOK_WIDTHS = [640, 960, 1254];

// The laptop band. Matches the up($bp-lg) / up($bp-3xl) pair on
// .about__slide in About.scss.
const NOTEBOOK_MEDIA = "(min-width: 1024px) and (max-width: 1919.98px)";

const imageSet = (stem: string, widths: number[], ext: "webp" | "jpg") =>
  widths.map((w) => `${stem}-${w}.${ext} ${w}w`).join(", ");

// The stage is the photo's biggest frame: full width of the column below
// $bp-lg, and about half the viewport (bleeding to the edge) above it.
const STAGE_SIZES = "(min-width: 1024px) 55vw, 100vw";

/**
 * Below $bp-lg the carousel is the same endless scroll-snap rail Servicios
 * has (see useEndlessRail): a card per step — photo, title, text — one per
 * screen, with the arrows and dots under it. From there up it is the stage
 * and peek below. Matches the `down($bp-lg)` in About.scss.
 */
const TOUCH_LAYOUT = "(max-width: 1023.98px)";

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
  const isTouchLayout = useMediaQuery(TOUCH_LAYOUT);

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
    // The phone rail is moved by the reader only.
    if (paused || isTouchLayout || prefersReducedMotion()) return;
    const timer = window.setTimeout(() => {
      go((index + 1) % steps.length);
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, isTouchLayout]);

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

  // ---- the phone rail -----------------------------------------------
  const railRef = useRef<HTMLOListElement | null>(null);
  const {
    shown: railShown,
    goTo: railGoTo,
    step: railStep,
  } = useEndlessRail(railRef, {
    count: steps.length,
    active: isTouchLayout,
    endless: isTouchLayout,
  });

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
      {isTouchLayout ? (
        <Reveal className="about__railbox">
          {/* The same endless rail Servicios has: a card per step, one per
              screen, the first and last flanked by a clone of the other so
              the swipe never goes the long way round. The clones are
              hidden from assistive tech and from the keyboard. */}
          <div
            className="about__rail"
            role="region"
            aria-label="Proceso, carrusel"
            tabIndex={0}
          >
            <ol className="about__list" ref={railRef}>
              {withClones(steps, true).map(({ item: entry, index: at, clone }) => (
                <li
                  className="about__card"
                  key={clone ? `clone-${clone}-${at}` : entry.id}
                  data-index={at}
                  {...(clone ? { "aria-hidden": true, inert: true } : {})}
                >
                  <figure className="about__card-photo">
                    <picture>
                      <source
                        type="image/webp"
                        srcSet={imageSet(entry.image, PHOTO_WIDTHS, "webp")}
                        sizes="100vw"
                      />
                      <img
                        src={`${entry.image}-1200.jpg`}
                        srcSet={imageSet(entry.image, PHOTO_WIDTHS, "jpg")}
                        sizes="100vw"
                        alt=""
                        loading={at === 0 && !clone ? "eager" : "lazy"}
                        decoding="async"
                        width={1200}
                        height={750}
                      />
                    </picture>
                  </figure>
                  <h3 className="about__title">{entry.title}</h3>
                  <p className="about__body">{entry.detail}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="about__nav">
            <button
              type="button"
              className="about__nav-btn about__nav-btn--prev"
              onClick={() => railStep(-1)}
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
                    aria-current={i === railShown ? "step" : undefined}
                    onClick={() => railGoTo(i)}
                  >
                    <span className="sr-only">
                      Paso {entry.step}: {entry.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="about__nav-btn about__nav-btn--next"
              onClick={() => railStep(1)}
            >
              <span className="sr-only">Siguiente paso</span>
              <ArrowIcon />
            </button>
          </div>
        </Reveal>
      ) : (
      <Reveal
        className="about__feature"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
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
                      onClick: () => go(prevIndex, "backward" as const),
                      onKeyDown: (event: KeyboardEvent) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        go(prevIndex, "backward");
                      },
                    }
                  : {})}
            >
              <picture>
                <source
                  media={NOTEBOOK_MEDIA}
                  type="image/webp"
                  srcSet={imageSet(
                    `${entry.image}-notebook`,
                    NOTEBOOK_WIDTHS,
                    "webp",
                  )}
                  sizes={STAGE_SIZES}
                />
                <source
                  media={NOTEBOOK_MEDIA}
                  type="image/jpeg"
                  srcSet={imageSet(
                    `${entry.image}-notebook`,
                    NOTEBOOK_WIDTHS,
                    "jpg",
                  )}
                  sizes={STAGE_SIZES}
                />
                <source
                  type="image/webp"
                  srcSet={imageSet(entry.image, PHOTO_WIDTHS, "webp")}
                  sizes={STAGE_SIZES}
                />
                <img
                  src={`${entry.image}-1200.jpg`}
                  srcSet={imageSet(entry.image, PHOTO_WIDTHS, "jpg")}
                  sizes={STAGE_SIZES}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  width={1200}
                  height={750}
                />
              </picture>
            </figure>
          );
        })}

        <div className="about__panel">
          {/* The live region is the stable wrapper; the copy inside is
              keyed so each step remounts and replays about-copy-in. */}
          <div className="about__copy-slot" aria-live="polite">
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
      )}
    </section>
  );
}
