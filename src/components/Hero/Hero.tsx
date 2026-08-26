import { Button } from "@/components/Button/Button";
import { Logo } from "@/components/Logo/Logo";
import site from "@/data/site.json";
import type { SiteData } from "@/types";
import "./Hero.scss";

const data = site as SiteData;

export function Hero() {
  return (
    <section className="hero" id="inicio">
      <div className="hero__band">
        {/* Art direction, not just resolution: the phone gets a
            portrait shot instead of a hard crop of the wide one.
            Mobile sources come first — the browser takes the first
            <source> whose media and type both match. */}
        <picture>
          <source
            media="(max-width: 767px)"
            type="image/webp"
            srcSet="/images/hero/hero-mobile-800.webp 800w, /images/hero/hero-mobile-1200.webp 1200w"
            sizes="100vw"
          />
          <source
            media="(max-width: 767px)"
            type="image/jpeg"
            srcSet="/images/hero/hero-mobile-800.jpg 800w, /images/hero/hero-mobile-1200.jpg 1200w"
            sizes="100vw"
          />
          <source
            type="image/webp"
            srcSet="/images/hero/hero-960.webp 960w, /images/hero/hero-1920.webp 1920w"
            sizes="100vw"
          />
          <img
            className="hero__bg"
            src="/images/hero/hero-1920.jpg"
            srcSet="/images/hero/hero-960.jpg 960w, /images/hero/hero-1920.jpg 1920w"
            sizes="100vw"
            alt=""
            // This is the hero's largest paint, so it loads eagerly
            // and skips the lazy-loading path every other image uses.
            fetchPriority="high"
            decoding="async"
            width={1920}
            height={1080}
          />
        </picture>
        <div className="hero__scrim" aria-hidden="true" />

        <div className="hero__inner">
          {/* Logo renders role="img" + aria-label itself, so this is
              the h1's only content — no separate sr-only text needed. */}
          <h1 className="hero__title">
            <Logo
              variant="wordmark"
              className="hero__wordmark"
              title="eklekta"
            />
          </h1>

          <p className="hero__lede">
            Automatizamos lo que te frena y diseñamos lo que te distingue.
            Procesos, CRM, producto y marca.
          </p>

          <div className="hero__actions">
            <Button href={data.cta.href} variant="ghost">
              {data.cta.label}
            </Button>
            <a className="hero__secondary" href="#proyectos">
              Ver proyectos
            </a>
          </div>
        </div>

        {/* The familiar mouse hint, centred along the bottom edge.
            Purely decorative, so it stays out of the accessibility
            tree — the page is already reachable by keyboard and the
            shape means nothing to a screen reader. */}
        <span className="hero__scroll" aria-hidden="true" />
      </div>
    </section>
  );
}
