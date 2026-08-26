import { Button } from '@/components/Button/Button'
import { ContactForm } from '@/components/ContactForm/ContactForm'
import { Reveal } from '@/components/Reveal/Reveal'
import site from '@/data/site.json'
import type { SiteData } from '@/types'
import './Contact.scss'

const data = site as SiteData

export function Contact() {
  return (
    <section className="contact" id="contacto">
      <div className="contact__inner">
        <Reveal className="contact__banner">
          <p className="contact__banner-line">Hablemos.</p>
        </Reveal>

        <div className="contact__grid">
          <Reveal className="contact__panel">
            <p className="contact__eyebrow">Contacto</p>
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
              <Button href={`mailto:${data.contact.email}`}>Escribinos</Button>
              <ul className="contact__socials">
                {data.socials.map((social) => (
                  <li key={social.id}>
                    <a
                      className="contact__social"
                      href={social.href}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {social.label}
                      <span className="contact__social-handle">{social.handle}</span>
                    </a>
                  </li>
                ))}
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
