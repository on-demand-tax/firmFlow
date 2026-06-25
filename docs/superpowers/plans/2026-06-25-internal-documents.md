# 내부 운영 문서 허브 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사이드바 최상단 「문서」 메뉴와 `/app/documents` 허브를 추가해 법인 운영 서류(파일·링크·메타·버전·만료)를 영수증·고객 폴더와 분리해 관리한다.

**Architecture:** `InternalDocument` Mongoose 모델에 메타·embedded `versions[]`를 두고, 파일 바이너리는 `FirmFlow_Data/Internal_Documents/[카테고리]/`에 Service Account 업로드(기존 `lib/drive/upload.ts` 패턴). 링크 항목은 Mongo만. RBAC는 `canEditDocument` / `canDeleteDocument`. 만료 UI는 `lib/document-expiry.ts`(서울 date-only).

**Tech Stack:** Next.js 16 App Router, React 19, Mongoose 9, Google Drive API v3, Jest + RTL + mongodb-memory-server

**Spec:** [`docs/superpowers/specs/2026-06-25-internal-documents-design.md`](../specs/2026-06-25-internal-documents-design.md)

---

## File map

| File | Action |
|------|--------|
| `lib/document-categories.ts` | Create — 8 enum, labels, Drive folder names |
| `lib/document-expiry.ts` | Create — expiry status, D-N, filter helpers |
| `lib/document-file.ts` | Create — MIME/size validation (extends receipt rules) |
| `lib/drive/internal-documents.ts` | Create — findOrCreate root + category folders |
| `lib/drive/upload.ts` | Modify — optional rename `uploadFile` alias or reuse `uploadReceipt` |
| `lib/permissions.ts` | Modify — `DocumentLike`, `canEditDocument`, `canDeleteDocument`, `canChangeDocumentCategory` |
| `models/InternalDocument.ts` | Create — schema + `InternalDocumentModel` |
| `app/api/documents/route.ts` | Create — GET list, POST link |
| `app/api/documents/tags/route.ts` | Create — GET distinct tags |
| `app/api/documents/expiring/route.ts` | Create — GET expiring within N days |
| `app/api/documents/upload/route.ts` | Create — POST multipart create / new version |
| `app/api/documents/[id]/route.ts` | Create — GET, PATCH, DELETE |
| `lib/nav-items.ts` | Modify — `DOCUMENT_ITEMS` first |
| `app/(app)/app/documents/page.tsx` | Create — list, filters, modals |
| `components/app/DocumentForm.tsx` | Create — link + file register/edit |
| `components/app/DocumentVersionHistory.tsx` | Create — accordion + revert |
| `components/app/ExpiringDocumentsCard.tsx` | Create — dashboard widget |
| `app/(app)/app/page.tsx` | Modify — mount expiring card |
| `docs/specification.md` | Modify — §2.1, §3.7, §4, §6 |
| `__tests__/unit/document-categories.test.ts` | Create |
| `__tests__/unit/document-expiry.test.ts` | Create |
| `__tests__/unit/lib/document-file.test.ts` | Create |
| `__tests__/unit/permissions-document.test.ts` | Create |
| `__tests__/unit/drive/internal-documents.test.ts` | Create |
| `__tests__/unit/models/InternalDocument.test.ts` | Create |
| `__tests__/api/documents.test.ts` | Create |
| `__tests__/api/documents-upload.test.ts` | Create |
| `__tests__/unit/nav-items.test.ts` | Modify — documents first |
| `__tests__/components/DocumentsPage.test.tsx` | Create |

---

### Task 1: Document categories registry

**Files:**
- Create: `lib/document-categories.ts`
- Create: `__tests__/unit/document-categories.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
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
  it('rejects unknown category', () => {
    expect(isDocumentCategory('Foo')).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- __tests__/unit/document-categories.test.ts
```

- [ ] **Step 3: Implement**

```ts
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

const LABELS: Record<DocumentCategory, string> = { /* spec §3.2 */ };
const FOLDER_NAMES: Record<DocumentCategory, string> = { /* same as labels */ };

export function isDocumentCategory(v: string): v is DocumentCategory {
  return (DOCUMENT_CATEGORIES as readonly string[]).includes(v);
}
export function getDocumentCategoryLabel(id: DocumentCategory): string { /* ... */ }
export function getDocumentCategoryFolderName(id: DocumentCategory): string { /* ... */ }
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add lib/document-categories.ts __tests__/unit/document-categories.test.ts
git commit -m "feat: add internal document category registry"
```

---

### Task 2: Expiry helpers

**Files:**
- Create: `lib/document-expiry.ts`
- Create: `__tests__/unit/document-expiry.test.ts`

- [ ] **Step 1: Write failing tests**

Cases (use fixed `now` via optional param):
- `expiresAt` null → `status: 'none'`
- expires today (Seoul) → `status: 'today'`
- expires in 7 days → `status: 'soon'`, `daysRemaining: 7`
- expired yesterday → `status: 'expired'`
- `isExpiringWithinDays(doc, 30)` true/false
- `sortByExpiryUrgency` puts today first, then soon, then none

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- __tests__/unit/document-expiry.test.ts
```

- [ ] **Step 3: Implement using `getSeoulDateKey`, `parseDateOnlySeoul`, `addDaysSeoul` from `lib/dates.ts`**

```ts
export type DocumentExpiryStatus = 'none' | 'today' | 'soon' | 'expired';

export function getDocumentExpiryInfo(
  expiresAt: Date | null | undefined,
  now = new Date(),
): { status: DocumentExpiryStatus; daysRemaining: number | null; label: string | null } { /* ... */ }
```

Badge labels: `오늘 만료`, `D-7`, `만료`.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

---

### Task 3: File validation (MIME + 10MB)

**Files:**
- Create: `lib/document-file.ts`
- Create: `__tests__/unit/lib/document-file.test.ts`

- [ ] **Step 1: Write failing tests**

- PDF, JPEG, PNG, xlsx, docx pass
- `image/heic` fails with Korean message
- \> 10MB fails

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
export const DOCUMENT_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const);

export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export function validateDocumentFile(file: File): string | null { /* resolveReceiptMimeType + size */ }
```

Reuse `resolveReceiptMimeType` from `lib/receipt-mime.ts` (pass custom set).

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

---

### Task 4: `InternalDocument` model

**Files:**
- Create: `models/InternalDocument.ts`
- Create: `__tests__/unit/models/InternalDocument.test.ts`

- [ ] **Step 1: Write failing schema tests** (pattern: `__tests__/unit/models/User.test.ts`)

- required: title, category, entryType, createdBy
- `Link` saves externalUrl
- `File` with versions subdoc validates version numbers

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- __tests__/unit/models/InternalDocument.test.ts
```

- [ ] **Step 3: Implement schema per spec §3.1**

```ts
const VersionSchema = new Schema({ version: Number, googleDriveFileId: String, /* ... */ }, { _id: false });

const InternalDocumentSchema = new Schema({
  title: { type: String, required: true },
  category: { type: String, enum: DOCUMENT_CATEGORIES, required: true, index: true },
  tags: { type: [String], default: [] },
  entryType: { type: String, enum: ['File', 'Link'], required: true },
  externalUrl: String,
  expiresAt: { type: Date, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  versions: [VersionSchema],
  currentVersion: Number,
}, { timestamps: true });

export const InternalDocumentModel =
  mongoose.models.InternalDocument ??
  mongoose.model<IInternalDocument>('InternalDocument', InternalDocumentSchema);
```

Add `normalizeTags(tags: string[]): string[]` — trim, lowercase, dedupe.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

---

### Task 5: Permissions

**Files:**
- Modify: `lib/permissions.ts`
- Create: `__tests__/unit/permissions-document.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
describe('canEditDocument', () => {
  it('allows owner Preparer', () => { /* ... */ });
  it('denies other Preparer', () => { /* ... */ });
  it('allows Admin on any doc', () => { /* ... */ });
});
describe('canDeleteDocument', () => {
  it('Admin only', () => { /* ... */ });
});
describe('canChangeDocumentCategory', () => {
  it('Admin only', () => { /* ... */ });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
export interface DocumentLike {
  createdBy: string;
}

export function canEditDocument(sessionUser: SessionUser, doc: DocumentLike): boolean {
  if (sessionUser.role === 'Admin') return true;
  return doc.createdBy === sessionUser.userId;
}

export function canDeleteDocument(sessionUser: SessionUser): boolean {
  return sessionUser.role === 'Admin';
}

export function canChangeDocumentCategory(sessionUser: SessionUser): boolean {
  return sessionUser.role === 'Admin';
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

---

### Task 6: Drive folder helpers

**Files:**
- Create: `lib/drive/internal-documents.ts`
- Create: `__tests__/unit/drive/internal-documents.test.ts`

- [ ] **Step 1: Write failing tests with mocked `DriveUploadClient`**

- `findOrCreateInternalDocumentsRoot` creates `Internal_Documents` under master
- `findOrCreateCategoryFolder('HR')` creates `인사` under root
- second call returns existing id

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
const ROOT_FOLDER_NAME = 'Internal_Documents';

export async function findOrCreateInternalDocumentsRoot(
  driveClient?: DriveUploadClient,
): Promise<string> { /* master → findOrCreate */ }

export async function findOrCreateCategoryFolder(
  category: DocumentCategory,
  driveClient?: DriveUploadClient,
): Promise<string> { /* root → folder name from getDocumentCategoryFolderName */ }
```

Mirror `findOrCreateOverheadReceiptsFolder` in `lib/drive/upload.ts`.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

---

### Task 7: API — list, create link, get, patch, delete

**Files:**
- Create: `app/api/documents/route.ts`
- Create: `app/api/documents/[id]/route.ts`
- Create: `app/api/documents/tags/route.ts`
- Create: `app/api/documents/expiring/route.ts`
- Create: `__tests__/api/documents.test.ts`

Follow patterns from `app/api/expenses/route.ts`, `requireSession`, `jsonError`, in-memory Mongo.

- [ ] **Step 1: Write failing API tests**

Cover:
- GET `/api/documents` — filter `category`, `tag`, `q` (title regex), default excludes expired unless `includeExpired=1`
- POST `/api/documents` — Link with title, category, externalUrl, tags, expiresAt
- GET `/api/documents/[id]` — 404, success with versions
- PATCH — owner updates title; non-owner Preparer 403; Admin updates category; `currentVersion` revert to v1 when v2 exists; invalid version 400
- DELETE — Admin only 403 for Preparer; Admin 200
- GET `/api/documents/tags` — distinct
- GET `/api/documents/expiring?withinDays=30`
- OnLeave → 403 on POST/PATCH

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- __tests__/api/documents.test.ts --runInBand
```

- [ ] **Step 3: Implement routes**

**GET list query builder:**

```ts
const filter: Record<string, unknown> = {};
if (category) filter.category = category;
if (tag) filter.tags = tag;
if (q) filter.title = { $regex: escapeRegex(q), $options: 'i' };
if (!includeExpired) {
  filter.$or = [
    { expiresAt: { $exists: false } },
    { expiresAt: null },
    { expiresAt: { $gte: startOfTodaySeoul } },
  ];
}
```

**PATCH body:** `title`, `description`, `tags`, `externalUrl` (Link), `expiresAt`, `category` (Admin only), `currentVersion` (revert — must exist in `versions`).

Serialize dates as ISO; populate `createdBy` name optional for list.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

---

### Task 8: API — file upload (create + new version)

**Files:**
- Create: `app/api/documents/upload/route.ts`
- Create: `__tests__/api/documents-upload.test.ts`

- [ ] **Step 1: Write failing tests**

- multipart: `file`, `title`, `category`, optional `description`, `tags`, `expiresAt`
- creates File doc with version 1, `currentVersion: 1`, Drive ids set (mock upload)
- with `documentId` — appends version 2, bumps `currentVersion`
- wrong MIME 400; OnLeave 403; non-owner PATCH version 403

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// POST multipart
const folderId = await findOrCreateCategoryFolder(category);
const uploaded = await uploadReceipt({ name: file.name, mimeType, buffer }, folderId);
// new doc or push version:
versions.push({
  version: nextVersion,
  googleDriveFileId: uploaded.id,
  fileUrl: uploaded.webViewLink,
  fileName: file.name,
  mimeType,
  uploadedBy: userId,
  uploadedAt: new Date(),
  note: formData.get('note') ?? undefined,
});
doc.currentVersion = nextVersion;
```

Use `validateDocumentFile` server-side (read buffer from File, check size; MIME via extension + magic if needed — match expenses-upload pattern).

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

---

### Task 9: Navigation

**Files:**
- Modify: `lib/nav-items.ts`
- Modify: `__tests__/unit/nav-items.test.ts`

- [ ] **Step 1: Update test — first href `/app/documents` for all roles**

```ts
expect(getNavItemsForRole('Preparer')[0]).toEqual({ href: '/app/documents', label: '문서' });
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Add `DOCUMENT_ITEMS` and prepend in `getNavItemsForRole`**

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

---

### Task 10: `DocumentForm` component

**Files:**
- Create: `components/app/DocumentForm.tsx`
- Create: `__tests__/components/DocumentForm.test.tsx` (minimal)

- [ ] **Step 1: Write failing test** — renders title, category select, link URL field when entryType Link, file input when File

- [ ] **Step 2: Implement form**

Props:

```ts
type DocumentFormProps = {
  mode: 'create' | 'edit';
  entryType: 'File' | 'Link';
  initialValues?: Partial<DocumentFormValues>;
  onSubmit: (values: DocumentFormValues) => Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
};
```

Fields: title, description, category (`Select`), tags (comma-separated or chip input), expiresAt (`input type="date"`), externalUrl (Link), file (File create only in form — new version separate modal).

Match `ExpenseForm` / shadcn `Input`, `Label`, `Button`.

- [ ] **Step 3: Run component tests — PASS**

- [ ] **Step 4: Commit**

---

### Task 11: `DocumentVersionHistory` + revert

**Files:**
- Create: `components/app/DocumentVersionHistory.tsx`

- [ ] **Step 1: Implement accordion** — list versions desc; current marked 「현행」; each row: vN, date, uploader, note, 「Drive에서 보기」, 「현행으로 지정」 (calls `onRevert(version)`)

- [ ] **Step 2: Component test** — current version button disabled; revert calls handler

- [ ] **Step 3: Commit**

---

### Task 12: Documents page

**Files:**
- Create: `app/(app)/app/documents/page.tsx`
- Create: `__tests__/components/DocumentsPage.test.tsx`

- [ ] **Step 1: Write failing tests**

- mock fetch list → renders title
- expiring badge `D-` or `오늘 만료` when fixture has expiresAt
- Admin sees delete; Preparer does not

- [ ] **Step 2: Implement page**

Structure:
- Header + 「문서 등록」 dropdown (파일 / 링크)
- Category sidebar (desktop) / chips (mobile) — `?category=HR` sync with URL searchParams
- Search input, tag filter
- `ResponsiveDataView` or `DataRecordCard` list (follow expenses page)
- `SimpleModal` for create/edit
- Detail drawer/modal with `DocumentVersionHistory` + new version upload

Expiry sections at top when `?expiring=1` or always pin 「오늘 만료」 block.

- [ ] **Step 3: Run tests — PASS**

- [ ] **Step 4: Commit**

---

### Task 13: Dashboard expiring card

**Files:**
- Create: `components/app/ExpiringDocumentsCard.tsx`
- Modify: `app/(app)/app/page.tsx`

- [ ] **Step 1: Component test** — renders up to 5 items from mocked fetch

- [ ] **Step 2: Implement card** — `GET /api/documents/expiring?withinDays=30`, link to `/app/documents?expiring=1`

- [ ] **Step 3: Add to dashboard below existing summary**

- [ ] **Step 4: Commit**

---

### Task 14: `specification.md` sync

**Files:**
- Modify: `docs/specification.md`

- [ ] **Step 1: Add §2.1 API rows for all `/api/documents*`**

- [ ] **Step 2: Add §3.7 InternalDocument table**

- [ ] **Step 3: Extend §4 with `Internal_Documents` tree + MIME list**

- [ ] **Step 4: §6 checklist item for 문서 허브**

- [ ] **Step 5: Commit**

```bash
git add docs/specification.md
git commit -m "docs: document internal documents hub in specification"
```

---

### Task 15: Full verification

- [ ] **Step 1: Run full test suite**

```bash
npm test -- --runInBand
```

Expected: all tests PASS (count increases from 202)

- [ ] **Step 2: Lint + build**

```bash
npm run lint
npm run build
```

- [ ] **Step 3: Manual smoke**

1. `/app/documents` — 링크 등록
2. PDF 업로드 → Drive `Internal_Documents/인사/` 확인
3. 새 버전 업로드 → v2
4. v1 현행으로 지정
5. 대시보드 만료 카드 (만료일 오늘+7일 문서)

---

## API response shape (reference)

```ts
type DocumentListItem = {
  _id: string;
  title: string;
  description?: string;
  category: DocumentCategory;
  tags: string[];
  entryType: 'File' | 'Link';
  externalUrl?: string;
  expiresAt?: string;
  currentVersion?: number;
  createdBy: string;
  createdByName?: string;
  expiry: ReturnType<typeof getDocumentExpiryInfo>;
  currentFileUrl?: string; // File only
};
```

---

## Notes for implementers

- **Do not** store receipts in this module; no changes to `Expense` upload paths.
- **Category change** on PATCH: reject unless `canChangeDocumentCategory`.
- **Revert** does not delete newer Drive files or version rows.
- **Delete** removes Mongo doc only (spec MVP).
- Use `isReadOnlyOnLeave` on all mutating document endpoints.
- Changelog: use clear Korean commit messages (hook updates `data/changelog.json`).
