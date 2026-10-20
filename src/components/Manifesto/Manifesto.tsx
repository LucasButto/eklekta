import { Fragment, useEffect, useRef } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import "./Manifesto.scss";

const STILL = "(prefers-reduced-motion: reduce)";

/**
 * Whether the timed entrance below $bp-lg can run: it waits for the
 * statement with an IntersectionObserver. Where it can, the word-by-word
 * lighting below would stack on top of it, so that stays off.
 */
const REVEAL = typeof IntersectionObserver !== "undefined";

/**
 * Where the statement scrolls into view and is revealed (Manifesto.scss):
 * once the first part's top edge has come this far up the screen — a
 * quarter of the way, measured from the bottom.
 */
const REVEAL_LINE = "0px 0px -25% 0px";

/**
 * The fallback for a phone whose browser cannot run the timed entrance:
 * the words light up one after another as the section scrolls through,
 * first to last — below $bp-lg only. From there up the text is the plain
 * statement the pinned photo sequence fades in (see the enhancement in
 * Manifesto.scss) and none of this applies.
 *
 * The block scrolls normally here, so the sweep is measured against the
 * viewport. It ends when the block's centre reaches READ — the middle of
 * the screen, where the reader is looking — so the whole statement has to
 * be lit by then, not after it has gone past.
 */
const READ = 0.5;

/**
 * Where it starts, relative to the block being entirely on screen (its
 * bottom edge at the viewport's), as a share of the viewport height:
 * positive waits that much further, negative starts that much sooner —
 * while the closing line is still coming in. The sweep's length is the
 * distance between this start and READ, and since READ is fixed at the
 * middle, starting sooner is what gives the fourteen words more scroll
 * to spread over.
 */
const HOLD = -0.06;

/**
 * Below $bp-lg the section is the statement and nothing else. The photographs
 * are a desktop device — they ride up past the pinned sentence as the reader
 * scrolls through it — and there is no pin to ride against on a phone, where
 * they were just three pictures with no context stacked around a sentence.
 * Matches the `down($bp-lg)` the stylesheet uses.
 */
const PHONE = "(max-width: 1023.98px)";

/**
 * Where the statement is set left-aligned, one sentence under the other,
 * with the brand slab on "lo repetitivo." — phones only. From $bp-md up it
 * is the centred statement the photographs ride past, plain. Matches the
 * `down($bp-md)` the stylesheet uses.
 */
const SMALL = "(max-width: 767.98px)";

/**
 * The three photographs, as path stems: `${src}-{480,800,1024}.{webp,jpg}`
 * are the real files (see scripts/make-section-photos.mjs). Listed in the
 * order they sit on the page — lead, mid, trail.
 */
const WIDTHS = [480, 800, 1024];

const srcSet = (stem: string, ext: "webp" | "jpg") =>
  WIDTHS.map((w) => `${stem}-${w}.${ext} ${w}w`).join(", ");

// The widest figure is ~29rem wide at its biggest (see the .manifesto__figure
// rules), about 27vw of the viewport from $bp-lg up.
const FIGURE_SIZES = "(min-width: 2400px) 850px, 27vw";

const figures = [
  {
    src: "/images/manifesto/ultimo-bloque-3",
    position: "lead",
    width: 1024,
    height: 1536,
  },
  {
    src: "/images/manifesto/ultimo-bloque-1",
    position: "mid",
    width: 1122,
    height: 1402,
  },
  {
    src: "/images/manifesto/ultimo-bloque-2",
    position: "trail",
    width: 1122,
    height: 1402,
  },
];

export function Manifesto() {
  // Not rendered below $bp-lg rather than hidden with CSS: the three files
  // come to about 5 MB, and a display: none on a lazy image leaves it to
  // each browser to decide not to fetch it. Unmounted, nothing is asked for.
  const phone = useMediaQuery(PHONE);
  const small = useMediaQuery(SMALL);
  const showCollage = !phone;
  // The words only light up below $bp-lg, and only where the timed
  // entrance is not available to do the job (see REVEAL). Reduced motion
  // gets the plain text in its final colour: in every other case, no word
  // spans and no scroll listener.
  const still = useMediaQuery(STILL);
  const lighting = phone && !still && !REVEAL;
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!lighting || !section) return;

    const text = section.querySelector<HTMLElement>(".manifesto__text");
    const closing = section.querySelector<HTMLElement>(
      ".manifesto__closing-line",
    );
    const spans = Array.from(
      section.querySelectorAll<HTMLElement>(".manifesto__word"),
    );
    if (!text || !closing || spans.length === 0) return;

    /** How many words are lit — the DOM is only touched when it moves. */
    let lit = -1;
    let raf = 0;

    const update = () => {
      raf = 0;
      const viewport = window.innerHeight;
      const top = text.getBoundingClientRect().top;
      const height = closing.getBoundingClientRect().bottom - top;
      // The block's own top when its bottom edge just reaches the
      // viewport's — the moment it is entirely on screen — offset by
      // HOLD. (If the block is taller than the viewport it never is
      // fully on screen; fall through to already-lit rather than leave
      // it dim and unreadable.)
      const from = viewport - height - HOLD * viewport;
      const to = READ * viewport - height / 2;
      const span = from - to;
      const progress = span > 0 ? (from - top) / span : 1;

      const count = Math.round(
        Math.min(1, Math.max(0, progress)) * spans.length,
      );
      if (count === lit) return;
      lit = count;
      spans.forEach((word, index) =>
        word.classList.toggle("is-active", index < count),
      );
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [lighting]);

  // The entrance, on the clock rather than on the scroll: once, when the
  // first part has come a quarter of the way up the screen, the section
  // gets .is-revealed and the three pieces play their timed fade-and-rise
  // (Manifesto.scss) — the same speed whether the reader keeps scrolling,
  // stops, or flicks past. When the closing line's own entrance ends the
  // whole statement is on screen, and "eklekta." gets .is-shaking: a
  // wobble on a loop from then on. Both classes are only ever added.
  // Phones and tablets only, never under reduced motion (which shows the
  // text as it is).
  const revealing = phone && !still && REVEAL;
  useEffect(() => {
    const section = sectionRef.current;
    if (!revealing || !section) return;
    const first = section.querySelector<HTMLElement>(".manifesto__part--one");
    const closing = section.querySelector<HTMLElement>(
      ".manifesto__closing-line",
    );
    const brand = section.querySelector<HTMLElement>(".manifesto__brand-word");
    if (!first || !closing || !brand) return;

    const onLanded = (event: AnimationEvent) => {
      if (event.target !== closing) return;
      brand.classList.add("is-shaking");
    };
    closing.addEventListener("animationend", onLanded);

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        section.classList.add("is-revealed");
        observer.disconnect();
      },
      { rootMargin: REVEAL_LINE },
    );
    observer.observe(first);

    return () => {
      observer.disconnect();
      closing.removeEventListener("animationend", onLanded);
    };
  }, [revealing]);

  /**
   * One run of text split into word spans. The words sit inside one
   * inline wrapper rather than straight in the row: below $bp-md a
   * .manifesto__row is a flex container, which drops the whitespace
   * between its children — the wrapper stays a single flex item, laid
   * out exactly as the bare text was.
   */
  const words = (run: string) =>
    !lighting ? (
      run
    ) : (
      <span className="manifesto__words">
        {run.split(" ").map((word, index) => (
          <Fragment key={index}>
            {index > 0 && " "}
            <span className="manifesto__word">{word}</span>
          </Fragment>
        ))}
      </span>
    );

  return (
    <section
      className="manifesto"
      aria-labelledby="manifesto-title"
      ref={sectionRef}
    >
      <div className="manifesto__frame">
        {showCollage && (
          <div className="manifesto__collage" aria-hidden="true">
            {figures.map((figure) => (
              <div
                className={`manifesto__figure manifesto__figure--${figure.position}`}
                key={figure.src}
              >
                <picture>
                  <source
                    type="image/webp"
                    srcSet={srcSet(figure.src, "webp")}
                    sizes={FIGURE_SIZES}
                  />
                  <img
                    src={`${figure.src}-800.jpg`}
                    srcSet={srcSet(figure.src, "jpg")}
                    sizes={FIGURE_SIZES}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={figure.width}
                    height={figure.height}
                  />
                </picture>
              </div>
            ))}
          </div>
        )}

        <h2 className="manifesto__text" id="manifesto-title">
          {/* Two parts on their own blocks: the enhancement fades them
              in one at a time as the reader scrolls through the pin,
              then the closing line lands. The <h2> still carries the
              whole statement as its accessible name.

              Below $bp-md each part anchors to an opposite edge and every
              one of its rows carries a brand bar, stepping out row by
              row. A bar has to know where its row ends, and a wrapped
              line is not an element, so each row is written out here.
              .manifesto__row is `display: contents` from $bp-md up — the
              spans then vanish from layout, the three runs and the
              spaces between them rejoin into one sentence, and the wide
              statement wraps and renders exactly as it did before these
              wrappers existed. */}
          <span className="manifesto__part manifesto__part--one">
            <span className="manifesto__row">{words("Automatizar")}</span>{" "}
            <span className="manifesto__row">{words("no es sumar")}</span>{" "}
            <span className="manifesto__row">{words("herramientas.")}</span>
          </span>{" "}
          <span className="manifesto__part manifesto__part--two">
            <span className="manifesto__row">{words("Es sacar")}</span>{" "}
            <span className="manifesto__row">{words("del medio")}</span>{" "}
            <span className="manifesto__row">
              {/* The slab is the shared .text-slab, so it is the same
                  mark as "servicios" and "entrega." in either theme. */}
              {small ? (
                <span className="text-slab">{words("lo repetitivo.")}</span>
              ) : (
                words("lo repetitivo.")
              )}
            </span>
          </span>
        </h2>

        {/* "Eso es" is the sentence talking; "eklekta." is the mark. So
            the lead-in is set in the statement's own face and ink and the
            name keeps the logo's face and brand colour — see
            .manifesto__closing-lead. */}
        <p className="manifesto__closing-line">
          <span className="manifesto__closing-lead">{words("Eso es")}</span>{" "}
          <span className="manifesto__brand-word">{words("eklekta.")}</span>
        </p>
      </div>
    </section>
  );
}
