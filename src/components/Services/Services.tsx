import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button/Button";
import { Reveal } from "@/components/Reveal/Reveal";
import { SectionHeading } from "@/components/SectionHeading/SectionHeading";
import servicesData from "@/data/services.json";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useScrollSequence } from "@/hooks/useScrollSequence";
import type { Service, ServiceMedia } from "@/types";
import "./Services.scss";

const services = servicesData as Service[];

const BACKGROUND = "/images/works/isotype-scatter.webp";

/**
 * Below $bp-lg the four services are a scroll-snap carousel instead of
 * the pinned rail's scroll sequence — see the &__carousel block in
 * Services.scss. Matches the `down($bp-lg)` the stylesheet uses, so the
 * two never disagree about which layout is on screen.
 */
const CAROUSEL = "(max-width: 1023.98px)";

/**
 * Where a card is the whole screen and nothing of the next one shows, so
 * the rail gets the one-time nudge below. From $bp-md two cards share the
 * row and the next is already half visible. Matches the `down($bp-md)`
 * in Services.scss.
 */
const SINGLE_CARD = "(max-width: 767.98px)";

/**
 * The nudge: the rail slides this far left, as if a thumb had started a
 * swipe, shows the start of the next card, and settles back. A share of
 * the screen, so it reads the same on a narrow phone and a wide one.
 */
const NUDGE_SHARE = 0.16;
const NUDGE_MIN_PX = 44;
const NUDGE_MAX_PX = 72;
const NUDGE_MS = 1900;

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_SWING = "cubic-bezier(0.45, 0, 0.55, 1)";

/**
 * The nudge as a card on a spring, not a slider: each stop is
 * [share of NUDGE_MS, how far out as a share of the distance (1 = fully out,
 * 0 = home, negative = past home, to the right), the easing into the NEXT
 * stop]. It shoots past the mark on the way out and rings down onto it,
 * holds so the next card can be read, then comes home past zero and
 * rebounds until it rests — the boing is both ends of the move.
 */
const NUDGE_PATH: ReadonlyArray<readonly [number, number, string]> = [
  [0, 0, EASE_OUT],
  [0.18, 1.08, EASE_SWING], // out, a touch past the mark
  [0.33, 1, "linear"], // eases back onto it, showing the next card
  [0.5, 1, EASE_SWING], // held
  [0.62, -0.22, EASE_SWING], // home, and past it
  [0.74, 0.08, EASE_SWING], // rebound
  [0.85, -0.03, EASE_SWING],
  [1, 0, "linear"],
];

/** Every photo is generated at 4:5, the aspect the pinned panel uses.
 *  CSS sizes these, so the attributes only carry the ratio for CLS. */
const MEDIA_RATIO = { width: 800, height: 1000 };

const srcSet = (media: ServiceMedia, ext: "webp" | "jpg") =>
  media.widths.map((w) => `${media.src}-${w}.${ext} ${w}w`).join(", ");

/** Widest file, used as the plain `src` a browser without srcset takes. */
const fallback = (media: ServiceMedia) =>
  `${media.src}-${media.widths[media.widths.length - 1]}.jpg`;

/** The arrow About's transport controls draw, mirrored in CSS for "previous". */
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

export function Services() {
  const isCarousel = useMediaQuery(CAROUSEL);
  const isSingleCard = useMediaQuery(SINGLE_CARD);

  // `count` is the hook's effect dependency and nothing else, so
  // handing it a different number is how the sequence is torn down and
  // rebuilt when the layout flips. Paired with the ref below, that
  // keeps the whole scroll-driven sequence — the fades and the reading
  // -line beat — to $bp-lg and up, where the pinned rail it drives
  // actually exists.
  const { trackRef, markerRef, active } = useScrollSequence<
    HTMLOListElement,
    HTMLDivElement
  >(isCarousel ? 0 : services.length);

  const listRef = useRef<HTMLOListElement | null>(null);
  const setList = useCallback(
    (node: HTMLOListElement | null) => {
      listRef.current = node;
      trackRef.current = isCarousel ? null : node;
    },
    [isCarousel, trackRef],
  );

  // Which card the rail is resting on, for the dots under it. Read off
  // the scroll container itself rather than from a scroll handler:
  // whichever card is showing the most of itself inside the rail is the
  // one being read, mid-swipe as well as at rest.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const list = listRef.current;
    if (!isCarousel || !list) return;

    const items = Array.from(
      list.querySelectorAll<HTMLLIElement>("[data-seq-item]"),
    );
    if (items.length === 0) return;

    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target, entry.intersectionRatio);
        }
        let best = 0;
        let bestRatio = -1;
        items.forEach((item, index) => {
          const ratio = ratios.get(item) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = index;
          }
        });
        setShown(best);
      },
      { root: list.parentElement, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    for (const item of items) observer.observe(item);
    return () => observer.disconnect();
  }, [isCarousel]);

  // The one-time nudge. Once, the first time the rail is fully on screen,
  // it slides a little to the left and comes back — a card that is the
  // whole screen gives no sign there is a second one, and this is the
  // sign. Moves the list with a transform rather than scrolling the
  // container: the rail is scroll-snap mandatory, which would pull a
  // small programmatic scroll straight back to the first card.
  //
  // It is only ever a hint, so it gives way to the reader moving the rail:
  // a sideways swipe (the rail itself scrolling) or a tap on the arrows or
  // dots cancels it, and the rail is then wherever the reader put it. A
  // thumb that lands on the rail and keeps scrolling the PAGE does not —
  // the reader is still on their way down, and the nudge plays out under
  // them. Reduced motion skips it entirely.
  const nudgeRef = useRef<Animation | null>(null);
  const nudgedRef = useRef(false);
  useEffect(() => {
    const list = listRef.current;
    const carousel = list?.parentElement;
    if (!isSingleCard || !list || !carousel || nudgedRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cancel = () => {
      nudgeRef.current?.cancel();
    };
    // A sideways swipe is the reader taking over. Measured off scrollLeft,
    // not just the event, so a scroll that goes nowhere is not one.
    const onScroll = () => {
      if (nudgeRef.current && carousel.scrollLeft > 2) cancel();
    };

    // Fully on screen: every pixel of the rail is inside the viewport — or,
    // if it is taller than the viewport, as much of it as a viewport can
    // hold.
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry || nudgedRef.current) return;
        const visible = entry.intersectionRect.height;
        const wanted = Math.min(
          entry.boundingClientRect.height,
          entry.rootBounds?.height ?? window.innerHeight,
        );
        if (!entry.isIntersecting || visible < wanted - 2) return;

        nudgedRef.current = true;
        observer.disconnect();
        // Already moved by hand: nothing left to hint at.
        if (carousel.scrollLeft > 2) return;

        const distance = Math.round(
          Math.min(
            NUDGE_MAX_PX,
            Math.max(NUDGE_MIN_PX, window.innerWidth * NUDGE_SHARE),
          ),
        );
        // Out with a rebound, a beat to be seen, and back with another —
        // see NUDGE_PATH.
        nudgeRef.current = list.animate(
          NUDGE_PATH.map(([offset, out, easing]) => ({
            offset,
            transform: `translateX(${Math.round(-out * distance * 10) / 10}px)`,
            easing,
          })),
          { duration: NUDGE_MS },
        );
        // Snap is off for the length of the nudge: snap points follow the
        // cards' transformed boxes, so when the rebound carried the first
        // card past home the rail re-snapped onto it — a real scroll,
        // which read as the reader swiping and cut the bounce short.
        carousel.style.scrollSnapType = "none";
        const settle = () => {
          nudgeRef.current = null;
          carousel.style.scrollSnapType = "";
        };
        nudgeRef.current.onfinish = settle;
        nudgeRef.current.oncancel = settle;
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    );
    observer.observe(carousel);

    // Only the rail's own horizontal scroll counts as the reader taking
    // over; vertical page scrolling never fires this.
    carousel.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      carousel.removeEventListener("scroll", onScroll);
      cancel();
    };
  }, [isSingleCard]);

  // Walks the rail to a card. Scrolls the CONTAINER, never the item:
  // scrollIntoView would take the page with it and drag the reader out
  // of the section they are standing in. The observer above keeps the
  // dots in step on its own, since a programmatic scroll crosses the
  // same intersections a thumb does.
  function goTo(index: number) {
    // A nudge still in flight would be measured as part of the card's
    // position, and is pointless once the reader is driving.
    nudgeRef.current?.cancel();
    nudgeRef.current = null;
    const list = listRef.current;
    const carousel = list?.parentElement;
    const item = list?.children[index];
    if (!carousel || !(item instanceof HTMLElement)) return;

    // The snapport's own start inset, so the card lands on the page
    // gutter rather than flush against the bled edge — the same place
    // scroll-snap puts it after a swipe.
    const inset =
      parseFloat(getComputedStyle(carousel).scrollPaddingInlineStart) || 0;
    const delta =
      item.getBoundingClientRect().left - carousel.getBoundingClientRect().left;

    carousel.scrollTo({
      left: carousel.scrollLeft + delta - inset,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  return (
    <section className="services">
      <img
        className="services__bg"
        src={BACKGROUND}
        alt=""
        loading="lazy"
        decoding="async"
        width={1920}
        height={1600}
      />

      <div className="services__masthead">
        <div className="services__inner" id="servicios">
          <SectionHeading
            align="right"
            title={
              <>
                <p>Nuestros</p> <span className="text-slab">servicios</span>
              </>
            }
            intro="Cuatro disciplinas que casi siempre viajan juntas. Podés tomar una sola, pero el resultado es mejor cuando se diseñan en conjunto."
          />
        </div>
      </div>

      <div className="services__inner">
        <div className="services__body">
          {/* The list comes first in the DOM so that on mobile — where
              the grid collapses to one column and the panel is hidden —
              the note and CTA fall after the services instead of ahead
              of them. Desktop puts the rail back on the left with an
              explicit grid-column, no order hack and no duplicate
              markup.

              The wrapper is the scroll-snap rail below $bp-lg and
              `display: contents` above it, so at every desktop width the
              grid still sees .services__list as its own item and nothing
              about the pinned sequence changes. role / label / tab stop
              only exist while it is really a carousel. */}
          <div
            className="services__carousel"
            {...(isCarousel
              ? {
                  role: "region" as const,
                  "aria-label": "Servicios, carrusel",
                  tabIndex: 0,
                }
              : {})}
          >
            <ol className="services__list" ref={setList}>
              {services.map((service) => (
                <li className="services__item" key={service.id} data-seq-item>
                  <h3 className="services__item-title">{service.title}</h3>
                  <p className="services__item-body">{service.description}</p>
                  <ul className="services__chips">
                    {service.deliverables.map((item) => (
                      <li className="services__chip" key={item}>
                        {item}
                      </li>
                    ))}
                  </ul>

                  {/* Below $bp-lg there is no pinned panel, so each
                      service carries its own photo inline instead — on
                      the carousel card it is ordered above the type
                      (see &__item-figure in Services.scss). */}
                  <div className="services__item-figure">
                    <picture>
                      <source
                        type="image/webp"
                        srcSet={srcSet(service.media, "webp")}
                        sizes="(min-width: 768px) 44vw, 100vw"
                      />
                      <img
                        src={fallback(service.media)}
                        srcSet={srcSet(service.media, "jpg")}
                        sizes="(min-width: 768px) 44vw, 100vw"
                        alt=""
                        loading="lazy"
                        decoding="async"
                        {...MEDIA_RATIO}
                      />
                    </picture>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* The carousel's controls: previous, the dots, next — the same
              row About's carousel ends in, so the two sections drive the
              same way. The dots alone were the only thing to reach for
              here, which left a thumb with four small targets and no
              obvious "next"; the arrows are the big ones, and they wrap
              round at either end like About's do.

              Real buttons throughout, so a thumb, Tab and Enter all reach
              every service. Rendered only where the carousel is. */}
          {isCarousel && (
            <div
              className="services__nav"
              role="group"
              aria-label="Servicios, paginación"
            >
              <button
                type="button"
                className="services__nav-btn services__nav-btn--prev"
                onClick={() =>
                  goTo((shown - 1 + services.length) % services.length)
                }
              >
                <span className="sr-only">Servicio anterior</span>
                <ArrowIcon />
              </button>

              <div className="services__progress">
                {services.map((service, index) => (
                  <button
                    type="button"
                    className="services__dot"
                    key={service.id}
                    aria-label={`Ir al servicio ${index + 1}: ${service.title}`}
                    aria-current={index === shown ? "true" : undefined}
                    onClick={() => goTo(index)}
                  />
                ))}
              </div>

              <button
                type="button"
                className="services__nav-btn services__nav-btn--next"
                onClick={() => goTo((shown + 1) % services.length)}
              >
                <span className="sr-only">Siguiente servicio</span>
                <ArrowIcon />
              </button>
            </div>
          )}

          {/* Pinned rail: the panel and the CTA travel together for the
              whole sequence, so the invitation is on screen no matter
              which service is being read.

              It is also the sequence's marker — the reading line is this
              whole column's centre, not the photo's. The photo sits high
              in the rail (the closing note is under it), so lining the
              service text up with the photo alone left the text reading
              as too high in the column. */}
          <div className="services__rail" ref={markerRef}>
            {/* All four textures are stacked and cross-faded by opacity
                rather than swapping one src, so there is no blank frame
                while the next file decodes. Decorative: the service each
                one belongs to is named in the text column, so alt stays
                empty and screen readers skip the stack. */}
            <div className="services__media" aria-hidden="true">
              {services.map((service, index) => (
                <picture
                  className="services__shot"
                  key={service.id}
                  data-active={index === active}
                >
                  <source
                    type="image/webp"
                    srcSet={srcSet(service.media, "webp")}
                    sizes="(min-width: 2400px) 850px, (min-width: 1600px) 620px, 45vw"
                  />
                  <img
                    src={fallback(service.media)}
                    srcSet={srcSet(service.media, "jpg")}
                    sizes="(min-width: 2400px) 850px, (min-width: 1600px) 620px, 45vw"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    {...MEDIA_RATIO}
                  />
                </picture>
              ))}
            </div>

            <Reveal className="services__closing">
              <p className="services__closing-note">
                ¿No sabés por dónde empezar? El diagnóstico inicial te deja un
                mapa de procesos aunque después no trabajemos juntos.
              </p>
              <Button href="#contacto">Pedir diagnóstico</Button>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
