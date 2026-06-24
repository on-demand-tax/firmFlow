'use client';

import { useIsMobile } from '@/lib/use-media-query';

type ResponsiveDataViewProps = {
  mobile: React.ReactNode;
  desktop: React.ReactNode;
  mode?: 'auto' | 'mobile' | 'desktop';
};

export function ResponsiveDataView({
  mobile,
  desktop,
  mode = 'auto',
}: ResponsiveDataViewProps) {
  const isMobile = useIsMobile();
  const showMobile = mode === 'mobile' || (mode === 'auto' && isMobile);
  return showMobile ? mobile : desktop;
}
