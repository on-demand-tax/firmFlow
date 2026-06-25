import {
  canChangeDocumentCategory,
  canDeleteDocument,
  canEditDocument,
  type SessionUser,
} from '@/lib/permissions';

const owner: SessionUser = { userId: 'user-1', role: 'Preparer' };
const other: SessionUser = { userId: 'user-2', role: 'Preparer' };
const admin: SessionUser = { userId: 'admin-1', role: 'Admin' };
const doc = { createdBy: 'user-1' };

describe('permissions-document', () => {
  describe('canEditDocument', () => {
    it('allows owner Preparer', () => {
      expect(canEditDocument(owner, doc)).toBe(true);
    });

    it('denies other Preparer', () => {
      expect(canEditDocument(other, doc)).toBe(false);
    });

    it('allows Admin on any doc', () => {
      expect(canEditDocument(admin, doc)).toBe(true);
      expect(canEditDocument(admin, { createdBy: 'user-2' })).toBe(true);
    });
  });

  describe('canDeleteDocument', () => {
    it('is Admin only', () => {
      expect(canDeleteDocument(owner)).toBe(false);
      expect(canDeleteDocument(admin)).toBe(true);
    });
  });

  describe('canChangeDocumentCategory', () => {
    it('is Admin only', () => {
      expect(canChangeDocumentCategory(owner)).toBe(false);
      expect(canChangeDocumentCategory(admin)).toBe(true);
    });
  });
});
