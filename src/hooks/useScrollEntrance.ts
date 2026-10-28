import { useEffect, useRef } from "react";

/**
 * One-shot entrance trigger: sets `data-entered` on the element the first
 * time its top edge comes up past ENTER_LINE of the screen, and leaves it
 * there. The stylesheet plays the entrance off that attribute on its own
 * clock — it runs to the end whether or not the reader keeps scrolling.
 *
 * Fires early on purpose (a little after the element starts showing, not
 * once a share of it is in view, as Reveal does), so a slower entrance
 * still lands before the reader is halfway into it.
 */
const ENTER_LINE = 0.92;

export function useScrollEntrance<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!enabled || !node || node.dataset.entered) return;

    if (!("IntersectionObserver" in window)) {
      node.dataset.entered = "";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          node.dataset.entered = "";
          observer.disconnect();
        }
      },
      { rootMargin: `0px 0px -${Math.round((1 - ENTER_LINE) * 100)}% 0px` },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return ref;
}
