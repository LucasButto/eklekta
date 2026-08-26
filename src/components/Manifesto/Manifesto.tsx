import { Reveal } from '@/components/Reveal/Reveal'
import './Manifesto.scss'

const figures = [
  { src: '/images/editorial/manifesto-100.jpg', position: 'lead', width: 900, height: 1100 },
  { src: '/images/editorial/manifesto-200.jpg', position: 'mid', width: 1100, height: 1200 },
  { src: '/images/editorial/manifesto-300.jpg', position: 'trail', width: 900, height: 1100 },
]

export function Manifesto() {
  return (
    <section className="manifesto" aria-labelledby="manifesto-title">
      <div className="manifesto__stage">
        {figures.map((figure) => (
          <div className={`manifesto__figure manifesto__figure--${figure.position}`} key={figure.src}>
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

        <h2 className="manifesto__text" id="manifesto-title">
          Automatizar no es sumar herramientas. Es sacar del medio todo lo que
          no debería necesitar tu atención.
        </h2>
      </div>

      <Reveal className="manifesto__closing">
        <p className="manifesto__closing-line">Eso es eklekta.</p>
      </Reveal>
    </section>
  )
}
