import { useMemo } from 'react'
import projectsData from '@/data/projects.json'
import type { Project } from '@/types'
import './ProjectsRibbon.scss'

const projects = projectsData as Project[]

/**
 * The full-bleed strip under the hero. It shows the same work as the
 * Proyectos section, so it is a teaser rather than decoration — every
 * panel links straight to its project.
 */
export function ProjectsRibbon() {
  // Repeat until the strip is wide enough that the seam never shows,
  // then render the set twice so the loop can reset at -50%.
  const set = useMemo(() => {
    const items: Project[] = []
    while (items.length < 8) items.push(...projects)
    return items
  }, [])

  return (
    <div className="ribbon">
      <h2 className="sr-only">Trabajos recientes</h2>

      <div className="ribbon__viewport">
        <ul className="ribbon__track">
          {set.map((project, index) => (
            <li className="ribbon__item" key={`a-${project.id}-${index}`}>
              <a className="ribbon__link" href={project.url} target="_blank" rel="noreferrer noopener">
                <img
                  className="ribbon__image"
                  src={`${project.cover}-800.jpg`}
                  alt={`${project.title} — ${project.categories.join(', ')}`}
                  loading="lazy"
                  decoding="async"
                  width={1200}
                  height={1500}
                />
                <span className="ribbon__meta">
                  <span className="ribbon__name">{project.title}</span>
                  <span className="ribbon__tag">{project.categories[0]}</span>
                </span>
              </a>
            </li>
          ))}

          {set.map((project, index) => (
            <li className="ribbon__item" key={`b-${project.id}-${index}`} aria-hidden="true">
              <span className="ribbon__link ribbon__link--clone">
                <img
                  className="ribbon__image"
                  src={`${project.cover}-800.jpg`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={1200}
                  height={1500}
                />
                <span className="ribbon__meta">
                  <span className="ribbon__name">{project.title}</span>
                  <span className="ribbon__tag">{project.categories[0]}</span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
