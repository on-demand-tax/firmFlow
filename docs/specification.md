# FirmFlow 제품 요구사항 문서 (PRD) & TDD 구현 명세

## 프로젝트 개요
**프로젝트명:** FirmFlow — 소규모 회계법인용 내부 관리 웹앱  
**대상 규모:** 직원 5~15명 규모의 소형 회계법인  
**기술 스택:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Shadcn UI, MongoDB (Mongoose 9), Google Drive API, NextAuth.js 4 (Google Workspace OAuth)  
**아키텍처:** Monolithic Next.js + Serverless Route Handlers, TDD(Test-Driven Development) 중심

### AI Agent — 읽기 가이드

1. **현재 구현 상태** → [§6](#6-구현-체크리스트-및-실행-로드맵)
2. **프로젝트 유형·청구 메타** → [§3.3](#33-project-modelsprojectts) + `lib/project-types.ts`
3. **기장·비청구 타임로그 액티비티** → [§3.4](#34-timelog-modelstimelogts) + `lib/project-activities.ts`
4. **API 전체** → [§2.1](#21-api-인덱스)
5. **스키마 정본** → `models/*.ts` (§3는 필드 요약; embedded TS는 제거)

> 문서 지도·superpowers 경고: [`docs/README.md`](README.md)

### 목차

- [1. 시스템 개요](#1-시스템-개요-및-핵심-목표)
- [2. RBAC](#2-인증-및-역할-기반-접근-제어-rbac) · [2.1 API](#21-api-인덱스)
- [3. 데이터 모델](#3-데이터-모델-및-mongodb-스키마-mongoose) (3.1–3.6)
- [4. Google Drive](#4-google-drive-연동-명세)
- [5. 테스트](#5-테스트-구조-및-검증)
- [6. 로드맵](#6-구현-체크리스트-및-실행-로드맵)

---

## 1. 시스템 개요 및 핵심 목표

FirmFlow는 소규모 회계법인을 위한 경량·고효율 반응형 웹 애플리케이션이다. 고객별 청구 가능 시간, 프로젝트 관련 경비, 기본 HR/급여 이력을 한곳에서 추적한다. Google Workspace OAuth와 **공유 Drive 폴더**(Service Account)로 문서를 관리하며, 별도 바이너리 스토리지는 사용하지 않는다.

### 핵심 설계 원칙

| 원칙 | 설명 |
|------|------|
| **TDD 우선** | 비즈니스 로직, API 라우트, 핵심 UI 상호작용은 운영 구현 전에 테스트를 먼저 작성한다. |
| **최소 인프라 비용** | Vercel + MongoDB Atlas 무료/공유 티어로 배포하여 호스팅 비용을 0에 가깝게 유지한다. |
| **데이터 무결성** | 직원 보수 이력을 엄격히 추적하여 과거 청구 계산이 재현 가능하도록 보장한다. |

---

## 2. 인증 및 역할 기반 접근 제어 (RBAC)

**NextAuth.js** + Google Workspace OAuth 2.0. 회사 도메인(`ALLOWED_EMAIL_DOMAIN`)만 허용.  
`middleware.ts` — `/app/*` 인증 필수, 미로그인 시 `/login` 리다이렉트.

**역할 계층:** `Admin` ⊃ `Approver` ⊃ `Preparer` (`lib/permissions.ts` — `hasMinRole`, `requireRole`)

| 역할 | UI 메뉴 (`lib/nav-items.ts`) | API·데이터 |
|------|------------------------------|------------|
| **Preparer** | 대시보드, 타임시트, 경비 | 본인 TimeLog·Expense CRUD; options API로 고객·프로젝트 드롭다운 |
| **Approver** | + 승인, 고객, 프로젝트 | **전체** Clients·Projects CRUD (배정 모델 없음); Users 읽기; TimeLog·Expense **승인/반려** |
| **Admin** | + 사용자, 기간 마감, 급여 단가 | Approver 권한 + `salaryTable` CRUD, PeriodLock 생성/해제, 사용자 role/status |

### 수정·승인 규칙 (`lib/permissions.ts`)

| 조건 | Preparer | Approver / Admin |
|------|----------|------------------|
| `lockedAt` 설정됨 (PeriodLock) | 수정·삭제 불가 | 수정·삭제 불가 |
| 본인 TimeLog/Expense, `Pending` 또는 `Rejected` | 수정·삭제 가능 | 수정·삭제 가능 |
| 타인 TimeLog/Expense | 불가 | 수정·삭제 가능 |
| `Approved` 상태 (마감 아님) | Preparer 수정 불가 | 수정 가능 |

> **주의:** 마감은 status `"Locked"`가 **아니라** `lockedAt` 필드로 표현한다. status enum은 `Pending` \| `Approved` \| `Rejected`만 존재.

**승인 API:** `PATCH /api/timelogs/[id]/status`, `PATCH /api/expenses/[id]/status` — body `{ status: 'Approved' \| 'Rejected', rejectionReason? }`, 최소 역할 Approver.

**온보딩:** 첫 로그인 시 User 자동 생성. `INITIAL_ADMIN_EMAIL` → Admin, 그 외 도메인 사용자 → Preparer (`lib/onboarding.ts`).

### 2.1. API 인덱스

`requireRole(X)` = 최소 역할 X (상위 역할 포함). `requireSession` = 로그인만.

| Method | Path | 최소 역할 | 설명 |
|--------|------|-----------|------|
| * | `/api/auth/[...nextauth]` | — | NextAuth (Google OAuth) |
| GET | `/api/users` | Approver | 사용자 목록 (급여 제외) |
| PATCH | `/api/users/[id]` | Admin | role, status 변경 |
| GET/PATCH | `/api/users/[id]/salary` | Admin | `salaryTable` 조회·추가 |
| GET/POST | `/api/clients` | Approver | 고객 목록·생성 (Drive 폴더) |
| GET/PATCH/DELETE | `/api/clients/[id]` | Approver | 고객 상세 |
| GET | `/api/clients/options` | Preparer | 드롭다운용 고객 목록 |
| GET/POST | `/api/projects` | Approver | 프로젝트 목록·생성 (유형 검증) |
| GET/PATCH/DELETE | `/api/projects/[id]` | Approver | 프로젝트 상세 |
| GET | `/api/projects/options` | Preparer | 프로젝트 + `activityGroups` (기장대리) |
| GET | `/api/project-types` | Preparer | 유형·subtype·필드 마스터 (`lib/project-types.ts`) |
| GET/POST | `/api/timelogs` | Session | 목록·생성 (`activity` 검증) |
| PATCH/DELETE | `/api/timelogs/[id]` | Session | 수정·삭제 (`canEditTimeLog`) |
| PATCH | `/api/timelogs/[id]/status` | Approver | 승인·반려 |
| GET/POST | `/api/expenses` | Session | 목록·생성 |
| PATCH/DELETE | `/api/expenses/[id]` | Session | 수정·삭제 (`canEditExpense`) |
| PATCH | `/api/expenses/[id]/status` | Approver | 승인·반려 |
| POST | `/api/expenses/upload` | Session | 영수증 multipart → Drive |
| GET/POST | `/api/period-locks` | Admin | 마감 목록·생성 |
| DELETE | `/api/period-locks/[id]` | Admin | 마감 해제 + `lockedAt` unset |
| GET | `/api/dashboard` | Session | 집계 (아래 쿼리) |

**`GET /api/dashboard` 쿼리** (`lib/dashboard.ts`, `Asia/Seoul`):

- 기본: 당월
- `?year=YYYY&month=M` 또는 `?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `?clientId=`, `?projectId=` (optional)
- Preparer: 본인 TimeLog·Expense만 집계; Approver/Admin: 전체

**공통 에러:** `{ error: "한국어 메시지" }` (`lib/api-error.ts`)

---

## 3. 데이터 모델 및 MongoDB 스키마 (Mongoose)

### 3.1. User (`models/User.ts`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `email` | String | 고유, 인덱스 |
| `name` | String | 사용자 이름 |
| `role` | Enum | `Admin` \| `Approver` \| `Preparer` (기본: `Preparer`) |
| `status` | Enum | `Active` \| `OnLeave` \| `Terminated` (기본: `Active`) |
| `salaryTable` | Array | 급여 이력 (`select: false` — 기본 조회에서 제외) |
| `createdAt` | Date | 생성일 |

**salaryTable 하위 스키마 (`ISalaryHistory`)**

| 필드 | 타입 | 설명 |
|------|------|------|
| `effectiveDate` | Date | 적용 시작일 |
| `baseSalary` | Number | 기본급 |
| `hourlyBillableRate` | Number | 시간당 청구 단가 |

**구현:** `models/User.ts`

### 3.2. Client (`models/Client.ts`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `name` | String | 고객사명 (인덱스) |
| `businessRegistrationNumber` | String | 사업자등록번호 |
| `contactPerson` | String | 담당자 |
| `googleDriveFolderId` | String | Google Drive 폴더 ID |
| `createdAt` | Date | 생성일 |

**구현:** `models/Client.ts` — 고객 생성 시 `POST /api/clients`가 Drive 폴더 `FirmFlow_Data/[name]_[code]` 생성 후 `googleDriveFolderId` 저장.

### 3.3. Project (`models/Project.ts`)

고객(`Client`) 하위 **업무(Engagement)** 단위다. 타임로그·경비는 프로젝트에 귀속되며, **업무 구분(`projectType`)** · **세부 업무(`workSubtype`)** · **청구 모델(`billingModel`)** 로 회계·세무사무소의 실제 수임 패턴을 표현한다.

#### 3.3.0. 업무별 구분 (회계·세무사무소)

회계(세무)사무소의 업무별 내용을 FirmFlow `projectType` / `workSubtype`의 기준으로 둔다.

| 구분 | 내용 |
|------|------|
| **기장대리** | 부가가치세신고(매출 및 매입전표 입력); 원천징수이행상황신고 및 지급명세서(연말정산 포함) 제출; 인건비 대행업무(급여대장 작성, 입퇴사신고, 4대보험 관리); 회계전표 입력 및 장부작성; 회계결산 |
| **신고대리** | 법인세 및 종합소득세신고(세무조정 포함); 부가가치세신고(과세사업자 대상); 사업장현황신고(면세사업자 대상) |
| **재산제세 신고대리** | 상속세, 증여세, 양도소득세, 증권거래세 신고 |
| **외부감사** | 외부 회계감사대상 법인 등에 대한 회계감사 |
| **상담 및 자문** | 각종 세금 및 기업경영에 대한 상담 및 자문 |
| **기업진단** | 건설업 등 면허기준 적격자본금 확인 |
| **세무조사대리** | 국세 관련 세무조사 대리 및 지원 |
| **기타업무** | 사업자등록신청; 대출서류 전송 및 증명서류 발급; 경정청구 및 조세불복 |

> **시스템 유형:** `FeeCycleAdmin`(수수료청구·수금 행정)은 위 실무 구분과 별도로, 고객당 장기 프로젝트로 둘 수 있다.

#### 3.3.1. 설계 원칙

| 원칙 | 설명 |
|------|------|
| **구분 = Enum, 세부 = Subtype** | `projectType`은 §3.3.0 업무 구분과 1:1. 세부 업무는 `workSubtype`으로 구분. |
| **유형은 Enum, 명칭은 자유** | DB enum은 영어, UI 라벨은 한국어. `projectName`은 `{업무유형} {대상기간}` 템플릿 권장 (고객은 `clientId`로 연결). |
| **청구 ≠ 집계 (MVP)** | MVP는 유형·계약 메타데이터 저장 + 시간/경비 추적. **자동 수수료 산출·청구서 발행은 Phase 2**. |
| **하위 호환** | 기존 프로젝트는 `projectType: 'General'`, `billingModel: 'Hourly'` 기본값. 구 enum → 신 enum 매핑은 §3.3.10. |
| **건당 vs 주기** | 기장대리·수수료청구는 장기 `Active` 1건; 신고·감사·건당 업무는 기간·건 단위로 분리. |

#### 3.3.1a. `workSubtype` vs `activity` (ID 충돌 주의)

| 구분 | 저장 위치 | 레지스트리 | 용도 |
|------|-----------|------------|------|
| `workSubtype` | Project | `lib/project-types.ts` | 프로젝트 등록 시 업무 세부 분류 |
| `activity` | TimeLog | `lib/project-activities.ts` | 기장대리 타임로그 입력 시 업무 항목 |

`VatFiling` 등 **동일 문자열 ID**가 양쪽에 존재할 수 있다. 서로 다른 필드·검증 규칙이므로 Agent는 혼용하지 말 것.

#### 3.3.2. 업무 구분 (`projectType`)

| `projectType` | UI 라벨 (§3.3.0) | 설명 | 기본 `billingModel` |
|---------------|------------------|------|---------------------|
| `BookkeepingAgency` | 기장대리 | 정기 기장·부가세·원천·인건비 대행·전표·결산 등 **§3.3.0 기장대리** 전반. 고객당 장기 `Active` 1건 권장 | `Retainer` + `Monthly` |
| `FilingAgency` | 신고대리 | 법인세·종합소득세(세무조정), 과세 부가세, 면세 사업장현황 **사업연도·신고 건당** | `Retainer` + `Annual` |
| `PropertyTaxFiling` | 재산제세 신고대리 | 상속·증여·양도·증권거래세 **신고 1건당** (`workSubtype`) | `FixedPerEvent` |
| `ExternalAudit` | 외부감사 | 회계기간(사업연도)당 외부감사 수임 | `PerFiscalPeriod` |
| `Consulting` | 상담 및 자문 | 세무·경영 자문, 시간 기준 수임 | `Hourly` |
| `BusinessDiagnosis` | 기업진단 | 면허기준 적격자본금 확인 등 **건당** 진단 | `FixedPerEvent` |
| `TaxAuditRepresentation` | 세무조사대리 | 국세 세무조사 대리·지원 **건당 또는 조사 기간당** | `Hourly` 또는 `FixedPerEvent` |
| `OtherWork` | 기타업무 | 사업자등록, 대출·증명서류, 경정·조세불복 등 (`workSubtype`) | 유형별 (경정: `BasePlusSuccess`) |
| `FeeCycleAdmin` | 수수료청구 관리 | 월/분기/연 **청구·수금 행정** (실무와 병행 가능) | `Retainer` + `billingCycle` |
| `NonBillable` | 비청구 시간 | **시스템 자동 생성** — 직원 비청구 시간 입력 전용 (`lib/non-billable-project.ts`) | `Manual` (청구 없음) |
| `General` | 일반 (레거시) | 유형 미지정·마이그레이션 전 | `Hourly` |

**`workSubtype` — `BookkeepingAgency`**

| `workSubtype` | UI 라벨 |
|---------------|---------|
| `GeneralBookkeeping` | 통합 기장대리 (장기 수임, 기본값) |
| `VatFiling` | 부가가치세신고 |
| `WithholdingFiling` | 원천징수·지급명세서(연말정산) |
| `PayrollAgency` | 인건비 대행 |
| `VoucherEntry` | 회계전표·장부작성 |
| `AccountingSettlement` | 회계결산 |

> 장기 프로젝트 1건으로 운영 시 `GeneralBookkeeping`을 쓰고, 월·건 구분은 대시보드 날짜 필터·타임로그 설명으로 처리. 세부 subtype은 **별도 건 추적**이 필요할 때만 별도 프로젝트로 분리.

**`workSubtype` — `FilingAgency`**

| `workSubtype` | UI 라벨 |
|---------------|---------|
| `CorpIncomeTax` | 법인세(세무조정 포함) |
| `ComprehensiveIncomeTax` | 종합소득세(세무조정 포함) |
| `VatTaxable` | 부가가치세(과세사업자) |
| `BusinessStatusReport` | 사업장현황신고(면세) |

**`workSubtype` — `PropertyTaxFiling`**

| `workSubtype` | UI 라벨 |
|---------------|---------|
| `Inheritance` | 상속세 |
| `Gift` | 증여세 |
| `Transfer` | 양도소득세 |
| `SecuritiesTransaction` | 증권거래세 |

**`workSubtype` — `BusinessDiagnosis`**

| `workSubtype` | UI 라벨 |
|---------------|---------|
| `ConstructionLicenseCapital` | 건설업 면허 적격자본금 |
| `Other` | 기타 진단 |

**`workSubtype` — `OtherWork`**

| `workSubtype` | UI 라벨 | 기본 `billingModel` |
|---------------|---------|---------------------|
| `BusinessRegistration` | 사업자등록신청 | `FixedPerEvent` |
| `LoanDocuments` | 대출서류·증명서류 | `FixedPerEvent` 또는 `Hourly` |
| `TaxAmendment` | 경정청구 | `BasePlusSuccess` |
| `TaxAppeal` | 조세불복 | `Hourly` 또는 `Manual` |

**`workSubtype` — `Consulting` / `ExternalAudit` / `TaxAuditRepresentation` / `FeeCycleAdmin`**

- 선택 필드. 미지정 시 `projectType` 라벨만으로 표시.

#### 3.3.3. 청구 모델 (`billingModel`)

| `billingModel` | 설명 | 주요 필드 | TimeLog | 고정 수수료 (Phase 2) |
|----------------|------|-----------|---------|----------------------|
| `Retainer` | 정기 수임 (월/분기/연) | `billingCycle`, `contractAmount`, `currency` | 선택 (내부 원가 추적) | 주기별 계약금액 |
| `Hourly` | 시간당 청구 | `hourlyRate` (선택, 미입력 시 User `salaryTable` 참조) | **필수** | 승인 시간 × 단가 |
| `FixedPerEvent` | 건당 정액 | `contractAmount`, `eventDate` | 권장 | 계약 정액 |
| `BasePlusSuccess` | 기본금 + 성공보수 | `baseFeeAmount`, `successFeeRate`, `currency` | 권장 | 기본금 + (경정·환급액 × %) |
| `PerFiscalPeriod` | 회계기간당 | `fiscalYearStart`, `fiscalYearEnd`, `contractAmount` | **필수** | 기간당 계약금액 |
| `Manual` | 혼합·예외 | `notes`, `contractAmount` | 자유 | 수동 입력 |

**`billingCycle`** (`Retainer` / `FeeCycleAdmin`): `Monthly` \| `Quarterly` \| `SemiAnnual` \| `Annual` \| `OnCompletion`

**`currency`:** `KRW` \| `USD` (계약 금액·청구 기준 통화. 경비 `currency`와 독립)

#### 3.3.4. 필드 명세

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `clientId` | ObjectId | ✅ | Client 참조 (인덱스) |
| `projectName` | String | ✅ | 프로젝트명 (예: `2026 법인세 조정`, `3월 기장`) |
| `projectType` | Enum | ✅ | Section 3.3.2 (`General` 기본) |
| `billingModel` | Enum | ✅ | Section 3.3.3 (`Hourly` 기본) |
| `status` | Enum | ✅ | `Active` \| `Completed` (기본: `Active`) |
| `billingCycle` | Enum | | `Retainer`·`FeeCycleAdmin` 시 |
| `currency` | Enum | | `KRW` \| `USD` (기본: `KRW`) |
| `contractAmount` | Number | | 정액·정기·기간당 계약 금액 (≥ 0) |
| `baseFeeAmount` | Number | | `BasePlusSuccess` 기본금 |
| `successFeeRate` | Number | | `BasePlusSuccess` 성공보수율 0~100 (%) |
| `hourlyRate` | Number | | `Hourly` 전용 청구 단가 (미입력 시 User 급여표 fallback) |
| `workSubtype` | Enum | | `projectType`별 세부 업무 (§3.3.2) |
| `eventDate` | Date | | 건당 신고·건당 업무 기준일 (date-only) |
| `fiscalYearStart` | Date | | `FilingAgency`, `ExternalAudit` 사업연도 시작 |
| `fiscalYearEnd` | Date | | 사업연도 종료 |
| `billingAnchorDay` | Number | | 월간 청구 기준일 1~28 (`BookkeepingAgency` 등) |
| `notes` | String | | 계약 메모·청구 조건 |
| `createdAt` | Date | ✅ | 생성일 |

> **Deprecated (마이그레이션):** `filingSubtype`, `engagementSubtype` → `workSubtype`으로 통합 (§3.3.10).

**프로젝트명 권장 템플릿 (UI 자동 제안, 수정 가능)**

공통 규칙: `{업무유형 또는 workSubtype 라벨} {대상기간}` — 장기 수임은 대상기간 생략. 고객명은 포함하지 않음 (타임로그·경비에서 `clientId`로 표시).

| `projectType` | 템플릿 예 |
|---------------|-----------|
| `BookkeepingAgency` | `기장대리` |
| `FilingAgency` | `법인세 2024.01~2024.12` |
| `PropertyTaxFiling` | `양도소득세 신고 2024.03` |
| `ExternalAudit` | `외부감사 2024.01~2024.12` |
| `Consulting` | `상담 및 자문` |
| `BusinessDiagnosis` | `기업진단 2024.03` |
| `TaxAuditRepresentation` | `세무조사대리 2024.06` |
| `OtherWork` | `경정청구 2023귀속` |
| `FeeCycleAdmin` | `수수료청구 관리` |

#### 3.3.5. 유형별 운영 규칙

| 업무 구분 (§3.3.0) | 반복/건당 | TimeLog | 경비 (Core) | 청구 산정 (Phase 2) |
|--------------------|-----------|---------|-------------|---------------------|
| 기장대리 | **고객당 장기** (`BookkeepingAgency`) | 선택 | ✅ | 월 `contractAmount` |
| 신고대리 | **사업연도·신고 건당** (`FilingAgency`) | ✅ | ✅ | 연·건 `contractAmount` |
| 재산제세 신고대리 | **건당** | ✅ | ✅ | 건당 `contractAmount` |
| 외부감사 | **회계기간당** | **필수** | ✅ | 기간 `contractAmount` + 초과 시간 |
| 상담 및 자문 | 시간·건 혼합 | **필수** | ✅ | 시간 × `hourlyRate` |
| 기업진단 | **건당** | ✅ | ✅ | 건당 정액 |
| 세무조사대리 | **조사 건당/기간** | **필수** | ✅ | 시간 또는 정액 |
| 기타업무 | **건당** | ✅ | ✅ | subtype별 (`TaxAmendment`: 성공보수) |
| 수수료청구 관리 | 주기 (`billingCycle`) | 선택 | 해당 고객 | 주기별 청구·미수 (Phase 2) |

#### 3.3.6. API·UI (확장)

| 메서드 | 경로 | 변경 |
|--------|------|------|
| GET | `/api/projects/options` | `projectType`, `workSubtype`, 라벨 포함 |
| POST/PATCH | `/api/projects` | `projectType`·`workSubtype`별 필수 필드 검증 |
| GET | `/api/project-types` | 업무 구분·subtype 마스터 + 권장 필드 (읽기 전용) |

**POST/PATCH 검증 규칙**

| 조건 | 응답 |
|------|------|
| `workSubtype: 'TaxAmendment'` 이고 `baseFeeAmount` 또는 `successFeeRate` 누락 | 400 `경정청구는 기본금과 성공보수율이 필요합니다` |
| `successFeeRate` ∉ [0, 100] | 400 |
| `PropertyTaxFiling` 이고 `workSubtype` 누락 | 400 |
| `FilingAgency` / `OtherWork` 등 subtype 필수 유형에서 `workSubtype` 누락 | 400 |
| `ExternalAudit` / `FilingAgency`(연간) 이고 `fiscalYearStart` > `fiscalYearEnd` | 400 |
| `billingCycle: 'Monthly'` 이고 `billingAnchorDay` ∉ [1, 28] | 400 |

**UI (`/app/projects`):** 업무 구분(§3.3.0) 선택 → `workSubtype` → 청구 모델·동적 필드 → 프로젝트명 자동 채움.

#### 3.3.7. 대시보드·집계 (Phase 2 연동)

MVP 대시보드는 **승인 시간·인건비(KRW)·경비(KRW/USD 분리)** 를 프로젝트별 집계한다.  
Phase 2에서 `projectType` / `workSubtype` / `billingModel` 기준 **청구 예정액·수금 현황** 카드를 추가한다.

| 집계 축 | 내용 |
|---------|------|
| 업무 구분별 | `BookkeepingAgency` 월 수임, `Consulting` 시간 청구 등 |
| 세부 업무별 | `workSubtype` (예: `VatFiling`, `CorpIncomeTax`) |
| 통화별 | 계약 `currency` 기준 KRW / USD 분리 |
| 주기별 | `billingCycle` 달력 — 당월 청구 대상 프로젝트 |

#### 3.3.8. Mongoose 스키마

**구현 정본:** `models/Project.ts` — enum·필드·인덱스.  
**비즈니스 규칙·레이블·검증:** `lib/project-types.ts` (`PROJECT_TYPE_REGISTRY`, `validateProjectPayload`, `normalizeLegacyProject`).

- 신 `projectType` 10종 + Mongoose enum에 **레거시 7종** (`MonthlyBookkeeping` 등) — DB 하위 호환 읽기·POST 허용, 응답 시 신 enum으로 정규화
- `workSubtype` 허용값은 스키마 enum이 아니라 API·레지스트리에서 검증

#### 3.3.9. TDD 추가 명세

| 테스트 | 경로 | 검증 |
|--------|------|------|
| 업무 구분·subtype | `__tests__/unit/lib/project-types.test.ts` | 필수 필드, 레거시 정규화, 라벨 |
| 기장 액티비티 | `__tests__/unit/lib/project-activities.test.ts` | activity 그룹·필수 검증 |
| API 검증 | `__tests__/api/projects.test.ts` | subtype 누락·경정 필드 → 400 |
| 프로젝트 유형 API | `__tests__/api/project-types.test.ts` | 마스터 JSON |
| 모델 | `__tests__/unit/models/Project.test.ts` | 스키마 제약 |

#### 3.3.10. 구현 마이그레이션 (구 enum → 신 enum)

현재 코드베이스(`lib/project-types.ts`)는 **신 `projectType` / `workSubtype`** 을 사용한다. 기존 DB 문서의 구 enum은 읽기 시 `normalizeLegacyProject()`로 정규화하며, POST 시 구 `projectType`도 허용한다.

| 구 `projectType` | 신 `projectType` | 신 `workSubtype` (권장) |
|------------------|------------------|-------------------------|
| `MonthlyBookkeeping` | `BookkeepingAgency` | `GeneralBookkeeping` |
| `AnnualTaxAdjustment` | `FilingAgency` | `CorpIncomeTax` 또는 `ComprehensiveIncomeTax` |
| `EstateGiftTransferTax` | `PropertyTaxFiling` | `Transfer` / `Gift` / `Inheritance` |
| `TaxAmendment` | `OtherWork` | `TaxAmendment` |
| `TaxConsulting` | `Consulting` | — |
| `Audit` | `ExternalAudit` | — |
| `AdHoc` + `BusinessDiagnosis` | `BusinessDiagnosis` | `ConstructionLicenseCapital` 등 |
| `AdHoc` (기타) | `OtherWork` | `BusinessRegistration` / `LoanDocuments` 등 |
| `FeeCycleAdmin` | `FeeCycleAdmin` | (동일) |
| `General` | `General` | (동일) |

| 구 필드 | 신 필드 |
|---------|---------|
| `filingSubtype` | `workSubtype` (`PropertyTaxFiling`) |
| `engagementSubtype` | `workSubtype` (`BusinessDiagnosis`, `OtherWork`) |

**신규:** `TaxAuditRepresentation`(세무조사대리), `PropertyTaxFiling` + `SecuritiesTransaction`(증권거래세), `OtherWork` + `TaxAppeal`(조세불복).

### 3.4. TimeLog (`models/TimeLog.ts`)

타임로그는 프로젝트(`projectId`)에 귀속된다. **기장대리** 등 일부 `projectType`은 업무 **액티비티(`activity`)** 선택이 필수이며, 레지스트리는 `lib/project-activities.ts`에서 관리한다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `userId` | ObjectId | User 참조 (인덱스) |
| `clientId` | ObjectId | Client 참조 |
| `projectId` | ObjectId | Project 참조 |
| `date` | Date | 작업일 (인덱스) |
| `hours` | Number | 시간 (0.25 ~ 24, 0.25 단위) |
| `activity` | String | 프로젝트 유형별 업무 액티비티 ID (선택·유형별 필수) |
| `description` | String | 작업 내용·추가 메모 (`activity`만 선택 시 액티비티 라벨로 자동 채움) |
| `status` | Enum | `Pending` \| `Approved` \| `Rejected` (기본: `Pending`) |
| `approvedBy` | ObjectId | 승인자 (선택) |
| `rejectionReason` | String | 반려 사유 (선택) |
| `lockedAt` | Date | PeriodLock 적용 시각 — 설정 시 **전 역할 수정 불가** |

**구현:** `models/TimeLog.ts`

#### 3.4.1. 기장대리 액티비티 (`BookkeepingAgency`)

`projectType`이 `BookkeepingAgency`(레거시 `MonthlyBookkeeping` 포함)인 프로젝트에 타임로그를 기록할 때 `activity` **필수**.

| 구분 | 내용 | 주기 (참고) |
|------|------|-------------|
| 부가가치세 신고 및 기장 | 부가가치세 신고, 면세사업자 사업장현황신고, 매출·매입 전표 입력, 일반전표 입력(법인) | 분기(법인) / 반기(개인) |
| 인건비 신고 | 원천징수이행상황 신고, 지급명세서 제출, 급여대장·4대보험 | 매월/반기/연간 |
| 결산 및 재무제표 작성 | 간이영수증 등 전표입력, 결산전표 입력 | 연간/반기/분기 |

| `activity` ID | UI 라벨 |
|---------------|---------|
| `VatFiling` | 부가가치세 신고 |
| `ExemptBusinessStatusReport` | 면세사업자 사업장현황신고 |
| `SalesPurchaseVoucherEntry` | 매출·매입 전표 입력(세금계산서, 신용카드, 현금영수증) |
| `GeneralVoucherEntry` | 일반전표 입력(사업자통장)-법인대상/개인제외 |
| `WithholdingTaxReport` | 원천징수이행상황 신고 |
| `PaymentStatementSubmission` | 지급명세서 제출 |
| `PayrollAndInsurance` | 급여대장작성, 4대보험관리(입·퇴사 신고포함) |
| `InformalReceiptVoucherEntry` | 간이영수증 등 전표입력 |
| `ClosingVoucherEntry` | 결산전표 입력(감가상각비 등) |

#### 3.4.2. 비청구 시간 액티비티 (`NonBillable`)

`projectType`이 `NonBillable`인 **시스템 내부 프로젝트**에 타임로그를 기록할 때 `activity` **필수**. 내부 고객·프로젝트는 `GET /api/projects/options` 호출 시 `lib/non-billable-project.ts`의 `ensureNonBillableProject()`로 자동 생성된다. 타임시트 UI에서는 **「비청구 시간」** 입력 모드로 전환하여 대분류·소분류를 선택한다.

| 대분류 | `activity` ID | UI 라벨 |
|--------|---------------|---------|
| 행정 및 일반 관리 | `ADMIN_MEETING` | 내부 회의 및 보고 |
| | `ADMIN_HR` | 인사 및 노무 관리 |
| | `ADMIN_IT` | IT 및 시스템 관리 |
| | `ADMIN_OFFICE` | 총무 및 출납 |
| 연구 및 개발 | `RND_TAX_RESEARCH` | 세법 및 회계기준 연구 |
| | `RND_TOOL_DEV` | 내부 도구 및 시스템 개발 |
| | `RND_CASE_STUDY` | 사례 분석 |
| 교육 및 전문성 개발 | `EDU_CPE` | CPE(계속전문교육) 이수 |
| | `EDU_OJT` | 내부 교육(OJT) |
| | `EDU_CERTIFICATION` | 자격증/학위 과정 |
| 마케팅 및 영업 | `MKT_PROPOSAL` | 신규 제안서 작성 |
| | `MKT_NETWORKING` | 고객 상담 및 네트워킹 |
| | `MKT_CONTENT` | 콘텐츠 제작 및 홍보 |
| 유급 휴가 및 공가 | `PTO_VACATION` | 연차 휴가 |
| | `PTO_SICK` | 병가 |
| | `PTO_LEAVE` | 경조사 휴가 및 공가 |
| 기타 비효율/유휴 | `IDLE_BENCH` | 대기 시간 (Bench Time) |
| | `IDLE_REWORK` | 단순 오류 수정 (Rework) |

**API·UI**

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/projects/options` | `isNonBillable: true` 플래그·`activityGroups` 포함 (비청구 프로젝트 목록 최상단) |
| POST/PATCH | `/api/timelogs` | `NonBillable` 프로젝트 `activity` 검증 |

**구현:** `models/TimeLog.ts` · 편집 권한 `lib/permissions.ts` (`canEditTimeLog`)

### 3.5. Expense (`models/Expense.ts`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `userId` | ObjectId | User 참조 |
| `clientId` | ObjectId | Client 참조 (선택) |
| `projectId` | ObjectId | Project 참조 (선택) |
| `expenseType` | Enum | `Core` (프로젝트 직접) \| `Overhead` (간접) |
| `paymentMethod` | Enum | 지출 방법 — `lib/expense-payment-methods.ts` (적격/비증빙/기타) |
| `expensePurpose` | Enum | 지출 용도 — `lib/expense-purposes.ts` (A~F 회계·세무 사무소 분류) |
| `filingPeriod` | Enum | 관련 신고 기간 (선택) — `lib/expense-filing-periods.ts` |
| `amount` | Number | 금액 (≥ 0) |
| `currency` | Enum | `KRW` \| `USD` (기본: `KRW`) — 대시보드 KRW/USD 분리 집계 |
| `date` | Date | 지출일 |
| `receiptUrl` | String | 영수증 URL (선택) |
| `googleDriveFileId` | String | Drive 파일 ID (선택) |
| `description` | String | 설명 |
| `notes` | String | 비고 (선택) — 비증빙 지출 시 수임업체명·목적 소명 |
| `status` | Enum | `Pending` \| `Approved` \| `Rejected` (기본: `Pending`) |
| `approvedBy` | ObjectId | 승인자 (선택) |
| `rejectionReason` | String | 반려 사유 (선택) |
| `lockedAt` | Date | PeriodLock 적용 시각 |

#### 영수증 첨부 (UI)

경비 등록 폼(`ExpenseForm`)에서 영수증은 **선택** 첨부이다.

| 뷰포트 | UI | 구현 |
|--------|-----|------|
| `< md` (768px) | **촬영** (`capture=environment`), **앨범**, 미리보기, **다시 촬영**, **제거** | `components/app/ReceiptAttachment.tsx` |
| `≥ md` | **파일 선택** (PDF, JPEG, PNG), 미리보기·제거 | 동일 |

- 클라이언트 검증: `lib/receipt-file.ts` — MIME(`lib/receipt-mime.ts`), 최대 **10MB**
- 촬영 기본 파일명(`image.jpg` 등)은 `receipt-{YYYYMMDD}-{HHmmss}.jpg`로 정규화
- **비지원 (1차):** HEIC 자동 변환, 인앱 카메라, 크롭·압축

**구현:** `models/Expense.ts` · 편집 권한 `lib/permissions.ts` (`canEditExpense`)

### 3.6. PeriodLock (`models/PeriodLock.ts`)

Admin이 **날짜 범위**를 마감하면, 해당 기간의 TimeLog·Expense에 `lockedAt`을 일괄 설정한다. 해제 시 PeriodLock 문서 삭제 + `lockedAt` unset.

| 필드 | 타입 | 설명 |
|------|------|------|
| `startDate` | Date | 마감 시작일 (인덱스) |
| `endDate` | Date | 마감 종료일 (인덱스) |
| `lockedBy` | ObjectId | 실행 Admin |
| `lockedAt` | Date | 실행 시각 |
| `note` | String | 메모 (선택) |

**생성 (`POST /api/period-locks`, Admin):**

- `{ year, month }` — 서울 기준 해당 월 전체 (`getMonthRangeSeoul`)
- 또는 `{ startDate, endDate }` — date-only, 종료일 inclusive
- 겹치는 기간 존재 시 **409**

**해제 (`DELETE /api/period-locks/[id]`):** `lib/period-lock.ts` — `removePeriodLock`

**구현:** `models/PeriodLock.ts`, `lib/period-lock.ts`, `__tests__/api/period-locks.test.ts`

---

## 4. Google Drive 연동 명세

백엔드는 **Google Service Account JWT** + Master Folder **공유**(Editor) 방식 (`lib/drive/client.ts`). Domain-Wide Delegation은 사용하지 않는다.

### 고객 생성 시 (`POST /api/clients`)
1. Drive API로 `FirmFlow_Data/[고객명]_[고객코드]` 폴더 생성 (`lib/drive/folders.ts`)
2. `folderId` → Client `googleDriveFolderId`

### 경비 영수증 업로드 시 (`POST /api/expenses/upload`)

1. Multipart Form (이미지/PDF, `lib/receipt-mime.ts` 검증, **최대 10MB**)
2. Core → 고객 폴더; Overhead → `/Overhead_Receipts` (`lib/drive/upload.ts`)
3. `receiptUrl`, `googleDriveFileId` 저장

**클라이언트 첨부 (§3.5):** 모바일 촬영·앨범 또는 데스크톱 파일 선택 → 동일 업로드 API. 허용 MIME: `application/pdf`, `image/jpeg`, `image/png`.

---

## 5. 테스트 구조 및 검증

Jest + React Testing Library + mongodb-memory-server. **202 tests** (`npm test -- --runInBand`).

### 5.1. 디렉터리 맵

| 경로 | 대상 |
|------|------|
| `__tests__/unit/` | `billingUtils`, `permissions*`, `project-types`, `project-activities`, `currency`, `dates`, `nav-items`, `onboarding`, … |
| `__tests__/unit/models/` | User, Client, Project 스키마 |
| `__tests__/unit/drive/` | Drive 폴더 어댑터 |
| `__tests__/api/` | Route Handler + in-memory MongoDB |
| `__tests__/components/` | TimesheetGrid, TimesheetForm, ExpenseForm, ReceiptAttachment, DashboardSummary |
| `__tests__/lib/` | `timesheet-week` |
| `__tests__/unit/lib/` | `receipt-file`, `receipt-mime`, … |

### 5.2. API 통합 테스트

| 파일 | 주요 검증 |
|------|-----------|
| `clients.test.ts` | RBAC, Drive 폴더 생성 |
| `projects.test.ts` | 유형별 필드 검증, 레거시 enum |
| `project-types.test.ts` | 마스터 API |
| `timelogs.test.ts` | 24h 제한, activity, lockedAt |
| `expenses.test.ts` | currency, Core/Overhead, lockedAt |
| `expenses-upload.test.ts` | multipart 업로드 |
| `period-locks.test.ts` | 마감·해제·lockedAt 일괄 |
| `dashboard.test.ts` | 기간·Preparer 필터·KRW/USD |
| `users.test.ts` | Admin salary, role |

### 5.3. 핵심 단위 테스트

- `billingUtils.test.ts` — `calculateProjectCost`, 과거 `salaryTable` 단가 해석
- `permissions-timelog.test.ts` / `permissions-expense.test.ts` — `lockedAt`, 역할별 편집
- `project-types.test.ts` — 레지스트리·검증·레거시 `normalizeLegacyProject`

### 5.4. 검증 명령

```bash
npm test -- --runInBand
npm run lint
npm run build
```

---

## 6. 구현 체크리스트 및 실행 로드맵

**현재 상태 (2026-06-24):** MVP 범위 **구현 완료**. Jest **202 tests** 통과 (`npm test -- --runInBand`).  
**미완료:** Phase 2 기능(청구·수금·Export), 프로덕션 배포, 일부 UI 권장 사항.  
**Agent 참고:** 문서 읽기 순서·코드 위치 → [`docs/README.md`](README.md). 구 설계 enum은 `docs/superpowers/`를 따르지 말 것.

### MVP — 완료

- [x] **Phase 1: 환경 및 기본 테스트 설정**
  - `jest.config.ts`, `jest.setup.ts`, `lib/testDbHelper.ts`
  - mongodb-memory-server 기반 API 통합 테스트

- [x] **Phase 2: 데이터 모델 검증**
  - User, Client, Project, TimeLog, Expense, **PeriodLock (§3.6)** 스키마 + 단위 테스트
  - Project: §3.3.0 업무 구분 8종 + `FeeCycleAdmin`·`General` / `workSubtype` / `billingModel` (Section 3.3)
  - Expense: `currency` (KRW/USD) 필드

- [x] **Phase 3: 라우트 인증 및 Workspace 보안**
  - NextAuth Google OAuth, 도메인 제한, RBAC (`Admin` / `Approver` / `Preparer`)
  - `middleware.ts` — `/app/*` 인증 가드
  - 역할별 API 접근 테스트 (`__tests__/api/`, `__tests__/unit/permissions*.test.ts`)

- [x] **Phase 4: 핵심 로직 및 Google Drive 어댑터**
  - `lib/billingUtils.ts` — 과거 단가 해석
  - `lib/drive/` — 고객 폴더 생성, 영수증 업로드 (Service Account JWT + 공유 폴더)
  - API: users, clients, projects, timelogs, expenses, period-locks, dashboard
  - `GET /api/project-types` — 프로젝트 유형 마스터

- [x] **Phase 5: 반응형 클라이언트 프론트엔드**
  - Marketing 라우트 (`(marketing)/`) — 플레이스홀더
  - App: 대시보드, 타임시트, 승인, 경비, 고객, 프로젝트, Admin(사용자·급여·마감)
  - `TimesheetGrid` 모바일 카드 / 데스크톱 매트릭스 (`__tests__/components/TimesheetGrid.test.tsx`)
  - `lib/timesheet-week.ts`, `WeekdayHoursSummary` — 주간 요일별 시간 합계
  - 역할별 사이드바: `lib/nav-items.ts`
  - 대시보드 경비 KRW/USD 분리 집계
  - `ReceiptAttachment` — 경비 영수증 모바일 촬영·앨범·미리보기 (`lib/receipt-file.ts`)

- [x] **Phase 6: 프로젝트 업무 구분·청구 메타 (Section 3.3)**
  - `lib/project-types.ts` — 레지스트리, 검증, 프로젝트명 템플릿, 레거시 enum 정규화
  - `lib/project-activities.ts` — 기장대리 타임로그 액티비티 (Section 3.4)
  - `/app/projects` 동적 폼, API 검증, `GET /api/project-types`
  - [x] **§3.3.0 신 업무 구분·`workSubtype` 반영** (§3.3.10 — 레거시 enum 읽기·POST 호환)

### MVP — 부분 완료 / 권장 사항

- [ ] **프로젝트 목록 고객 검색 필터** (Section 3.3.6·설계 §5.2 권장 — 유형·상태 필터만 구현됨)
- [ ] **Marketing 실제 콘텐츠** (구조·플레이스홀더만 존재)

### Phase 2 — 미구현 (의도적 제외)

- [ ] **유형별 청구 예정액·수금 집계** — `billingCycle` 캘린더, 미수 관리, `refundAmount` 등
- [ ] **대시보드 청구·수금 카드** (Section 3.3.7)
- [ ] **Excel / PDF Export**
- [ ] **Vercel 프로덕션 배포** — `docs/deploy-vercel.md` 참고 (로컬 dev 검증 완료)

### 검증 명령

```bash
npm test -- --runInBand    # 전체 202 tests
npm run dev                # http://localhost:3000
```
