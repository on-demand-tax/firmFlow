# FirmFlow 설계 명세

**작성일:** 2026-06-20  
**상태:** Spec review 반영 (v1.1)  
**기반 문서:** `docs/specification.md`

---

## 1. 개요

FirmFlow는 소규모 회계법인(5~15명, 초기에는 1인)을 위한 내부 자원 관리 웹앱이다. 동일 도메인에서 **공개 홍보 사이트(Marketing)** 와 **인증 후 내부 앱(App)** 을 함께 제공한다.

### 1.1 기술 스택

| 계층 | 선택 |
|------|------|
| 프레임워크 | Next.js (App Router) |
| UI | Tailwind CSS, Shadcn UI |
| DB | MongoDB Atlas + Mongoose |
| 인증 | NextAuth.js (Google Workspace OAuth) |
| 파일 | Google Drive API (Service Account) |
| 배포 | Vercel |
| 테스트 | Jest, React Testing Library, mongodb-memory-server |

### 1.2 핵심 설계 원칙

- **TDD 우선:** 비즈니스 로직, API, 핵심 UI는 테스트 선행
- **최소 인프라 비용:** Vercel + MongoDB Atlas 무료/공유 티어
- **데이터 무결성:** 급여 이력 기반 과거 청구 단가 재현
- **솔로 → 팀 확장:** 1인 Admin으로 시작, RBAC는 처음부터 완비

---

## 2. Brainstorming 결정 사항

| # | 항목 | 결정 |
|---|------|------|
| 1 | MVP 범위 | TimeLog+승인, Client/Project+Drive, Expense+영수증 **전부 포함** |
| 2 | Approver 접근 | **전체** Client/Project (배정 모델 없음) |
| 3 | 마감(Lock) | Admin **월별 기본** + 임의 기간 선택 |
| 4 | 정정 | **구두·메신저** 중심; 앱은 Pending/Approved/Rejected |
| 5 | 온보딩 | 첫 로그인 자동 생성; `INITIAL_ADMIN_EMAIL` → Admin, 그 외 Preparer |
| 6 | 역할 | Admin ⊃ Approver ⊃ Preparer (Admin은 모든 기능 사용) |
| 7 | UI 언어 | **한국어** 전용 (DB enum은 영어, UI에서 매핑) |
| 8 | 산출물 | **대시보드 집계**만 (Excel/PDF export는 Phase 2) |
| 9 | Drive | Service Account + `FirmFlow_Data` Master Folder 공유 |
| 10 | 사이트 구조 | 단일 Next.js, Route Group으로 Marketing + App 분리 |
| 11 | Marketing MVP | **플레이스홀더** 콘텐츠 (구조만) |
| 12 | 대시보드 비용 | **Approved만** 비용 반영; Pending은 건수만 표시 |

---

## 3. 사이트 아키텍처

### 3.1 Route Group 구조

```
app/
├── (marketing)/          # 공개 — SEO 허용
│   ├── layout.tsx
│   ├── page.tsx          # /
│   ├── about/
│   ├── services/
│   ├── contact/
│   └── login/
├── (app)/                # 내부 — 인증 필수
│   ├── layout.tsx
│   └── app/
│       ├── page.tsx
│       ├── timesheet/
│       ├── approvals/
│       ├── expenses/
│       ├── clients/
│       ├── projects/
│       └── admin/
│           ├── users/
│           ├── locks/
│           └── salary/
├── api/
└── middleware.ts
```

### 3.2 Middleware 규칙

- `/app/*` — 세션 없으면 `/login?callbackUrl=...` 리다이렉트
- `/login` — 세션 있으면 `/app` 리다이렉트
- Marketing 경로 — 통과
- `/app`, `/api` — `robots` noindex

### 3.3 Marketing 페이지 (MVP)

| 경로 | 내용 |
|------|------|
| `/` | 홈 (히어로, 서비스 요약, CTA) |
| `/about` | 법인 소개 (플레이스홀더) |
| `/services` | 업무 분야 (플레이스홀더) |
| `/contact` | 연락처 / mailto (플레이스홀더) |
| `/login` | Google OAuth 「내부 시스템 로그인」 |

---

## 4. 인증 및 RBAC

### 4.1 OAuth

- Google Provider, `hd` / 이메일 도메인으로 `@yourfirm.com` 제한
- `Terminated` 사용자 로그인 거부 → 403 「접근이 제한된 계정입니다」
- `OnLeave` 사용자: **로그인 허용**, App 읽기 전용 (TimeLog/Expense **신규 제출·수정 불가**), 대시보드에서 본인 과거 데이터 조회만 가능

### 4.2 온보딩

```
OAuth 성공
  → User 조회 by email
  → 없으면 (신규):
       Admin이 1명도 없으면:
         email === INITIAL_ADMIN_EMAIL → Admin 생성
         그 외 → 403 「관리자 설정 전에는 로그인할 수 없습니다」
       Admin이 이미 있으면:
         email === INITIAL_ADMIN_EMAIL → Admin 생성 (예외적 복구)
         그 외 → Preparer 생성
  → status: Active, 세션 생성
```

환경변수 `INITIAL_ADMIN_EMAIL`은 배포 전 **필수** 설정. go-live 전 Admin 0명 상태에서 비관리자가 먼저 로그인하는 chicken-and-egg를 방지한다.

### 4.3 권한 매트릭스

| 기능 | Preparer | Approver | Admin |
|------|----------|----------|-------|
| 본인 TimeLog/Expense CRUD (unlocked) | ✅ | ✅ | ✅ |
| 타인 TimeLog/Expense 승인/반려 | ❌ | ✅ | ✅ |
| 타인 TimeLog/Expense 수정 (unlocked) | ❌ | ✅ | ✅ |
| Client/Project CRUD | ❌ | ✅ | ✅ |
| Active Client/Project 드롭다운 | ✅ | ✅ | ✅ |
| User role/status | ❌ | ❌ | ✅ |
| PeriodLock 생성/해제 | ❌ | ❌ | ✅ |
| salaryTable | ❌ | ❌ | ✅ |
| User 목록 (급여 제외) | ❌ | ✅ | ✅ |

**운영 원칙:** Preparer의 실제 업무 시간 기록은 차단하지 않는다. 정정은 구두·메신저 후 Approver/Admin이 unlocked 항목을 Pending으로 되돌리거나 직접 수정한다.

**User 목록 API:** Approver+는 `GET /api/users`로 이름·이메일·역할·status만 조회 (`salaryTable` 제외).

---

## 5. 데이터 모델

### 5.1 User (`models/User.ts`)

기존 명세 유지. `salaryTable`은 `select: false`.

### 5.2 Client (`models/Client.ts`) — 변경

**추가 필드:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `clientCode` | String | 고유, `/^[A-Z0-9]{2,10}$/`, 대문자 저장 |

Drive 폴더명: `FirmFlow_Data/{sanitize(name)}_{clientCode}` — `sanitize`: 공백→`_`, 특수문자 제거, 최대 50자. Section 6.1과 동일 규칙.

중복 `clientCode` → 409 「이미 사용 중인 고객 코드입니다」

### 5.3 Project (`models/Project.ts`)

기존 명세 유지. `Completed`는 Preparer 드롭다운에서 제외.

### 5.4 TimeLog (`models/TimeLog.ts`) — 변경

**추가 필드:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `lockedAt` | Date? | PeriodLock 적용 시각 |

**status:** `Pending` | `Approved` | `Rejected`

**수정 규칙:**

| 조건 | Preparer | Approver | Admin |
|------|----------|----------|-------|
| Pending/Rejected, unlocked | 본인 ✅ | ✅ | ✅ |
| Approved, unlocked | ❌ | ✅ | ✅ |
| lockedAt 있음 | ❌ | ❌ | ❌ |

### 5.5 Expense (`models/Expense.ts`) — 변경

**추가 필드:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `lockedAt` | Date? | PeriodLock 적용 시각 |
| `approvedBy` | ObjectId? | 승인자 (TimeLog와 동일) |

**검증:**

| expenseType | clientId / projectId | Drive 경로 |
|-------------|----------------------|------------|
| Core | **둘 다 필수**; `projectId`는 해당 `clientId` 소속 | Client 폴더 |
| Overhead | null 허용 | `FirmFlow_Data/Overhead_Receipts` |

**수정 규칙:** Section 5.4 TimeLog 표와 동일 (Pending/Rejected unlocked → Preparer 본인; Approved unlocked → Preparer ❌).

### 5.6 PeriodLock (`models/PeriodLock.ts`) — 신규

| 필드 | 타입 | 설명 |
|------|------|------|
| `startDate` | Date | 잠금 시작 (포함) |
| `endDate` | Date | 잠금 종료 (포함) |
| `lockedBy` | ObjectId | Admin User |
| `lockedAt` | Date | 실행 시각 |
| `note` | String? | 마감 메모 |

**생성 시:** 해당 `date` 범위의 TimeLog/Expense에 `lockedAt` 일괄 설정  
**해제 시:** PeriodLock 삭제 + `lockedAt` unset  
**중복:** 기존 PeriodLock과 `[startDate, endDate]` **포함(inclusive) 구간이 1일이라도 겹치면** 거부

**타임존:** `Asia/Seoul` 기준. TimeLog/Expense `date`는 **date-only** (시간 없음, `YYYY-MM-DD`). 월별 마감 시 해당 월 1일 00:00 ~ 말일 (Seoul) 범위.

**UI:** 월별 마감(연·월 선택 → 해당 월 1~말일) + 임의 기간(고급)

---

## 6. Google Drive 연동

- **방식:** Service Account + 회사 Drive `FirmFlow_Data` Master Folder 공유 (편집 권한)
- **Domain-Wide Delegation:** 사용하지 않음

### 6.1 Client 생성 (`POST /api/clients`)

1. Drive API로 `FirmFlow_Data/{sanitize(name)}_{clientCode}` 폴더 생성
2. `folderId` → MongoDB Client 저장
3. Drive 실패 시 Client 미저장, 500 반환

### 6.2 영수증 업로드 (`POST /api/expenses/upload`)

1. Multipart — **허용:** PDF, JPEG, PNG; **최대 10MB**
2. Core → Client 폴더; Overhead → `Overhead_Receipts`
3. Drive upload 응답의 `id` → `googleDriveFileId`, `webViewLink` → `receiptUrl` 저장
4. Master Folder가 Workspace 내 공유되어 있으므로 `webViewLink`로 법인 구성원 열람 가능

---

## 7. API 목록

| Method | Path | 설명 | 최소 역할 |
|--------|------|------|-----------|
| — | `/api/auth/[...nextauth]` | NextAuth | 공개 |
| GET | `/api/users` | 사용자 목록 (salaryTable 제외) | Approver+ |
| PATCH | `/api/users/[id]` | role/status | Admin |
| GET/PATCH | `/api/users/[id]/salary` | 급여 이력 | Admin |
| GET/POST | `/api/clients` | 고객 | Approver+ |
| GET/PATCH/DELETE | `/api/clients/[id]` | 고객 상세 | Approver+ |
| GET | `/api/clients/options` | 드롭다운 | Preparer+ |
| GET/POST | `/api/projects` | 프로젝트 | Approver+ |
| GET/PATCH/DELETE | `/api/projects/[id]` | 프로젝트 상세 | Approver+ |
| GET | `/api/projects/options` | 드롭다운 | Preparer+ |
| GET/POST | `/api/timelogs` | 타임로그 | Preparer+ |
| PATCH/DELETE | `/api/timelogs/[id]` | 수정·삭제 | 규칙 적용 |
| PATCH | `/api/timelogs/[id]/status` | 승인/반려 | Approver+ |
| GET/POST | `/api/expenses` | 경비 | Preparer+ |
| PATCH/DELETE | `/api/expenses/[id]` | 수정·삭제 | TimeLog와 동일 규칙 |
| POST | `/api/expenses/upload` | 영수증 | Preparer+ |
| PATCH | `/api/expenses/[id]/status` | 승인/반려 | Approver+ |
| GET/POST | `/api/period-locks` | 마감 | Admin |
| DELETE | `/api/period-locks/[id]` | 마감 해제 | Admin |
| GET | `/api/dashboard` | 집계 | 전 역할 (범위 다름) |

**Dashboard 쿼리:** 기본 = **당월** (`Asia/Seoul`). `?year=2026&month=3` 또는 `?from=YYYY-MM-DD&to=YYYY-MM-DD` (선택). `?clientId=`, `?projectId=` 필터 optional.

**Client/Project DELETE:** 관련 TimeLog 또는 Expense가 1건이라도 있으면 **409 거부**. Drive 폴더는 삭제하지 않음 (orphan 허용). MVP는 hard delete 없이 `Project.status = Completed` 권장.

**Salary PATCH:** `salaryTable` 항목 **append-only**. 동일 `effectiveDate` 중복 → 400.

**공통:** 세션 → 역할 → `lockedAt` 검증. 에러 `{ error: "한국어 메시지" }`.

---

## 8. 화면 (App)

| 메뉴 | 경로 | Preparer | Approver | Admin |
|------|------|----------|----------|-------|
| 대시보드 | `/app` | ✅ | ✅ | ✅ |
| 내 타임시트 | `/app/timesheet` | ✅ | ✅ | ✅ |
| 승인 대기 | `/app/approvals` | ❌ | ✅ | ✅ |
| 경비 | `/app/expenses` | 본인 | 전체 | 전체 |
| 고객 | `/app/clients` | ❌ | ✅ | ✅ |
| 프로젝트 | `/app/projects` | ❌ | ✅ | ✅ |
| 사용자 | `/app/admin/users` | ❌ | ❌ | ✅ |
| 기간 마감 | `/app/admin/locks` | ❌ | ❌ | ✅ |
| 급여 단가 | `/app/admin/salary` | ❌ | ❌ | ✅ |

**TimesheetGrid:** 모바일 카드 스택 / 데스크톱 매트릭스 (기존 명세).

---

## 9. 워크플로우

### 9.1 타임로그

```
Preparer/Admin → POST Pending
Approver/Admin → PATCH Approved (`approvedBy` 기록; Expense 동일)
[오프라인 정정] → Approver/Admin PATCH Pending 또는 직접 수정
Admin → PeriodLock → lockedAt 설정 → 전원 수정 불가
```

### 9.2 솔로 Admin 일상

```
로그인 → 고객/프로젝트 등록 → 타임시트 입력 → 승인 대기에서 자기 항목 승인 → 대시보드 확인
```

### 9.3 대시보드 집계

| 지표 | 규칙 |
|------|------|
| 프로젝트별 시간 | Approved TimeLog hours 합 |
| 인건비 | Approved × `calculateProjectCost(hours, date, salaryTable)` |
| 직접경비 | Approved Core Expense 합 |
| 간접비 | Approved Overhead Expense (별도 행) |
| 미승인 | Pending TimeLog + Expense **건수만** |
| Preparer 뷰 | 본인 기여 카드 + (Approver 이상은 전체) |

---

## 10. 테스트 전략

| 유형 | 경로 | 대상 |
|------|------|------|
| Unit | `__tests__/unit/` | `calculateProjectCost`, 권한 게이트, lockedAt 검증 |
| API | `__tests__/api/` | Route Handlers + mongodb-memory-server |
| UI | 컴포넌트 | TimesheetGrid 반응형, 폼 제약 |

**필수 테스트 (기존 명세 유지):**

- Historical rate resolving (2025/2026 단가)
- POST timelogs hours > 24 → 400
- **동일 user+date** TimeLog hours 합계 > 24 → 400 (일일 상한)
- TimesheetGrid mobile/desktop testId

**추가 테스트:**

- PeriodLock 생성/해제 + lockedAt 일괄 적용
- Core Expense without clientId **or projectId** → 400
- PATCH/DELETE expenses/[id] lockedAt → 403
- `/app/*` middleware 미인증 리다이렉트
- Admin 0명 시 non-INITIAL email 첫 로그인 → 403
- `INITIAL_ADMIN_EMAIL` 첫 로그인 Admin 생성
- PeriodLock overlapping ranges → 409

---

## 11. 에러 처리

| 상황 | HTTP | 메시지 예 |
|------|------|-----------|
| 도메인 외 로그인 | 403 | 허용되지 않은 계정입니다 |
| Terminated | 403 | 접근이 제한된 계정입니다 |
| Locked 수정 | 403 | 마감된 기간입니다 |
| Core Expense client 누락 | 400 | 고객과 프로젝트를 선택해 주세요 |
| hours > 24 | 400 | 시간은 24시간을 초과할 수 없습니다 |
| salaryTable 없음 | — | 비용 0 또는 「단가 미설정」 표시 |
| Drive 실패 | 500 | 파일 저장에 실패했습니다 |

---

## 12. 구현 로드맵 (Vertical Slice)

| Sprint | 산출물 |
|--------|--------|
| **S0** | Marketing shell (4페이지 + login + middleware skeleton) |
| **S1** | NextAuth, User 모델, Jest, `INITIAL_ADMIN_EMAIL` |
| **S2** | Client/Project CRUD + Drive 폴더 |
| **S3** | TimeLog CRUD + 승인 + PeriodLock (단순 리스트/폼 UI; TimesheetGrid는 S5) |
| **S4** | Expense + upload |
| **S5** | Dashboard + TimesheetGrid 반응형 |

---

## 13. Phase 2 (MVP 제외)

- Excel/CSV, PDF 청구서 export
- 리뷰 코멘트 / CorrectionRequested status
- Approver–Client 배정
- i18n (한/영 전환)
- Google Group → role 매핑
- 문의 폼 백엔드 (Resend 등)
- Marketing 실제 콘텐츠 반영
- 감사 로그(audit trail), 알림

---

## 14. 환경 변수 (초안)

| 변수 | 용도 |
|------|------|
| `MONGODB_URI` | MongoDB Atlas |
| `NEXTAUTH_SECRET` | 세션 |
| `NEXTAUTH_URL` | 배포 URL |
| `GOOGLE_CLIENT_ID` | OAuth |
| `GOOGLE_CLIENT_SECRET` | OAuth |
| `ALLOWED_EMAIL_DOMAIN` | `@yourfirm.com` |
| `INITIAL_ADMIN_EMAIL` | 최초 Admin |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Drive SA |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Drive SA |
| `GOOGLE_DRIVE_MASTER_FOLDER_ID` | FirmFlow_Data |

---

## 15. `specification.md` 대비 변경 요약

| 항목 | 기존 | 본 설계 |
|------|------|---------|
| Approver 담당 Client | assigned | **전체 접근** |
| Locked | TimeLog status enum | **PeriodLock + lockedAt** |
| Client 폴더명 | clientCode 미정의 | **clientCode 필드 추가** |
| 사이트 | App only | **Marketing + App** |
| Admin 온보딩 | 미정의 | **INITIAL_ADMIN_EMAIL + Admin 0명 가드** |
| OnLeave | 미정의 | **로그인 허용, 제출/수정 불가** |
| Approver User 목록 | PRD에 있음 | **Approver+ GET /api/users (급여 제외)** |
| 정정 | Reject 언급 | **오프라인 중심, 앱은 status만** |
| Expense PATCH/DELETE | PRD에 없음 | **TimeLog와 동일 규칙 추가** |
| 산출물 | calculateProjectCost만 | **대시보드 집계 명세** |
| 구현 순서 | Layer별 Phase 1~5 | **Vertical Slice S0~S5** |
