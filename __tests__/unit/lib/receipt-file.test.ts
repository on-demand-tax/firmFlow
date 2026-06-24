import {
  normalizeReceiptFileName,
  prepareReceiptFile,
  RECEIPT_INVALID_MIME_MESSAGE,
  RECEIPT_MAX_BYTES,
  RECEIPT_TOO_LARGE_MESSAGE,
  validateReceiptFile,
} from '@/lib/receipt-file';

describe('validateReceiptFile', () => {
  it('accepts JPEG', () => {
    const file = new File(['x'], 'receipt.jpg', { type: 'image/jpeg' });
    expect(validateReceiptFile(file)).toBeNull();
  });

  it('accepts PNG', () => {
    const file = new File(['x'], 'scan.png', { type: 'image/png' });
    expect(validateReceiptFile(file)).toBeNull();
  });

  it('accepts PDF', () => {
    const file = new File(['x'], 'invoice.pdf', { type: 'application/pdf' });
    expect(validateReceiptFile(file)).toBeNull();
  });

  it('rejects HEIC', () => {
    const file = new File(['x'], 'photo.heic', { type: 'image/heic' });
    expect(validateReceiptFile(file)).toBe(RECEIPT_INVALID_MIME_MESSAGE);
  });

  it('rejects files larger than 10MB', () => {
    const buffer = new Uint8Array(RECEIPT_MAX_BYTES + 1);
    const file = new File([buffer], 'big.jpg', { type: 'image/jpeg' });
    expect(validateReceiptFile(file)).toBe(RECEIPT_TOO_LARGE_MESSAGE);
  });
});

describe('normalizeReceiptFileName', () => {
  it('renames generic camera filenames', () => {
    const file = new File(['x'], 'image.jpg', { type: 'image/jpeg' });
    const renamed = normalizeReceiptFileName(file, 'image/jpeg');
    expect(renamed.name).toMatch(/^receipt-\d{8}-\d{6}\.jpg$/);
    expect(renamed.type).toBe('image/jpeg');
  });

  it('keeps already normalized names', () => {
    const file = new File(['x'], 'receipt-20260624-120000.jpg', { type: 'image/jpeg' });
    const renamed = normalizeReceiptFileName(file, 'image/jpeg');
    expect(renamed.name).toBe('receipt-20260624-120000.jpg');
  });
});

describe('prepareReceiptFile', () => {
  it('returns validation error for invalid mime', () => {
    const file = new File(['x'], 'photo.heic', { type: 'image/heic' });
    const result = prepareReceiptFile(file);
    expect(result.error).toBe(RECEIPT_INVALID_MIME_MESSAGE);
  });

  it('returns normalized file for valid image', () => {
    const file = new File(['x'], 'image.jpg', { type: 'image/jpeg' });
    const result = prepareReceiptFile(file);
    expect(result.error).toBeNull();
    expect(result.file.name).toMatch(/^receipt-\d{8}-\d{6}\.jpg$/);
  });
});
