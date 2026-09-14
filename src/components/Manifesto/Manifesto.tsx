import "./Manifesto.scss";

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
  return (
    <section className="manifesto" aria-labelledby="manifesto-title">
      <div className="manifesto__frame">
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

        <h2 className="manifesto__text" id="manifesto-title">
          {/* Two parts on their own blocks: the enhancement fades them
              in one at a time as the reader scrolls through the pin,
              then the closing line lands. The <h2> still carries the
              whole statement as its accessible name. */}
          <span className="manifesto__part manifesto__part--one">
            Automatizar no es sumar herramientas.
          </span>{" "}
          <span className="manifesto__part manifesto__part--two">
            Es sacar del medio lo repetitivo.
          </span>
        </h2>

        <p className="manifesto__closing-line">Eso es eklekta.</p>
      </div>
    </section>
  );
}
