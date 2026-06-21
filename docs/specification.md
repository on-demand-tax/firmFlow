# FirmFlow 제품 요구사항 문서 (PRD) & TDD 구현 명세

## 프로젝트 개요
**프로젝트명:** FirmFlow — 소규모 회계법인용 내부 관리 웹앱  
**대상 규모:** 직원 5~15명 규모의 소형 회계법인  
**기술 스택:** Next.js (App Router), Tailwind CSS, Shadcn UI, MongoDB (Mongoose), Google Drive API, NextAuth.js (Google Workspace OAuth)  
**아키텍처:** Monolithic Next.js + Serverless Route Handlers, TDD(Test-Driven Development) 중심

---

## 1. 시스템 개요 및 핵심 목표

FirmFlow는 소규모 회계법인을 위한 경량·고효율 반응형 웹 애플리케이션이다. 고객별 청구 가능 시간, 프로젝트 관련 경비, 기본 HR/급여 이력을 한곳에서 추적한다. Squarespace 도메인 기반 Google Workspace와 깊이 연동하여 Google Drive 내 폴더 관리를 자동화하고, 별도의 바이너리 스토리지 구축 없이 문서를 관리한다.

### 핵심 설계 원칙

| 원칙 | 설명 |
|------|------|
| **TDD 우선** | 비즈니스 로직, API 라우트, 핵심 UI 상호작용은 운영 구현 전에 테스트를 먼저 작성한다. |
| **최소 인프라 비용** | Vercel + MongoDB Atlas 무료/공유 티어로 배포하여 호스팅 비용을 0에 가깝게 유지한다. |
| **데이터 무결성** | 직원 보수 이력을 엄격히 추적하여 과거 청구 계산이 재현 가능하도록 보장한다. |

---

## 2. 인증 및 역할 기반 접근 제어 (RBAC)

**NextAuth.js**를 통해 Google Workspace OAuth 2.0으로 인증하며, 회사 도메인(`@yourfirm.com`) 계정만 허용한다.

### 역할별 권한

#### Admin (파트너 / 대표 CPA)
- 모든 컬렉션(`Users`, `Clients`, `Projects`, `TimeLogs`, `Expenses`)에 대한 전체 CRUD
- HR 기밀 데이터(`salaryTable`) 접근
- 시간·경비 지표의 최종 잠금 및 승인

#### Approver (선임 회계사 / 프로젝트 매니저)
- `Users` 읽기 (기본 프로필만, 급여 정보 제외)
- 담당 `Clients`, `Projects` 읽기/쓰기
- `TimeLogs`, `Expenses`의 `status`를 `"Pending"` → `"Approved"` 또는 `"Rejected"`로 변경

#### Preparer (주니어 직원 / 인턴 / 파트타임)
- 본인 `TimeLogs`, `Expenses`만 쓰기
- 활성 `Clients`, `Projects` 드롭다운 읽기
- 타인 데이터 열람 금지, `"Approved"` 또는 `"Locked"` 상태 로그 수정 금지

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

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface ISalaryHistory {
  effectiveDate: Date;
  baseSalary: number;
  hourlyBillableRate: number;
}

export interface IUser extends Document {
  email: string;
  name: string;
  role: 'Admin' | 'Approver' | 'Preparer';
  status: 'Active' | 'OnLeave' | 'Terminated';
  salaryTable: ISalaryHistory[];
  createdAt: Date;
}

const SalaryHistorySchema = new Schema<ISalaryHistory>({
  effectiveDate: { type: Date, required: true },
  baseSalary: { type: Number, required: true },
  hourlyBillableRate: { type: Number, required: true }
});

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Approver', 'Preparer'], default: 'Preparer', required: true },
  status: { type: String, enum: ['Active', 'OnLeave', 'Terminated'], default: 'Active', required: true },
  salaryTable: { type: [SalaryHistorySchema], default: [], select: false },
  createdAt: { type: Date, default: Date.now }
});

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
```

### 3.2. Client (`models/Client.ts`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `name` | String | 고객사명 (인덱스) |
| `businessRegistrationNumber` | String | 사업자등록번호 |
| `contactPerson` | String | 담당자 |
| `googleDriveFolderId` | String | Google Drive 폴더 ID |
| `createdAt` | Date | 생성일 |

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IClient extends Document {
  name: string;
  businessRegistrationNumber: string;
  contactPerson: string;
  googleDriveFolderId: string;
  createdAt: Date;
}

const ClientSchema = new Schema<IClient>({
  name: { type: String, required: true, index: true },
  businessRegistrationNumber: { type: String, required: true },
  contactPerson: { type: String, required: true },
  googleDriveFolderId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const ClientModel = mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);
```

### 3.3. Project (`models/Project.ts`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `clientId` | ObjectId | Client 참조 (인덱스) |
| `projectName` | String | 프로젝트명 |
| `status` | Enum | `Active` \| `Completed` (기본: `Active`) |
| `createdAt` | Date | 생성일 |

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  clientId: mongoose.Types.ObjectId;
  projectName: string;
  status: 'Active' | 'Completed';
  createdAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  projectName: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Completed'], default: 'Active', required: true },
  createdAt: { type: Date, default: Date.now }
});

export const ProjectModel = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);
```

### 3.4. TimeLog (`models/TimeLog.ts`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `userId` | ObjectId | User 참조 (인덱스) |
| `clientId` | ObjectId | Client 참조 |
| `projectId` | ObjectId | Project 참조 |
| `date` | Date | 작업일 (인덱스) |
| `hours` | Number | 시간 (0.5 ~ 24) |
| `description` | String | 작업 내용 |
| `status` | Enum | `Pending` \| `Approved` \| `Rejected` (기본: `Pending`) |
| `approvedBy` | ObjectId | 승인자 (선택) |

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface ITimeLog extends Document {
  userId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  date: Date;
  hours: number;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: mongoose.Types.ObjectId;
}

const TimeLogSchema = new Schema<ITimeLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  date: { type: Date, required: true, index: true },
  hours: { type: Number, required: true, min: 0.5, max: 24 },
  description: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' }
});

export const TimeLogModel = mongoose.models.TimeLog || mongoose.model<ITimeLog>('TimeLog', TimeLogSchema);
```

### 3.5. Expense (`models/Expense.ts`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `userId` | ObjectId | User 참조 |
| `clientId` | ObjectId | Client 참조 (선택) |
| `projectId` | ObjectId | Project 참조 (선택) |
| `expenseType` | Enum | `Core` (프로젝트 직접) \| `Overhead` (간접) |
| `amount` | Number | 금액 (≥ 0) |
| `date` | Date | 지출일 |
| `receiptUrl` | String | 영수증 URL (선택) |
| `googleDriveFileId` | String | Drive 파일 ID (선택) |
| `description` | String | 설명 |
| `status` | Enum | `Pending` \| `Approved` \| `Rejected` (기본: `Pending`) |

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  expenseType: 'Core' | 'Overhead';
  amount: number;
  date: Date;
  receiptUrl?: string;
  googleDriveFileId?: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

const ExpenseSchema = new Schema<IExpense>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
  expenseType: { type: String, enum: ['Core', 'Overhead'], required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
  receiptUrl: { type: String },
  googleDriveFileId: { type: String },
  description: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', required: true }
});

export const ExpenseModel = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
```

---

## 4. Google Drive 연동 명세

백엔드는 **Google Service Account**로 동작하며, Domain-Wide Delegation 또는 회사 소유 Master Folder 공유 접근으로 설정한다.

### 고객 생성 시 (`POST /api/clients`)
1. Google Drive API로 `FirmFlow_Data/[고객명]_[고객코드]` 폴더 생성
2. 반환된 `folderId`를 MongoDB Client 문서에 저장

### 경비 영수증 업로드 시 (`POST /api/expenses/upload`)
1. Next.js Route Handler에서 Multipart Form(이미지/PDF) 처리
2. 해당 고객 폴더 또는 `/Overhead_Receipts` 폴더로 스트림 업로드
3. 서버 임시 캐시 정리 후 고유 view URL을 MongoDB에 저장

---

## 5. TDD 실행 전략 및 테스트 명세

AI 개발 에이전트는 **Jest** + **React Testing Library**로 테스트를 먼저 작성·실행한 뒤 운영 코드를 구현한다.

### 5.1. 테스트 환경 구성

| 유형 | 대상 | 경로 |
|------|------|------|
| **Unit Test** | 비즈니스 함수, 권한 게이트, 계산 로직 | `__tests__/unit/...` |
| **API Integration Test** | Route Handler + mongodb-memory-server | `__tests__/api/...` |
| **UI / E2E Test** | 폼 제약, 반응형 뷰포트 | 컴포넌트 테스트 |

### 5.2. 핵심 단위 테스트 — 시간 누적 및 비용 계산

작업일 기준으로 해당 시점의 `hourlyBillableRate`를 적용하는 **과거 단가 해석(Historical Rate Resolving)** 로직을 검증한다.

```typescript
import { calculateProjectCost } from '@/lib/billingUtils';
import { ISalaryHistory } from '@/models/User';

describe('Billing Calculation Utility - Historical Rate Resolving', () => {
  const mockSalaryTable: ISalaryHistory[] = [
    { effectiveDate: new Date('2025-01-01'), baseSalary: 3000, hourlyBillableRate: 50 },
    { effectiveDate: new Date('2026-01-01'), baseSalary: 3500, hourlyBillableRate: 65 }
  ];

  test('2025년 작업에는 2025년 단가 적용', () => {
    const logDate = new Date('2025-06-15');
    const hours = 10;
    const cost = calculateProjectCost(hours, logDate, mockSalaryTable);
    expect(cost).toBe(500);
  });

  test('2026년 작업에는 갱신된 2026년 단가 적용', () => {
    const logDate = new Date('2026-02-20');
    const hours = 4;
    const cost = calculateProjectCost(hours, logDate, mockSalaryTable);
    expect(cost).toBe(260);
  });
});
```

### 5.3. 핵심 API 통합 테스트 — TimeLog 생성 검증

```typescript
import { createMocks } from 'node-mocks-http';
import POST_RouteHandler from '@/app/api/timelogs/route';
import { dbConnect, dbDisconnect } from '@/lib/testDbHelper';

beforeAll(async () => { await dbConnect(); });
afterAll(async () => { await dbDisconnect(); });

describe('POST /api/timelogs - Access Enforcement & Form Constraints', () => {
  test('단일 항목 시간이 24시간 초과 시 제출 차단', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        clientId: '60c72b2f9b1d8b2bad123456',
        projectId: '60c72b2f9b1d8b2bad123457',
        date: '2026-06-20',
        hours: 26,
        description: 'Legal review override attempt'
      }
    });

    req.session = { user: { id: 'user_preparer_01', role: 'Preparer' } };

    await POST_RouteHandler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });
});
```

### 5.4. 반응형 UI 컴포넌트 테스트

```typescript
import { render, screen } from '@testing-library/react';
import TimesheetGrid from '@/components/TimesheetGrid';

describe('TimesheetGrid Layout Adaptability', () => {
  test('좁은 화면(모바일)에서 컴팩트 카드 뷰 렌더링', () => {
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));

    render(<TimesheetGrid viewMode="auto" />);
    expect(screen.getByTestId('mobile-timesheet-card-stack')).toBeInTheDocument();
  });

  test('데스크톱 뷰포트에서 매트릭스 그리드 뷰 렌더링', () => {
    global.innerWidth = 1440;
    global.dispatchEvent(new Event('resize'));

    render(<TimesheetGrid viewMode="auto" />);
    expect(screen.getByTestId('desktop-matrix-grid-view')).toBeInTheDocument();
  });
});
```

---

## 6. 구현 체크리스트 및 실행 로드맵

아래 순서대로 구현한다.

- [ ] **Phase 1: 환경 및 기본 테스트 설정**
  - `jest.config.js`, 테스트 DB 설정 파일 구성
  - 설정 파이프라인 더미 실행으로 매핑 검증

- [ ] **Phase 2: 데이터 모델 검증**
  - User, Client, Project, TimeLog, Expense 스키마 검증 테스트 구현·실행

- [ ] **Phase 3: 라우트 인증 및 Workspace 보안 미들웨어**
  - 토큰 검증, NextAuth 권한 필터 구축
  - 모킹된 세션 역할별 검증 테스트 실행

- [ ] **Phase 4: 핵심 로직 및 Google Drive 어댑터**
  - 파일 파이프라인 어댑터 구현
  - 표준 응답 구조로 API 엔드포인트 모킹 후 통합 핸들러 테스트

- [ ] **Phase 5: 반응형 클라이언트 프론트엔드**
  - Tailwind 기반 동적 대시보드 구축
  - 다양한 화면 비율에서 네이티브 지원 확인
