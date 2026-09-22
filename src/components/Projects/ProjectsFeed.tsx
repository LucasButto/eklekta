import { useState } from "react";
import type { Project } from "@/types";
import { coverSet, COVER_WIDTHS } from "./coverSet";

interface ProjectsFeedProps {
  projects: Project[];
  /** True while the leaving set is fading out on a filter change. */
  swapping: boolean;
  /** Hands back the card that opened the sheet, so focus can return. */
  onOpen: (project: Project, trigger: HTMLElement) => void;
}

/**
 * The feed is one card per project, full width, stacked — and, unlike
 * the bento it replaces below $bp-lg, every card shows the work. On the
 * desktop grid a card is a coloured poster and the screenshot is what it
 * hides until you hover it; on a phone there is no hover, so that
 * screenshot was simply never seen and four flat colour blocks were the
 * whole section.
 *
 * The poster is still here — it is what a card falls back to when a
 * project has no cover, or when the one it has fails to load.
 */
export function ProjectsFeed({ projects, swapping, onOpen }: ProjectsFeedProps) {
  // Covers that 404'd or otherwise refused to decode. Keyed by project
  // so one bad file costs one card its picture, not the whole feed.
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());

  return (
    <ul
      className="projects-feed"
      role="list"
      data-swapping={swapping ? "" : undefined}
    >
      {projects.map((project) => {
        const category = project.categories[0];
        const hasShot = Boolean(project.cover) && !failed.has(project.id);
        const set = hasShot ? coverSet(project.cover, COVER_WIDTHS) : null;

        return (
          <li className="projects-feed__cell" key={project.id}>
            <button
              type="button"
              className="project-tile"
              data-tint={project.tint ?? "violet"}
              data-poster={hasShot ? undefined : ""}
              onClick={(event) => onOpen(project, event.currentTarget)}
              aria-label={`${project.title}, ver el proyecto de ${project.client}`}
            >
              {set && (
                <span className="project-tile__shot" aria-hidden="true">
                  <picture>
                    <source
                      type="image/webp"
                      srcSet={set.webp}
                      sizes="(min-width: 640px) 46vw, 88vw"
                    />
                    <img
                      src={set.src}
                      srcSet={set.jpg}
                      sizes="(min-width: 640px) 46vw, 88vw"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      data-align={project.alignImg ?? "center"}
                      onError={() =>
                        setFailed((current) =>
                          new Set(current).add(project.id),
                        )
                      }
                    />
                  </picture>
                </span>
              )}

              <span className="project-tile__body">
                {category && (
                  <span className="project-card__eyebrow">{category}</span>
                )}
                <span className="project-card__title">
                  {project.title.toUpperCase()}
                </span>
                <span className="project-card__sub">{project.subtitle}</span>
                <span className="project-tile__action">
                  Ver proyecto
                  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                    <path
                      d="M4 10h11M11 5.5 15.5 10 11 14.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
