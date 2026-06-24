# 경비 영수증 모바일 촬영 설계

**작성일:** 2026-06-24  
**상태:** Approved (brainstorming)  
**정본 연동:** [`docs/specification.md`](../../specification.md) §3.5, §4, §6  
**관련 코드:** `components/app/ExpenseForm.tsx`, `app/api/expenses/upload/route.ts`, `lib/receipt-mime.ts`

---

## 1. 개요

현장(모바일)에서 종이 영수증을 **확실히 촬영**해 경비에 첨부할 수 있도록 한다. 데스크톱은 기존 파일 선택(PDF·이미지)을 유지한다.

### 1.1 Brainstorming 결정 사항

| # | 항목 | 결정 |
|---|------|------|
| 1 | 주 사용 환경 | **A** — 모바일 현장 촬영 중심; 데스크톱은 파일 선택 유지 |
| 2 | 촬영 후 UX | **A** — 썸네일 미리보기 + 「다시 촬영」 / 「제거」 후 폼 제출 |
| 3 | 구현 접근 | **분리된 네이티브 file input + `ReceiptAttachment` 컴포넌트** (인앱 `getUserMedia` 제외) |

### 1.2 범위

**포함 (MVP)**

- 모바일: 「촬영」「앨범」 버튼, 촬영 시 `capture="environment"`
- 촬영·선택 후 이미지 미리보기, 재촬영·제거
- 데스크톱: 단일 「파일 선택」(PDF, JPEG, PNG)
- 클라이언트 MIME·10MB 사전 검증(기존 API 규칙과 동일)
- 촬영 파일명 정규화: `receipt-{YYYYMMDD}-{timestamp}.jpg`
- `specification.md` 영수증 UX·제약 문서화

**제외 (1차)**

- 인앱 카메라 UI (`getUserMedia`)
- 이미지 크롭·보정·압축
- HEIC → JPEG 자동 변환
- 모바일 PDF 전용 버튼 (파일 앱 경유는 OS에 맡김)
- 기존 경비에 대한 사후 영수증 첨부 UI (API `expenseId`는 이미 지원, UI는 별도 작업)

---

## 2. UX · UI

### 2.1 모바일 (`< md`, 768px)

```
[영수증 (선택)]
  [촬영]  [앨범]

  ┌─────────────┐
  │  썸네일      │  receipt-20260624-143052.jpg
  └─────────────┘
  [다시 촬영]  [제거]
```

- **촬영:** 숨겨진 input — `accept="image/jpeg,image/png"`, `capture="environment"`
- **앨범:** 숨겨진 input — `accept="image/jpeg,image/png,image/*"` (갤러리)
- **다시 촬영:** 마지막으로 사용한 소스(촬영/앨범)와 동일 input 재호출
- **제거:** `receiptFile = null`, object URL 해제

### 2.2 데스크톱 (`md+`)

- 단일 「파일 선택」: `accept` = PDF + JPEG + PNG (현행과 동일)
- 미리보기: 이미지 → 썸네일; PDF → 파일명 + 「PDF」 라벨

### 2.3 오류·제약 (사용자 메시지)

| 조건 | 메시지 |
|------|--------|
| 허용 외 MIME | `PDF, JPEG, PNG 파일만 첨부할 수 있습니다` |
| 10MB 초과 | `파일 크기는 10MB 이하여야 합니다` |
| iOS HEIC 등 | 위 MIME 메시지 (변환 없음) |

---

## 3. 컴포넌트 구조

```
components/app/ReceiptAttachment.tsx   ← 신규 (UI + hidden inputs + preview)
lib/receipt-file.ts                    ← 신규 (검증, rename, preview URL 헬퍼)
components/app/ExpenseForm.tsx         ← receipt 필드 블록을 ReceiptAttachment로 교체
lib/use-media-query.ts                 ← 기존 (모바일 분기)
```

### 3.1 `ReceiptAttachment` Props

```ts
type ReceiptAttachmentProps = {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
};
```

- `ExpenseForm`의 `receiptFile` 상태와 1:1 바인딩
- `onSubmit` / `POST /api/expenses/upload` 계약 변경 없음

### 3.2 `lib/receipt-file.ts`

| 함수 | 역할 |
|------|------|
| `validateReceiptFile(file)` | MIME(`resolveReceiptMimeType`) + 10MB; 오류 문자열 또는 `null` |
| `normalizeReceiptFileName(file)` | 촬영 기본명(`image.jpg` 등) → `receipt-{date}-{ts}.jpg` |
| `isReceiptImage(mime)` | 미리보기 여부 |
| `createReceiptPreviewUrl(file)` | `URL.createObjectURL` (unmount/remove 시 `revoke`) |

허용 MIME 집합은 `app/api/expenses/upload/route.ts`의 `ALLOWED_MIME_TYPES`와 **동일 집합**을 export해 단일 정의(shared constant 권장: `lib/receipt-mime.ts`에 `RECEIPT_ALLOWED_MIME_TYPES` 추가).

### 3.3 데이터 흐름 (변경 없음)

```
ExpenseForm → expenses/page onSubmit
  → POST /api/expenses (경비 생성)
  → POST /api/expenses/upload (multipart file + expenseId)  [기존]
```

---

## 4. `specification.md` 반영 (구현 시 동시 적용)

### 4.1 §3.5 Expense 하단 — UI 동작 (신규 소절)

- 경비 등록 폼(`ExpenseForm`) 영수증은 **선택** 첨부
- 모바일: 촬영·앨범·미리보기·재촬영·제거
- 데스크톱: 파일 선택(PDF/JPEG/PNG)
- 구현: `components/app/ReceiptAttachment.tsx`, `lib/receipt-file.ts`

### 4.2 §4 경비 영수증 업로드 — 확장

기존 3단계 유지 + 클라이언트 명시:

1. Multipart Form (이미지/PDF, `lib/receipt-mime.ts` 검증, **최대 10MB**)
2. Core → 고객 폴더; Overhead → `/Overhead_Receipts`
3. `receiptUrl`, `googleDriveFileId` 저장

**클라이언트 첨부 (2026-06-24):**

| 뷰포트 | UI |
|--------|-----|
| `< md` | 촬영(`capture=environment`), 앨범, 미리보기 |
| `≥ md` | 파일 선택 (PDF/JPEG/PNG) |

**비지원:** HEIC, 인앱 카메라, 크롭/압축

### 4.3 §5 테스트 / §6 로드맵

- `__tests__/components/ReceiptAttachment.test.tsx` (또는 `ExpenseForm` 확장)
- `__tests__/unit/lib/receipt-file.test.ts`
- §6 구현 현황에 영수증 모바일 촬영 항목 추가

---

## 5. 테스트

### 5.1 단위 — `lib/receipt-file.test.ts`

- JPEG/PNG/PDF 통과
- HEIC·빈 파일 거부
- 10MB 초과 거부
- `normalizeReceiptFileName` 패턴

### 5.2 컴포넌트 — `ReceiptAttachment.test.tsx`

- `useIsMobile` mock: 모바일 → 촬영·앨범 버튼 노출, 데스크톱 → 파일 선택만
- 파일 선택 후 미리보기·파일명 표시
- 제거 시 `onChange(null)`
- 잘못된 MIME 시 오류 메시지

### 5.3 회귀

- `ExpenseForm.test.tsx` — 기존 검증 유지
- `expenses-upload.test.ts` — API 변경 없음, 전체 통과

---

## 6. 브라우저·기기 참고

| 환경 | 촬영 동작 |
|------|-----------|
| iOS Safari | `capture=environment` → 후면 카메라 우선 (OS UI) |
| Android Chrome | 동일, 제조사별 카메라 앱 |
| 데스크톱 | `capture` 무시, 파일 선택만 |

촬영 품질·해상도는 OS 기본값; 10MB 초과 시 클라이언트에서 차단.
