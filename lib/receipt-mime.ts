const EXTENSION_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

export const RECEIPT_ALLOWED_MIME_TYPES = new Set<string>([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

export function resolveReceiptMimeType(
  file: File,
  allowed: ReadonlySet<string> = RECEIPT_ALLOWED_MIME_TYPES,
): string | null {
  if (file.type && allowed.has(file.type)) {
    return file.type;
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext) return null;

  const mime = EXTENSION_MIME[ext];
  return mime && allowed.has(mime) ? mime : null;
}
