import { Button } from "@/components/Button/Button";
import { Reveal } from "@/components/Reveal/Reveal";
import { SectionHeading } from "@/components/SectionHeading/SectionHeading";
import processData from "@/data/process.json";
import type { ProcessStep } from "@/types";
import "./Process.scss";

const steps = processData as ProcessStep[];

const BACKGROUND = "/images/works/blueprint-grid.webp";

export function Process() {
  return (
    <section className="process">
      <img
        className="process__bg"
        src={BACKGROUND}
        alt=""
        loading="lazy"
        decoding="async"
        width={1920}
        height={1600}
      />

      <div className="process__masthead" id="proceso">
        <div className="process__inner">
          <div className="process__head">
            <SectionHeading title="Proceso" className="process__heading" />

            <Reveal className="process__aside" delay={120}>
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
          </div>
        </div>
      </div>

      <div className="process__inner">
        <ol className="process__stairs">
          {steps.map((step, index) => (
            <Reveal as="li" className="stage" key={step.id} delay={index * 90}>
              <span className="stage__num">{step.step}</span>

              <p className="stage__duration">
                <span className="sr-only">Duración: </span>
                {step.duration}
              </p>

              <div className="stage__text">
                <h3 className="stage__title">{step.title}</h3>
                <p className="stage__body">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
