/**
 * One filter tab and every project under it. `projects.json` is an
 * array of these, in tab order — position 0 is "Sitios web", and so on.
 * Adding a project is dropping an object into the right group's
 * `projects` array; adding a tab is a new group. `crm` carries an empty
 * array — its tab shows the konekta panel, not a card grid.
 */
export interface ProjectGroup {
  /** Matches the filter tab's id and, historically, a project's `kind`. */
  kind: string
  /** The tab's visible label in the filter bar. */
  label: string
  projects: Project[]
}

export interface Project {
  id: string
  title: string
  client: string
  /**
   * Optional on purpose: a delivery year is a factual claim about a real
   * client, so a project carries one only once it is confirmed. The card
   * drops the year from its meta line when it is missing rather than
   * printing a placeholder.
   */
  year?: string
  categories: string[]
  /** One line under the title in the dialog. Never on the card. */
  subtitle: string
  /**
   * The card's teaser. Clamped to two lines there, so it has to say
   * something on its own — the reader only gets the rest by opening the
   * project.
   */
  summary: string
  /** The full account of the work. Dialog only. */
  description: string
  /**
   * The card's colour field — the flat ground the project's name is set
   * on, the way konekta's panel sets its wordmark on celeste. One of the
   * names the card's `[data-tint]` rules define (see Projects.scss):
   * `orange`, `blue`, `lime`, `violet`, `graphite`. Optional; a project
   * without one falls back to the brand violet.
   *
   * Tints repeat from one filter tab to the next on purpose — a tab
   * never shows another tab's cards, so the set stays a handful of
   * strong colours instead of thinning into near-duplicates.
   */
  tint?: string
  /**
   * The project's pictures — one per place it is shown, each drawn for
   * that frame so none of them is cropped. Every value is a path stem
   * (see coverSet). Optional, all or nothing: work with no public
   * picture (desktop tools, internal apps) is the colour poster alone,
   * with no peek and no picture once opened. They live in
   * `public/images/projects/<filter tab>/`.
   */
  images?: {
    /**
     * Landscape — `${laptop}-{400,800,1200}.{webp,jpg}`. The laptop lid
     * the bento's wide cards raise on hover, and the picture the feed,
     * the deck and the sheet show below $bp-lg.
     */
    laptop: string
    /**
     * Portrait — `${phone}-{440,832}.{webp,jpg}`. The phone the narrow
     * cards tip in on hover.
     */
    phone: string
    /**
     * 4:5 — `${panel}-{560,840,1122}.{webp,jpg}`. The picture the
     * opened project's panel shows — the identity board of a website, the
     * step by step of an automation; the panel keeps this proportion so
     * it is never cropped.
     */
    panel: string
  }
  /**
   * External link to the live site. Optional: automation and CRM work has
   * no public URL, so the dialog just drops the "Ver sitio" button.
   */
  url?: string
  featured: boolean
}

export interface TeamMember {
  id: string
  name: string
  role: string
  focus: string
  /**
   * Path stem — `${photo}-{400,640,880}.{webp,jpg}` are the real files
   * (see Team.tsx). Generated from `brand-assets/team-src/` by
   * `scripts/make-team-photos.mjs`.
   */
  photo: string
  linkedin: string
}

export interface ServiceMedia {
  /** Path stem — `${src}-${width}.webp` / `.jpg` are the real files. */
  src: string
  /**
   * Widths actually rendered, so the srcset descriptors match the files.
   * Not every source photo reaches the largest step; none are upscaled.
   */
  widths: number[]
}

export interface Service {
  id: string
  title: string
  description: string
  deliverables: string[]
  /** Photo the pinned panel swaps to while this service is being read. */
  media: ServiceMedia
  /**
   * A landscape (3:2) cut of the same photo, for the mobile carousel card,
   * whose frame is wide rather than tall — the portrait `media` lost its
   * top and bottom there. Optional: the card falls back to `media`.
   */
  mediaMobile?: ServiceMedia
}

export interface ProcessStep {
  id: string
  step: string
  title: string
  /** Proceso's own copy — the short recap in its 2x2 grid. */
  description: string
  /**
   * About's copy for the same step — longer and more specific than
   * `description`. The two sections read as distinct pieces of writing
   * on purpose (Proceso is the recap, About is the walkthrough), so this
   * is never derived from `description`.
   */
  detail: string
  duration: string
  /**
   * Path stem of the stage photo for the About carousel, which walks these
   * same four steps one at a time (see About.tsx) — `${image}-{800,1200,1480}.{webp,jpg}`
   * are the real files, from scripts/make-section-photos.mjs. One process, two views — the
   * Proceso section reads `description` and ignores this and `detail`.
   */
  image: string
}

export interface NavItem {
  id: string
  label: string
  href: string
}

export interface SocialLink {
  id: string
  label: string
  handle: string
  href: string
}

export interface SiteData {
  name: string
  tagline: string
  nav: NavItem[]
  cta: { label: string; href: string }
  contact: {
    email: string
    location: string
    availability: string
    /**
     * Where the contact form POSTs its JSON. In production that is
     * `/api/contact.php` (public/api/contact.php, which relays it by SMTP);
     * it has to answer `{"ok": true}` on success. Leave empty and the form
     * falls back to opening the visitor's mail client with every field
     * already filled in.
     */
    formEndpoint: string
  }
  socials: SocialLink[]
}

export type Theme = 'light' | 'dark'
