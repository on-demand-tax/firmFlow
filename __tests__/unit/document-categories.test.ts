import {
  DOCUMENT_CATEGORIES,
  getDocumentCategoryLabel,
  getDocumentCategoryFolderName,
  isDocumentCategory,
} from '@/lib/document-categories';

describe('document-categories', () => {
  it('has 8 categories', () => {
    expect(DOCUMENT_CATEGORIES).toHaveLength(8);
  });

  it('maps HR to 인사 folder', () => {
    expect(getDocumentCategoryFolderName('HR')).toBe('인사');
    expect(getDocumentCategoryLabel('HR')).toBe('인사');
  });

  it('maps all categories to Korean labels', () => {
    expect(getDocumentCategoryLabel('Administration')).toBe('행정');
    expect(getDocumentCategoryLabel('GeneralAffairs')).toBe('총무');
    expect(getDocumentCategoryLabel('Reference')).toBe('참고자료');
    expect(getDocumentCategoryLabel('FormsAndLinks')).toBe('링크·양식');
    expect(getDocumentCategoryLabel('IT')).toBe('IT·시스템');
    expect(getDocumentCategoryLabel('Education')).toBe('교육·CPE');
    expect(getDocumentCategoryLabel('Marketing')).toBe('마케팅·영업');
  });

  it('rejects unknown category', () => {
    expect(isDocumentCategory('Foo')).toBe(false);
  });

  it('accepts known category', () => {
    expect(isDocumentCategory('HR')).toBe(true);
  });
});
