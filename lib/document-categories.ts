export const DOCUMENT_CATEGORIES = [
  'HR',
  'Administration',
  'GeneralAffairs',
  'Reference',
  'FormsAndLinks',
  'IT',
  'Education',
  'Marketing',
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

const LABELS: Record<DocumentCategory, string> = {
  HR: '인사',
  Administration: '행정',
  GeneralAffairs: '총무',
  Reference: '참고자료',
  FormsAndLinks: '링크·양식',
  IT: 'IT·시스템',
  Education: '교육·CPE',
  Marketing: '마케팅·영업',
};

export function isDocumentCategory(value: string): value is DocumentCategory {
  return (DOCUMENT_CATEGORIES as readonly string[]).includes(value);
}

export function getDocumentCategoryLabel(id: DocumentCategory): string {
  return LABELS[id];
}

export function getDocumentCategoryFolderName(id: DocumentCategory): string {
  return LABELS[id];
}
