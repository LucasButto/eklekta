import { useState } from "react";
import { Button } from "@/components/Button/Button";
import { Logo } from "@/components/Logo/Logo";
import site from "@/data/site.json";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTheme } from "@/hooks/useTheme";
import type { SiteData } from "@/types";
import "./Hero.scss";

const data = site as SiteData;

/** The CTA only exists where the navbar cannot carry it — see &__cta. */
const HAS_CTA = "(max-width: 767.98px)";

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

  // The skin the page is LEAVING. It is a two-way toggle, so it is
  // simply the opposite of where we are going — no extra state to keep
  // in step, and it stays correct for the whole life of the sweep
  // because `target` only moves when the reader toggles again.
  const leavingSkin = target === "day" ? "dark" : "light";

  // The outgoing layer is only worth mounting where the CTA it exists
  // for is on screen; above $bp-md the masthead is the wordmark alone
  // and nothing about the hero changes.
  const hasCta = useMediaQuery(HAS_CTA);

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
                    <source> whose media and type both match. One size
                    each (no srcset) — the source files are already
                    sized for their breakpoint. */}
                <source
                  media="(max-width: 767.98px)"
                  type="image/webp"
                  srcSet="/images/hero/hero-day-mobile.webp"
                />
                <source
                  media="(max-width: 767.98px)"
                  type="image/jpeg"
                  srcSet="/images/hero/hero-day-mobile.jpg"
                />
                <source type="image/webp" srcSet="/images/hero/hero-day-desktop.webp" />
                <source type="image/jpeg" srcSet="/images/hero/hero-day-desktop.jpg" />
                {/* The hero's largest paint — loads eagerly, off the lazy path. */}
                <img
                  src="/images/hero/hero-day-desktop.jpg"
                  alt=""
                  fetchPriority="high"
                  decoding="async"
                  width={2560}
                  height={1441}
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
              <picture>
                <source
                  media="(max-width: 767.98px)"
                  type="image/webp"
                  srcSet="/images/hero/hero-night-mobile.webp"
                />
                <source
                  media="(max-width: 767.98px)"
                  type="image/jpeg"
                  srcSet="/images/hero/hero-night-mobile.jpg"
                />
                <source type="image/webp" srcSet="/images/hero/hero-night-desktop.webp" />
                <source type="image/jpeg" srcSet="/images/hero/hero-night-desktop.jpg" />
                <img
                  src="/images/hero/hero-night-desktop.jpg"
                  alt=""
                  fetchPriority="high"
                  decoding="async"
                  width={2560}
                  height={1441}
                />
              </picture>
            </div>
          )}
        </div>

        {/* The wordmark, set large along the floor of the frame in the
            brand colour, on a neutral wash that rises off the bottom
            edge so it keeps contrast where it crosses the photo. Both
            sink out and fade on scroll while the photo zooms up under
            them. */}
        <div className="hero__masthead">
          {/* The wash is two stacked layers — the colour being left
              underneath, the new one on top clipped to the same
              expanding circle as the photo (identical box, origin and
              timing, so the two edges travel together). Keyed like the
              photo layers so the wipe replays on every toggle. */}
          <div
            key={isSweeping ? `wash-${sweepGen}` : "wash"}
            className={`hero__wash${isSweeping ? " is-sweeping" : ""}`}
          />

          {/* The masthead's contents in the skin the page is LEAVING,
              painted underneath the real one. Everything the layer
              above shows outside its circle is this. Carries no <h1>
              (there is exactly one on the page) and is inert: it is a
              picture of a button, not a second button.

              Only while a sweep is running, and only where the CTA it
              exists for is on screen — above $bp-md the masthead is the
              wordmark alone and there is nothing to cross-fade. */}
          {hasCta && isSweeping && (
            <div
              className="hero__skin hero__skin--prev"
              data-skin={leavingSkin}
              aria-hidden="true"
              inert
            >
              <div className="hero__title">
                <Logo
                  variant="wordmark"
                  className="hero__wordmark"
                  title="eklekta"
                />
              </div>
              <Button href={data.cta.href} className="hero__cta" variant="ghost">
                {data.cta.label}
              </Button>
            </div>
          )}

          {/* The real masthead, in the current skin, clipped to the same
              expanding circle as the incoming photo — same box, same
              origin, same duration and easing, so the pill's edge and
              the photograph's cross any given pixel together. Remounted
              by `key` on each toggle exactly like the photo layers, so
              the circle replays from zero; `is-sweeping` is what keeps
              the wordmark from taking that remount as a cue to make its
              entrance all over again (see &__wordmark in Hero.scss). */}
          <div
            key={isSweeping ? `skin-${sweepGen}` : "skin"}
            className={`hero__skin hero__skin--current${
              isSweeping ? " is-sweeping" : ""
            }`}
          >
            <h1 className="hero__title">
              {/* Logo renders role="img" + aria-label itself, so this is
                  the h1's only content — no separate sr-only text needed. */}
              <Logo variant="wordmark" className="hero__wordmark" title="eklekta" />
            </h1>

            {/* The navbar's own CTA, which cannot be shown below $bp-md —
                brand, toggle, pill and burger come to 371px of content
                inside a 336px bar at 360px wide. Below that breakpoint
                the first screen was photo and wordmark only, with the
                single call to action buried in the hamburger menu, so the
                same label and href land here instead. Hidden by default,
                so it exists at exactly the widths the bar cannot carry it
                and nowhere else. */}
            <Button href={data.cta.href} className="hero__cta" variant="ghost">
              {data.cta.label}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
