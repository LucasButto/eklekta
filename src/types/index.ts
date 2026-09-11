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
   * Path stem for the landscape cover — `${cover}-{400,800,1200}.{webp,jpg}`
   * are the real files (see coverSet in ProjectCard). The fallback for
   * projects with no portrait crop of their own.
   */
  cover: string
  /**
   * Path stem for the portrait crop — `${coverLarge}-{440,832}.{webp,jpg}`.
   * It is the screenshot that slides in from the card's right edge on
   * hover and, larger, the one framed inside the opened project's panel.
   * Optional: automation work has no dedicated vertical, so it falls
   * back to `cover` (those are already portrait).
   */
  coverLarge?: string
  /**
   * Which part of the screenshot carries the brand. Every one is a wide
   * capture of a live site dropped into a portrait frame, so
   * object-fit: cover throws most of the width away — 'left' or 'right'
   * keeps whichever edge holds the logo and headline instead of
   * centring on whatever happens to sit in the middle. Optional,
   * defaults to 'center' when a project has no lopsided crop to worry
   * about.
   */
  alignImg?: 'left' | 'center' | 'right'
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
}

export interface ProcessStep {
  id: string
  step: string
  title: string
  description: string
  duration: string
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
     * Where the contact form POSTs its JSON (Formspree, Web3Forms, a
     * serverless function — anything that accepts a JSON body). Leave
     * empty and the form falls back to opening the visitor's mail
     * client with every field already filled in.
     */
    formEndpoint: string
  }
  socials: SocialLink[]
}

export type Theme = 'light' | 'dark'
