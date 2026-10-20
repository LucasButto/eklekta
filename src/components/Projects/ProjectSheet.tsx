import { useEffect, useRef, useState } from "react";
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
/** How long the sheet takes to slide back down; matches project-sheet-out. */
const CLOSE_MS = 320;

/** The phone sheet only: from $bp-md the sheet is a centred modal. */
const PHONE_SHEET = "(max-width: 767.98px)";

/** A pull past this much of the panel's height, or this fast, closes it. */
const DRAG_CLOSE_SHARE = 0.22;
const DRAG_CLOSE_MAX_PX = 150;
const DRAG_CLOSE_SPEED = 0.55; // px per ms
/** The exit after a pull: at least this fast, and no shorter or longer than this. */
const DRAG_EXIT_MIN_SPEED = 0.9; // px per ms
const DRAG_EXIT_MIN_MS = 140;
const DRAG_EXIT_MAX_MS = 300; // inside CLOSE_MS, so the sheet outlives it
/** How far a finger must move down before it counts as a pull. */
const DRAG_SLOP_PX = 8;

export function ProjectSheet({ project: next, onClose }: ProjectSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // The parent hands a fresh closure every render; the drag listeners keep
  // the latest one without being torn down (and the sheet reset) each time.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // The sheet holds on to the project it is showing for as long as it
  // takes to slide back down: the parent drops it at once on close, and
  // without this the panel vanished on the spot instead of leaving the
  // way it arrived.
  const [project, setProject] = useState(next);
  const [closing, setClosing] = useState(false);
  // On once the open sheet has been painted where it starts (see the
  // [data-shown] transition in Projects.scss).
  const [shown, setShown] = useState(false);
  if (next && next !== project) {
    setProject(next);
    if (closing) setClosing(false);
  }
  if (!next && project && !closing) setClosing(true);

  useEffect(() => {
    if (!closing) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const done = () => {
      setProject(null);
      setClosing(false);
      setShown(false);
    };
    const timer = window.setTimeout(done, reduce ? 0 : CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [closing]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (!project) {
      if (dialog.open) dialog.close();
      return;
    }

    if (!dialog.open) dialog.showModal();

    // The rise starts only once the sheet is ready to move without a
    // hitch: its screenshot decoded (decoding a large image on the first
    // frames of the slide is what made it stutter), capped so a slow
    // network never holds the sheet back, and then two frames — the first
    // lays the sheet out below the screen, the second is the first one
    // painted there — so none of the rise is spent before it is visible.
    let cancelled = false;
    let raf = 0;
    const start = () => {
      if (cancelled) return;
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          if (!cancelled) setShown(true);
        });
      });
    };
    const img = dialog.querySelector<HTMLImageElement>(".project-sheet__shot img");
    const decoded = img?.decode ? img.decode().catch(() => undefined) : null;
    if (decoded) {
      Promise.race([
        decoded,
        new Promise((resolve) => window.setTimeout(resolve, 280)),
      ]).then(start);
    } else {
      start();
    }

    // showModal() does not stop the page behind from scrolling, and a
    // sheet that drags the list along under it reads as broken. Same
    // hold the mobile nav panel already uses, and it keeps scrollY
    // where it was rather than jumping to the top.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      // Also covers the case where the viewport crosses $bp-lg while the
      // sheet is open and this whole component unmounts.
      if (dialog.open) dialog.close();
    };
  }, [project]);

  // Pull down to close. The phone sheet follows a finger that drags it
  // down — from the handle, the picture, or the text, anywhere on it — and
  // lets go of it past a fair pull (or a quick flick), which closes it;
  // short of that it springs back. The sheet's own text scrolls first: a
  // pull only takes over once that has reached its top, mid-gesture
  // included, so reading a long description and then pulling past the top
  // closes it, as a native sheet does. Native listeners, not React's: the
  // move handler has to be able to cancel the page's own scroll.
  const open = project !== null && !closing;
  useEffect(() => {
    const panel = panelRef.current;
    const dialog = ref.current;
    if (!open || !panel || !dialog) return;
    const scroller = panel.querySelector<HTMLElement>(
      ".project-sheet__scroll",
    );

    let y0 = 0;
    let x0 = 0;
    let dragging = false;
    let exiting = false;
    let samples: Array<[number, number]> = [];

    const reset = (animate: boolean) => {
      if (animate) {
        panel.style.transition =
          "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)";
        panel.style.transform = "";
        window.setTimeout(() => {
          panel.style.transition = "";
        }, 340);
      } else {
        panel.style.transition = "";
        panel.style.transform = "";
      }
    };

    const onStart = (event: TouchEvent) => {
      if (
        event.touches.length !== 1 ||
        !window.matchMedia(PHONE_SHEET).matches
      ) {
        dragging = false;
        y0 = Number.NaN;
        return;
      }
      const touch = event.touches[0];
      x0 = touch.clientX;
      y0 = touch.clientY;
      dragging = false;
      samples = [[performance.now(), touch.clientY]];
    };

    const onMove = (event: TouchEvent) => {
      if (Number.isNaN(y0)) return;
      const touch = event.touches[0];
      if (!touch) return;

      if (!dragging) {
        // The text still has room to scroll up: let it, and start counting
        // the pull from here, from wherever it gets to the top.
        if (scroller && scroller.scrollTop > 0) {
          y0 = touch.clientY;
          x0 = touch.clientX;
          return;
        }
        const dy = touch.clientY - y0;
        const dx = touch.clientX - x0;
        if (dy < DRAG_SLOP_PX || dy < Math.abs(dx)) return;
        dragging = true;
        // Counted from where the pull started, so the sheet does not jump
        // by the slop when it takes hold.
        y0 = touch.clientY - dy + DRAG_SLOP_PX;
        panel.style.transition = "none";
      }

      const dy = Math.max(0, touch.clientY - y0);
      if (event.cancelable) event.preventDefault();
      panel.style.transform = `translateY(${dy}px)`;
      const now = performance.now();
      samples.push([now, touch.clientY]);
      samples = samples.filter(([t]) => now - t < 100);
    };

    const onEnd = () => {
      if (!dragging) {
        y0 = Number.NaN;
        return;
      }
      dragging = false;
      y0 = Number.NaN;

      const matrix = new DOMMatrix(getComputedStyle(panel).transform);
      const pulled = matrix.m42;
      const first = samples[0];
      const last = samples[samples.length - 1];
      const speed =
        first && last && last[0] > first[0]
          ? (last[1] - first[1]) / (last[0] - first[0])
          : 0;
      const far = Math.min(
        DRAG_CLOSE_MAX_PX,
        panel.offsetHeight * DRAG_CLOSE_SHARE,
      );

      if (pulled > far || speed > DRAG_CLOSE_SPEED) {
        // The panel leaves at the speed the finger let go at. The close's
        // own CSS exit is an ease-in (it starts from rest, which is right
        // for the close button), so handing a dragged panel over to it
        // made it stop dead where the finger left it and pick up again:
        // the stall. Here the rest of the way is a straight line at the
        // release speed, so the move never slows between the finger and
        // the edge of the screen. The inline transform and transition
        // beat the CSS ones, so the close runs alongside without taking
        // the panel over; they are left in place (the panel is gone
        // before it matters) and the `open` cleanup knows not to undo
        // them.
        const remaining = window.innerHeight - panel.getBoundingClientRect().top;
        const pace = Math.max(speed, DRAG_EXIT_MIN_SPEED);
        const ms = Math.min(
          DRAG_EXIT_MAX_MS,
          Math.max(DRAG_EXIT_MIN_MS, remaining / pace),
        );
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          panel.style.transition = "";
          panel.style.transform = "";
        } else {
          exiting = true;
          panel.style.transition = `transform ${Math.round(ms)}ms linear`;
          panel.style.transform = `translateY(${Math.round(pulled + remaining + 24)}px)`;
        }
        onCloseRef.current();
      } else {
        reset(true);
      }
    };

    panel.addEventListener("touchstart", onStart, { passive: true });
    panel.addEventListener("touchmove", onMove, { passive: false });
    panel.addEventListener("touchend", onEnd, { passive: true });
    panel.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      panel.removeEventListener("touchstart", onStart);
      panel.removeEventListener("touchmove", onMove);
      panel.removeEventListener("touchend", onEnd);
      panel.removeEventListener("touchcancel", onEnd);
      if (!exiting) reset(false);
    };
  }, [open]);

  if (!project) return null;

  // The LANDSCAPE cover, not the portrait `-V` crop the desktop panel
  // uses. That panel is a tall column, so a 0.71-ratio file fits it; the
  // sheet's frame is 16:10, and feeding it the portrait crop meant
  // object-fit threw away 56% of every image — on Prosperi it sliced
  // straight through the wordmark in the artwork. Same picture, the
  // orientation this frame was built for.
  const set = project.cover ? coverSet(project.cover, COVER_WIDTHS) : null;

  return (
    <dialog
      className="project-sheet"
      data-shown={shown && !closing ? "" : undefined}
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
      <div
        className="project-sheet__panel"
        ref={panelRef}
        data-tint={project.tint ?? "violet"}
      >
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
            {/* No screenshot: the frame is the project's poster instead —
                its colour field with the name set on it, the way the tile
                in the list shows it — not an empty block of colour. */}
            {!set && (
              <span className="project-sheet__poster">
                {project.title.toUpperCase()}
              </span>
            )}
            {set && (
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
                  alt={`${project.title}: ${project.subtitle}`}
                  decoding="async"
                  fetchPriority="high"
                  data-align={project.alignImg ?? "center"}
                />
              </picture>
            )}
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
