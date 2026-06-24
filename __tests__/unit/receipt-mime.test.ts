import { resolveReceiptMimeType } from '@/lib/receipt-mime';

const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png']);

describe('resolveReceiptMimeType', () => {
  it('uses file.type when allowed', () => {
    const file = new File(['x'], 'receipt.pdf', { type: 'application/pdf' });
    expect(resolveReceiptMimeType(file, ALLOWED)).toBe('application/pdf');
  });

  it('falls back to extension when file.type is empty', () => {
    const file = new File(['x'], 'receipt.pdf', { type: '' });
    expect(resolveReceiptMimeType(file, ALLOWED)).toBe('application/pdf');
  });

  it('rejects unsupported extensions', () => {
    const file = new File(['x'], 'notes.txt', { type: '' });
    expect(resolveReceiptMimeType(file, ALLOWED)).toBeNull();
  });
});
