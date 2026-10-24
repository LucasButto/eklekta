import { useState } from "react";
import type { Project } from "@/types";
import { ProjectTile } from "./ProjectTile";

interface ProjectsFeedProps {
  projects: Project[];
  /** True while the leaving set is fading out on a filter change. */
  swapping: boolean;
  /** Hands back the card that opened the sheet, so focus can return. */
  onOpen: (project: Project, trigger: HTMLElement) => void;
}

/**
 * The feed is one card per project, full width, stacked — and, unlike
 * the bento it replaces below $bp-lg, every card shows the work. See
 * ProjectTile for the card itself and why it is not the bento's poster.
 *
 * On a phone (< $bp-sm) <Projects> swaps this for the deck instead; it is
 * what stays from there up to $bp-lg, two cards to a row.
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
      {projects.map((project) => (
        <li className="projects-feed__cell" key={project.id}>
          <ProjectTile
            project={project}
            failed={failed.has(project.id)}
            onFail={() =>
              setFailed((current) => new Set(current).add(project.id))
            }
            onOpen={onOpen}
          />
        </li>
      ))}
    </ul>
  );
}
