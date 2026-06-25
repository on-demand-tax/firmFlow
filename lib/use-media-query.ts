'use client';

import { useEffect, useState } from 'react';

export const MOBILE_BREAKPOINT = 768;

/** Below this width, multi-column data tables switch to card layout (sidebar reduces content area). */
export const COMPACT_TABLE_BREAKPOINT = 1024;

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}

export function useIsCompactTableViewport(): boolean {
  return useMediaQuery(`(max-width: ${COMPACT_TABLE_BREAKPOINT - 1}px)`);
}
