import { useEffect, useState } from "react";

/**
 * Tracks a CSS media query from JS.
 *
 * Only for the few places where a layout that exists at one breakpoint
 * and not the other has to change BEHAVIOUR too, not just style — the
 * services carousel is the case this was written for: below $bp-lg it
 * is a scroll-snap rail that owns a tab stop and an IntersectionObserver,
 * and above it the very same markup is the pinned scroll sequence, which
 * must keep neither. Anything that can be expressed as a media query in
 * the stylesheet belongs there instead.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);

    // Re-read on mount as well as on change: the lazy initial state was
    // computed during the first render, and a query can already have
    // flipped by the time the effect runs.
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);

  return matches;
}
