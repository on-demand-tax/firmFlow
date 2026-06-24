# FirmFlow Vercel 배포 가이드

로컬 `.env.local` 설정이 끝난 뒤, 프로덕션 배포 순서입니다.

---

## 1. MongoDB Atlas (상세)

FirmFlow는 Mongoose로 Atlas에 연결합니다. **별도 컬렉션/스키마를 Atlas UI에서 만들 필요 없습니다** — 앱이 첫 사용 시 `users`, `clients`, `projects`, `timelogs`, `expenses`, `periodlocks` 등을 자동 생성합니다.

### 1.1 계정 및 Organization

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) 접속 → Google/GitHub 또는 이메일로 가입
2. **Create an organization** (예: `My Firm` 또는 법인명)
3. **Create a project** (예: `FirmFlow`)

### 1.2 클러스터 생성 (Free Tier)

1. **Build a Database** 클릭
2. **M0 FREE** 선택 (Shared, 512MB — FirmFlow MVP에 충분)
3. **Cloud Provider & Region**
  - Provider: **AWS** (또는 GCP, 무료 티어 지원 provider)
  - Region: `**ap-northeast-2` (Seoul)** 또는 `**ap-northeast-1` (Tokyo)** — 한국에서 latency 낮음
4. **Cluster Name**: 기본값(`Cluster0`) 또는 `firmflow-cluster`
5. **Create** → 3~5분 대기 (Status: Available)

> M0는 단일 노드 shared 클러스터입니다. Vercel serverless + 소규모 법인(5~15명) 용도에 적합합니다.

### 1.3 Database Access — DB 사용자

Atlas 좌측 **Security → Database Access → Add New Database User**


| 항목                       | 권장값                                                                        |
| ------------------------ | -------------------------------------------------------------------------- |
| Authentication           | **Password**                                                               |
| Username                 | `firmflow_app` (임의)                                                        |
| Password                 | **Autogenerate Secure Password** → **반드시 복사해 안전한 곳에 저장**                   |
| Database User Privileges | **Read and write to any database** (Built-in Role: `readWriteAnyDatabase`) |


**Create User** 클릭.

> 이 계정은 **앱 전용**입니다. 본인 개인 MongoDB Atlas 로그인 비밀번호와 다릅니다.

### 1.4 Network Access — IP 허용

**Security → Network Access → Add IP Address**


| 용도            | 설정                                           |
| ------------- | -------------------------------------------- |
| **로컬 개발**     | **Add Current IP Address** (집/사무실 IP)        |
| **Vercel 배포** | **Allow Access from Anywhere** → `0.0.0.0/0` |


Vercel은 함수마다 IP가 바뀌므로 `**0.0.0.0/0`이 사실상 필수**입니다.  
M0 + 강한 DB 비밀번호 + 앱 OAuth로 MVP 수준에서는 일반적인 선택입니다. (추후 Atlas **Private Endpoint** 또는 IP allowlist 고급 설정 가능)

**Confirm** 클릭.

### 1.5 Connection String 복사

1. **Database → Connect** (클러스터 카드의 Connect 버튼)
2. **Drivers** 선택
3. Driver: **Node.js**, Version: **5.5 or later** (버전은 크게 상관없음)
4. Connection string 예시:

```
mongodb+srv://firmflow_app:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

1. `<password>`를 **1.3에서 저장한 DB 사용자 비밀번호**로 교체
2. **데이터베이스 이름** 추가 (권장):

```
mongodb+srv://firmflow_app:<password>@cluster0.xxxxx.mongodb.net/firmflow?retryWrites=true&w=majority
```

`/firmflow`는 DB 이름입니다. 없으면 기본 DB `test`에 저장될 수 있어 `**/firmflow` 명시를 권장**합니다.

> 비밀번호에 `@`, `#`, `%` 등 특수문자가 있으면 **URL 인코딩** 필요  
> 예: `@` → `%40`, `#` → `%23`  
> Autogenerate 비밀번호 사용 시 Atlas UI의 **Copy** 버튼이 인코딩된 URI를 제공하기도 합니다.

### 1.6 `.env.local`에 설정

프로젝트 루트 `.env.local`:

```env
MONGODB_URI=mongodb+srv://firmflow_app:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/firmflow?retryWrites=true&w=majority
```

**주의**

- 따옴표 없이 한 줄로
- 값 앞뒤 공백 없음
- Git에 커밋하지 않음 (`.gitignore`에 `.env.local` 포함됨)

### 1.7 연결 확인

```bash
node scripts/check-env.mjs .env.local
# MONGODB_URI → ✓ SET

npm run dev
```

브라우저에서 `/login` → Google 로그인 시도 → Admin 계정이 생성되면 Atlas **Browse Collections**에서 `firmflow` DB → `users` 컬렉션에 문서 1건이 보입니다.

또는 Node로 빠른 테스트:

```bash
node -e "
require('fs').readFileSync('.env.local','utf8').split('\n').forEach(l=>{
  const i=l.indexOf('='); if(i>0 && !l.trim().startsWith('#')) process.env[l.slice(0,i).trim()]=l.slice(i+1).trim();
});
const mongoose=require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(()=>{console.log('OK: MongoDB connected'); return mongoose.disconnect();}).catch(e=>{console.error('FAIL:', e.message); process.exit(1);});
"
```

`OK: MongoDB connected` → Atlas 설정 완료.

### 1.8 Vercel 배포 시

Vercel Dashboard → **Settings → Environment Variables**

- Name: `MONGODB_URI`
- Value: 위와 **동일한 connection string** (로컬과 같은 Atlas 클러스터 사용 가능)
- Environment: **Production**, **Preview** 체크

로컬 `.env.local`과 Vercel **Production**은 같은 URI를 써도 되고, 나중에 `firmflow-prod` / `firmflow-dev` DB로 분리해도 됩니다.

### 1.9 FirmFlow에서 Atlas에 생기는 데이터


| 컬렉션           | 생성 시점        |
| ------------- | ------------ |
| `users`       | 첫 Google 로그인 |
| `clients`     | 고객 등록        |
| `projects`    | 프로젝트 등록      |
| `timelogs`    | 타임시트 입력      |
| `expenses`    | 경비 등록        |
| `periodlocks` | Admin 기간 마감  |


Atlas **Browse Collections**에서 데이터 확인·백업 가능. MVP 단계에서는 Atlas **Automated Backup**이 M0에서 제한적이므로, 중요 데이터는 주기적 export를 Phase 2에서 검토.

### 1.10 자주 하는 실수


| 증상                                 | 원인                 | 해결                                             |
| ---------------------------------- | ------------------ | ---------------------------------------------- |
| `bad auth : Authentication failed` | DB 사용자명/비밀번호 오류    | Database Access에서 사용자 확인; URI의 `<password>` 교체 |
| `IP not whitelisted` / timeout     | Network Access 미설정 | `0.0.0.0/0` 또는 현재 IP 추가                        |
| `Invalid scheme`                   | URI 형식 오류          | `mongodb+srv://`로 시작하는지 확인                     |
| 로그인은 되는데 데이터 없음                    | DB 이름 불일치          | URI에 `/firmflow` 포함 여부 확인                      |
| 특수문자 비밀번호 실패                       | URL 미인코딩           | 비밀번호 재생성 또는 `%40` 등으로 인코딩                      |
| `MONGODB_URI` MISSING              | `.env.local` 빈 값   | `KEY=value` 형식, `#` 주석 아래에 값 입력                |
| `querySrv ECONNREFUSED` (Windows)  | 로컬 DNS SRV 조회 실패 | `.env.local`에 `MONGODB_DNS_SERVERS=8.8.8.8,8.8.4.4,1.1.1.1` 추가 |


---

## 2. Google Cloud — OAuth (로그인, 상세)

FirmFlow는 **NextAuth.js + Google OAuth**로 로그인합니다. Step 2에서는 **로그인에 필요한 6개 변수**만 설정합니다. (Drive Service Account는 Step 3)


| 변수                     | Step |
| ---------------------- | ---- |
| `NEXTAUTH_SECRET`      | 2    |
| `NEXTAUTH_URL`         | 2    |
| `GOOGLE_CLIENT_ID`     | 2    |
| `GOOGLE_CLIENT_SECRET` | 2    |
| `ALLOWED_EMAIL_DOMAIN` | 2    |
| `INITIAL_ADMIN_EMAIL`  | 2    |


### 2.0 회사 도메인 + GCP Parent (Organization / No organization)

회사 `@도메인` Workspace로 FirmFlow **전체 기능**을 쓰는 데 Parent 종류는 **거의 영향 없습니다**.  
중요한 것은 **Console에 회사 이메일로 로그인**하고, OAuth·`.env` 도메인을 맞추는 것입니다.


| Parent 화면                                | 의미                               | 어떻게 하면 되나                                 |
| ---------------------------------------- | -------------------------------- | ----------------------------------------- |
| **Organization** (`yourfirm.com`)만 선택 가능 | Workspace가 GCP Organization과 연결됨 | **Organization 선택** → Create (권장, 오히려 유리) |
| **No organization**만 보이거나 선택 불가          | 조직 미연결 계정                        | Parent **비우거나 기본값** 그대로 → Create          |
| Parent 필드 자체가 없음                         | 신규 UI                            | Project name만 입력 → Create                 |
| **Browse**에 Folder만 있음                   | 조직 아래 폴더                         | Organization 루트 또는 아무 Folder → Create     |


> **「No organization」이 선택 안 됨」** → 정상인 경우가 많습니다.  
> Organization이 보이면 **그걸 선택**하세요. FirmFlow 기능은 동일하고, 나중에 OAuth **Internal**도 쓸 수 있습니다.


| 구분                        | 설정                                    |
| ------------------------- | ------------------------------------- |
| Console 로그인               | **회사 Workspace** (`you@yourfirm.com`) |
| OAuth (Organization 없을 때) | **External** + Test users / Publish   |
| OAuth (Organization 있을 때) | **Internal** 가능 (권장) 또는 External      |
| 앱 도메인 제한                  | `ALLOWED_EMAIL_DOMAIN=yourfirm.com`   |


**단계별 영향 (기능 차단 없이 가는 순서)**


| 단계                | OAuth 상태                        | 누가 로그인 가능?                         | FirmFlow 기능          |
| ----------------- | ------------------------------- | ---------------------------------- | -------------------- |
| **로컬 개발**         | External + **Testing**          | Test users에 등록된 `@yourfirm.com`    | 전체 (Drive는 Step 3 후) |
| **본인만 운영**        | Testing + 본인 이메일 Test user      | 본인 Admin                           | 전체                   |
| **직원 합류 (2~15명)** | **Publish app** → Production    | `@yourfirm.com` 전원 (Test user 불필요) | 전체                   |
| **(선택) 나중에**      | Workspace ↔ GCP Organization 연결 | Internal OAuth로 전환 가능              | 동일                   |


> **직원이 로그인 못 하는 가장 흔한 이유:** External이 **Testing**인데 Test users에 없음 → **Publish app** 하면 `@yourfirm.com` 직원 전원 사용 가능 (FirmFlow `ALLOWED_EMAIL_DOMAIN`이 추가로 막음).

**Publish app (직원 합류 전 1회)**  
OAuth consent screen → **Publish App** → 확인.  
이메일/프로필 scope만 사용하므로 대부분 **추가 Google 검수 없이** Production 전환됩니다.

### 2.1 Google Cloud 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) — **회사 이메일**(`@yourfirm.com`)로 로그인
2. 상단 프로젝트 선택 → **New Project**
3. **Parent resource / Location** (화면마다 다름):
  - **Organization**이 목록에 있으면 → **그 Organization 선택** (No organization 고르지 않아도 됨)
  - Parent가 **비활성·비어 있음** → 그대로 **Create**
  - **「No organization」이 회색/없음** → 무시하고 Organization 또는 기본값으로 Create
4. Project name: `FirmFlow` → **Create**
5. 생성된 프로젝트가 선택되어 있는지 확인

**Parent를 꼭 No organization으로 둘 필요는 없습니다.**

### 2.2 OAuth consent screen (동의 화면)

**APIs & Services → OAuth consent screen**

#### A) Organization 없음 + 회사 도메인 (지금 이 경로)


| 항목                 | 선택                 |
| ------------------ | ------------------ |
| User Type          | **External**       |
| App name           | `FirmFlow`         |
| User support email | `you@yourfirm.com` |
| Developer contact  | `you@yourfirm.com` |


**Scopes:** `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid` (기본) — **Save**

**Test users (로컬·1인 개발 시):**

- **Add users** → `you@yourfirm.com` (Admin이 될 이메일)
- 추가 직원 테스트 시 해당 `@yourfirm.com` 이메일도 임시 추가 **또는** 아래 Publish

**직원 합류 전:** OAuth consent screen 상단 → **Publish App** → Production (Test user 한도 해제)

#### B) Organization이 보이는 경우 (나중에 선택 가능)


| 항목        | 선택                                      |
| --------- | --------------------------------------- |
| User Type | **Internal** — 조직(`@yourfirm.com`) 사용자만 |


- Test users 단계 생략
- Workspace Admin + GCP Organization 연결 필요

#### C) 개인 Gmail만 쓰는 경우 (비권장)


| 항목        | 선택                        |
| --------- | ------------------------- |
| User Type | **External** + Test users |


`ALLOWED_EMAIL_DOMAIN=gmail.com` — 회사 운영에는 부적합

### 2.3 OAuth Client ID 생성

**APIs & Services → Credentials → Create Credentials → OAuth client ID**


| 항목               | 값                   |
| ---------------- | ------------------- |
| Application type | **Web application** |
| Name             | `FirmFlow Web`      |


**Authorized JavaScript origins** (로컬만 먼저):

```
http://localhost:3000
```

**Authorized redirect URIs** — **정확히** 아래 형식 (끝에 `/` 없음):

```
http://localhost:3000/api/auth/callback/google
```

> Vercel 배포 후 프로덕션 도메인이 정해지면 **같은 Client ID**에 아래를 **추가**:
>
> - Origin: `https://your-project.vercel.app`
> - Redirect: `https://your-project.vercel.app/api/auth/callback/google`

**Create** → **Client ID**와 **Client secret** 표시 → 복사해 저장

### 2.4 NEXTAUTH_SECRET 생성

터미널 (Git Bash / PowerShell):

```bash
openssl rand -base64 32
```

또는 Node:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

출력된 문자열을 그대로 `NEXTAUTH_SECRET`에 사용 (로컬·프로덕션 **각각 다른 값** 권장)

### 2.5 `.env.local` — Step 2 항목

MongoDB URI 아래에 추가/채우기:

```env
# NextAuth
NEXTAUTH_SECRET=여기에_생성한_랜덤_문자열
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx

# FirmFlow 도메인 제한 — 회사 도메인만 (@ 없이)
ALLOWED_EMAIL_DOMAIN=yourfirm.com
INITIAL_ADMIN_EMAIL=you@yourfirm.com
```


| 변수                     | 설명                              | 예시                                         |
| ---------------------- | ------------------------------- | ------------------------------------------ |
| `NEXTAUTH_URL`         | 앱 공개 URL                        | 로컬: `http://localhost:3000` (**끝 `/` 없음**) |
| `ALLOWED_EMAIL_DOMAIN` | 허용 이메일 도메인                      | `yourfirm.com` (`@` **없이**)                |
| `INITIAL_ADMIN_EMAIL`  | **첫 Admin**이 될 본인 Workspace 이메일 | `partner@yourfirm.com`                     |


**중요**

- `INITIAL_ADMIN_EMAIL`은 **실제로 Google 로그인할 이메일**과 **완전히 동일**해야 함 (대소문자 무시)
- Admin이 한 명도 없을 때, 이 이메일만 첫 가입 가능
- 다른 이메일은 Admin 생성 전까지 로그인 **거부**

### 2.6 로컬 로그인 테스트

```bash
node scripts/check-env.mjs .env.local
# Step 2 변수 6개 + MONGODB_URI ✓ SET 확인

npm run dev
```

1. 브라우저: [http://localhost:3000/login](http://localhost:3000/login)
2. **Google로 로그인** 클릭
3. `INITIAL_ADMIN_EMAIL` 계정 선택
4. 성공 시 `**/app`** 대시보드로 이동
5. MongoDB Atlas → `firmflow` → `**users**` 컬렉션에 Admin 문서 1건 생성 확인

### 2.7 FirmFlow 로그인 동작 요약

```
Google OAuth 성공
  → 이메일이 @ALLOWED_EMAIL_DOMAIN 인지 확인
  → DB에 User 없으면:
       Admin 0명 + email === INITIAL_ADMIN_EMAIL → Admin 생성
       Admin 0명 + 다른 email → 거부
       Admin 있음 → Preparer 생성
  → /app 세션 생성
```

### 2.8 자주 하는 실수


| 증상                      | 원인                               | 해결                                                                          |
| ----------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| `redirect_uri_mismatch` | Redirect URI 불일치                 | Google Console에 `http://localhost:3000/api/auth/callback/google` **정확히** 등록 |
| `access_denied`         | External + Test user 미등록         | OAuth consent → Test users에 이메일 추가                                          |
| 로그인 후 바로 실패             | `ALLOWED_EMAIL_DOMAIN` 불일치       | `@` 없이 도메인만; Gmail로 테스트 시 domain을 `gmail.com`으로 (비권장)                       |
| Admin 없음 403            | `INITIAL_ADMIN_EMAIL` ≠ 로그인 이메일  | `.env.local` 이메일과 Google 계정 일치                                              |
| `Configuration` error   | `NEXTAUTH_SECRET` / Client ID 누락 | `check-env` 스크립트로 확인                                                        |
| 로그인 후 DB 없음             | dev 서버 미재시작                      | `.env.local` 수정 후 `npm run dev` 재시작                                         |


### 2.9 Step 2 완료 체크리스트

- [ ] Google Cloud 프로젝트 생성
- [ ] OAuth consent screen (Internal 또는 External + Test users)
- [ ] OAuth Web Client ID + Secret 발급
- [ ] Redirect URI `http://localhost:3000/api/auth/callback/google` 등록
- [ ] `.env.local` 6개 변수 + `MONGODB_URI` 설정
- [ ] `/login` → `/app` 로그인 성공
- [ ] Atlas `firmflow.users`에 Admin 레코드 확인

Step 3(Drive)는 **고객 등록·영수증 업로드** 전까지 미설정해도 로그인·타임시트 테스트는 가능합니다.

---

## 3. Google Cloud — Service Account (Drive, 상세)

FirmFlow **FirmFlow** GCP 프로젝트(Step 2와 동일)에서 진행합니다.  
OAuth(로그인)와 **별도** — Service Account는 **파일·폴더 API** 전용입니다.

### 3.0 Organization Policy — 키 생성 차단 시

에러 예:

> *Service account key creation is disabled … iam.disableServiceAccountKeyCreation*

Organization **Secure by Default** 정책으로 SA JSON 키 생성이 막힌 상태입니다.

#### 레거시 + Managed 제약 (둘 다 확인)

Google은 다음 **두 제약을 동시에** 평가합니다. 하나만 풀면 **여전히 차단**될 수 있습니다.


| 제약 ID                                          | 종류                   |
| ---------------------------------------------- | -------------------- |
| `iam.disableServiceAccountKeyCreation`         | **Legacy** (구형)      |
| `iam.managed.disableServiceAccountKeyCreation` | **Managed** (신형, 권장) |


콘솔 메시지 예:

> *The legacy constraint is active. We recommend migrating to iam.managed.disableServiceAccountKeyCreation … Both constraints are evaluated concurrently.*

**→ FirmFlow 프로젝트에서 위 두 정책 모두 Override / Enforce Off 필요**

#### A) 프로젝트 단위 정책 예외 (권장)

**권한:** `roles/orgpolicy.policyAdmin` (Organization Policy Administrator)  
Workspace Super Admin만으로는 **부족할 수 있음** → Organization IAM에서 역할 부여 또는 Admin에게 요청.

1. GCP Console → **FirmFlow** 프로젝트 선택
2. **IAM & Admin → Organization Policies**
3. 아래 **각각** 검색 후 동일하게 처리:
  **(1)** `Disable service account key creation`  
   → 제약: `iam.disableServiceAccountKeyCreation`
   **(2)** `Disable service account key creation` (managed)  
   → 제약: `iam.managed.disableServiceAccountKeyCreation`
4. 각 항목 → **Manage policy** → **Override parent's policy**
5. **Enforce: Off** / **Not enforced** (UI 문구는 버전마다 다름)
6. **Save** → 1~5분 후 SA **Keys → Add key → JSON** 재시도

**gcloud (프로젝트 ID 교체):**

```bash
gcloud resource-manager org-policies disable-enforce iam.disableServiceAccountKeyCreation --project=YOUR_PROJECT_ID
gcloud resource-manager org-policies disable-enforce iam.managed.disableServiceAccountKeyCreation --project=YOUR_PROJECT_ID
```

#### IAM 권한이 없을 때

Organization **IAM**에서 `Organization Policy Administrator` 부여를 요청하거나,  
Owner에게 **FirmFlow 프로젝트만** 위 두 제약 예외 처리를 요청합니다.

#### B) SA 키 없이 Drive (정책 변경 불가 시)

현재 FirmFlow는 **SA JSON 키** 방식만 구현. 키를 절대 쓸 수 없으면 **OAuth 사용자 Drive**로 코드 변경 필요 (별도 작업).

### 3.1 Drive API 활성화

1. GCP Console → **FirmFlow** 프로젝트 선택
2. **APIs & Services → Library**
3. **Google Drive API** 검색 → **Enable**

### 3.2 Service Account 생성

1. **IAM & Admin → Service Accounts**
2. **+ Create Service Account**
3. Name: `firmflow-drive` (임의) → **Create and Continue**
4. Role: **Basic → Editor** (또는 Role 없이 Skip 가능 — Drive는 **폴더 공유**로 동작)
5. **Done**

### 3.3 JSON 키 다운로드

1. 방금 만든 Service Account 클릭
2. **Keys** 탭 → **Add key → Create new key → JSON** → **Create**
3. `firmflow-xxxxx.json` 다운로드 → **안전한 곳에 보관** (Git 커밋 금지)

JSON 예시 구조:

```json
{
  "client_email": "firmflow-drive@firmflow-xxxxx.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

### 3.3.1 영수증 업로드 — 도메인 전체 위임 (필수)

폴더 생성은 Service Account만으로 가능하지만, **PDF/이미지 파일 업로드**는 SA에 저장 할당량이 없어 **관리자 계정 대신 업로드(위임)** 가 필요합니다.

1. **GCP** → Service Account (`firmflow-drive@...`) → **Details**
2. **Advanced settings** → **Enable Google Workspace Domain-wide Delegation** 체크 → 저장
3. **OAuth 2 Client ID** (숫자) 복사
4. **Google Admin** ([admin.google.com](https://admin.google.com)) → **Security** → **Access and data control** → **API controls** → **Manage Domain Wide Delegation**
5. **Add new** → Client ID 붙여넣기, OAuth Scopes:
  ```
   https://www.googleapis.com/auth/drive
  ```
6. **Authorize**

앱은 `INITIAL_ADMIN_EMAIL`(예: `service@on-demand-tax.com`) 계정으로 위임 업로드합니다. 별도 지정이 필요하면 `.env.local`에 추가:

```env
GOOGLE_DRIVE_FILE_OWNER_EMAIL=service@on-demand-tax.com
```

로컬 검증:

```bash
node scripts/test-drive-upload.mjs .env.local
```

### 3.4 Google Drive — Master Folder

1. **회사 Google Drive** (Workspace `service@on-demand-tax.com` 등)에서 로그인
2. 새 폴더 생성: `**FirmFlow_Data`**
3. 폴더 우클릭 → **공유**
4. **Service Account 이메일** 추가 (`...@...iam.gserviceaccount.com`)
5. 권한: **편집자 (Editor)**
6. **공유** 완료

> SA는 “사용자”가 아니라 **로봇 계정**입니다. 폴더를 SA와 공유하지 않으면 API로 접근 불가.

### 3.5 Folder ID 복사

브라우저에서 `FirmFlow_Data` 폴더 열기:

```
https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz
                                      └──────── 이 부분이 FOLDER_ID ────────┘
```

### 3.6 `.env.local` 설정

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=firmflow-drive@firmflow-xxxxx.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_MASTER_FOLDER_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
```

**Private key 넣는 방법 (Windows `.env.local`)**


| 방법                     | 설명                                                        |
| ---------------------- | --------------------------------------------------------- |
| **A) 따옴표 + `\n`** (권장) | JSON의 `private_key` 한 줄을 복사해 **큰따옴표**로 감싸기. 줄바꿈은 `\n` 그대로 |
| **B) 한 줄 이스케이프**       | PEM 전체를 한 줄로, 실제 줄바꿈을 `\n` 문자로 치환                         |


앱 코드가 `.replace(/\\n/g, '\n')` 처리하므로 **방법 A**가 가장 안전합니다.

**주의**

- `GOOGLE_DRIVE_MASTER_FOLDER_ID`는 `**FirmFlow_Data` 폴더 ID** (상위 My Drive 루트 ID 아님)
- 키 파일을 Git에 올리지 말 것

### 3.7 로컬 테스트

```bash
node scripts/check-env.mjs .env.local
# Drive 3개 변수 ✓ SET

npm run dev   # 재시작
```

1. `/app/clients` → **고객 등록** (clientCode 예: `TEST01`)
2. Google Drive → `FirmFlow_Data` 안에 `**고객명_TEST01`** 형태 폴더 생성 확인
3. `/app/expenses` → Core 경비 + **영수증 업로드** (PDF/JPG/PNG, 10MB 이하)
4. 해당 고객 폴더 또는 `Overhead_Receipts`에 파일 생성 확인

### 3.8 FirmFlow Drive 동작


| 동작              | Drive 경로                                       |
| --------------- | ---------------------------------------------- |
| 고객 생성           | `FirmFlow_Data/{고객명}_{clientCode}/`            |
| Core 경비 영수증     | 해당 **고객 폴더**                                   |
| Overhead 경비 영수증 | `FirmFlow_Data/Overhead_Receipts/` (없으면 자동 생성) |


### 3.9 자주 하는 실수


| 증상                            | 원인                         | 해결                                    |
| ----------------------------- | -------------------------- | ------------------------------------- |
| 고객 생성 500                     | Drive API 미활성화             | Library에서 Drive API Enable            |
| `invalid_grant` / auth error  | private_key 형식 오류          | 따옴표 + `\n` 형식 재확인                     |
| `File not found` / 404        | Master folder 미공유          | SA 이메일에 **편집자** 공유                    |
| 폴더가 내 Drive에 안 보임             | SA 소유로 생성됨                 | **FirmFlow_Data**를 공유했으면 그 안에 보임      |
| 영수증만 실패                       | Core인데 고객 폴더 ID 없음         | 고객을 Drive 연동 후 다시 생성                  |
| 영수증 500 / storage quota       | SA 파일 업로드 한도               | **3.3.1 도메인 전체 위임** 설정                |
| `unauthorized_client` / 위임 오류 | Domain-wide delegation 미설정 | Admin에서 SA Client ID + Drive scope 승인 |


### 3.10 Step 3 체크리스트

- [x] Drive API Enabled
- [x] **도메인 전체 위임** (영수증 업로드, 3.3.1)
- [x] `FirmFlow_Data` 폴더 + SA **편집자** 공유
- [x] `.env.local` 3개 변수
- [x] `npm run dev` 재시작
- [x] 고객 등록 → Drive 폴더 확인

---

## 4. Vercel 환경 변수 (전체)

Vercel Dashboard → Project → **Settings → Environment Variables**


| 변수                                   | Production 값                     | 비고                   |
| ------------------------------------ | -------------------------------- | -------------------- |
| `MONGODB_URI`                        | Atlas connection string          |                      |
| `NEXTAUTH_SECRET`                    | `openssl rand -base64 32`        | 로컬과 **다른** 값 권장      |
| `NEXTAUTH_URL`                       | `https://your-domain.vercel.app` | **끝에 `/` 없음**        |
| `GOOGLE_CLIENT_ID`                   | OAuth Client ID                  |                      |
| `GOOGLE_CLIENT_SECRET`               | OAuth Secret                     |                      |
| `ALLOWED_EMAIL_DOMAIN`               | `yourfirm.com`                   | `@` 없이               |
| `INITIAL_ADMIN_EMAIL`                | 파트너 이메일                          | 첫 Admin              |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`       | SA email                         |                      |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | PEM private key                  | Vercel에 여러 줄 붙여넣기 가능 |
| `GOOGLE_DRIVE_MASTER_FOLDER_ID`      | Drive folder ID                  |                      |


모든 변수에 **Production** (필요 시 Preview/Development) 체크.

로컬 검증:

```bash
node scripts/check-env.mjs .env.local
```

---

## 5. GitHub + Vercel 연결

```bash
# GitHub에 새 repo 생성 후 (이미 remote가 있으면 생략)
git remote add origin https://github.com/<user>/firmflow.git
git push -u origin HEAD
```

Vercel → **Add New Project** → GitHub repo import → Deploy

또는 CLI:

```bash
npx vercel login
npx vercel link
npx vercel env pull .env.vercel.local   # optional
npx vercel --prod
```

---

## 6. 배포 후 확인

- [ ] `https://<domain>/` — Marketing 홈
- [ ] `https://<domain>/login` — Google 로그인
- [ ] `INITIAL_ADMIN_EMAIL` 계정으로 로그인 → `/app` 대시보드
- [ ] 고객 생성 → Drive에 폴더 생성 확인
- [ ] 타임시트 입력 → 승인 → 대시보드 집계

---

## 7. 커스텀 도메인 (선택)

Squarespace DNS:

1. Vercel → Domains → 도메인 추가
2. Squarespace DNS에 Vercel이 안내하는 **A/CNAME** 레코드 추가
3. `NEXTAUTH_URL`을 `https://www.yourfirm.com` 등으로 변경
4. Google OAuth redirect URI에 프로덕션 도메인 추가

---

## 문제 해결


| 증상                          | 원인          | 해결                               |
| --------------------------- | ----------- | -------------------------------- |
| 로그인 후 403                   | 도메인 불일치     | `ALLOWED_EMAIL_DOMAIN` 확인        |
| Admin 없음 403                | Admin 미생성   | `INITIAL_ADMIN_EMAIL`로 첫 로그인     |
| MongoDB timeout             | Atlas IP 차단 | Network Access `0.0.0.0/0`       |
| Drive 500                   | SA 미공유      | `FirmFlow_Data` 편집자 공유           |
| OAuth redirect_uri_mismatch | URI 미등록     | Google Console에 정확한 callback URL |


