import { Fragment, useEffect, useRef } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import "./Manifesto.scss";

const STILL = "(prefers-reduced-motion: reduce)";

/**
 * The words light up one after another as the section scrolls through,
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

const figures = [
  {
    src: "/images/editorial/manifesto-100.jpg",
    position: "lead",
    width: 900,
    height: 1100,
  },
  {
    src: "/images/editorial/manifesto-200.jpg",
    position: "mid",
    width: 1100,
    height: 1200,
  },
  {
    src: "/images/editorial/manifesto-300.jpg",
    position: "trail",
    width: 900,
    height: 1100,
  },
];

export function Manifesto() {
  // Not rendered below $bp-lg rather than hidden with CSS: the three files
  // come to about 5 MB, and a display: none on a lazy image leaves it to
  // each browser to decide not to fetch it. Unmounted, nothing is asked for.
  const phone = useMediaQuery(PHONE);
  const showCollage = !phone;
  // The words only light up below $bp-lg, and reduced motion gets the
  // plain text in its final colour: either way, no word spans and no
  // scroll listener.
  const still = useMediaQuery(STILL);
  const lighting = phone && !still;
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
                <img
                  src={figure.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={figure.width}
                  height={figure.height}
                />
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
            <span className="manifesto__row">{words("lo repetitivo.")}</span>
          </span>
        </h2>

        {/* "Eso es" is the sentence talking; "eklekta." is the mark. So
            the lead-in is set in the statement's own face and ink and the
            name keeps the logo's face and brand colour — see
            .manifesto__closing-lead. */}
        <p className="manifesto__closing-line">
          <span className="manifesto__closing-lead">{words("Eso es")}</span>{" "}
          {words("eklekta.")}
        </p>
      </div>
    </section>
  );
}
