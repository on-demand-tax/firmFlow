import { resolveReceiptMimeType } from '@/lib/receipt-mime';

export const DOCUMENT_ALLOWED_MIME_TYPES = new Set<string>([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export function validateDocumentFile(file: File): string | null {
  const mimeType = resolveReceiptMimeType(file, DOCUMENT_ALLOWED_MIME_TYPES);
  if (!mimeType) {
    return 'PDF, JPEG, PNG, XLSX, DOCX 파일만 업로드할 수 있습니다';
  }

  if (file.size > DOCUMENT_MAX_BYTES) {
    return '파일 크기는 10MB 이하여야 합니다';
  }

  return null;
}

export function resolveDocumentMimeType(file: File): string | null {
  return resolveReceiptMimeType(file, DOCUMENT_ALLOWED_MIME_TYPES);
}
