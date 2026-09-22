import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import { preload } from "react-dom";
import type { Project } from "@/types";
import { coverSet, COVER_LARGE_WIDTHS, COVER_WIDTHS } from "./coverSet";

export type CardView = "grid" | "lead" | "rail";

interface ProjectCardProps {
  project: Project;
  index: number;
  /** Where this card sits: the bento, the opened panel, or the side rail. */
  view: CardView;
  /**
   * The bento's wide/narrow alternation, in `view="grid"` only. Undefined
   * for a row's lone card (an odd-count filter's closer), which takes the
   * row's full width instead — see .projects__cell:only-child.
   */
  span?: "wide" | "narrow";
  /** grid / rail → open this project; lead → close back to the grid. */
  onSelect: (id: string | null) => void;
  /** Hands the cell element up so <Projects> can FLIP it between layouts. */
  registerRef: (id: string, el: HTMLElement | null) => void;
  /**
   * Skip the scroll-reveal fade. Set once a project has been opened —
   * its grid card then rides the FLIP back from the detail rather than
   * re-fading in underneath it.
   */
  noReveal?: boolean;
}

// The peek's frame differs a lot between the bento's two columns — a
// strip of ~13vw in a narrow card, a panel of ~29vw standing in a wide
// one — so they ask for different steps of the same file rather than
// sharing one `sizes` that would be wrong for both. At the wide card's
// size the 440 step is visibly soft; at the narrow card's, the 832 one
// is bytes nobody sees.
const PEEK_SIZES = "(min-width: 1024px) 13vw, 38vw";
const PEEK_SIZES_WIDE = "(min-width: 1024px) 29vw, 38vw";
// The opened panel is the detail grid's `lead` track — measured, ~32vw
// of the viewport from $bp-lg up, and the full container width below
// it. Declared a notch over each so the slot never comes out narrower
// than the frame it fills, which is what makes the browser settle for
// the step below and scale it up.
const SHOT_SIZES = "(min-width: 1024px) 33vw, 92vw";

/**
 * One project, as a poster: a flat colour field (`tint`), the category
 * as an eyebrow up top, the project's name set large at the foot in the
 * display face — the same construction as the konekta panel next door.
 * The screenshot is no longer the card; it is what the card is hiding.
 *
 * In the bento it slides in from beyond the right edge on hover — a
 * strip of the site, still half off the card — and opening the project
 * pays that promise off: the panel keeps its colour and frames the same
 * screenshot, larger, inside it. The rail mini is the poster with
 * nothing behind it, too small to preview anything.
 *
 * It is a <button>, not a link — in the grid it opens the inline detail,
 * as the opened panel it closes.
 */
export function ProjectCard({
  project,
  index,
  view,
  span,
  onSelect,
  registerRef,
  noReveal = false,
}: ProjectCardProps) {
  const cellRef = useRef<HTMLDivElement | null>(null);
  const category = project.categories[0];
  const isLead = view === "lead";
  const isGrid = view === "grid";
  const settled = isLead || noReveal;
  // Every grid card that isn't the bento's narrow column gets the big
  // peek — the wide cards and, on an odd count, the span-less card that
  // takes the last row on its own (see .projects__cell:only-child).
  const bigPeek = isGrid && span !== "narrow";
  const peekSizes = bigPeek ? PEEK_SIZES_WIDE : PEEK_SIZES;

  // Both the hover peek and the opened panel show the portrait crop.
  // Automation work has no dedicated vertical, so it falls back to the
  // landscape `cover` (those files are already portrait).
  const stem = project.coverLarge ?? project.cover;
  const widths = project.coverLarge ? COVER_LARGE_WIDTHS : COVER_WIDTHS;
  const set = coverSet(stem, widths);
  const align = project.alignImg ?? "center";

  // Warm the opened panel's step on hover / focus so the FLIP into the
  // detail isn't waiting on a fetch. The peek already has the same
  // image at a much smaller step, which is a different resource.
  const warm = useCallback(() => {
    if (isLead) return;
    preload(set.src, {
      as: "image",
      imageSrcSet: set.webp,
      imageSizes: SHOT_SIZES,
    });
  }, [isLead, set.src, set.webp]);

  // Register on a stable callback ref, not an effect: the ref fires
  // during commit, before <Projects>'s FLIP layout effect reads the
  // map, so every card's box is current when the animation is set up.
  const setCell = useCallback(
    (el: HTMLDivElement | null) => {
      cellRef.current = el;
      registerRef(project.id, el);
    },
    [project.id, registerRef],
  );

  // The same reveal-on-scroll as <Reveal>, inlined so the cell element
  // is ours to hand to the FLIP. The opened panel and any card that has
  // already been opened skip it — their entrance comes from the FLIP.
  useEffect(() => {
    const node = cellRef.current;
    if (!node || settled || node.dataset.reveal === "shown") return;

    if (!("IntersectionObserver" in window)) {
      node.dataset.reveal = "shown";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.dataset.reveal = "shown";
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [settled]);

  const cellClass = span
    ? `projects__cell projects__cell--${span}`
    : "projects__cell";

  return (
    <div
      ref={setCell}
      className={cellClass}
      data-view={view}
      data-reveal={settled ? "shown" : "hidden"}
      role="listitem"
      style={{ "--i": index } as CSSProperties}
    >
      <button
        type="button"
        className="project-card"
        data-tint={project.tint ?? "violet"}
        onClick={() => onSelect(isLead ? null : project.id)}
        onPointerEnter={isLead ? undefined : warm}
        onFocus={isLead ? undefined : warm}
        aria-label={
          isLead
            ? `Cerrar ${project.title}`
            : `${project.title}, ver el proyecto de ${project.client}`
        }
      >
        {/* The opened panel carries no type of its own — the readout
            sitting beside it already has the category, the name and the
            rest, and printing them over the picture said it twice. */}
        {!isLead && (
          <>
            {category && (
              <span className="project-card__eyebrow">{category}</span>
            )}
            <span className="project-card__head">
              <span className="project-card__title">
                {project.title.toUpperCase()}
              </span>
              {isGrid && (
                <span className="project-card__sub">{project.subtitle}</span>
              )}
            </span>
          </>
        )}

        {/* Opened, the card *is* the screenshot; in the bento only part
            of it shows, and only on hover. */}
        {(isLead || isGrid) && (
          <span
            className={isLead ? "project-card__shot" : "project-card__peek"}
            aria-hidden="true"
          >
            <picture>
              <source
                type="image/webp"
                srcSet={set.webp}
                sizes={isLead ? SHOT_SIZES : peekSizes}
              />
              <img
                src={set.src}
                srcSet={set.jpg}
                sizes={isLead ? SHOT_SIZES : peekSizes}
                alt=""
                loading={isLead ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={isLead ? "high" : undefined}
                data-align={align}
              />
            </picture>
          </span>
        )}

        {isLead && (
          <span className="project-card__close" aria-hidden="true">
            <svg viewBox="0 0 20 20" focusable="false">
              <path
                d="M6 6l8 8M14 6l-8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
      </button>
    </div>
  );
}
