import { Button } from "@/components/Button/Button";
import { Reveal } from "@/components/Reveal/Reveal";
import { SectionHeading } from "@/components/SectionHeading/SectionHeading";
import servicesData from "@/data/services.json";
import type { Service } from "@/types";
import "./Services.scss";

const services = servicesData as Service[];

/**
 * Background texture for the section. Alternatives live in
 * public/images/works — swap the filename to change the look:
 * flow-nodes · mesh-bloom · blueprint-grid · chevron-field ·
 * isotype-scatter · contour-flow
 *
 * All of them are violet with transparency, so the section's own
 * background colour shows through and one file serves both themes.
 */
const BACKGROUND = "/images/works/isotype-scatter.webp";

export function Services() {
  return (
    <section className="services" id="servicios">
      {/* The texture is scoped to the masthead so it sits behind the
          title only, and so the list below keeps a plain surface. */}
      <div className="services__masthead">
        <img
          className="services__bg"
          src={BACKGROUND}
          alt=""
          loading="lazy"
          decoding="async"
          width={1920}
          height={1600}
        />

        <div className="services__inner">
          <SectionHeading
            eyebrow="Servicios"
            align="right"
            title={
              <>
                Lo que <span className="text-slab">hacemos</span>
              </>
            }
            intro="Cinco disciplinas que casi siempre viajan juntas. Podés tomar una sola, pero el resultado es mejor cuando se diseñan en conjunto."
          />
        </div>
      </div>

      <div className="services__inner">
        <div className="services__body">
          <Reveal className="services__aside">
            <div className="services__figure">
              <img
                src="/images/editorial/manifesto-3.jpg"
                alt=""
                loading="lazy"
                decoding="async"
                width={900}
                height={1100}
              />
            </div>
            <p className="services__aside-note">
              ¿No sabés por dónde empezar? El diagnóstico inicial te deja un
              mapa de procesos aunque después no trabajemos juntos.
            </p>
            <Button href="#contacto">Pedir diagnóstico</Button>
          </Reveal>

          <ul className="services__list">
            {services.map((service, index) => (
              <Reveal
                as="li"
                className="services__item"
                key={service.id}
                delay={index * 70}
              >
                <h3 className="services__item-title">{service.title}</h3>
                <p className="services__item-body">{service.description}</p>
                <ul className="services__chips">
                  {service.deliverables.map((item) => (
                    <li className="services__chip" key={item}>
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
