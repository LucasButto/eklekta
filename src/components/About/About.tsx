import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/Reveal/Reveal";
import { SectionHeading } from "@/components/SectionHeading/SectionHeading";
import processData from "@/data/process.json";
import { useEndlessRail, withClones } from "@/hooks/useEndlessRail";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useScrollBeat } from "@/hooks/useScrollBeat";
import { useScrollEntrance } from "@/hooks/useScrollEntrance";
import type { ProcessStep } from "@/types";
import "./About.scss";

const steps = processData as ProcessStep[];

/**
 * Each step's photo is a path stem with two cuts behind it (see
 * scripts/make-section-photos.mjs):
 *   `${image}-{800,1200,1480}.{webp,jpg}`          the landscape original
 *   `${image}-notebook-{640,960,1254}.{webp,jpg}`  a square recut
 * The phone rail shows the landscape one. The desktop stage is half the
 * screen wide and one screen tall — close to square on most screens (see
 * &__stage in About.scss) — so it shows the square one.
 */
const PHOTO_WIDTHS = [800, 1200, 1480];
const NOTEBOOK_WIDTHS = [640, 960, 1254];

const imageSet = (stem: string, widths: number[], ext: "webp" | "jpg") =>
  widths.map((w) => `${stem}-${w}.${ext} ${w}w`).join(", ");

// The stage is the right half of the screen.
const STAGE_SIZES = "50vw";

/**
 * Below $bp-lg the carousel is the same endless scroll-snap rail Servicios
 * has (see useEndlessRail): a card per step — photo, title, text — one per
 * screen, with the arrows and dots under it. From there up it is the split
 * layout: copy on the left, the photo filling the right. Matches the
 * `down($bp-lg)` in About.scss.
 */
const TOUCH_LAYOUT = "(max-width: 1023.98px)";

// How long a step sits on stage before autoplay moves to the next one.
// Long enough to read the detail paragraph at a relaxed pace, not just
// a fast one.
const AUTOPLAY_MS = 9500;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  // Hovering or focusing anything in the carousel holds it on the
  // current step — reading the paragraph shouldn't race the timer.
  const [paused, setPaused] = useState(false);
  const isTouchLayout = useMediaQuery(TOUCH_LAYOUT);
  // Which way the step change runs: forward, the copy and the new photo
  // come in from the right while the old photo drifts off to the left;
  // back, the mirror. Set in the same handler as `setIndex`, so it lands
  // in one render.
  const [stepDirection, setStepDirection] = useState<"forward" | "backward">(
    "forward",
  );
  // The photo on its way out, which fades and drifts while the new one
  // comes in. Only one at a time: the next change hands the role on.
  const [leaving, setLeaving] = useState<number | null>(null);

  function go(next: number, direction: "forward" | "backward" = "forward") {
    if (next === index) return;
    setStepDirection(direction);
    setLeaving(index);
    setIndex(next);
  }

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

  // The photo is one screen tall, so this stops the scroll for a beat —
  // with the Servicios bounce, played by the whole split — exactly when
  // it fills the viewport, on the way down and on the way back up.
  const { ref: stageRef, bounceRef: splitRef } = useScrollBeat<
    HTMLDivElement,
    HTMLDivElement
  >(!isTouchLayout);
  // The entrance from the hero: copy in from the left, photo in from the
  // right, played once as the split starts to show (see &__split in
  // About.scss).
  const enterRef = useScrollEntrance<HTMLDivElement>(!isTouchLayout);

  const step = steps[index];

  const intro = (
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
  );

  return (
    <section className="about" id="nosotros">
      {isTouchLayout ? (
        <>
          {intro}
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
                {withClones(steps, true).map(
                  ({ item: entry, index: at, clone }) => (
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
                  ),
                )}
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
        </>
      ) : (
        // The four steps of Proceso, walked one at a time — the same
        // steps, written up in more depth here (the `detail` field in
        // process.json); Proceso stays the short recap. Heading and the
        // current step on the left; the photo fills the right column from
        // the section's top to its bottom. Autoplay pauses on hover/focus
        // anywhere in here.
        <div
          className="about__split"
          ref={(el) => {
            splitRef.current = el;
            enterRef.current = el;
          }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className="about__text">
            {intro}

            <Reveal className="about__panel">
              {/* Every step is laid out invisibly in the same grid cell, so
                  the slot is as tall as the longest one and the controls
                  under it never move. The live copy is keyed so each step
                  remounts and replays about-copy-in. */}
              <div className="about__copy-slot">
                {steps.map((entry) => (
                  <div
                    className="about__copy about__copy--sizer"
                    aria-hidden="true"
                    key={entry.id}
                  >
                    <h3 className="about__title">{entry.title}</h3>
                    <p className="about__body">{entry.detail}</p>
                  </div>
                ))}
                <div aria-live="polite">
                  <div
                    className="about__copy"
                    data-direction={stepDirection}
                    key={step.id}
                  >
                    <h3 className="about__title">{step.title}</h3>
                    <p className="about__body">{step.detail}</p>
                  </div>
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
                        // A dot behind the current step plays the copy in
                        // from the left, like the prev arrow.
                        onClick={() =>
                          go(i, i < index ? "backward" : "forward")
                        }
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
                  onClick={() => go((index + 1) % steps.length)}
                >
                  <span className="sr-only">Siguiente paso</span>
                  <ArrowIcon />
                </button>
              </div>
            </Reveal>
          </div>

          {/* Every photo is stacked in the one frame. On a step change
              the old one fades out drifting a little toward one side
              while the new one fades in from the other — see
              `stepDirection`. */}
          <div
            className="about__stage"
            ref={stageRef}
            data-direction={stepDirection}
          >
            <Reveal className="about__photos">
              {steps.map((entry, i) => (
                <figure
                  className="about__slide"
                  data-state={
                    i === index ? "active" : i === leaving ? "leaving" : undefined
                  }
                  key={entry.id}
                >
                  <picture>
                    <source
                      type="image/webp"
                      srcSet={imageSet(
                        `${entry.image}-notebook`,
                        NOTEBOOK_WIDTHS,
                        "webp",
                      )}
                      sizes={STAGE_SIZES}
                    />
                    <img
                      src={`${entry.image}-notebook-960.jpg`}
                      srcSet={imageSet(
                        `${entry.image}-notebook`,
                        NOTEBOOK_WIDTHS,
                        "jpg",
                      )}
                      sizes={STAGE_SIZES}
                      alt=""
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                      width={960}
                      height={960}
                    />
                  </picture>
                </figure>
              ))}
            </Reveal>
          </div>
        </div>
      )}
    </section>
  );
}
