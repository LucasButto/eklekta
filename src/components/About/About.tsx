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
import type { ProcessStep } from "@/types";
import "./About.scss";

const steps = processData as ProcessStep[];

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
  // The step being left behind, recorded as `go` fires. Going back it
  // is the leaving photo that crosses, and on a dot jump that is not
  // the step next to the new one, so the effect cannot work it out from
  // `index` alone.
  const leavingRef = useRef(0);
  // Carries --shift: the distance the crossing photo covers, measured
  // off its own FLIP and handed to everything else that travels with it
  // (the copy, the peek). It sits on the section because those live in
  // different branches of the tree, and .about__copy is keyed and
  // remounts every step, so the value could not live there anyway.
  const rootRef = useRef<HTMLElement | null>(null);

  function go(next: number, direction: "forward" | "backward" = "forward") {
    if (next === index) return;
    directionRef.current = direction;
    leavingRef.current = index;

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
    // Exactly one photo crosses: going forward the step arriving on
    // stage, going back the one leaving it. It is named outright rather
    // than picked as whichever box moved furthest, because the photo
    // landing in the peek now has an entrance transform of its own (see
    // about-slide-in) over the very same distance — a measured guess
    // would be a coin flip between the two.
    const crossIndex = direction === "forward" ? index : leavingRef.current;

    // Drop travels still in flight from a quick previous pick — all of
    // them, not just this step's. The CSS reveal is a CSSTransition
    // subclass, so it is left alone.
    for (const el of slideRefs.current) {
      if (!el) continue;
      for (const running of el.getAnimations()) {
        if (running.constructor === Animation) running.cancel();
      }
    }

    const el = slideRefs.current[crossIndex];
    const before = prev.get(crossIndex);
    const after = el?.getBoundingClientRect();
    let travelDx = 0;

    // Below $bp-lg only the stage slide is laid out, so a slide measures
    // zero at one end of the move — nothing to play back.
    if (el && before && after && before.width && after.width) {
      // The inline axis is stretch, which behaves as `start` the moment
      // the keyframe gives the slide a definite width, so dx is the
      // plain edge delta. The block axis is centred, so dy has to be the
      // *centre* delta or the slide starts half a height out.
      const dx = before.left - after.left;
      const dy =
        before.top + before.height / 2 - (after.top + after.height / 2);

      travelDx = dx;

      if (
        Math.abs(dx) >= 1 ||
        Math.abs(dy) >= 1 ||
        Math.abs(before.width - after.width) >= 1
      ) {
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
      }
    }

    // The copy and the waiting peek ride that same distance, in the same
    // time, on the same curve — so the three hold their spacing the
    // whole way and arrive as one composition rather than three things
    // that happen to move at once. Holding that spacing is also what
    // keeps the copy from ever crossing the peek's picture. Which side
    // it comes from is --dir's job, so only the magnitude goes through
    // here. Below $bp-lg no slide is laid out to measure, and the
    // property is dropped instead of left holding a stale desktop
    // distance across a resize.
    if (Math.abs(travelDx) > 1) {
      rootRef.current?.style.setProperty(
        "--shift",
        `${Math.round(Math.abs(travelDx))}px`,
      );
    } else {
      rootRef.current?.style.removeProperty("--shift");
    }

    prev.clear();
  }, [index]);

  const step = steps[index];

  return (
    // Which way the last step went, for the two entrances that need to
    // know: the copy reads it for the side it comes in from, and the
    // peek for whether it should play its own arrival at all (going
    // back, a photo is carried into that slot by the FLIP instead).
    <section
      className="about"
      id="nosotros"
      ref={rootRef}
      data-direction={directionRef.current}
    >
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
            <div className="about__copy" key={step.id}>
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
