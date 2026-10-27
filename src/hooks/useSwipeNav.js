import { useEffect, useRef } from "react";

/**
 * Swipe left  -> next page,  swipe right -> previous page (order = `pages`).
 *
 * Guard rails so it never fights normal phone use:
 *  - ignores swipes that start within 24px of either screen edge
 *    (that zone belongs to Android's system Back gesture)
 *  - needs a clearly horizontal move (not a diagonal scroll)
 *  - ignores touches on inputs/sliders, inside horizontally-scrollable areas,
 *    inside anything marked data-no-swipe, and while text is selected
 */

const MIN_DIST = 70; // px
const EDGE = 24; // px
const RATIO = 1.8; // horizontal must beat vertical by this much
const SLOW_MS = 700; // slow drags must travel further
const SLOW_DIST = 140; // px

// Pure decision function: returns 1 (next), -1 (previous) or 0 (ignore)
export function swipeDirection({ dx, dy, dt, startX, vw }) {
  if (startX < EDGE || startX > vw - EDGE) return 0;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < MIN_DIST || ax < ay * RATIO) return 0;
  if (dt > SLOW_MS && ax < SLOW_DIST) return 0;
  return dx < 0 ? 1 : -1;
}

function inBlockedArea(target) {
  for (let n = target; n && n !== document.body; n = n.parentElement) {
    if (n.nodeType !== 1) continue;
    if (n.hasAttribute("data-no-swipe")) return true;
    const tag = n.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || n.isContentEditable) {
      return true;
    }
    const ox = getComputedStyle(n).overflowX;
    if ((ox === "auto" || ox === "scroll") && n.scrollWidth > n.clientWidth + 1) {
      return true;
    }
  }
  return false;
}

export function useSwipeNav({ page, pages, navigate, enabled = true }) {
  // always read the latest values without re-attaching listeners
  const latest = useRef({ page, pages, navigate });
  latest.current = { page, pages, navigate };

  useEffect(() => {
    if (!enabled) return undefined;
    let start = null;

    const onStart = (e) => {
      const sel = window.getSelection && window.getSelection().toString();
      if (e.touches.length !== 1 || sel || inBlockedArea(e.target)) {
        start = null;
        return;
      }
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY, time: Date.now() };
    };

    const onEnd = (e) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dir = swipeDirection({
        dx: t.clientX - start.x,
        dy: t.clientY - start.y,
        dt: Date.now() - start.time,
        startX: start.x,
        vw: window.innerWidth,
      });
      start = null;
      if (!dir) return;
      const { page: cur, pages: list, navigate: go } = latest.current;
      const next = list[list.indexOf(cur) + dir];
      // replace: swiping through tabs doesn't pile up Back steps
      if (next) go(next, { replace: true });
    };

    const onCancel = () => {
      start = null;
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
    };
  }, [enabled]);
}