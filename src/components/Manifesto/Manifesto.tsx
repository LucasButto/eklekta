import { useMediaQuery } from "@/hooks/useMediaQuery";
import "./Manifesto.scss";

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
  const showCollage = !useMediaQuery(PHONE);

  return (
    <section className="manifesto" aria-labelledby="manifesto-title">
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
            <span className="manifesto__row">Automatizar</span>{" "}
            <span className="manifesto__row">no es sumar</span>{" "}
            <span className="manifesto__row">herramientas.</span>
          </span>{" "}
          <span className="manifesto__part manifesto__part--two">
            <span className="manifesto__row">Es sacar</span>{" "}
            <span className="manifesto__row">del medio</span>{" "}
            <span className="manifesto__row">lo repetitivo.</span>
          </span>
        </h2>

        {/* "Eso es" is the sentence talking; "eklekta." is the mark. So
            the lead-in is set in the statement's own face and ink and the
            name keeps the logo's face and brand colour — see
            .manifesto__closing-lead. */}
        <p className="manifesto__closing-line">
          <span className="manifesto__closing-lead">Eso es</span> eklekta.
        </p>
      </div>
    </section>
  );
}
