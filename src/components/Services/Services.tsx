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

  // Walks the rail to a card. Scrolls the CONTAINER, never the item:
  // scrollIntoView would take the page with it and drag the reader out
  // of the section they are standing in. The observer above keeps the
  // dots in step on its own, since a programmatic scroll crosses the
  // same intersections a thumb does.
  function goTo(index: number) {
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
                        sizes="(min-width: 768px) 44vw, 82vw"
                      />
                      <img
                        src={fallback(service.media)}
                        srcSet={srcSet(service.media, "jpg")}
                        sizes="(min-width: 768px) 44vw, 82vw"
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
