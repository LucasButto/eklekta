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
  cover: string
  /**
   * Which part of the cover carries the brand. Every cover is a wide
   * screenshot of a live site dropped into a portrait or square tile, so
   * object-fit: cover throws most of the width away — 'left' or 'right'
   * keeps whichever edge holds the logo and headline instead of
   * centring on whatever happens to sit in the middle. Optional,
   * defaults to 'center' when a project has no lopsided crop to worry
   * about.
   */
  alignImg?: 'left' | 'center' | 'right'
  /** External link to the case study or the live site. */
  url: string
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
