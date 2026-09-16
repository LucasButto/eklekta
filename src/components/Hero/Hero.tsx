import { useState } from "react";
import { Logo } from "@/components/Logo/Logo";
import { useTheme } from "@/hooks/useTheme";
import "./Hero.scss";

export function Hero() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const target = isDark ? "night" : "day";

  // Both the day and night shots stay mounted at once so the incoming
  // one can wipe in over the outgoing one — but only once a visitor
  // actually reaches that theme, so the very first paint only fetches
  // the photo being shown. `sweepGen` counts theme changes (not the
  // very first paint) and gets folded into the incoming layer's `key`
  // below, forcing React to remount it — a fresh element so its wipe
  // keyframes always replay from the start, even switching back to a
  // layer that's already mounted. All adjusted during render (React's
  // documented pattern for state driven by a prop change) rather than
  // in an effect, so none of this costs an extra tick.
  const [dayMounted, setDayMounted] = useState(!isDark);
  const [nightMounted, setNightMounted] = useState(isDark);
  const [prevTarget, setPrevTarget] = useState(target);
  const [sweepGen, setSweepGen] = useState(0);
  if (target !== prevTarget) {
    setPrevTarget(target);
    setSweepGen((gen) => gen + 1);
    if (target === "night") setNightMounted(true);
    else setDayMounted(true);
  }

  const isSweeping = sweepGen > 0;

  return (
    <section className="hero" id="inicio">
      {/* One viewport tall and pinned while a second viewport of scroll
          runs underneath it (see Hero.scss). The photo zooms in, blurs
          and dissolves; the masthead lifts and fades; the next section
          climbs over. No JS — a view timeline drives all of it. */}
      <div className="hero__viewport">
        <div className="hero__photo" aria-hidden="true">
          {/* Day and night are two stacked layers, not a swapped
              <picture> — that's what lets the theme change wipe in as a
              circle expanding from the navbar's sun/moon toggle (see
              ThemeToggle.tsx, which sets --theme-origin-x/y) instead of
              popping, which matters because the two AI-generated shots
              don't line up pixel-for-pixel (the mountains, mainly).
              Whichever theme is current stays on top — as the wipe
              plays the very first time, and simply at rest after. */}
          {dayMounted && (
            <div
              key={target === "day" && isSweeping ? `day-${sweepGen}` : "day"}
              className={`hero__photo-layer hero__photo-layer--day${
                target === "day" ? ` is-current${isSweeping ? " is-sweeping" : ""}` : ""
              }`}
            >
              <picture>
                {/* Art direction: the phone gets its own portrait shot
                    so object-fit:cover isn't cropping a landscape frame
                    down to a sliver; wide screens get the 16:9. Mobile
                    sources first — the browser takes the first
                    <source> whose media and type both match. */}
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
                  srcSet="/images/hero/hero-day-960.webp 960w, /images/hero/hero-day-1600.webp 1600w, /images/hero/hero-day-2560.webp 2560w, /images/hero/hero-day-3840.webp 3840w"
                  sizes="100vw"
                />
                <source
                  type="image/jpeg"
                  srcSet="/images/hero/hero-day-960.jpg 960w, /images/hero/hero-day-1600.jpg 1600w, /images/hero/hero-day-2560.jpg 2560w, /images/hero/hero-day-3840.jpg 3840w"
                  sizes="100vw"
                />
                {/* The hero's largest paint — loads eagerly, off the lazy path. */}
                <img
                  src="/images/hero/hero-day-1600.jpg"
                  alt=""
                  fetchPriority="high"
                  decoding="async"
                  width={1600}
                  height={900}
                />
              </picture>
            </div>
          )}

          {nightMounted && (
            <div
              key={target === "night" && isSweeping ? `night-${sweepGen}` : "night"}
              className={`hero__photo-layer hero__photo-layer--night${
                target === "night" ? ` is-current${isSweeping ? " is-sweeping" : ""}` : ""
              }`}
            >
              {/* One landscape source only — the night shot has no
                  dedicated portrait crop, so phones fall back to the
                  same frame via object-fit:cover (see the
                  --night object-position override in Hero.scss). */}
              <picture>
                <source
                  type="image/webp"
                  srcSet="/images/hero/hero-night-960.webp 960w, /images/hero/hero-night-1600.webp 1600w, /images/hero/hero-night-2560.webp 2560w, /images/hero/hero-night-3840.webp 3840w"
                  sizes="100vw"
                />
                <source
                  type="image/jpeg"
                  srcSet="/images/hero/hero-night-960.jpg 960w, /images/hero/hero-night-1600.jpg 1600w, /images/hero/hero-night-2560.jpg 2560w, /images/hero/hero-night-3840.jpg 3840w"
                  sizes="100vw"
                />
                <img
                  src="/images/hero/hero-night-1600.jpg"
                  alt=""
                  fetchPriority="high"
                  decoding="async"
                  width={1600}
                  height={900}
                />
              </picture>
            </div>
          )}
        </div>

        {/* The wordmark, set large along the floor of the frame in the
            brand colour, on a neutral wash that rises off the bottom
            edge (::before) so it keeps contrast where it crosses the
            photo. Both sink out and fade on scroll while the photo
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
