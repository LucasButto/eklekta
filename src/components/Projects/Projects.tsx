import { Reveal } from '@/components/Reveal/Reveal'
import { SectionHeading } from '@/components/SectionHeading/SectionHeading'
import projectsData from '@/data/projects.json'
import type { Project } from '@/types'
import './Projects.scss'

const projects = projectsData as Project[]

// The bento's hero tile goes to the flagged project. sort() is stable,
// so everything else keeps the order it has in the JSON file.
const ordered = [...projects].sort((a, b) => Number(b.featured) - Number(a.featured))

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M6.5 13.5 13.5 6.5M7.5 6.5h6v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Projects() {
  return (
    <section className="projects" id="proyectos">
      <div className="projects__inner">
        <SectionHeading
          eyebrow="Proyectos"
          title="Trabajo hecho, no casos hipotéticos."
          intro="Una muestra de lo último. Cada proyecto abre el caso completo con el problema, lo que construimos y qué cambió después."
          className="projects__heading"
        />

        <ul className="projects__grid">
          {ordered.map((project, index) => (
            <Reveal
              as="li"
              key={project.id}
              className="projects__cell"
              delay={index * 90}
            >
              <article className="bento-card">
                <img
                  className="bento-card__image"
                  src={project.cover}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={1200}
                  height={1500}
                />
                <span className="bento-card__scrim" aria-hidden="true" />

                <p className="bento-card__metric">
                  <span className="bento-card__metric-value">{project.metric.value}</span>
                  <span className="bento-card__metric-label">{project.metric.label}</span>
                </p>

                <span className="bento-card__arrow" aria-hidden="true">
                  <Arrow />
                </span>

                <div className="bento-card__body">
                  <p className="bento-card__meta">
                    {project.categories.join(' / ')} · {project.year}
                  </p>

                  <h3 className="bento-card__title">
                    <a
                      className="bento-card__link"
                      href={project.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {project.title}
                      <span className="sr-only">
                        , ver el proyecto de {project.client}
                      </span>
                    </a>
                  </h3>

                  <p className="bento-card__summary">{project.summary}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
