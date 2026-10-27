import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Page navigation that talks to the browser history.
 *
 * Why Back used to leave the site: when pages are just React state (setPage),
 * the browser only ever sees ONE history entry, so Back goes straight out.
 * Here every navigate() pushes a real history entry (with the URL hash, e.g.
 * #/quest), so phone Back / Android back-gesture / browser Back return to the
 * previous page, and a refresh stays on the same page.
 *
 *   const { page, direction, navigate } = usePageNav(PAGES);
 *   navigate("Quest");                       // push  -> Back returns here
 *   navigate("Quest", { replace: true });    // replace -> no extra Back step
 */

const hashOf = (page) => "#/" + encodeURIComponent(page.toLowerCase());

// Plain (non-React) store so it is easy to test and safe under StrictMode.
export function createPageNav(pages, initial = pages[0], win = window) {
  const idx = (p) => pages.indexOf(p);

  const read = () => {
    const st = win.history.state;
    if (st && pages.includes(st.page)) return st.page;
    let h = "";
    try {
      h = decodeURIComponent((win.location.hash || "").replace(/^#\/?/, ""));
    } catch (e) {
      h = "";
    }
    return pages.find((p) => p.toLowerCase() === h.toLowerCase()) || initial;
  };

  let page = read();
  let snapshot = { page, direction: 1 };
  const listeners = new Set();

  const commit = (next, direction) => {
    page = next;
    snapshot = { page, direction };
    listeners.forEach((l) => l());
  };

  // make the very first entry carry state, so coming Back to it works
  win.history.replaceState({ page }, "", hashOf(page));

  const navigate = (next, { replace = false } = {}) => {
    if (!pages.includes(next) || next === page) return;
    const direction = Math.sign(idx(next) - idx(page)) || 1;
    win.history[replace ? "replaceState" : "pushState"]({ page: next }, "", hashOf(next));
    commit(next, direction);
  };

  const onPop = (e) => {
    const next = e.state && pages.includes(e.state.page) ? e.state.page : read();
    if (next === page) return;
    commit(next, Math.sign(idx(next) - idx(page)) || -1);
  };

  // listener lives with the subscription, so StrictMode's mount/unmount/mount is fine
  const subscribe = (listener) => {
    listeners.add(listener);
    if (listeners.size === 1) win.addEventListener("popstate", onPop);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) win.removeEventListener("popstate", onPop);
    };
  };

  return { navigate, subscribe, getSnapshot: () => snapshot };
}

export function usePageNav(pages, initial) {
  const ref = useRef(null);
  if (!ref.current) ref.current = createPageNav(pages, initial);
  const store = ref.current;

  const { page, direction } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );

  // every page starts at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  return { page, direction, navigate: store.navigate };
}