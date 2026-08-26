import { useEffect, useRef } from 'react'
import { Button } from '@/components/Button/Button'
import type { Project } from '@/types'
import './ProjectModal.scss'

interface ProjectModalProps {
  /** The project to show, or null when nothing is open. */
  project: Project | null
  onClose: () => void
}

function Close() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M6 6l8 8M14 6l-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * The project detail, in a native <dialog>.
 *
 * `showModal()` is doing a lot of work that would otherwise be hand-written
 * and half-right: it traps Tab inside the panel, closes on Escape, marks
 * everything behind it inert for assistive tech, returns focus to the card
 * that opened it, and puts the panel in the top layer — which is why this
 * needs no z-index at all and cannot end up underneath the fixed header.
 *
 * What the element does NOT give us is a background scroll lock or a
 * click-outside, so those two are the only things handled below.
 */
export function ProjectModal({ project, onClose }: ProjectModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Open and close follow the prop rather than an imperative call at the
  // click site, so the dialog can never disagree with React's state.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (project && !dialog.open) dialog.showModal()
    else if (!project && dialog.open) dialog.close()
  }, [project])

  // Escape is handled here rather than left to the element, so that the
  // close always starts from React and the two can never disagree. If
  // the element closed itself, the panel would vanish while state still
  // said it was open — and the scroll lock below, which is unwound by
  // that state, would stay applied and leave the page unscrollable.
  //
  // preventDefault stops the element's own Escape handling, so this is
  // the single path: state goes null, and the effect above closes the
  // dialog to match.
  useEffect(() => {
    if (!project) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [project, onClose])

  // Backstop for any close we did not initiate — a form[method=dialog],
  // or browser UI. Harmless when state is already null; setting it twice
  // is idempotent.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    dialog.addEventListener('close', onClose)
    return () => dialog.removeEventListener('close', onClose)
  }, [onClose])

  // The page behind a modal should not scroll. Locking `body` also drops
  // the vertical scrollbar, which would shift the whole layout sideways
  // by its width, so the gutter it leaves is measured and given back as
  // padding for as long as the dialog is open.
  useEffect(() => {
    if (!project) return

    const { body } = document
    const gutter = window.innerWidth - document.documentElement.clientWidth
    const previousOverflow = body.style.overflow
    const previousPadding = body.style.paddingRight

    body.style.overflow = 'hidden'
    if (gutter > 0) body.style.paddingRight = `${gutter}px`

    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPadding
    }
  }, [project])

  const titleId = project ? `project-modal-title-${project.id}` : undefined

  // The element itself stays mounted while only its contents come and
  // go. Unmounting a dialog that is still open would tear it out of the
  // top layer without ever firing `close`, which is the one event the
  // scroll lock is unwound by. Keeping the shell also means the panel is
  // built fresh on every open, so it always starts scrolled to the top.
  return (
    <dialog
      className="project-modal"
      ref={dialogRef}
      aria-labelledby={titleId}
      // The backdrop is part of the dialog element, so a click that lands
      // on the element itself — never on the panel inside it — is a click
      // outside the panel.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      {project && (
        <div className="project-modal__panel">
          <button
            type="button"
            className="project-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <Close />
          </button>

          <figure className="project-modal__figure">
            <img
              src={project.cover}
              alt={`Captura del sitio de ${project.client}`}
              data-align={project.alignImg ?? 'center'}
              width={1200}
              height={800}
            />
          </figure>

          <div className="project-modal__body">
            <header className="project-modal__header">
              <p className="project-modal__eyebrow">Proyecto</p>
              <h2 className="project-modal__title" id={titleId}>
                {project.client}
              </h2>
              <p className="project-modal__subtitle">{project.subtitle}</p>
            </header>

            <Button href={project.url} size="sm" className="project-modal__cta">
              Ver sitio
            </Button>

            <p className="project-modal__description">{project.description}</p>
          </div>
        </div>
      )}
    </dialog>
  )
}
