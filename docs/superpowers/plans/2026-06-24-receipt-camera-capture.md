# 경비 영수증 모바일 촬영 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일에서 영수증을 확실히 촬영·미리보기·재촬영한 뒤 기존 업로드 API로 첨부하고, `specification.md`에 동작을 문서화한다.

**Architecture:** `ReceiptAttachment` 클라이언트 컴포넌트가 모바일(촬영/앨범)과 데스크톱(파일 선택)을 `useIsMobile`로 분기한다. 파일 검증·이름 정규화는 `lib/receipt-file.ts`에 두고 MIME 허용 목록은 `lib/receipt-mime.ts`와 공유한다. API·Drive 업로드 경로는 변경하지 않는다.

**Tech Stack:** Next.js App Router, React 19, Tailwind 4, shadcn `Button`/`Label`, Jest + RTL

**Spec:** [`docs/superpowers/specs/2026-06-24-receipt-camera-capture-design.md`](../specs/2026-06-24-receipt-camera-capture-design.md)

---

## File map

| File | Action |
|------|--------|
| `lib/receipt-mime.ts` | Modify — `RECEIPT_ALLOWED_MIME_TYPES` export |
| `lib/receipt-file.ts` | Create — validate, rename, preview helpers |
| `components/app/ReceiptAttachment.tsx` | Create — mobile/desktop UI |
| `components/app/ExpenseForm.tsx` | Modify — use `ReceiptAttachment` |
| `app/api/expenses/upload/route.ts` | Modify — import shared MIME set (optional 1-line) |
| `docs/specification.md` | Modify — §3.5 UI, §4 upload, §5/§6 |
| `__tests__/unit/lib/receipt-file.test.ts` | Create |
| `__tests__/components/ReceiptAttachment.test.tsx` | Create |
| `__tests__/components/ExpenseForm.test.tsx` | Modify — smoke for receipt section |

---

### Task 1: Shared MIME constants

**Files:**
- Modify: `lib/receipt-mime.ts`
- Modify: `app/api/expenses/upload/route.ts`

- [ ] **Step 1: Export allowed MIME set from `receipt-mime.ts`**

```ts
export const RECEIPT_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const);
```

- [ ] **Step 2: Update upload route to use `RECEIPT_ALLOWED_MIME_TYPES`**

Replace local `ALLOWED_MIME_TYPES` with import.

- [ ] **Step 3: Run upload tests**

```bash
npm test -- __tests__/api/expenses-upload.test.ts
```

Expected: PASS

---

### Task 2: `lib/receipt-file.ts` + unit tests

**Files:**
- Create: `lib/receipt-file.ts`
- Create: `__tests__/unit/lib/receipt-file.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:
- valid JPEG passes `validateReceiptFile`
- `image/heic` fails with Korean message
- file > 10MB fails
- `normalizeReceiptFileName` returns `receipt-YYYYMMDD-*.jpg` for generic camera names

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- __tests__/unit/lib/receipt-file.test.ts
```

- [ ] **Step 3: Implement `receipt-file.ts`**

```ts
import { resolveReceiptMimeType, RECEIPT_ALLOWED_MIME_TYPES } from '@/lib/receipt-mime';

export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

export function validateReceiptFile(file: File): string | null { /* ... */ }
export function normalizeReceiptFileName(file: File): File { /* ... */ }
export function isReceiptImage(mime: string): boolean { /* jpeg | png */ }
```

- [ ] **Step 4: Run tests — expect PASS**

---

### Task 3: `ReceiptAttachment` component

**Files:**
- Create: `components/app/ReceiptAttachment.tsx`
- Create: `__tests__/components/ReceiptAttachment.test.tsx`

- [ ] **Step 1: Write failing component tests**

Mock `useIsMobile`:
- mobile `true` → `getByRole('button', { name: '촬영' })`, `앨범` visible; no desktop-only label
- mobile `false` → `getByLabelText(/파일 선택|영수증/)` single picker
- fireEvent change with JPEG `File` → preview region / filename visible
- click `제거` → `onChange` called with `null`

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- __tests__/components/ReceiptAttachment.test.tsx
```

- [ ] **Step 3: Implement component**

Key structure:

```tsx
'use client';
// hidden inputs: cameraInputRef, galleryInputRef, desktopInputRef
// useIsMobile() from lib/use-media-query
// object URL preview with useEffect cleanup revoke
// on file pick: validate → normalize → onChange(file)
// Buttons: 촬영, 앨범 (mobile) | 파일 선택 (desktop)
// Preview: img or PDF label + 다시 촬영 + 제거
```

Use `Button variant="outline" size="sm"` to match app patterns. Touch targets: `py-2.5` on mobile buttons.

- [ ] **Step 4: Run tests — expect PASS**

---

### Task 4: Integrate into `ExpenseForm`

**Files:**
- Modify: `components/app/ExpenseForm.tsx`
- Modify: `__tests__/components/ExpenseForm.test.tsx` (optional: assert `ReceiptAttachment` region)

- [ ] **Step 1: Replace receipt `<Input type="file">` block with:**

```tsx
<ReceiptAttachment
  value={form.receiptFile}
  onChange={(file) => setForm({ ...form, receiptFile: file })}
  disabled={submitting}
/>
```

- [ ] **Step 2: Run ExpenseForm + full suite**

```bash
npm test -- __tests__/components/ExpenseForm.test.tsx __tests__/components/ReceiptAttachment.test.tsx
npm test
```

---

### Task 5: Update `specification.md`

**Files:**
- Modify: `docs/specification.md`

- [ ] **Step 1: After §3.5 Expense table, add `#### 영수증 첨부 (UI)`** per design §4.1

- [ ] **Step 2: Extend §4 `경비 영수증 업로드`** with client viewport table + 10MB + 비지원 목록

- [ ] **Step 3: §5.1 디렉터리 맵** — add `ReceiptAttachment`, `receipt-file.test.ts`

- [ ] **Step 4: §6 구현 현황** — bullet: 영수증 모바일 촬영 (`ReceiptAttachment`)

---

### Task 6: Manual verification

- [ ] DevTools mobile (375px): `/app/expenses` → 촬영·앨범·미리보기·제거
- [ ] Desktop: PDF + image file pick still works
- [ ] Submit expense with receipt → Drive upload succeeds (existing flow)

---

## Execution handoff

Plan saved. Choose:

1. **Subagent-Driven** — task별 subagent + 리뷰  
2. **Inline Execution** — 이 세션에서 순차 구현

Which approach?
