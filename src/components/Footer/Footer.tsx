import { Logo } from '@/components/Logo/Logo'
import servicesData from '@/data/services.json'
import site from '@/data/site.json'
import type { Service, SiteData } from '@/types'
import './Footer.scss'

const data = site as SiteData
const services = servicesData as Service[]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    // A plain, non-sticky wrapper purely so the focus-in animation has
    // something to measure. .footer itself is `position: sticky` and
    // shorter than the viewport, so it SNAPS straight to fully-visible
    // the instant it engages — there's no gradual entry to scrub against.
    // This wrapper still reserves .footer's normal-flow box (sticky
    // doesn't remove it from flow), so IT scrolls into view gradually
    // like any ordinary element, unaffected by what its sticky child
    // does visually. See Footer.scss.
    <div className="footer-anchor">
      <footer className="footer">
        <div className="footer__inner">
          <div className="footer__top">
            <div className="footer__brand">
              <a className="footer__brand-link" href="#inicio" aria-label="eklekta, ir al inicio">
                <Logo variant="lockup" className="footer__logo" title="eklekta" />
              </a>
              <p className="footer__claim">{data.tagline}</p>
              <a className="footer__email" href={`mailto:${data.contact.email}`}>
                {data.contact.email}
              </a>
            </div>

            <nav className="footer__columns" aria-label="Pie de página">
              <div className="footer__column">
                <h2 className="footer__column-title">Secciones</h2>
                <ul className="footer__links">
                  {data.nav.map((item) => (
                    <li key={item.id}>
                      <a className="footer__link" href={item.href}>
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="footer__column">
                <h2 className="footer__column-title">Servicios</h2>
                <ul className="footer__links">
                  {services.map((service) => (
                    <li key={service.id}>
                      <a className="footer__link" href="#servicios">
                        {service.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="footer__column">
                <h2 className="footer__column-title">Seguinos</h2>
                <ul className="footer__links">
                  {data.socials.map((social) => (
                    <li key={social.id}>
                      <a
                        className="footer__link"
                        href={social.href}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {social.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </div>

          <div className="footer__bottom">
            <p className="footer__legal">© {year} eklekta. Todos los derechos reservados.</p>
            <a className="footer__top-link" href="#inicio">
              Volver arriba
            </a>
          </div>
        </div>

        {/* Oversized wordmark closing the page — decorative, the real
            brand name is already announced by the link above. */}
        <div className="footer__mark" aria-hidden="true">
          <Logo variant="wordmark" title="eklekta" />
        </div>
      </footer>
    </div>
  )
}
