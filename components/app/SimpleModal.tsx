'use client';

import type { ReactNode } from 'react';

interface SimpleModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}

export function SimpleModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: SimpleModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/20"
        aria-label="닫기"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="simple-modal-title"
        className="relative z-10 w-full max-w-md rounded-xl border bg-background p-6 shadow-lg"
      >
        <h2 id="simple-modal-title" className="text-lg font-semibold">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
        <div className="mt-4">{children}</div>
        <div className="mt-6 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}
