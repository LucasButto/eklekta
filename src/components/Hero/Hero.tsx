import { Logo } from "@/components/Logo/Logo";
import "./Hero.scss";

export function Hero() {
  return (
    <section className="hero" id="inicio">
      {/* One viewport tall and pinned while a second viewport of scroll
          runs underneath it (see Hero.scss). The photo zooms in, blurs
          and dissolves; the masthead lifts and fades; the next section
          climbs over. No JS — a view timeline drives all of it. */}
      <div className="hero__viewport">
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

        {/* The white wordmark, set large along the floor of the frame on
            a brand-violet block that rises off the bottom edge
            (::before). Both sink out and fade on scroll while the photo
            zooms up under them. */}
        <div className="hero__masthead">
          <h1 className="hero__title">
            {/* Logo renders role="img" + aria-label itself, so this is
                the h1's only content — no separate sr-only text needed. */}
            <Logo variant="wordmark" className="hero__wordmark" title="eklekta" />
          </h1>
        </div>
      </div>
    </section>
  );
}
