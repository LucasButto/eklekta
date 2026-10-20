import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

/**
 * The phone carousel the Servicios and Nosotros sections share: a native
 * scroll-snap rail (the list's parent is the scroller) with one card per
 * screen, and everything a thumb, an arrow and a dot need around it.
 *
 *  - ENDLESS ("endless"): the list is [two clones of the last cards, the
 *    cards, two clones of the first]. Swiping on from the last card slides
 *    the clone of the first in from the right — the same move as any other
 *    step — and once the rail has come to rest on a clone it is put back on
 *    the real card it copies, instantly and invisibly (they are the same
 *    picture and the same words). The first card has the mirror image on
 *    its left, so nothing ever scrolls the long way round. Two clones a
 *    side, not one, because a burst of taps may run up to two cards past
 *    where it began and the rail has to have something to show there. The
 *    caller renders the clones (see "withClones").
 *  - A one-time nudge the first time the rail is fully on screen: it slides
 *    a little left and comes back, so a card that is the whole screen still
 *    says there is a second one.
 *  - "shown", the card being read, for the dots; "goTo" and "step" for the
 *    dots and the arrows.
 *
 * SPAMMING the arrows is allowed, up to a point: each tap while the rail is
 * still moving queues one more step, to at most MAX_AHEAD cards from where
 * the burst began, and the rail simply carries on to the new destination
 * without stopping. A step is not a browser smooth-scroll — those restart
 * from nothing on every new target, which is what made a spammed rail
 * stutter and fall apart — but a critically damped spring we drive
 * ourselves: a new destination changes where the spring is pulled to and
 * leaves its position and velocity alone, so the motion stays one
 * continuous move however fast the taps come. A finger on the rail takes
 * it over at once, wherever the spring had got to.
 *
 * Without "endless" (the tablet band, which shows two cards at a time and
 * has no clones) a swipe that STARTS at an end and keeps pushing the same
 * way carries the rail to the other end instead.
 *
 * Every direct child of the list must carry "data-index" (the real card it
 * is, clones included).
 */

/** How far a swipe has to travel past an end of the rail to wrap round. */
const WRAP_SWIPE_PX = 44;

/** Clones on each side of an endless rail. */
const CLONES = 2;

/** How many cards past where a burst began the taps can queue the rail. */
const MAX_AHEAD = 2;

/** How long without a scroll event counts as the rail having come to rest. */
const REST_MS = 90;

/**
 * The spring. Critically damped (no overshoot) with this natural frequency:
 * one card takes about half a second, and a second card queued behind it
 * does not wait for the first to land.
 */
const OMEGA = 13;
/** Settled when this close to the destination (px) and this slow (px/s). */
const SETTLE_DIST = 0.4;
const SETTLE_SPEED = 12;

/**
 * The nudge: the rail slides this far left, as if a thumb had started a
 * swipe, shows the start of the next card, and settles back. A share of
 * the screen, so it reads the same on a narrow phone and a wide one.
 */
const NUDGE_SHARE = 0.16;
const NUDGE_MIN_PX = 44;
const NUDGE_MAX_PX = 72;
const NUDGE_MS = 1900;

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_SWING = "cubic-bezier(0.45, 0, 0.55, 1)";

/**
 * The nudge as a card on a spring, not a slider: each stop is
 * [share of NUDGE_MS, how far out as a share of the distance (1 = fully out,
 * 0 = home, negative = past home, to the right), the easing into the NEXT
 * stop]. It shoots past the mark on the way out and rings down onto it,
 * holds so the next card can be read, then comes home past zero and
 * rebounds until it rests — the boing is both ends of the move.
 */
const NUDGE_PATH: ReadonlyArray<readonly [number, number, string]> = [
  [0, 0, EASE_OUT],
  [0.18, 1.08, EASE_SWING], // out, a touch past the mark
  [0.33, 1, "linear"], // eases back onto it, showing the next card
  [0.5, 1, EASE_SWING], // held
  [0.62, -0.22, EASE_SWING], // home, and past it
  [0.74, 0.08, EASE_SWING], // rebound
  [0.85, -0.03, EASE_SWING],
  [1, 0, "linear"],
];

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The cards a rail renders: the real ones, flanked (when "endless") by the
 * last CLONES cards before and the first CLONES after. "index" is the real
 * card each entry stands for.
 */
export function withClones<T>(items: readonly T[], endless: boolean) {
  const real = items.map((item, index) => ({ item, index, clone: null }));
  const n = items.length;
  if (!endless || n < CLONES) return real;
  const lead = Array.from({ length: CLONES }, (_, k) => n - CLONES + k).map(
    (index) => ({ item: items[index], index, clone: "start" }),
  );
  const trail = Array.from({ length: CLONES }, (_, k) => k).map((index) => ({
    item: items[index],
    index,
    clone: "end",
  }));
  return [...lead, ...real, ...trail];
}

interface Options {
  /** Number of real cards. */
  count: number;
  /** The carousel layout is the one on screen. */
  active: boolean;
  /** One card per screen, with clones of the end cards on each side. */
  endless: boolean;
}

export function useEndlessRail(
  listRef: RefObject<HTMLOListElement | null>,
  { count, active, endless }: Options,
) {
  // Which card the rail is resting on, for the dots. Read off the scroll
  // container itself rather than from a scroll handler: whichever card is
  // showing the most of itself inside the rail is the one being read,
  // mid-swipe as well as at rest. A clone reports the real card it copies.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const list = listRef.current;
    if (!active || !list) return;

    const items = Array.from(list.children) as HTMLElement[];
    if (items.length === 0) return;

    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target, entry.intersectionRatio);
        }
        let best = 0;
        let bestRatio = -1;
        items.forEach((item, index) => {
          const ratio = ratios.get(item) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = index;
          }
        });
        setShown(Number(items[best].dataset.index ?? best));
      },
      { root: list.parentElement, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    for (const item of items) observer.observe(item);
    return () => observer.disconnect();
  }, [active, endless, listRef]);

  // ---- where the rail is, and where it is headed ----------------------
  // "rest" is the slot (child position) the rail last came to rest on — the
  // anchor the burst cap counts from. "target" is the slot a step in
  // progress is heading for, or null when nothing is. "spring" is the
  // running animation, if any.
  const restRef = useRef(CLONES);
  // The routine that takes the rail from "stopped" to "at rest" (clone back
  // to its real card, anchor and target updated); the spring asks for it
  // when it lands, since its last frame may not move the rail at all and so
  // may fire no scroll event to ask the usual way.
  const settleRef = useRef<() => void>(() => undefined);
  const targetRef = useRef<number | null>(null);
  const spring = useRef<{ raf: number; to: number; pos: number; v: number } | null>(
    null,
  );

  /** The slot a given real card sits at on this rail. */
  const slotOf = (real: number) => (endless ? real + CLONES : real);

  // The rail rests on the first real card, two pitches in, from the start;
  // and is put back on a real card from a clone once it comes to rest on
  // one.
  useLayoutEffect(() => {
    const list = listRef.current;
    const carousel = list?.parentElement;
    if (!endless || !list || !carousel) return;

    const pitch = () => {
      const [a, b] = [list.children[0], list.children[1]];
      return a && b
        ? b.getBoundingClientRect().left - a.getBoundingClientRect().left
        : 0;
    };
    const place = (real: number) => {
      // scrollTo, instant: a jump the reader cannot see, not a scroll.
      carousel.scrollTo({
        left: (real + CLONES) * pitch(),
        behavior: "instant",
      });
      restRef.current = real + CLONES;
    };
    place(0);

    let timer = 0;
    const settle = () => {
      // Our own spring is still running: it is not at rest, whatever the
      // scroll events say.
      if (spring.current) return;
      const p = pitch();
      if (!p) return;
      const slot = Math.round(carousel.scrollLeft / p);
      const real = (((slot - CLONES) % count) + count) % count;
      if (slot < CLONES || slot >= count + CLONES) place(real);
      else restRef.current = slot;
      targetRef.current = null;
    };
    settleRef.current = settle;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, REST_MS);
    };
    // A resize changes the pitch: keep the same real card in view.
    let lastWidth = carousel.clientWidth;
    const onResize = () => {
      const width = carousel.clientWidth;
      if (width === lastWidth) return;
      const p = pitch();
      const slot = Math.round(carousel.scrollLeft / (p * (lastWidth / width)));
      lastWidth = width;
      place((((slot - CLONES) % count) + count) % count);
    };

    carousel.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      settleRef.current = () => undefined;
      carousel.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [endless, count, listRef]);

  // A finger on the rail takes it over from the spring, wherever the
  // spring had got to; native scrolling (and the snap) carries on from
  // there. Snap is turned back on, since the spring switched it off.
  useEffect(() => {
    const carousel = listRef.current?.parentElement;
    if (!active || !carousel) return;
    const onTouchStart = () => {
      const s = spring.current;
      if (!s) return;
      cancelAnimationFrame(s.raf);
      spring.current = null;
      targetRef.current = null;
      carousel.style.scrollSnapType = "";
    };
    carousel.addEventListener("touchstart", onTouchStart, { passive: true });
    return () => {
      carousel.removeEventListener("touchstart", onTouchStart);
      const s = spring.current;
      if (s) cancelAnimationFrame(s.raf);
      spring.current = null;
      carousel.style.scrollSnapType = "";
    };
  }, [active, listRef]);

  // The one-time nudge. It is only ever a hint, so it gives way to the
  // reader moving the rail: a sideways swipe (the rail itself scrolling) or
  // a tap on the arrows or dots cancels it, and the rail is then wherever
  // the reader put it. A thumb that lands on the rail and keeps scrolling
  // the PAGE does not — the reader is still on their way down, and the
  // nudge plays out under them. Reduced motion skips it entirely. Moves the
  // list with a transform rather than scrolling the container: the rail is
  // scroll-snap mandatory, which would pull a small programmatic scroll
  // straight back to the card it left.
  const nudgeRef = useRef<Animation | null>(null);
  const nudgedRef = useRef(false);
  useEffect(() => {
    const list = listRef.current;
    const carousel = list?.parentElement;
    if (!endless || !list || !carousel || nudgedRef.current) return;
    if (reducedMotion()) return;

    const cancel = () => {
      nudgeRef.current?.cancel();
    };
    // Where the rail rests on the first real card: CLONES pitches in,
    // behind the clones of the last cards.
    const home = () => {
      const [a, b] = [list.children[0], list.children[1]];
      return a && b
        ? CLONES *
            (b.getBoundingClientRect().left - a.getBoundingClientRect().left)
        : 0;
    };
    const onScroll = () => {
      if (nudgeRef.current && Math.abs(carousel.scrollLeft - home()) > 2) {
        cancel();
      }
    };

    // Fully on screen: every pixel of the rail is inside the viewport — or,
    // if it is taller than the viewport, as much of it as a viewport can
    // hold.
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry || nudgedRef.current) return;
        const visible = entry.intersectionRect.height;
        const wanted = Math.min(
          entry.boundingClientRect.height,
          entry.rootBounds?.height ?? window.innerHeight,
        );
        if (!entry.isIntersecting || visible < wanted - 2) return;

        nudgedRef.current = true;
        observer.disconnect();
        // Already moved by hand: nothing left to hint at.
        if (Math.abs(carousel.scrollLeft - home()) > 2) return;

        const distance = Math.round(
          Math.min(
            NUDGE_MAX_PX,
            Math.max(NUDGE_MIN_PX, window.innerWidth * NUDGE_SHARE),
          ),
        );
        // Out with a rebound, a beat to be seen, and back with another —
        // see NUDGE_PATH.
        nudgeRef.current = list.animate(
          NUDGE_PATH.map(([offset, out, easing]) => ({
            offset,
            transform: `translateX(${Math.round(-out * distance * 10) / 10}px)`,
            easing,
          })),
          { duration: NUDGE_MS },
        );
        // Snap is off for the length of the nudge: snap points follow the
        // cards' transformed boxes, so when the rebound carried the first
        // card past home the rail re-snapped onto it — a real scroll,
        // which read as the reader swiping and cut the bounce short.
        carousel.style.scrollSnapType = "none";
        const settle = () => {
          nudgeRef.current = null;
          carousel.style.scrollSnapType = "";
        };
        nudgeRef.current.onfinish = settle;
        nudgeRef.current.oncancel = settle;
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    );
    observer.observe(carousel);

    // Only the rail's own horizontal scroll counts as the reader taking
    // over; vertical page scrolling never fires this.
    carousel.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      carousel.removeEventListener("scroll", onScroll);
      cancel();
    };
  }, [endless, listRef]);

  // Without clones (the tablet band): a swipe that STARTS at an end and
  // keeps pushing the same way — left on the last card, right on the first
  // — carries the rail to the other end, as the arrows do. Judged from where
  // the gesture began, so a swipe that merely arrives at an end does not
  // also turn the corner.
  useEffect(() => {
    const carousel = listRef.current?.parentElement;
    if (!active || endless || !carousel) return;

    const slack = 2;
    let start: {
      x: number;
      y: number;
      atStart: boolean;
      atEnd: boolean;
    } | null = null;
    const maxScroll = () => carousel.scrollWidth - carousel.clientWidth;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        start = null;
        return;
      }
      const touch = event.touches[0];
      start = {
        x: touch.clientX,
        y: touch.clientY,
        atStart: carousel.scrollLeft <= slack,
        atEnd: carousel.scrollLeft >= maxScroll() - slack,
      };
    };

    const onTouchEnd = (event: TouchEvent) => {
      const from = start;
      start = null;
      const touch = event.changedTouches[0];
      if (!from || !touch) return;

      const dx = touch.clientX - from.x;
      const dy = touch.clientY - from.y;
      if (Math.abs(dx) < WRAP_SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.4) {
        return;
      }

      const behavior = reducedMotion() ? "auto" : "smooth";
      // Pushed left on the last card, or right on the first.
      if (dx < 0 && from.atEnd) carousel.scrollTo({ left: 0, behavior });
      else if (dx > 0 && from.atStart) {
        carousel.scrollTo({ left: maxScroll(), behavior });
      }
    };

    carousel.addEventListener("touchstart", onTouchStart, { passive: true });
    carousel.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      carousel.removeEventListener("touchstart", onTouchStart);
      carousel.removeEventListener("touchend", onTouchEnd);
    };
  }, [active, endless, listRef]);

  // ---- moving the rail ------------------------------------------------
  /** Where the rail has to scroll to put a slot on the page gutter. */
  function scrollLeftFor(slot: number) {
    const list = listRef.current;
    const carousel = list?.parentElement;
    const item = list?.children[slot];
    if (!carousel || !(item instanceof HTMLElement)) return null;
    // The snapport's own start inset, so the card lands on the page
    // gutter rather than flush against the bled edge — the same place
    // scroll-snap puts it after a swipe.
    const inset =
      parseFloat(getComputedStyle(carousel).scrollPaddingInlineStart) || 0;
    return (
      carousel.scrollLeft +
      item.getBoundingClientRect().left -
      carousel.getBoundingClientRect().left -
      inset
    );
  }

  /**
   * Heads for slot. If the spring is already running it is only pulled
   * to the new place (position and velocity untouched); otherwise it is
   * started from where the rail is. Snap is off while it runs and back on
   * when it lands, exactly on the slot, so the snap has nothing to move.
   */
  function driveTo(slot: number) {
    const list = listRef.current;
    const carousel = list?.parentElement;
    const to = scrollLeftFor(slot);
    if (!carousel || to === null) return;

    // A nudge still in flight would be measured as part of the card's
    // position, and is pointless once the reader is driving.
    nudgeRef.current?.cancel();
    nudgeRef.current = null;

    targetRef.current = slot;

    if (reducedMotion()) {
      carousel.scrollTo({ left: to, behavior: "instant" });
      return;
    }

    const running = spring.current;
    if (running) {
      running.to = to;
      return;
    }

    carousel.style.setProperty("scroll-snap-type", "none");
    const state = { raf: 0, to, pos: carousel.scrollLeft, v: 0 };
    spring.current = state;
    let last = performance.now();

    const tick = (now: number) => {
      // Capped, so a frame the browser dropped does not become a lurch.
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      // Critically damped spring: x'' = w²(to - x) - 2w x'.
      state.v += (OMEGA * OMEGA * (state.to - state.pos) - 2 * OMEGA * state.v) * dt;
      state.pos += state.v * dt;

      const done =
        Math.abs(state.to - state.pos) < SETTLE_DIST &&
        Math.abs(state.v) < SETTLE_SPEED;
      carousel.scrollTo({
        left: done ? state.to : state.pos,
        behavior: "instant",
      });
      if (done) {
        spring.current = null;
        carousel.style.removeProperty("scroll-snap-type");
        window.setTimeout(() => settleRef.current(), REST_MS);
        return;
      }
      state.raf = requestAnimationFrame(tick);
    };
    state.raf = requestAnimationFrame(tick);
  }

  /**
   * To a card, from the dots. A direct jump, so it is not held to the burst
   * cap; on an endless rail it still goes by the shortest way round only
   * within the clones, which is wherever the dot's own card sits.
   */
  function goTo(index: number) {
    driveTo(slotOf(index));
  }

  /**
   * One card on (1) or back (-1), from the arrows; goes round at either
   * end. Taps that come while the rail is still moving stack, but never to
   * more than MAX_AHEAD cards from where the burst began — past that the
   * tap is dropped, which is what keeps a hammered arrow from running away
   * with the page.
   */
  function step(delta: 1 | -1) {
    if (!endless) {
      goTo((shown + delta + count) % count);
      return;
    }
    const rest = restRef.current;
    const base = targetRef.current ?? rest;
    const next = base + delta;
    if (Math.abs(next - rest) > MAX_AHEAD) return;
    driveTo(next);
  }

  return { shown, goTo, step };
}
