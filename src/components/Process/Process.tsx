import { Button } from '@/components/Button/Button'
import { Reveal } from '@/components/Reveal/Reveal'
import processData from '@/data/process.json'
import type { ProcessStep } from '@/types'
import './Process.scss'

const steps = processData as ProcessStep[]

export function Process() {
  return (
    <section className="process" id="proceso">
      <div className="process__inner">
        <Reveal className="process__figure">
          <img
            src="/images/editorial/process.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            width={1200}
            height={1700}
          />
        </Reveal>

        <div className="process__content">
          <Reveal className="process__head">
            <p className="process__eyebrow">Cómo trabajamos</p>
            <h2 className="process__title">Proceso</h2>
            <p className="process__intro">
              Cuatro etapas, sin sorpresas. Sabés qué se entrega en cada una,
              cuánto dura y qué necesitamos de tu lado antes de empezar.
            </p>
            <div className="process__actions">
              <Button href="#contacto">Agendar diagnóstico</Button>
              <Button href="#proyectos" variant="outline">
                Ver proyectos
              </Button>
            </div>
          </Reveal>

          {/* An ordered list because the order is the point: each step
              depends on what the previous one produced. */}
          <ol className="process__steps">
            {steps.map((step, index) => (
              <Reveal as="li" className="step" key={step.id} delay={index * 80}>
                <div className="step__meta">
                  <span className="step__number">{step.step}</span>
                  <span className="step__duration">{step.duration}</span>
                </div>
                <h3 className="step__title">{step.title}</h3>
                <p className="step__body">{step.description}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
