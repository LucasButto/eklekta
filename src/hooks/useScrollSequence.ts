import { useEffect, useRef, useState } from "react";

/** Progress hits 0 when an item's top crosses this fraction of the viewport. */
const ENTER = 0.9;
/** Progress hits 1 when an item's bottom crosses this fraction. */
const EXIT = 0.15;

/**
 * Fallback reading line, as a fraction of the viewport, for when there
 * is no marker to measure (or it is hidden, as the panel is on mobile).
 */
const READ_LINE = 0.5;

/**
 * The beat. When a service reaches the rail's centre the scroll snaps
 * onto it and stays put for this long, swallowing input the whole time
 * — so scrolling past a service costs one gesture to stop on it and
 * another to move on. No easing, no spring: it just stops. The window
 * is short enough to read as a catch, and it can never trap — it ends
 * on a clock.
 */
const HOLD_MS = 200;

/**
 * The escape hatch. Keep scrolling hard through the beat — this much
 * wheel distance while it holds — and it lets go early, so a reader who
 * does not want to stop never has to wait it out.
 */
const ABORT_PX = 360;

/**
 * How far a service has to get from the line before it may be held
 * again, in px. Without it the beat retriggers on the service it just
 * released — it is parked on the line, so the very next scroll flips
 * its sign and reads as a fresh crossing, and the reader never gets
 * past it. Comfortably under the ~580px between two services, so
 * turning back to re-read one still re-arms its beat.
 */
const CLEAR_PX = 250;

/**
 * The beat is for reading past a service, not for passing through the
 * section on the way somewhere else — a nav-bar link, a "back to top",
 * a hash jump. Two ways a frame is judged to be one of those, and both
 * have to clear reading by a wide margin, since a missed judgement here
 * is the beat firing (or not) at random:
 *
 *  - FLING_DIST: a *continuous* scroll (no >120ms pause) has covered
 *    this much. A read is bursty — notch, pause, notch — so its run
 *    keeps resetting and never gets near a full viewport; only a held
 *    key, a spun wheel or a driven scroll runs unbroken this far.
 *  - FLING_JUMP: one frame moved this far. A wheel notch here is ~185px
 *    and even two coalesced into a frame are ~400 — anything past a
 *    thousand is the page being sent somewhere, not turned.
 *
 * On a hit, no new beat engages (and one in progress is let go) until
 * the page has been still for COOLDOWN.
 */
const FLING_DIST = 2000;
const FLING_JUMP = 1200;
const FLING_COOLDOWN = 400;

/**
 * Drives a sticky-media sequence: each item gets its own scroll
 * progress, and whichever item is nearest the reading line becomes the
 * active one so the pinned media can swap to match.
 *
 * Per-frame values are written straight onto the nodes as custom
 * properties instead of going through state — five items re-rendering
 * on every scroll frame is exactly the cascade Reveal avoids. Only the
 * active index is React state, and that changes when the reader crosses
 * an item, not when they move a pixel.
 *
 * Items are found by `data-seq-item` under the returned ref rather than
 * through an array of callback refs, so adding or reordering entries in
 * the JSON needs no wiring here.
 */
export function useScrollSequence<
  T extends HTMLElement,
  M extends HTMLElement = HTMLElement,
>(count: number) {
  const trackRef = useRef<T | null>(null);
  /**
   * Optional element whose centre becomes the reading line. Point it at
   * the pinned panel and an item goes active exactly as it draws level
   * with the panel, instead of at a viewport fraction that happens to
   * sit some tens of pixels off it.
   */
  const markerRef = useRef<M | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const items = Array.from(
      track.querySelectorAll<HTMLElement>("[data-seq-item]"),
    );
    if (items.length === 0) return;

    // Reduced motion keeps every item at rest and fully legible; the
    // media still swaps, since that is a content change and not motion.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    /** The item currently being held, or -1 between services. */
    let held = -1;
    /** Scroll position and time at the previous frame, the running
     *  distance of the current continuous scroll, and when a fling's
     *  suppression lifts — see the FLING_* constants. */
    let lastFrameY = window.scrollY;
    let lastFrameT = 0;
    let runDist = 0;
    let flingUntil = 0;
    /** The item whose beat has already been spent, until it clears. */
    let spent = -1;
    /** When the current hold started, the scroll position it pins to,
     *  its rAF handle, and the wheel distance the reader has fought it
     *  with. */
    let holdStart = 0;
    let holdAt = 0;
    let holdFrame = 0;
    let abortDelta = 0;
    /**
     * Each service's signed distance from the reading line as of the
     * previous frame. A sign flip between two frames is a service
     * crossing the line, and that is what starts a beat.
     *
     * Measured per FRAME, not per wheel event, and that is the whole
     * point. Driving this from the wheel handler made the beat depend on
     * where the pointer happened to be: wheel events are delivered
     * against whatever is under the cursor, so it fired with the mouse
     * over the service column and did nothing at all with it anywhere
     * else on the page. Scroll frames have no such gap — every scroll
     * produces them, whatever moved the page and wherever the pointer
     * is. A frame is also a far finer ruler: the page travels tens of
     * pixels between frames rather than the ~185px a notch jumps, so the
     * crossing is caught close to the line and the snap onto it is small.
     */
    let offsets: number[] = [];

    const update = () => {
      frame = 0;

      // --- fling gate -------------------------------------------------
      const nowFrame = performance.now();
      const dy = Math.abs(window.scrollY - lastFrameY);
      if (nowFrame - lastFrameT > 120) runDist = 0;
      lastFrameY = window.scrollY;
      lastFrameT = nowFrame;
      runDist += dy;
      if (dy >= FLING_JUMP || runDist >= FLING_DIST) {
        flingUntil = nowFrame + FLING_COOLDOWN;
        runDist = 0;
        if (held !== -1) {
          spent = held;
          held = -1;
        }
      }

      const viewport = window.innerHeight;

      // The marker is display:none below $bp-lg, where a hidden element
      // measures 0 and would drag the line to the top of the page.
      const marker = markerRef.current?.getBoundingClientRect();
      const line =
        marker && marker.height > 0
          ? marker.top + marker.height / 2
          : viewport * READ_LINE;

      let nearest = 0;
      let nearestDistance = Infinity;
      const previous = offsets;
      const current: number[] = [];

      items.forEach((node, index) => {
        const box = node.getBoundingClientRect();
        const top = box.top;

        // Distance the item travels between its own 0 and 1, which is
        // why taller items are not rushed through their fade.
        const travel = (ENTER - EXIT) * viewport + box.height;
        const raw = (ENTER * viewport - top) / travel;
        const progress = Math.min(1, Math.max(0, raw));

        if (!still.matches) {
          // The first item is already on screen when the section
          // arrives, so it starts solid instead of fading up from zero.
          const fadeIn = index === 0 ? 1 : Math.min(1, progress / 0.3);
          // The last item gets the mirror of that exemption. Its fade
          // used to bottom out at zero within a few pixels of the rail
          // unpinning, so the sequence's closing move was content
          // dissolving into a blank column exactly as the next section
          // arrived. It holds instead, and simply scrolls away.
          const fadeOut =
            index === items.length - 1
              ? 1
              : 1 - Math.max(0, (progress - 0.7) / 0.3);

          node.style.setProperty(
            "--seq-opacity",
            Math.min(fadeIn, fadeOut).toFixed(3),
          );
          // Unitless: the stylesheet multiplies it by a rem length, so
          // the travel scales with the large-display root ramp.
          node.style.setProperty("--seq-shift", (1 - progress * 2).toFixed(3));
        }

        const middle = top + box.height / 2;
        current[index] = middle - line;
        const distance = Math.abs(current[index]);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = index;
        }
      });

      offsets = current;

      // A service that has had its beat is left alone until the reader
      // has genuinely moved on from it.
      if (spent !== -1 && Math.abs(current[spent] ?? Infinity) > CLEAR_PX) {
        spent = -1;
      }

      // A service has just drawn level with the rail's centre: snap onto
      // it and hold. Skipped while a beat is already running (its own
      // scroll write would read as a fresh crossing), while a fling is
      // passing through, and while the navbar is mid smooth-scroll.
      if (
        held === -1 &&
        !still.matches &&
        nowFrame >= flingUntil &&
        // Set by the navbar for the exact span of a link's smooth-scroll
        // — the precise version of the fling heuristic, for the case
        // that causes it most. The heuristic stays as the backstop for
        // the ways a page can also be sent somewhere without the navbar:
        // Home/End, find-in-page, a pasted #hash.
        !document.documentElement.dataset.navScrolling &&
        previous.length === current.length
      ) {
        const crossed = current.findIndex(
          (offset, index) =>
            index !== spent &&
            ((previous[index] > 0 && offset <= 0) ||
              (previous[index] < 0 && offset >= 0)),
        );
        const rail = markerRef.current;
        // Desktop only: the beat marks a service arriving at the pinned
        // rail's centre, and the rail is only `position: sticky` from
        // $bp-lg up. Read only once a crossing has actually happened, so
        // it is never a per-frame cost.
        if (
          crossed !== -1 &&
          rail &&
          getComputedStyle(rail).position === "sticky"
        ) {
          held = crossed;
          holdStart = nowFrame;
          holdAt = Math.round(window.scrollY + current[crossed]);
          abortDelta = 0;
          if (!holdFrame) holdFrame = requestAnimationFrame(runHold);
        }
      }

      // Same value bails out of a re-render, so this is cheap per frame.
      setActive((prior) => (prior === nearest ? prior : nearest));
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    /**
     * Not what starts the beat — the frame loop above does that, so it
     * fires wherever the pointer is. This keeps the browser from
     * scrolling underneath a hold that is already running (they would
     * argue over the same pixels), and, once the reader has pushed hard
     * enough against it, lets it go so a fast reader is never held
     * against their will.
     */
    const onWheel = (event: WheelEvent) => {
      if (held === -1) return;
      abortDelta += Math.abs(event.deltaY);
      if (abortDelta >= ABORT_PX) {
        spent = held;
        held = -1;
        return;
      }
      if (event.cancelable) event.preventDefault();
    };

    /**
     * The hold: pin the scroll on the service's line position for
     * HOLD_MS, writing it every frame — which is what lets it survive
     * the touchpad momentum events preventDefault cannot cancel — then
     * release. No easing between here and the target: the snap onto the
     * line is instant, and it is small because the crossing is caught a
     * frame's worth of scroll from the line at most.
     */
    const runHold = () => {
      holdFrame = 0;
      if (held === -1) return;

      if (performance.now() - holdStart >= HOLD_MS) {
        spent = held;
        held = -1;
        return;
      }

      if (Math.abs(window.scrollY - holdAt) >= 1) {
        window.scrollTo({ top: holdAt, behavior: "instant" });
      }
      holdFrame = requestAnimationFrame(runHold);
    };

    const clear = () => {
      for (const node of items) {
        node.style.removeProperty("--seq-opacity");
        node.style.removeProperty("--seq-shift");
      }
    };

    const onPreferenceChange = () => {
      clear();
      schedule();
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    still.addEventListener("change", onPreferenceChange);
    // Not passive: onWheel calls preventDefault while a hold runs. It
    // reads a couple of numbers and touches no layout, so it costs the
    // scroll nothing.
    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      still.removeEventListener("change", onPreferenceChange);
      window.removeEventListener("wheel", onWheel);
      if (frame) cancelAnimationFrame(frame);
      if (holdFrame) cancelAnimationFrame(holdFrame);
      clear();
    };
  }, [count]);

  return { trackRef, markerRef, active };
}
