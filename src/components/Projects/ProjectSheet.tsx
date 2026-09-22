import { useEffect, useRef } from "react";
import { Button } from "@/components/Button/Button";
import type { Project } from "@/types";
import { coverSet, COVER_WIDTHS } from "./coverSet";

interface ProjectSheetProps {
  /** The open project, or null for a closed sheet. */
  project: Project | null;
  onClose: () => void;
}

/**
 * The opened project, below $bp-lg, as a bottom sheet.
 *
 * The desktop detail reflows the grid in place: the picked card FLIPs
 * into a lead panel, the readout's lines fade up one after another, and
 * the rest of the set becomes a side rail. On a phone that same move had
 * nowhere to go — the grid was one column, so the layout jumped, the
 * shot reveal painted a black frame over the whole width, and the
 * readout's stagger left the space under it empty for the better part of
 * a second while the page had already changed height underneath the
 * reader's thumb.
 *
 * A sheet has none of that to arrange: it arrives over the list, the
 * list does not move, and everything inside it comes in together.
 *
 * A real <dialog> with showModal(), so the top layer, the backdrop, the
 * focus trap and Escape are the platform's and not ours to re-implement.
 */
export function ProjectSheet({ project, onClose }: ProjectSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (!project) {
      if (dialog.open) dialog.close();
      return;
    }

    if (!dialog.open) dialog.showModal();

    // showModal() does not stop the page behind from scrolling, and a
    // sheet that drags the list along under it reads as broken. Same
    // hold the mobile nav panel already uses, and it keeps scrollY
    // where it was rather than jumping to the top.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      // Also covers the case where the viewport crosses $bp-lg while the
      // sheet is open and this whole component unmounts.
      if (dialog.open) dialog.close();
    };
  }, [project]);

  if (!project) return null;

  // The LANDSCAPE cover, not the portrait `-V` crop the desktop panel
  // uses. That panel is a tall column, so a 0.71-ratio file fits it; the
  // sheet's frame is 16:10, and feeding it the portrait crop meant
  // object-fit threw away 56% of every image — on Prosperi it sliced
  // straight through the wordmark in the artwork. Same picture, the
  // orientation this frame was built for.
  const set = coverSet(project.cover, COVER_WIDTHS);

  return (
    <dialog
      className="project-sheet"
      ref={ref}
      aria-label={`Detalle de ${project.title}`}
      // Escape fires `cancel` before the dialog closes itself; taking
      // the default lets React own the open state instead of the DOM
      // silently disagreeing with it.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // The dialog element fills the viewport once it is in the top
      // layer, so "outside the sheet" is a press that lands on the
      // dialog itself rather than on anything inside it.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="project-sheet__panel">
        <span className="project-sheet__handle" aria-hidden="true" />

        <button
          type="button"
          className="project-sheet__close"
          onClick={onClose}
        >
          <span className="sr-only">Cerrar</span>
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path
              d="M6 6l8 8M14 6l-8 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="project-sheet__scroll">
          <span
            className="project-sheet__shot"
            data-tint={project.tint ?? "violet"}
            aria-hidden="true"
          >
            <picture>
              <source
                type="image/webp"
                srcSet={set.webp}
                sizes="(min-width: 768px) 40rem, 100vw"
              />
              <img
                src={set.src}
                srcSet={set.jpg}
                sizes="(min-width: 768px) 40rem, 100vw"
                alt=""
                decoding="async"
                fetchPriority="high"
                data-align={project.alignImg ?? "center"}
              />
            </picture>
          </span>

          <div className="project-sheet__body">
            <p className="project-sheet__eyebrow">
              {project.categories.join(" · ")}
            </p>
            <h3 className="project-sheet__title">{project.title}</h3>
            <p className="project-sheet__sub">
              {project.client} · {project.subtitle}
            </p>
            <p className="project-sheet__summary">{project.summary}</p>

            {project.url ? (
              <Button
                href={project.url}
                size="sm"
                className="project-sheet__cta"
              >
                Ver sitio
              </Button>
            ) : (
              <p className="project-sheet__note">
                Trabajo interno, sin sitio público.
              </p>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
