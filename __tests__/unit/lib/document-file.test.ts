import { DOCUMENT_MAX_BYTES, validateDocumentFile } from '@/lib/document-file';

function createFile(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('document-file', () => {
  it('accepts pdf, jpeg, png, xlsx, docx', () => {
    expect(validateDocumentFile(createFile('a.pdf', 'application/pdf', 1))).toBeNull();
    expect(validateDocumentFile(createFile('a.jpg', 'image/jpeg', 1))).toBeNull();
    expect(validateDocumentFile(createFile('a.png', 'image/png', 1))).toBeNull();
    expect(
      validateDocumentFile(
        createFile(
          'a.xlsx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          1,
        ),
      ),
    ).toBeNull();
    expect(
      validateDocumentFile(
        createFile(
          'a.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          1,
        ),
      ),
    ).toBeNull();
  });

  it('rejects heic', () => {
    expect(validateDocumentFile(createFile('a.heic', 'image/heic', 1))).toBe(
      'PDF, JPEG, PNG, XLSX, DOCX 파일만 업로드할 수 있습니다',
    );
  });

  it('rejects files over 10MB', () => {
    expect(
      validateDocumentFile(createFile('big.pdf', 'application/pdf', DOCUMENT_MAX_BYTES + 1)),
    ).toBe('파일 크기는 10MB 이하여야 합니다');
  });
});
