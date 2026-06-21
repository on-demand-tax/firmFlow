# FirmFlow

**FirmFlow**는 소규모 회계법인(5–15명)을 위한 내부 업무 관리 웹앱과 공개 마케팅 사이트를 하나의 Next.js 프로젝트로 제공합니다.

- **내부 앱 (`/app`)** — 시간 기록, 경비, 고객·프로젝트, 승인 워크플로, 대시보드, HR/급여 이력
- **마케팅 사이트 (`/`, `/about`, `/services`, `/contact`)** — 회계법인 소개 및 문의

**Tech stack:** Next.js (App Router), Tailwind CSS, Shadcn UI, MongoDB (Mongoose), Google Drive API, NextAuth.js (Google Workspace OAuth)

---

## Prerequisites / 사전 요구사항

| Requirement | Notes |
|-------------|-------|
| **Node.js** | LTS 20+ recommended |
| **MongoDB Atlas** | Free/shared tier cluster and connection string |
| **Google Cloud** | OAuth 2.0 client (NextAuth sign-in) + Service Account (Drive API) |
| **Google Workspace** | Company domain email (e.g. `@yourfirm.com`) |

---

## Environment variables / 환경 변수

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | Random secret for encrypting NextAuth sessions (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Public app URL (`http://localhost:3000` in dev; production domain on Vercel) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID for Workspace sign-in |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ALLOWED_EMAIL_DOMAIN` | Allowed Workspace domain without `@` (e.g. `yourfirm.com`) |
| `INITIAL_ADMIN_EMAIL` | Email of the first admin; must sign in before other users can register |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email for Google Drive API |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Service account private key (PEM; use `\n` for newlines in `.env.local`) |
| `GOOGLE_DRIVE_MASTER_FOLDER_ID` | Root Drive folder ID for `FirmFlow_Data` |

---

## Local development / 로컬 개발

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Marketing pages: `/`, `/about`, `/services`, `/contact`
- Sign in: `/login` → redirects to `/app` after Google OAuth

---

## Testing / 테스트

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Other checks:

```bash
npm run lint
npm run build
```

---

## Deployment (Vercel) / 배포

1. Push the repo to GitHub and import the project in [Vercel](https://vercel.com).
2. Set **all** environment variables from `.env.example` in the Vercel project settings.
3. Set `NEXTAUTH_URL` to your production URL (e.g. `https://firmflow.yourfirm.com`).
4. For `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, paste the full PEM; Vercel accepts multiline values in the dashboard.
5. Add the production callback URL to your Google OAuth client:  
   `https://<your-domain>/api/auth/callback/google`
6. Deploy. Vercel runs `next build` automatically.

**MongoDB Atlas:** Allow network access from `0.0.0.0/0` (or Vercel IP ranges) for serverless functions.

---

## Google setup checklist / Google 설정 체크리스트

### 1. OAuth (sign-in)

- [ ] Create a Google Cloud project
- [ ] Enable **Google+ API** / People API as required by OAuth
- [ ] Create **OAuth 2.0 Client ID** (Web application)
- [ ] Authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google` (dev)
  - `https://<production-domain>/api/auth/callback/google` (prod)
- [ ] Copy Client ID and Secret to `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

### 2. Service Account (Google Drive)

- [ ] Create a **Service Account** and download JSON key
- [ ] Enable **Google Drive API** for the project
- [ ] Create a shared Drive folder `FirmFlow_Data` (or use an existing master folder)
- [ ] **Share** `FirmFlow_Data` with the service account email (Editor access)
- [ ] Set `GOOGLE_DRIVE_MASTER_FOLDER_ID` to that folder’s ID
- [ ] Set `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` from the key file

### 3. First admin bootstrap

- [ ] Set `INITIAL_ADMIN_EMAIL` to the partner/admin Workspace email
- [ ] Set `ALLOWED_EMAIL_DOMAIN` to your firm’s domain
- [ ] Deploy or run locally, then sign in at `/login` with that email — the account is created as **Admin**
- [ ] After the first admin exists, other `@domain` users can sign in (default role: **Preparer**)

---

## MVP features / MVP 기능

| Area | Features |
|------|----------|
| **Auth & RBAC** | Google Workspace OAuth, domain restriction, roles: Admin / Approver / Preparer |
| **Clients** | CRUD, auto Google Drive folder per client (`FirmFlow_Data/[name]_[code]`) |
| **Projects** | Per-client projects, Active / Completed status |
| **Timesheet** | Time log entry, responsive grid (mobile cards / desktop matrix), 24h/day validation |
| **Expenses** | Core (project) and Overhead types, receipt upload to Drive |
| **Approvals** | Approver/Admin approve or reject pending time logs |
| **Dashboard** | Monthly hours, labor cost, core/overhead totals, per-project breakdown |
| **Admin** | User role/status management, salary history (`salaryTable`), period locks |
| **Marketing** | Public landing, about, services, contact pages |

---

## Project structure / 프로젝트 구조

```
app/
  (marketing)/     # Public site
  (app)/app/       # Authenticated internal app
  api/             # Route handlers
components/        # UI and app components
lib/               # Auth, DB, permissions, Drive adapter
models/            # Mongoose schemas
__tests__/         # Unit, API, and component tests
docs/              # Product specification (Korean PRD)
```

Full product requirements: [`docs/specification.md`](docs/specification.md)

---

## License

Private — internal use for the accounting firm.
