import { useLayoutEffect } from 'react'

/**
 * The build pre-renders the page into #root (scripts/postbuild.mjs) and
 * flags it `data-prerendered`; index.html keeps that markup
 * `visibility: hidden`, so with JS on it is never seen — it is only there
 * for crawlers and for no-JS visitors.
 *
 * createRoot().render() replaces the container's contents in its first
 * commit. This layout effect runs in that same commit — after the swap,
 * before the browser paints — and takes the flag off, so the first thing
 * on screen is the live tree and there is no flash of the static copy.
 * A layout effect on the root component rather than flushSync around
 * render() in main.tsx: flushSync would also make useEffect run
 * synchronously, moving every effect in the page ahead of the first paint.
 *
 * Not hydrateRoot: parts of the page read localStorage and matchMedia on
 * the client (theme, media queries), so the live tree can legitimately
 * differ from the build-time snapshot and hydration would report
 * mismatches. In `npm run dev` there is no flag, and this is a no-op.
 */
export function useClearPrerenderFlag() {
  useLayoutEffect(() => {
    document.getElementById('root')?.removeAttribute('data-prerendered')
  }, [])
}
