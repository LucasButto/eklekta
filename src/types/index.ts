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

export interface Service {
  id: string
  title: string
  description: string
  deliverables: string[]
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
  }
  socials: SocialLink[]
}

export type Theme = 'light' | 'dark'
