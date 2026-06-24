'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  createReceiptPreviewUrl,
  prepareReceiptFile,
} from '@/lib/receipt-file';
import { resolveReceiptMimeType, RECEIPT_ALLOWED_MIME_TYPES } from '@/lib/receipt-mime';

type ReceiptSource = 'camera' | 'gallery' | 'desktop';

type ReceiptAttachmentProps = {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
};

const IMAGE_ACCEPT = 'image/jpeg,image/png';
const DESKTOP_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

export function ReceiptAttachment({
  value,
  onChange,
  disabled = false,
}: ReceiptAttachmentProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const lastSourceRef = useRef<ReceiptSource>('camera');
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }

    const url = createReceiptPreviewUrl(value);
    setPreviewUrl(url);
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [value]);

  function openInput(source: ReceiptSource) {
    if (disabled) return;
    lastSourceRef.current = source;
    setError('');

    if (source === 'camera') {
      cameraInputRef.current?.click();
      return;
    }
    if (source === 'gallery') {
      galleryInputRef.current?.click();
      return;
    }
    desktopInputRef.current?.click();
  }

  function handleFileSelected(file: File | undefined) {
    if (!file) return;

    const { file: prepared, error: validationError } = prepareReceiptFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    onChange(prepared);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    handleFileSelected(file);
    e.target.value = '';
  }

  function handleRemove() {
    setError('');
    onChange(null);
  }

  function handleRetake() {
    openInput(lastSourceRef.current);
  }

  const mime = value ? resolveReceiptMimeType(value, RECEIPT_ALLOWED_MIME_TYPES) : null;
  const isPdf = mime === 'application/pdf';

  return (
    <div className="space-y-3" data-testid="receipt-attachment">
      <Label>영수증 (선택, PDF · JPEG · PNG)</Label>

      <input
        ref={cameraInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        onChange={handleInputChange}
        data-testid="receipt-camera-input"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept={`${IMAGE_ACCEPT},image/*`}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        onChange={handleInputChange}
        data-testid="receipt-gallery-input"
      />
      <input
        ref={desktopInputRef}
        id="receipt-desktop"
        type="file"
        accept={DESKTOP_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        onChange={handleInputChange}
        data-testid="receipt-desktop-input"
      />

      {!value && (
        <>
          <div
            className="flex flex-wrap gap-2 md:hidden"
            data-testid="receipt-mobile-actions"
          >
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="min-h-10"
              onClick={() => openInput('camera')}
            >
              촬영
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="min-h-10"
              onClick={() => openInput('gallery')}
            >
              앨범
            </Button>
          </div>
          <div className="hidden md:block" data-testid="receipt-desktop-actions">
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              aria-controls="receipt-desktop"
              onClick={() => openInput('desktop')}
            >
              파일 선택
            </Button>
          </div>
        </>
      )}

      {value && (
        <div
          className="rounded-lg border border-border bg-muted/20 p-3"
          data-testid="receipt-preview"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="영수증 미리보기"
                className="max-h-40 w-full max-w-xs rounded-md border border-border object-contain bg-background sm:w-auto"
              />
            ) : (
              <div className="flex h-24 w-full max-w-xs items-center justify-center rounded-md border border-dashed border-border bg-background text-sm font-medium text-muted-foreground">
                {isPdf ? 'PDF' : '첨부됨'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="break-all text-sm font-medium text-foreground">{value.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(value.size / 1024).toFixed(0)} KB
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className="md:hidden"
                  onClick={handleRetake}
                >
                  다시 촬영
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className="hidden md:inline-flex"
                  onClick={() => openInput('desktop')}
                >
                  다른 파일
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={handleRemove}
                >
                  제거
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
