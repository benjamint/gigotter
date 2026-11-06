import { useEffect, useRef } from 'react'

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Scroll so `el` sits just under the sticky header (or to the top of the page when no element). */
export function scrollToEl(el?: Element | null, offset = 88) {
  const y = el ? el.getBoundingClientRect().top + window.scrollY - offset : 0
  // only move if the target is out of view (avoids jumpy desktop scrolling)
  if (el) { const r = el.getBoundingClientRect(); if (r.top >= offset - 4 && r.top < window.innerHeight * 0.4) return }
  window.scrollTo({ top: Math.max(0, y), behavior: reduced() ? 'auto' : 'smooth' })
}

/** When any dependency changes (after the first render), bring the ref'd element into view. */
export function useScrollIntoViewOn<T extends Element>(deps: unknown[]) {
  const ref = useRef<T>(null)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    // wait a frame so the new content has rendered
    requestAnimationFrame(() => scrollToEl(ref.current))
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return ref
}
