import { Button } from "@/components/Button/Button";
import { Reveal } from "@/components/Reveal/Reveal";
import { SectionHeading } from "@/components/SectionHeading/SectionHeading";
import servicesData from "@/data/services.json";
import { useScrollSequence } from "@/hooks/useScrollSequence";
import type { Service, ServiceMedia } from "@/types";
import "./Services.scss";

const services = servicesData as Service[];

const BACKGROUND = "/images/works/isotype-scatter.webp";

/** Every photo is generated at 4:5, the aspect the pinned panel uses.
 *  CSS sizes these, so the attributes only carry the ratio for CLS. */
const MEDIA_RATIO = { width: 800, height: 1000 };

const srcSet = (media: ServiceMedia, ext: "webp" | "jpg") =>
  media.widths.map((w) => `${media.src}-${w}.${ext} ${w}w`).join(", ");

/** Widest file, used as the plain `src` a browser without srcset takes. */
const fallback = (media: ServiceMedia) =>
  `${media.src}-${media.widths[media.widths.length - 1]}.jpg`;

export function Services() {
  const { trackRef, markerRef, active } = useScrollSequence<
    HTMLOListElement,
    HTMLDivElement
  >(services.length);

  return (
    <section className="services" id="servicios">
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
        <div className="services__inner">
          <SectionHeading
            eyebrow="Servicios"
            align="right"
            title={
              <>
                <p>Nuestros</p> <span className="text-slab">servicios</span>
              </>
            }
            intro="Cinco disciplinas que casi siempre viajan juntas. Podés tomar una sola, pero el resultado es mejor cuando se diseñan en conjunto."
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
              markup. */}
          <ol className="services__list" ref={trackRef}>
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

                {/* Below $bp-lg there is no pinned panel, so each service
                    carries its own photo inline instead. */}
                <div className="services__item-figure">
                  <picture>
                    <source
                      type="image/webp"
                      srcSet={srcSet(service.media, "webp")}
                      sizes="95vw"
                    />
                    <img
                      src={fallback(service.media)}
                      srcSet={srcSet(service.media, "jpg")}
                      sizes="95vw"
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

          {/* Pinned rail: the panel and the CTA travel together for the
              whole sequence, so the invitation is on screen no matter
              which service is being read. */}
          <div className="services__rail">
            {/* All five textures are stacked and cross-faded by opacity
                rather than swapping one src, so there is no blank frame
                while the next file decodes. Decorative: the service each
                one belongs to is named in the text column, so alt stays
                empty and screen readers skip the stack. */}
            <div className="services__media" ref={markerRef} aria-hidden="true">
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
