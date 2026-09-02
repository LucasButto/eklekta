/**
 * Builds the `<picture>` srcsets for a project cover from its path stem.
 *
 * `projects.json` stores a stem like `/images/projects/proj-1`; the real
 * files are `${stem}-${w}.webp` / `.jpg` at the widths below (generated
 * with sharp — see the project image notes). Landscape covers get three
 * steps, the portrait `-V` crops two.
 */

export const COVER_WIDTHS = [400, 800, 1200] as const
export const COVER_LARGE_WIDTHS = [440, 832] as const

export interface CoverSet {
  webp: string
  jpg: string
  /** `<img src>` fallback for browsers that ignore srcset. */
  src: string
}

export function coverSet(
  stem: string,
  widths: readonly number[] = COVER_WIDTHS,
): CoverSet {
  const line = (ext: string) =>
    widths.map((w) => `${stem}-${w}.${ext} ${w}w`).join(', ')
  // Middle step when there are three, the smaller of two.
  const fallbackW = widths[widths.length > 2 ? 1 : 0]
  return { webp: line('webp'), jpg: line('jpg'), src: `${stem}-${fallbackW}.jpg` }
}
