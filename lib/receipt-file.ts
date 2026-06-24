import {
  RECEIPT_ALLOWED_MIME_TYPES,
  resolveReceiptMimeType,
} from '@/lib/receipt-mime';

export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

export const RECEIPT_INVALID_MIME_MESSAGE =
  'PDF, JPEG, PNG 파일만 첨부할 수 있습니다';

export const RECEIPT_TOO_LARGE_MESSAGE = '파일 크기는 10MB 이하여야 합니다';

const GENERIC_CAMERA_NAMES = new Set([
  'image.jpg',
  'image.jpeg',
  'image.png',
  'photo.jpg',
  'photo.jpeg',
  'photo.png',
]);

export function validateReceiptFile(file: File): string | null {
  const mime = resolveReceiptMimeType(file, RECEIPT_ALLOWED_MIME_TYPES);
  if (!mime) {
    return RECEIPT_INVALID_MIME_MESSAGE;
  }
  if (file.size > RECEIPT_MAX_BYTES) {
    return RECEIPT_TOO_LARGE_MESSAGE;
  }
  return null;
}

export function isReceiptImage(mime: string): boolean {
  return mime === 'image/jpeg' || mime === 'image/png';
}

export function normalizeReceiptFileName(file: File, mime: string): File {
  const lowerName = file.name.toLowerCase();
  if (lowerName.startsWith('receipt-') || !GENERIC_CAMERA_NAMES.has(lowerName)) {
    return file;
  }

  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const time = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');

  const ext = mime === 'image/png' ? 'png' : mime === 'application/pdf' ? 'pdf' : 'jpg';
  const name = `receipt-${date}-${time}.${ext}`;

  return new File([file], name, { type: mime, lastModified: file.lastModified });
}

export function prepareReceiptFile(file: File): { file: File; error: string | null } {
  const error = validateReceiptFile(file);
  if (error) {
    return { file, error };
  }

  const mime = resolveReceiptMimeType(file, RECEIPT_ALLOWED_MIME_TYPES)!;
  return { file: normalizeReceiptFileName(file, mime), error: null };
}

export function createReceiptPreviewUrl(file: File): string | null {
  const mime = resolveReceiptMimeType(file, RECEIPT_ALLOWED_MIME_TYPES);
  if (!mime || !isReceiptImage(mime)) {
    return null;
  }
  return URL.createObjectURL(file);
}
