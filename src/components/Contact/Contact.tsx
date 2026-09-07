import type { ReactElement } from 'react'
import { ContactForm } from '@/components/ContactForm/ContactForm'
import { Reveal } from '@/components/Reveal/Reveal'
import site from '@/data/site.json'
import type { SiteData } from '@/types'
import './Contact.scss'

const data = site as SiteData

// Line icons in the same hand as Button's own Arrow: stroke-only,
// currentColor, no fill — so they take the link's colour for free on
// hover and in both themes instead of carrying a baked-in brand hue.
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="7.7" y1="10.2" x2="7.7" y2="16.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="7.7" cy="7.1" r="1" fill="currentColor" stroke="none" />
      <path
        d="M11.3 16.3v-6.1M11.3 12.6c0-1.4 1-2.5 2.35-2.5s2.35 1.1 2.35 2.5v3.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const SOCIAL_ICON: Record<string, () => ReactElement> = {
  instagram: InstagramIcon,
  linkedin: LinkedinIcon,
}

// Same arrow KonektaCard draws for its own text link — a plain link's
// mark, not Button's pill. "Escribinos" used to render as a <Button>,
// but sitting right next to the round social icons it read as a third
// "social button" despite doing something unrelated (opening mail), so
// it dropped the button chrome for this instead.
function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M4 10h11M11 5.5 15.5 10 11 14.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Contact() {
  return (
    <section className="contact" id="contacto">
      <div className="contact__inner">
        <Reveal className="contact__banner">
          <p className="contact__banner-line">Hablemos.</p>
        </Reveal>

        <div className="contact__grid">
          <Reveal className="contact__panel">
            <h2 className="contact__title">
              Contanos qué te está costando más de lo que debería.
            </h2>
            <p className="contact__intro">
              Escribinos con dos líneas sobre tu operación y te respondemos con
              una primera lectura, sin compromiso. Si tiene sentido seguir,
              agendamos el diagnóstico.
            </p>

            <dl className="contact__details">
              <div className="contact__detail">
                <dt>Email</dt>
                <dd>
                  <a className="contact__email" href={`mailto:${data.contact.email}`}>
                    {data.contact.email}
                  </a>
                </dd>
              </div>

              <div className="contact__detail">
                <dt>Disponibilidad</dt>
                <dd>{data.contact.availability}</dd>
              </div>

              <div className="contact__detail">
                <dt>Dónde estamos</dt>
                <dd>{data.contact.location}</dd>
              </div>
            </dl>

            <div className="contact__actions">
              <a className="contact__write" href={`mailto:${data.contact.email}`}>
                Escribinos
                <ArrowIcon />
              </a>
              <ul className="contact__socials">
                {data.socials.map((social) => {
                  const Icon = SOCIAL_ICON[social.id]
                  return (
                    <li key={social.id}>
                      <a
                        className="contact__social"
                        href={social.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        // The network name is gone from the visible text
                        // (design call: only the handle shows), so it
                        // moves here — otherwise a screen reader has no
                        // way to tell "@eklekta.estudio" is Instagram.
                        aria-label={`${social.label}: ${social.handle}`}
                      >
                        {Icon && (
                          <span className="contact__social-icon">
                            <Icon />
                          </span>
                        )}
                        <span className="contact__social-handle">{social.handle}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          </Reveal>

          <Reveal className="contact__form" delay={140}>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
