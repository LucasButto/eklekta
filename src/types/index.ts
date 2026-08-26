export interface ProjectMetric {
  value: string
  label: string
}

export interface Project {
  id: string
  title: string
  client: string
  year: string
  categories: string[]
  summary: string
  metric: ProjectMetric
  cover: string
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
