import { Logo } from "@/components/Logo/Logo";
import "./Hero.scss";

export function Hero() {
  return (
    <section className="hero" id="inicio">
      {/* Two stacked bands inside one viewport-tall frame: the grey
          masthead with the wordmark set large along its floor, and the
          studio photo filling the rest. The frame pins while a second
          viewport of scroll runs underneath it (see Hero.scss) — the
          photo zooms in, blurs and dissolves; the wordmark lifts and
          fades; the next section climbs over. No JS — a view timeline
          drives all of it. */}
      <div className="hero__viewport">
        <div className="hero__band">
          <h1 className="hero__title">
            {/* Logo renders role="img" + aria-label itself, so this is
                the h1's only content — no separate sr-only text needed. */}
            <Logo variant="wordmark" className="hero__wordmark" title="eklekta" />
          </h1>
        </div>

        <div className="hero__frame">
          <div className="hero__photo" aria-hidden="true">
            <picture>
              {/* Art direction: the phone gets a tighter 3:2 crop that
                  keeps her in frame; wide screens get the 16:9 with the
                  studio negative space. Mobile sources first — the browser
                  takes the first <source> whose media and type both match. */}
              <source
                media="(max-width: 767.98px)"
                type="image/webp"
                srcSet="/images/hero/new-hero-mobile-640.webp 640w, /images/hero/new-hero-mobile-1024.webp 1024w"
                sizes="100vw"
              />
              <source
                media="(max-width: 767.98px)"
                type="image/jpeg"
                srcSet="/images/hero/new-hero-mobile-640.jpg 640w, /images/hero/new-hero-mobile-1024.jpg 1024w"
                sizes="100vw"
              />
              <source
                type="image/webp"
                srcSet="/images/hero/new-hero-960.webp 960w, /images/hero/new-hero-1600.webp 1600w"
                sizes="100vw"
              />
              <source
                type="image/jpeg"
                srcSet="/images/hero/new-hero-960.jpg 960w, /images/hero/new-hero-1600.jpg 1600w"
                sizes="100vw"
              />
              {/* The hero's largest paint — loads eagerly, off the lazy path. */}
              <img
                src="/images/hero/new-hero-1600.jpg"
                alt=""
                fetchPriority="high"
                decoding="async"
                width={1600}
                height={900}
              />
            </picture>
          </div>

          {/* The familiar mouse hint, centred along the bottom edge of the
              photo. A sibling of the photo rather than a child, so the
              scroll-zoom's blur doesn't smear it. Purely decorative —
              the shape means nothing to a screen reader. */}
          <span className="hero__scroll" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
