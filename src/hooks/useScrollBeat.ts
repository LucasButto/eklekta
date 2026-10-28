import { useEffect, useRef } from "react";
import { ABORT_PX, FLING_JUMP, HOLD_MS } from "@/hooks/useScrollSequence";

/**
 * How far the element's centre has to get from the viewport's before
 * the beat re-arms, in px — the same job CLEAR_PX does in
 * useScrollSequence: without it the hold retriggers on the very next
 * scroll after it releases, since the element is parked on the line.
 */
const CLEAR_PX = 250;

/**
 * Slack on the line, in px. A pinned (sticky) element sits exactly on
 * it for the whole pin, and a sub-pixel difference between its 100svh
 * and innerHeight would otherwise keep it a hair off the line until the
 * pin let go — moving the stop from the start of the pin to its end.
 */
const LINE_SLACK = 1;

/**
 * How long the page has to be still after an in-page link or Home/End
 * before beats are allowed again, in ms. Restarted by every scroll frame
 * of the trip, so it covers a smooth scroll of any length.
 */
const SETTLE_MS = 200;

/**
 * The bounce that plays as the scroll stops. The Servicios beat gets its
 * bounce for free: the scroll overshoots the line by a frame and the
 * hold yanks it back. Here it is played on purpose, so it reads the same
 * on every screen and every input: the content starts exactly where the
 * reader last saw it (past the line by whatever the scroll overshot),
 * swings back through the line by RECOIL_PX, and settles on it.
 */
const BOUNCE_MS = 420;
const RECOIL_PX = 10;
/** The largest overshoot played back; a bigger miss starts this close. */
const MAX_OVERSHOOT_PX = 48;

/**
 * One scroll beat on one element: the moment its centre reaches the
 * viewport's centre — coming down onto it or coming back up onto it —
 * the scroll stops there for HOLD_MS (the wheel does nothing) with a
 * small bounce, the same catch Servicios gives each service at its
 * reading line (see useScrollSequence, whose timings this shares). Sized
 * to the viewport, the element fills the screen at exactly that moment.
 * It stops the scroll; it never adds any to the page.
 *
 * `ref` goes on the element that has to reach the line; `bounceRef` on
 * whatever should do the bounce — usually the block holding it.
 *
 * What it lets pass without stopping: the page being sent somewhere —
 * a nav link (the navbar flags its own scroll), any other in-page link
 * (the footer's "back to top" crosses this on its way up), Home/End, or
 * a single-frame jump (find-in-page, a restored or pasted #hash) — and
 * reduced motion. The reader can push through the hold with the wheel.
 *
 * Unlike the Servicios sequence it has no running-distance fling gate:
 * that gate was swallowing the stop for a reader who simply kept
 * scrolling out of the hero on a tall screen, where the photo arrives a
 * little over 2000px down. The explicit link / key checks above do its
 * job here instead.
 */
export function useScrollBeat<
  T extends HTMLElement,
  B extends HTMLElement = HTMLElement,
>(enabled: boolean) {
  const ref = useRef<T | null>(null);
  const bounceRef = useRef<B | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!enabled || !node) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    let holdFrame = 0;
    let holding = false;
    /** The beat has been spent on this pass, until the element clears. */
    let spent = false;
    let holdStart = 0;
    let holdAt = 0;
    let abortDelta = 0;
    /** The element's signed distance from the line at the last frame. */
    let previous: number | null = null;
    let lastY = window.scrollY;
    /** An in-page link or Home/End is moving the page; see SETTLE_MS. */
    let passing = false;
    let settleTimer = 0;

    // Same flag useScrollSequence raises, so useHideOnScroll ignores the
    // hold's own corrective scrollTo.
    const setHolding = (value: boolean) => {
      holding = value;
      const root = document.documentElement;
      if (value) root.dataset.seqHolding = "1";
      else delete root.dataset.seqHolding;
    };

    const release = () => {
      spent = true;
      setHolding(false);
    };

    const settle = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        passing = false;
      }, SETTLE_MS);
    };

    const startPassing = () => {
      passing = true;
      if (holding) release();
      settle();
    };

    const pin = () => {
      if (Math.abs(window.scrollY - holdAt) >= 1) {
        window.scrollTo({ top: holdAt, behavior: "instant" });
      }
    };

    /**
     * `overshoot` is how far past the line the element sat on screen the
     * moment the stop caught it (negative = above), so the bounce starts
     * where the reader last saw it and nothing jumps when pin() puts the
     * scroll back on the line. `down` is the way the page was going: the
     * recoil swings the other way, off the stop.
     */
    const bounce = (overshoot: number, down: boolean) => {
      const target = bounceRef.current;
      if (!target) return;
      const from = Math.max(
        -MAX_OVERSHOOT_PX,
        Math.min(MAX_OVERSHOOT_PX, overshoot),
      );
      const recoil = down ? RECOIL_PX : -RECOIL_PX;
      for (const running of target.getAnimations()) running.cancel();
      target.animate(
        [
          {
            transform: `translateY(${from}px)`,
            easing: "cubic-bezier(0.33, 1, 0.68, 1)",
          },
          {
            transform: `translateY(${recoil}px)`,
            offset: 0.45,
            easing: "cubic-bezier(0.65, 0, 0.35, 1)",
          },
          { transform: "translateY(0)" },
        ],
        { duration: BOUNCE_MS },
      );
    };

    // The hold ends on the clock, not on a frame count, so a late frame
    // can shorten nothing but the frames it skips.
    const expired = () => performance.now() - holdStart >= HOLD_MS;

    const runHold = () => {
      holdFrame = 0;
      if (!holding) return;
      if (expired()) {
        release();
        return;
      }
      pin();
      holdFrame = requestAnimationFrame(runHold);
    };

    const update = () => {
      frame = 0;

      const y = window.scrollY;
      // A wheel notch moves the page ~100px a frame; anything past this
      // in one frame is the page being sent somewhere, not scrolled.
      const jumped =
        Math.abs(y - lastY) >= Math.min(FLING_JUMP, window.innerHeight * 0.6);
      lastY = y;

      const box = node.getBoundingClientRect();
      const offset = box.top + box.height / 2 - window.innerHeight / 2;

      if (spent && Math.abs(offset) > CLEAR_PX) spent = false;

      // Onto the line from either side: from below on the way down, from
      // above on the way back up.
      const down = previous !== null && previous > LINE_SLACK;
      const up = previous !== null && previous < -LINE_SLACK;
      const arrived =
        (down && offset <= LINE_SLACK) || (up && offset >= -LINE_SLACK);
      previous = offset;

      if (
        arrived &&
        !holding &&
        !spent &&
        !jumped &&
        !passing &&
        !still.matches &&
        !document.documentElement.dataset.navScrolling
      ) {
        holdStart = performance.now();
        holdAt = Math.round(y + offset);
        abortDelta = 0;
        setHolding(true);
        // Stop now, in this frame, rather than on the next one.
        pin();
        bounce(offset, down);
        if (!holdFrame) holdFrame = requestAnimationFrame(runHold);
      }
    };

    const onScroll = () => {
      if (passing) settle();
      if (!frame) frame = requestAnimationFrame(update);
    };

    /**
     * Keeps the browser from scrolling under a running hold, and lets
     * it go early once the reader has pushed hard enough against it —
     * same escape hatch as the Servicios beat.
     */
    const onWheel = (event: WheelEvent) => {
      if (!holding) return;
      abortDelta += Math.abs(event.deltaY);
      if (abortDelta >= ABORT_PX || expired()) {
        release();
        return;
      }
      if (event.cancelable) event.preventDefault();
    };

    const onClick = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('a[href^="#"]')
      ) {
        startPassing();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Home" || event.key === "End") startPassing();
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // Not passive: onWheel calls preventDefault while a hold runs.
    window.addEventListener("wheel", onWheel, { passive: false });
    // Capture, so a link's own handler cannot keep this from hearing it.
    document.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", onWheel);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(settleTimer);
      if (frame) cancelAnimationFrame(frame);
      if (holdFrame) cancelAnimationFrame(holdFrame);
      if (holding) setHolding(false);
    };
  }, [enabled]);

  return { ref, bounceRef };
}
