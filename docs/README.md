# FirmFlow 문서

## AI Agent — 읽기 순서

작업(수리·확장·배포) 전에 아래 순서로 참조하세요. **현재 구현의 정본(SSOT)은 `specification.md`입니다.**

| 순서 | 문서 | 용도 |
|------|------|------|
| 1 | [`../README.md`](../README.md) | 실행 방법, 현재 상태 스냅샷, 앱 라우트·역할 치트시트 |
| 2 | [`specification.md`](specification.md) | 스키마(§3), **API 인덱스(§2.1)**, RBAC, PeriodLock(§3.6), 로드맵(§6) |
| 3 | [`deploy-vercel.md`](deploy-vercel.md) | MongoDB Atlas, Google OAuth/Drive, Vercel 배포만 필요할 때 |

## 핵심 코드 위치 (빠른 참조)

| 영역 | 경로 |
|------|------|
| 프로젝트 유형·청구 enum | `lib/project-types.ts` |
| 기장대리·비청구 타임로그 액티비티 | `lib/project-activities.ts` |
| 경비 지출 방법·용도 enum | `lib/expense-payment-methods.ts`, `lib/expense-purposes.ts`, `lib/expense-filing-periods.ts` |
| 비청구 내부 프로젝트 자동 생성 | `lib/non-billable-project.ts` |
| RBAC·권한 | `lib/permissions.ts` |
| 역할별 사이드바 메뉴 | `lib/nav-items.ts` |
| Mongoose 스키마 | `models/` |
| API 라우트 | `app/api/` |
| 내부 앱 페이지 | `app/(app)/app/` |
| **앱 버전·변경 이력 (정보 페이지)** | `data/changelog.json` → `lib/changelog.ts` → `/app/about` |
| 변경 이력 자동 기록 (커밋 hook) | `.githooks/commit-msg`, `scripts/update-changelog.ts`, `lib/changelog-updater.ts` |

## 변경 이력·정보 페이지 (Agent 참고)

사이드바 **정보** (`/app/about`)는 앱 버전·배포일·릴리스 노트를 표시한다. **데이터 정본은 `data/changelog.json`**이며, `lib/changelog.ts`가 이를 import해 `APP_VERSION`(`package.json` version)과 `CHANGELOG`를 노출한다.

### 커밋 시 자동 기록

`npm install` 시 `prepare`가 `git config core.hooksPath .githooks`를 설정한다. 이후 **로컬 `git commit`마다** `.githooks/commit-msg`가 실행되어:

1. 커밋 메시지(첫 줄 + 본문 `-` bullet)를 파싱
2. `data/changelog.json` 갱신
3. **새 날짜(서울 기준)** 첫 커밋이면 `package.json` patch 버전 증가
4. **같은 날** 추가 커밋이면 최신 엔트리 `items`에만 추가 (버전 유지)
5. `data/changelog.json`, `package.json`을 **해당 커밋에 자동 stage**

수동 실행: `npm run changelog:update -- <commit-msg-file>`

### Hook 건너뛰기

| 조건 | 동작 |
|------|------|
| merge 커밋 | 건너뜀 |
| 메시지가 `chore(changelog):`로 시작 | 건너뜀 |
| 메시지에 `[skip changelog]` 포함 | 건너뜀 |

### Changelog 언어 (필수)

`data/changelog.json`의 **`title`과 `items`는 반드시 한국어로만** 작성한다. `/app/about` 정보 페이지에 그대로 노출되며, **영어 문장·영어 bullet은 사용하지 않는다.**

| 구분 | 규칙 |
|------|------|
| **제목 (`title`)** | 한국어 한 줄 요약. `feat:`, `docs:` 등 conventional prefix는 hook이 제거하지만, **prefix 뒤 본문도 한국어**로 쓴다. |
| **항목 (`items`)** | 본문 `-` bullet도 **한국어**. 영어 커밋 메시지를 그대로 두지 않는다. |
| **예시 (좋음)** | `내부 문서 허브 추가 (버전 이력·만료 알림)` |
| **예시 (나쁨)** | `add internal documents hub with versioning and expiry` |

커밋 메시지를 영어로 작성하면 changelog에도 영어가 기록되므로, **사용자에게 보이는 변경은 커밋 전에 한국어로 다시 쓴다.**

### Agent 작업 시 유의

- **사용자에게 보이는 변경**을 ship할 때는 커밋 메시지 제목·본문 bullet을 **한국어로만 명확히** 작성한다 (위 **Changelog 언어** 준수).
- `data/changelog.json`을 **수동 편집하지 말 것** — hook이 정본이다. MVP 초기 항목 등 예외만 직접 수정.
- changelog 전용 커밋이 필요하면 `chore(changelog): …` prefix 사용.
- 내부 리팩터·테스트만일 때는 `[skip changelog]`를 메시지에 넣을 수 있다.
- GitHub 웹 UI 커밋은 hook 미실행 → 로컬 커밋 또는 `npm run changelog:update` 필요.

## `superpowers/` 폴더

`docs/superpowers/specs/`, `plans/`는 **2026-06 MVP 구현 당시 설계·계획 히스토리**입니다.

- **enum·스키마·API는 `specification.md`와 코드를 따르세요.**
- `2026-06-20-project-types-design.md`의 `MonthlyBookkeeping`, `Audit` 등은 **레거시 enum**이며 현재 코드(`BookkeepingAgency`, `ExternalAudit` 등)와 다릅니다.
