import { Button } from "@/components/Button/Button";
import { Reveal } from "@/components/Reveal/Reveal";
import { SectionHeading } from "@/components/SectionHeading/SectionHeading";
import "./About.scss";

export function About() {
  return (
    <section className="about" id="nosotros">
      <div className="about__intro">
        <SectionHeading
          eyebrow="Quiénes somos"
          title="Diseñamos lo que tu negocio necesita para avanzar."
          intro="Diseño, desarrollo y automatización trabajan en la misma mesa. Por eso la marca, el producto y el proceso terminan contándose la misma historia en lugar de pelearse entre sí."
        />
      </div>

      <div className="about__feature">
        <Reveal className="about__figure about__figure--lead">
          <img
            src="/images/editorial/about.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            width={1400}
            height={1000}
          />
        </Reveal>

        <Reveal className="about__panel" delay={120}>
          <h3 className="about__panel-title">
            Empezamos por entender la operación, no por elegir la herramienta.
          </h3>
          <p className="about__panel-body">
            Antes de proponer un stack miramos cómo trabaja tu equipo hoy: dónde
            se copia y pega, qué dato se pierde, qué tarea nadie quiere hacer.
            Esa foto define el alcance, y el alcance define el presupuesto.
          </p>
          <Button href="#proceso" variant="outline">
            Cómo trabajamos
          </Button>
        </Reveal>

        <Reveal className="about__figure about__figure--trail" delay={220}>
          <img
            src="/images/editorial/manifesto-2.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            width={1100}
            height={1200}
          />
        </Reveal>
      </div>
    </section>
  );
}
