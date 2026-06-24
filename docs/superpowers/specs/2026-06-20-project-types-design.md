# FirmFlow Project Types 확장 설계

> **⚠️ Superseded (2026-06-24)** — 이 문서의 `projectType` enum (`MonthlyBookkeeping`, `Audit`, `AdHoc` 등)은 **레거시**입니다.  
> **현재 구현 정본:** [`docs/specification.md`](../../specification.md) §3.3, [`lib/project-types.ts`](../../../lib/project-types.ts) (`BookkeepingAgency`, `ExternalAudit`, `OtherWork` 등).  
> AI Agent는 이 문서의 enum·필드명으로 구현하지 마세요.

**작성일:** 2026-06-20  
**상태:** Superseded — 히스토리 참고용  
**기반 문서:** `docs/specification.md` §3.3  
**관련:** `docs/superpowers/specs/2026-06-20-firmflow-design.md` (MVP — Project 섹션은 본 문서로 대체·확장)

---

## 1. 개요

회계법인의 실제 수임 패턴(기장, 세무조정, 경정, 감사 등)을 **프로젝트 메타데이터**로 구조화한다. MVP(1차 릴리스) 목표는 **메타데이터 저장 + 시간/경비 추적**이며, 자동 청구·수금·인보이스는 **Phase 2**로 분리한다.

### 1.1 Brainstorming 결정 사항

| # | 항목 | 결정 |
|---|------|------|
| 1 | 1차 릴리스 목표 | **A** — 메타데이터 + 운영 추적만; 자동 청구/수금은 Phase 2 |
| 2 | 반복 업무 (기장 등) | **A** — 고객당 장기 프로젝트 1개; 월 구분은 대시보드 날짜 필터 |
| 3 | 수수료청구 주기 관련 | **A** — `FeeCycleAdmin` 별도 프로젝트 유형 (고객당 1개) |
| 4 | `billingModel` 선택 | **C** — `projectType`에서 기본값 자동 유도; **Admin/Approver만** 변경 가능 |
| 5 | 구현 접근 | **단일 `Project` + `lib/project-types.ts` 레지스트리** (접근 1) |

---

## 2. 아키텍처

```
lib/project-types.ts          ← 단일 소스 (유형·청구 기본값·필수 필드·UI 라벨)
        │
        ├── models/Project.ts           Mongoose 스키마
        ├── lib/validate-project.ts     POST/PATCH 검증 (선택: project-types 내 통합 가능)
        ├── app/api/project-types/      마스터 JSON (읽기 전용)
        ├── app/api/projects/           CRUD + 검증
        └── app/(app)/app/projects/     동적 등록 폼
```

TimeLog / Expense / Dashboard API는 `projectId` 참조만 유지. MVP에서 집계 로직 변경 없음.

---

## 3. 데이터 모델 & 유형 레지스트리

### 3.1 `projectType` (9종)

| `projectType` | UI 라벨 | 프로젝트 수명 | 기본 `billingModel` | 기본 `billingCycle` |
|---------------|---------|---------------|---------------------|---------------------|
| `FeeCycleAdmin` | 수수료청구 관리 | 고객당 1개 장기 | `Retainer` | (요청 시 지정) |
| `MonthlyBookkeeping` | 기장대리 | 고객당 1개 장기 | `Retainer` | `Monthly` |
| `AnnualTaxAdjustment` | 세무조정 | 사업연도당 1개 | `Retainer` | `Annual` |
| `EstateGiftTransferTax` | 양도·증여·상속 신고 | 건당 1개 | `FixedPerEvent` | — |
| `TaxAmendment` | 경정청구 | 건당 1개 | `BasePlusSuccess` | — |
| `TaxConsulting` | 세법상담·컨설팅 | 건당 또는 장기 | `Hourly` | — |
| `Audit` | 회계감사 | 회계기간당 1개 | `PerFiscalPeriod` | — |
| `AdHoc` | 건당 기타 | 건당 1개 | `FixedPerEvent` | — |
| `General` | 일반 (레거시) | 자유 | `Hourly` | — |

### 3.2 `billingModel` (6종)

| `billingModel` | 설명 |
|----------------|------|
| `Retainer` | 정기 수임 (`billingCycle`, `contractAmount`) |
| `Hourly` | 시간당 (`hourlyRate` 선택) |
| `FixedPerEvent` | 건당 정액 |
| `BasePlusSuccess` | 기본금 + 성공보수 (`baseFeeAmount`, `successFeeRate`) |
| `PerFiscalPeriod` | 회계기간당 (`fiscalYearStart/End`, `contractAmount`) |
| `Manual` | 혼합·예외 (`notes`, `contractAmount`) |

`billingCycle`: `Monthly` | `Quarterly` | `SemiAnnual` | `Annual` | `OnCompletion`

### 3.3 유형별 MVP 필수 필드

| `projectType` | 필수 필드 |
|---------------|-----------|
| `FeeCycleAdmin` | `billingCycle`, `currency` |
| `MonthlyBookkeeping` | `contractAmount`, `currency`, `billingAnchorDay` |
| `AnnualTaxAdjustment` | `fiscalYearStart`, `fiscalYearEnd`, `contractAmount`, `currency` |
| `EstateGiftTransferTax` | `filingSubtype`, `eventDate`, `contractAmount`, `currency` |
| `TaxAmendment` | `baseFeeAmount`, `successFeeRate`, `currency` |
| `TaxConsulting` | `currency` (`hourlyRate` 선택) |
| `Audit` | `fiscalYearStart`, `fiscalYearEnd`, `contractAmount`, `currency` |
| `AdHoc` | `engagementSubtype` + (`contractAmount` 또는 `hourlyRate` 중 하나) |
| `General` | 없음 |

**서브타입 enum**

- `filingSubtype`: `Transfer` | `Gift` | `Inheritance`
- `engagementSubtype`: `NPL` | `BusinessDiagnosis` | `SubsidySettlement` | `Lecture` | `BookWriting` | `Other`

### 3.4 전체 스키마 필드

`clientId`, `projectName`, `projectType`, `billingModel`, `status`, `billingCycle?`, `currency` (기본 `KRW`), `contractAmount?`, `baseFeeAmount?`, `successFeeRate?`, `hourlyRate?`, `filingSubtype?`, `engagementSubtype?`, `eventDate?`, `fiscalYearStart?`, `fiscalYearEnd?`, `billingAnchorDay?`, `notes?`, `createdAt`

인덱스: `clientId`, `projectType`, 복합 `(clientId, projectType, status)` (중복 경고 조회용)

### 3.5 하위 호환

기존 프로젝트 → Mongoose `default`: `projectType: 'General'`, `billingModel: 'Hourly'`, `currency: 'KRW'`. 별도 마이그레이션 스크립트 불필요.

### 3.6 프로젝트명 권장 템플릿 (UI 자동 제안, 수정 가능)

#### 명명 규칙

```
{고객명} {업무유형} {대상기간}
```

| 세그먼트 | 설명 |
|----------|------|
| **고객명** | `Client.name` (항상 선행) |
| **업무유형** | `projectType` 한국어 라벨 또는 세부 유형 (`양도소득세 신고`, `NPL` 등) |
| **대상기간** | 구분이 필요한 경우만 포함 (공백으로 연결) |

**대상기간 표기**

| 상황 | 형식 | 예 |
|------|------|-----|
| 사업연도 시작·종료 모두 입력 | `YYYY.MM~YYYY.MM` | `2024.01~2024.12` |
| 사업연도 종료일만 입력 | `{연도}사업연도` | `2024사업연도` |
| 신고·건당 기준일 (`eventDate`) | `YYYY.MM` | `2024.03` |
| 경정 귀속연도 | `{연도}귀속` | `2023귀속` |
| 장기 수임 (기장·수수료청구) | *(생략)* | — |

구현: `lib/project-types.ts` → `composeProjectName()`, `buildProjectNameTemplate()`

#### 유형별 예시

| `projectType` | 자동 제안 예 |
|---------------|-------------|
| `MonthlyBookkeeping` | `테스트주식회사 기장대리` |
| `FeeCycleAdmin` | `테스트주식회사 수수료청구 관리` |
| `AnnualTaxAdjustment` | `테스트주식회사 세무조정 2024.01~2024.12` |
| `EstateGiftTransferTax` | `홍길동 양도소득세 신고 2024.03` |
| `TaxAmendment` | `테스트주식회사 경정청구 2023귀속` |
| `TaxConsulting` | `테스트주식회사 세법상담` (기준일 있으면 `… 세법상담 2024.06`) |
| `Audit` | `테스트주식회사 회계감사 2024.01~2024.12` |
| `AdHoc` | `테스트주식회사 NPL 2024.03` (기준일 없으면 세부명만) |
| `General` | `테스트주식회사 일반` |

### 3.7 중복·수명 (소프트 경고)

`FeeCycleAdmin`, `MonthlyBookkeeping` 등 `lifespan: 'long-lived'` 유형에서 동일 `clientId` + `projectType` + `status: Active` 존재 시:

- API는 **201 성공** (차단하지 않음)
- 응답 `warning` 필드로 알림
- UI 토스트 표시

---

## 4. API & 검증

### 4.1 엔드포인트

| 메서드 | 경로 | 역할 | 설명 |
|--------|------|------|------|
| GET | `/api/project-types` | Preparer+ | 레지스트리 마스터 (읽기 전용) |
| GET | `/api/projects` | Approver+ | 목록 (유형·청구 메타 포함) |
| GET | `/api/projects/[id]` | Approver+ | 상세 |
| POST | `/api/projects` | Approver+ | 유형별 검증 후 생성 |
| PATCH | `/api/projects/[id]` | Approver+ | 메타 수정 |
| GET | `/api/projects/options` | Preparer+ | 드롭다운 (`projectTypeLabel` 포함) |

### 4.2 `billingModel` 변경 권한 (결정 C)

- POST: 미전송 시 `deriveBillingDefaults(projectType)` 자동 적용
- POST/PATCH: 클라이언트가 기본값과 다른 `billingModel` 전송 시 **Admin/Approver만** 허용; Preparer 시도 → 403
- `projectType` 변경 시 기본값 재계산; 명시적 override는 Admin/Approver만

### 4.3 검증 규칙

**공통**

| 조건 | 응답 |
|------|------|
| POST 시 `clientId` / `projectName` / `projectType` 누락 | 400 `필수 항목을 입력해 주세요` |
| 금액 필드 < 0 | 400 `금액은 0 이상이어야 합니다` |
| 알 수 없는 enum | 400 `유효하지 않은 값입니다` |

**조합**

| 조건 | 응답 |
|------|------|
| `BasePlusSuccess`이고 `baseFeeAmount` 또는 `successFeeRate` 누락 | 400 `경정청구는 기본금과 성공보수율이 필요합니다` |
| `successFeeRate` ∉ [0, 100] | 400 |
| `EstateGiftTransferTax`이고 `filingSubtype` 누락 | 400 |
| `AdHoc`이고 `engagementSubtype` 누락 | 400 |
| `fiscalYearStart` > `fiscalYearEnd` | 400 |
| `billingCycle: 'Monthly'`이고 `billingAnchorDay` ∉ [1, 28] | 400 |

유형별 필수 필드는 레지스트리 `requiredFields`로 검증 (§3.3).

### 4.4 직렬화

API 응답에 `projectTypeLabel`, `billingModelLabel` 포함 (UI 한국어 표시용). 금액은 `formatMoney` (`lib/currency.ts`) 재사용.

### 4.5 TimeLog / Expense / Dashboard

MVP: **변경 없음**. Phase 2에서 `projectType` / `billingModel` 기반 청구 예정·수금 카드 추가.

---

## 5. UI & 운영 흐름

### 5.1 `/app/projects` 등록 폼

1. 고객 선택
2. 업무 유형 선택 → 청구 모델 기본값 표시 (Admin/Approver만 수정)
3. 유형별 동적 필드
4. 프로젝트명 템플릿 자동 채움 (수정 가능)
5. 등록

### 5.2 목록 테이블

컬럼: 고객, 프로젝트명, 유형, 청구(모델 + 계약금액), 상태, 작업(편집/완료).  
필터: 유형별, Active만, 고객 검색 (MVP 포함 권장).

### 5.3 Preparer (TimeLog / Expense)

`projects/options` 라벨: `{projectName} ({유형 라벨})`. 계약 메타는 드롭다운에 미표시.

### 5.4 운영 시나리오

| 시나리오 | 방법 |
|----------|------|
| 월별 기장 | 고객당 `MonthlyBookkeeping` 1개 장기; 월 구분 = 대시보드 날짜 필터 |
| 수수료 청구 행정 | 고객당 `FeeCycleAdmin` 1개 (기장과 병행 가능) |
| 연간 세무조정 | 사업연도마다 `AnnualTaxAdjustment` 신규 |
| 경정 | 건당 `TaxAmendment`; `successFeeRate`만 저장 (환급액 Phase 2) |
| 감사 | 회계기간당 `Audit` 1건 |

---

## 6. Phase 2 훅 (MVP 미구현)

- 스키마에 `refundAmount`, `lastBilledAt`, `nextBillDate` **추가하지 않음** (YAGNI)
- 레지스트리에 `phase2BillingKey` 주석/키만 두어 청구 엔진 연동 지점 표시
- 대시보드: 유형별 청구 예정액, `billingCycle` 캘린더, 미수 관리

---

## 7. 완료 기준

- [ ] `models/Project.ts` 확장 스키마 반영
- [ ] `lib/project-types.ts` + 검증 테스트
- [ ] `/api/project-types`, `/api/projects` POST/PATCH 유형별 검증
- [ ] `/app/projects` 동적 폼 + 목록 확장
- [ ] `/api/projects/options` `projectTypeLabel` 추가
- [ ] 기존 테스트 통과 + 신규 테스트 추가
- [ ] `docs/specification.md` §3.3과 일치 (이미 반영됨)

---

## 8. 구현 계획

`docs/superpowers/plans/2026-06-20-project-types.md`
