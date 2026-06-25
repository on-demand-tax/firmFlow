# 내부 운영 문서 허브 설계

**작성일:** 2026-06-25  
**상태:** Approved (brainstorming)  
**정본 연동:** [`docs/specification.md`](../../specification.md) §4 (Drive), §6 (로드맵) — 구현 시 §2.1 API·§3 스키마 확장  
**관련 코드:** `lib/nav-items.ts`, `lib/drive/upload.ts`, `lib/permissions.ts`

---

## 1. 개요

법인 내부 **운영 서류·참고 문서·링크**를 체계적으로 보관하는 **「문서」** 카테고리를 추가한다. 경비 **영수증**(`Expense` + `Overhead_Receipts`)과 **고객 폴더**와는 분리한다.

### 1.1 Brainstorming 결정 사항

| # | 항목 | 결정 |
|---|------|------|
| 1 | 항목 형태 | **D** — 파일 + 링크 + 메타(제목·설명·태그·만료일) |
| 2 | 분류 | **C** — 고정 카테고리 8개 + 자유 태그 |
| 3 | 등록·삭제 | **C** — 전 역할 등록; 삭제·카테고리 변경은 Admin만 |
| 4 | 대분류 | **B** — 인사·행정·총무·참고자료·링크·양식·IT·시스템·교육·CPE·마케팅·영업 (8개) |
| 5 | 저장 | **D** — 앱 업로드 → Drive; 링크 → URL+메타만 |
| 6 | 만료일 | **C** — 선택 입력 + 30일 전·당일 강조(목록·대시보드) |
| 7 | 파일 개정 | **B** — 버전 이력(v1, v2…); 최신 = 현행 |
| 8 | 수정 권한 | **D** — 등록자 + Admin |
| 9 | Drive 접근 | **A** — 열람 위주; 개정은 앱 「새 버전」만 |
| 10 | 버전 되돌리기 | **B** — MVP 포함 (`currentVersion` 포인터 변경) |

### 1.2 범위

**포함 (MVP)**

- 사이드바 **최상단** `문서` (`/app/documents`)
- 고정 8카테고리 + 태그 검색·필터
- 파일 업로드(Drive) / 외부 링크 등록
- 버전 이력 + **현행 버전 되돌리기**
- 만료 임박·당일 대시보드 카드
- RBAC (`canEditDocument`, `canDeleteDocument`)
- `Internal_Documents` Drive 트리 자동 생성

**제외 (1차)**

- Drive 파일 reader 전용 IAM (운영 가이드로 통제; Phase 2)
- Markdown/Office diff
- Git 스타일 브랜치·머지
- 삭제 시 Drive 파일 휴지통 이동 (MVP: Mongo 메타만 삭제, Drive 파일 유지)
- HEIC 변환, 인앱 미리보기(Office)

---

## 2. 네비게이션

`lib/nav-items.ts`에 `DOCUMENT_ITEMS` 추가, **모든 역할**에 **맨 위** 배치:

```ts
const DOCUMENT_ITEMS: NavItem[] = [
  { href: '/app/documents', label: '문서' },
];
// getNavItemsForRole: [...DOCUMENT_ITEMS, ...PREPARER_ITEMS, ...]
```

---

## 3. 데이터 모델

### 3.1 `InternalDocument` (`models/InternalDocument.ts`)

| 필드 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| `title` | String | ✅ | 제목 |
| `description` | String | | 설명 |
| `category` | Enum | ✅ | `lib/document-categories.ts` 8종 |
| `tags` | [String] | | 자유 태그 (소문자 정규화 권장) |
| `entryType` | Enum | ✅ | `File` \| `Link` |
| `externalUrl` | String | | `Link`일 때 URL |
| `expiresAt` | Date | | 만료일 (date-only, 서울 기준 표시) |
| `createdBy` | ObjectId | ✅ | User |
| `versions` | [Version] | | `File`만 — embedded |
| `currentVersion` | Number | | `File`만; 최신 또는 되돌린 현행 버전 번호 |
| `createdAt` | Date | ✅ | |
| `updatedAt` | Date | ✅ | |

**embedded `Version`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `version` | Number | 1, 2, 3… (불변) |
| `googleDriveFileId` | String | Drive 파일 ID |
| `fileUrl` | String | `webViewLink` |
| `fileName` | String | 원본 파일명 |
| `mimeType` | String | MIME |
| `uploadedBy` | ObjectId | User |
| `uploadedAt` | Date | |
| `note` | String | 개정·되돌리기 메모 (선택) |

- `Link` 항목: `versions`·`currentVersion` 없음
- 새 버전 업로드: **새 Drive 파일** 생성 (기존 파일 덮어쓰기 없음)

### 3.2 고정 카테고리 (`lib/document-categories.ts`)

| ID | UI 라벨 | Drive 폴더명 |
|----|---------|--------------|
| `HR` | 인사 | `인사` |
| `Administration` | 행정 | `행정` |
| `GeneralAffairs` | 총무 | `총무` |
| `Reference` | 참고자료 | `참고자료` |
| `FormsAndLinks` | 링크·양식 | `링크·양식` |
| `IT` | IT·시스템 | `IT·시스템` |
| `Education` | 교육·CPE | `교육·CPE` |
| `Marketing` | 마케팅·영업 | `마케팅·영업` |

---

## 4. Google Drive

### 4.1 폴더 구조

```
FirmFlow_Data/
├── Internal_Documents/     ← 신규 (findOrCreate)
│   └── [카테고리 폴더]/     ← 업로드 시 findOrCreate
├── Overhead_Receipts/      ← 기존
└── [고객 폴더]/             ← 기존
```

- 구현: `lib/drive/internal-documents.ts` — `findOrCreateInternalDocumentsRoot()`, `findOrCreateCategoryFolder(categoryId)`
- 업로드: 기존 `lib/drive/upload.ts`의 `uploadReceipt` 재사용 또는 공통 `uploadFile`로 추출

### 4.2 접근 정책 (A안)

- UI는 **「Drive에서 보기」** (`webViewLink`, 새 탭)만 제공
- 개정·현행 변경은 **앱 워크플로**만 (새 버전 업로드, 되돌리기)
- Workspace 폴더 공유는 기존과 동일; **직접 Drive 편집은 운영 가이드로 금지** 안내
- Phase 2: Drive 파일별 reader 공유로 기술적 편집 차단 검토

### 4.3 허용 MIME (MVP)

- `application/pdf`, `image/jpeg`, `image/png` (영수증과 동일)
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (xlsx)
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (docx)
- 최대 **10MB** (영수증과 동일)

---

## 5. RBAC

`lib/permissions.ts` 확장:

| 동작 | Preparer | Approver | Admin |
|------|:--------:|:--------:|:-----:|
| 목록·조회 | ✅ | ✅ | ✅ |
| 등록 | ✅ | ✅ | ✅ |
| 메타·링크 수정 (본인) | ✅ | ✅ | ✅ |
| 메타·링크 수정 (타인) | ❌ | ❌ | ✅ |
| 새 버전 업로드 (본인) | ✅ | ✅ | ✅ |
| 새 버전 업로드 (타인) | ❌ | ❌ | ✅ |
| **현행 버전 되돌리기** (본인) | ✅ | ✅ | ✅ |
| **현행 버전 되돌리기** (타인) | ❌ | ❌ | ✅ |
| 삭제 | ❌ | ❌ | ✅ |
| 카테고리 변경 (기존) | ❌ | ❌ | ✅ |

- `canEditDocument(user, doc)` — 본인 `createdBy` 또는 Admin
- `canDeleteDocument(user)` — Admin만
- `isReadOnlyOnLeave(user)` — 등록·수정·업로드·되돌리기 불가

### 5.1 현행 버전 되돌리기

- **동작:** `currentVersion`을 과거 `version` 번호로 변경; **Drive 파일·이력 배열은 변경 없음**
- **권한:** `canEditDocument`와 동일
- **UI:** 버전 이력에서 vN 옆 **「현행으로 지정」** (이미 현행이면 비활성)
- **감사:** `versions`에 새 항목을 만들지 않음; optional `note`를 요청 body로 받아 서버 로그 또는 `updatedAt`만 갱신 (MVP: PATCH body `{ currentVersion, revertNote? }`)
- **의미:** Git revert와 유사 — v3가 있어도 v2를 현행으로 표시 가능; v3 파일은 이력에 남음

---

## 6. API

| Method | Path | 최소 역할 | 설명 |
|--------|------|-----------|------|
| GET | `/api/documents` | Session | `?category=`, `?tag=`, `?q=`, `?includeExpired=` |
| GET | `/api/documents/tags` | Session | distinct 태그 (자동완성) |
| GET | `/api/documents/expiring` | Session | `?withinDays=30` — 대시보드·상단 배너 |
| POST | `/api/documents` | Session | `Link` 등록 또는 `File` 메타만 (업로드 전) |
| POST | `/api/documents/upload` | Session | multipart — 생성 또는 `documentId`+새 버전 |
| GET | `/api/documents/[id]` | Session | 상세 + versions |
| PATCH | `/api/documents/[id]` | Session | 메타; `currentVersion` 되돌리기 포함 |
| DELETE | `/api/documents/[id]` | Admin | 메타 삭제 |
| POST | `/api/documents/[id]/versions` | Session | 새 버전 multipart (대안: upload에 통합) |

**에러:** `{ error: "한국어 메시지" }` (`lib/api-error.ts`)

---

## 7. UI (`/app/documents`)

### 7.1 레이아웃

- **데스크톱:** 좌측 카테고리(8+전체) + 우측 목록·검색·태그 필터
- **모바일:** 카테고리 가로 칩 + 카드 목록 (기존 앱 패턴)

### 7.2 목록 항목

- 제목, 설명 요약, 카테고리·태그 뱃지
- 유형: 파일 / 링크
- 파일: `v{currentVersion}` 표시
- 만료 뱃지 (§8)

### 7.3 액션

| 액션 | 조건 |
|------|------|
| Drive에서 보기 | `File` + 현행 버전 URL |
| 링크 열기 | `Link` |
| 수정 | `canEditDocument` |
| 새 버전 | `File` + `canEditDocument` |
| 현행으로 지정 | `File` + `canEditDocument` + v ≠ currentVersion |
| 삭제 | Admin |

### 7.4 대시보드 (`/app`)

- **「만료 임박 문서」** 카드 — `withinDays=30`, 최대 5건, `/app/documents?expiring=1` 링크

---

## 8. 만료 표시

| 조건 | UI |
|------|-----|
| `expiresAt` 없음 | 뱃지 없음 |
| 오늘 만료 (서울) | 🔴 **오늘 만료** — 목록 상단 고정 섹션 |
| 30일 이내 | 🟡 **D-N** |
| 만료됨 | ⚫ **만료** — 기본 목록 흐림; `includeExpired=true`로 조회 |

---

## 9. 테스트 (TDD)

| 경로 | 검증 |
|------|------|
| `__tests__/unit/document-categories.test.ts` | enum·라벨·폴더명 |
| `__tests__/unit/permissions-document.test.ts` | edit/delete/revert·OnLeave |
| `__tests__/unit/drive/internal-documents.test.ts` | findOrCreate 폴더 |
| `__tests__/api/documents.test.ts` | CRUD, RBAC, 버전, 되돌리기 |
| `__tests__/api/documents-upload.test.ts` | multipart, MIME, 크기 |
| `__tests__/components/DocumentsPage.test.tsx` | 목록·만료 뱃지·권한 버튼 |
| `__tests__/unit/nav-items.test.ts` | `문서` 최상단 |

---

## 10. `specification.md` 반영 (구현 시)

- §2.1 API 인덱스에 documents 엔드포인트 추가
- §3 신규 `InternalDocument` 요약
- §4 Drive `Internal_Documents` 절 추가
- §6 로드맵에 문서 허브 완료 체크

---

## 11. 구현 순서 (요약)

1. `lib/document-categories.ts` + `models/InternalDocument.ts`
2. `lib/drive/internal-documents.ts` + upload MIME 확장
3. `lib/permissions.ts` — document helpers
4. API 라우트 + 테스트
5. `/app/documents` 페이지·컴포넌트
6. `nav-items` + 대시보드 만료 카드
7. `specification.md` 동기화
