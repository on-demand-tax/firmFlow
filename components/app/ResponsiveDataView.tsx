'use client';

import {
  COMPACT_TABLE_BREAKPOINT,
  MOBILE_BREAKPOINT,
  useIsCompactTableViewport,
  useIsMobile,
} from '@/lib/use-media-query';

type ResponsiveDataViewProps = {
  mobile: React.ReactNode;
  desktop: React.ReactNode;
  mode?: 'auto' | 'mobile' | 'desktop';
  /**
   * In `auto` mode, show mobile below this breakpoint.
   * Use `lg` (1024px) for wide tables so card layout appears before the sidebar squeezes columns.
   */
  compactBelow?: 'md' | 'lg';
};

export function ResponsiveDataView({
  mobile,
  desktop,
  mode = 'auto',
  compactBelow = 'md',
}: ResponsiveDataViewProps) {
  const isBelowMd = useIsMobile();
  const isBelowLg = useIsCompactTableViewport();
  const isCompact =
    compactBelow === 'lg'
      ? isBelowLg
      : isBelowMd;

  if (mode === 'mobile') {
    return mobile;
  }
  if (mode === 'desktop') {
    return desktop;
  }
  return isCompact ? mobile : desktop;
}

/** @internal test helper */
export function compactTableMediaQuery(): string {
  return `(max-width: ${COMPACT_TABLE_BREAKPOINT - 1}px)`;
}

/** @internal test helper */
export function mobileMediaQuery(): string {
  return `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;
}
