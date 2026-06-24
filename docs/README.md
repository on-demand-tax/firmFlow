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
| 비청구 내부 프로젝트 자동 생성 | `lib/non-billable-project.ts` |
| RBAC·권한 | `lib/permissions.ts` |
| 역할별 사이드바 메뉴 | `lib/nav-items.ts` |
| Mongoose 스키마 | `models/` |
| API 라우트 | `app/api/` |
| 내부 앱 페이지 | `app/(app)/app/` |

## `superpowers/` 폴더

`docs/superpowers/specs/`, `plans/`는 **2026-06 MVP 구현 당시 설계·계획 히스토리**입니다.

- **enum·스키마·API는 `specification.md`와 코드를 따르세요.**
- `2026-06-20-project-types-design.md`의 `MonthlyBookkeeping`, `Audit` 등은 **레거시 enum**이며 현재 코드(`BookkeepingAgency`, `ExternalAudit` 등)와 다릅니다.
