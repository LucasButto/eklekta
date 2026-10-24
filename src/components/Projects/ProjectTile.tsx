import type { Project } from "@/types";
import { coverSet, COVER_WIDTHS } from "./coverSet";

interface ProjectTileProps {
  project: Project;
  /**
   * The picture refused to load. The tile then falls back to the poster
   * it draws for a project with no picture at all. Owned by the parent so a
   * bad file is remembered across the tile remounting (see ProjectsFeed).
   */
  failed: boolean;
  onFail: () => void;
  /** Hands back the tile that was pressed, so focus can return to it. */
  onOpen: (project: Project, trigger: HTMLElement) => void;
}

/**
 * One project below $bp-lg: a coloured card with the work on top and the
 * words under it. Shared by the feed (a grid of these) and the phone's
 * deck (a stack of them) so the card is drawn in exactly one place.
 *
 * On the desktop grid a card is a coloured poster and the screenshot is
 * what it hides until you hover it; on a phone there is no hover, so
 * that screenshot was simply never seen and four flat colour blocks were
 * the whole section. The poster is still here — it is what a card falls
 * back to when a project has no picture, or when the one it has fails to
 * load.
 */
export function ProjectTile({
  project,
  failed,
  onFail,
  onOpen,
}: ProjectTileProps) {
  const category = project.categories[0];
  // The landscape picture drawn for the desktop bento's wide cards; it
  // fits this 16:10 frame, so it is used here too.
  const stem = project.images?.laptop;
  const hasShot = Boolean(stem) && !failed;
  const set = hasShot && stem ? coverSet(stem, COVER_WIDTHS) : null;

  return (
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
              alt={`${project.title}: ${project.subtitle}`}
              loading="lazy"
              decoding="async"
              onError={onFail}
            />
          </picture>
        </span>
      )}

      <span className="project-tile__body">
        {category && <span className="project-card__eyebrow">{category}</span>}
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
  );
}
