# FirmFlow

**FirmFlow**는 소규모 회계법인(5–15명)을 위한 내부 업무 관리 웹앱과 공개 마케팅 사이트를 하나의 Next.js 프로젝트로 제공합니다.

- **내부 앱 (`/app`)** — 시간 기록, 경비, 고객·프로젝트, 승인 워크플로, 대시보드, HR/급여 이력
- **마케팅 사이트 (`/`, `/about`, `/services`, `/contact`)** — 회계법인 소개 및 문의 (플레이스홀더)

**Tech stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Shadcn UI, MongoDB (Mongoose), Google Drive API, NextAuth.js (Google Workspace OAuth)

---

## Current status / 현재 상태

> AI Agent·재개 시 참고용 스냅샷. 상세 명세는 [`docs/specification.md`](docs/specification.md) §6.

| 항목 | 상태 |
|------|------|
| **MVP** | 구현 완료 (`npm test` → **202 tests** passed) |
| **Phase 2** | 청구·수금 집계, Excel/PDF Export, 프로덕션 배포 — 미구현 |
| **프로젝트 유형** | `lib/project-types.ts` — 10종 `projectType`, `workSubtype`, `billingModel` ([§3.3](docs/specification.md)) |
| **기장 타임로그 액티비티** | `lib/project-activities.ts` — `BookkeepingAgency` 시 `activity` 필수 ([§3.4](docs/specification.md)) |
| **RBAC** | `Admin` ⊃ `Approver` ⊃ `Preparer` — [`lib/permissions.ts`](lib/permissions.ts) |

---

## Documentation / 문서

| 문서 | 용도 |
|------|------|
| [`docs/README.md`](docs/README.md) | **AI Agent 읽기 순서** · 코드 위치 · superpowers 경고 |
| [`docs/specification.md`](docs/specification.md) | **SSOT** — PRD, 스키마, API, 로드맵 |
| [`docs/deploy-vercel.md`](docs/deploy-vercel.md) | Atlas, Google, Vercel 배포 상세 |

---

## Prerequisites / 사전 요구사항

| Requirement | Notes |
|-------------|-------|
| **Node.js** | LTS 20+ recommended |
| **MongoDB Atlas** | Free/shared tier cluster and connection string |
| **Google Cloud** | OAuth 2.0 client (NextAuth sign-in) + Service Account (Drive API) |
| **Google Workspace** | Company domain email (e.g. `@yourfirm.com`) |

---

## Quick start / 빠른 시작

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Marketing: `/`, `/about`, `/services`, `/contact`
- Sign in: `/login` → Google OAuth → `/app`

---

## Environment variables / 환경 변수

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DNS_SERVERS` | *(optional)* Custom DNS for `mongodb+srv` — Windows `querySrv ECONNREFUSED` 시 (e.g. `8.8.8.8,8.8.4.4,1.1.1.1`) |
| `NEXTAUTH_SECRET` | Random secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Public app URL (`http://localhost:3000` in dev) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ALLOWED_EMAIL_DOMAIN` | Allowed Workspace domain without `@` |
| `INITIAL_ADMIN_EMAIL` | First admin email — must sign in before other users |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account for Drive API |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Service account PEM (`\n` for newlines in `.env.local`) |
| `GOOGLE_DRIVE_MASTER_FOLDER_ID` | Root Drive folder ID for `FirmFlow_Data` |

---

## App cheat sheet / 앱 치트시트

### Internal routes (`/app`)

| Path | 설명 |
|------|------|
| `/app` | 대시보드 |
| `/app/timesheet` | 타임시트 |
| `/app/expenses` | 경비 |
| `/app/approvals` | 승인 대기 (Approver+) |
| `/app/clients` | 고객 (Approver+) |
| `/app/projects` | 프로젝트 (Approver+) |
| `/app/admin/users` | 사용자 (Admin) |
| `/app/admin/locks` | 기간 마감 (Admin) |
| `/app/admin/salary` | 급여 단가 (Admin) |

### Role-based nav (`lib/nav-items.ts`)

| Role | 추가 메뉴 |
|------|-----------|
| **Preparer** | 대시보드, 타임시트, 경비 |
| **Approver** | + 승인, 고객, 프로젝트 |
| **Admin** | + 사용자, 기간 마감, 급여 단가 |

### Key APIs

`users`, `clients`, `projects`, `project-types`, `timelogs`, `expenses`, `expenses/upload`, `period-locks`, `dashboard` — 상세는 [`docs/specification.md`](docs/specification.md).

---

## Testing / 테스트

```bash
npm test                  # 202 tests
npm run test:watch
npm run lint
npm run build
```

---

## Deployment / 배포

프로덕션 배포·Google 설정·Atlas 상세는 **[`docs/deploy-vercel.md`](docs/deploy-vercel.md)** 를 따르세요.

요약:

1. GitHub에 push → Vercel import
2. `.env.example`의 **모든** 변수를 Vercel에 설정 (`NEXTAUTH_URL` = 프로덕션 URL)
3. Google OAuth redirect: `https://<domain>/api/auth/callback/google`
4. Atlas Network Access: `0.0.0.0/0` (Vercel serverless)
5. `INITIAL_ADMIN_EMAIL` 계정으로 첫 로그인 → Admin 생성

---

## MVP features / MVP 기능

| Area | Features |
|------|----------|
| **Auth & RBAC** | Google Workspace OAuth, domain restriction, Admin / Approver / Preparer |
| **Clients** | CRUD, auto Drive folder (`FirmFlow_Data/[name]_[code]`) |
| **Projects** | 10종 `projectType`, `workSubtype`, `billingModel`; 동적 등록 폼; `GET /api/project-types` |
| **Timesheet** | Time logs, `BookkeepingAgency` activity picker, responsive grid, 24h/day validation, weekday summary |
| **Expenses** | Core / Overhead, KRW/USD, receipt upload to Drive |
| **Approvals** | Approve/reject pending time logs & expenses |
| **Dashboard** | Monthly hours, labor cost, core/overhead, per-project breakdown |
| **Admin** | Users, `salaryTable`, period locks |
| **Marketing** | Landing, about, services, contact (placeholder content) |

---

## Project structure / 프로젝트 구조

```
app/
  (marketing)/     # Public site
  (app)/app/       # Authenticated internal app
  api/             # Route handlers
components/        # UI and app components
lib/               # project-types, permissions, drive, billing, …
models/            # Mongoose schemas
__tests__/         # Unit, API, component tests
docs/              # SSOT + deploy guide (see docs/README.md)
```

---

## License

Private — internal use for the accounting firm.
