# FirmFlow 문서 정리 설계 (AI Agent 맥락 전달)

**작성일:** 2026-06-24  
**상태:** Approved  
**목적:** 수리·확장 시 AI Agent가 `@docs` / `@README`만으로 정확한 맥락을 잡도록 문서 계층 정리

---

## 1. 배경

- `specification.md` §3.3~3.4는 현재 코드와 대체로 일치
- `docs/superpowers/specs/2026-06-20-project-types-design.md`는 **구 enum** (`MonthlyBookkeeping` 등) — Agent 혼란 유발
- `README.md`는 MVP 초기 수준; 프로젝트 유형·역할별 메뉴·SSOT 링크 부재
- `specification.md` §6: 테스트 수 178 → 실제 202, 날짜·브랜치 구식

## 2. 목표

| 우선순위 | 내용 |
|----------|------|
| 1 | **SSOT 명확화** — 현재 구현 기준은 `specification.md` |
| 2 | **구 문서 격리** — superseded 배너로 잘못된 enum 참조 방지 |
| 3 | **Agent 진입 경로** — `docs/README.md` + README 상단 지도 |
| 4 | **상태 스냅샷** — §6에 코드 위치·완료/미완료 |

## 3. 문서 계층 (정본)

```
README.md              → 진입·실행·현재 상태·문서 링크
docs/README.md         → Agent용 읽기 순서
docs/specification.md  → SSOT (스키마, API, RBAC, 로드맵 §6)
docs/deploy-vercel.md  → 배포·Google 설정 상세
docs/superpowers/      → 설계 히스토리 (참고용, enum은 신뢰하지 않음)
```

## 4. 변경 범위

### 4.1 `README.md`

- **현재 상태** 블록: MVP 완료, 202 tests, Phase 2 미구현, 핵심 코드 경로
- **문서 링크** → `docs/README.md`, `specification.md`, `deploy-vercel.md`
- **환경 변수** `MONGODB_DNS_SERVERS` 추가
- **앱 치트시트**: `/app` 라우트, 역할별 메뉴 (`lib/nav-items.ts`)
- **MVP 기능표** 확장: 프로젝트 유형, 액티비티 타임로그, 기간 마감
- **배포** 섹션 축소 → `deploy-vercel.md` 위임
- Google 체크리스트 축소 (상세는 deploy-vercel)

### 4.2 `docs/README.md` (신규)

- Agent 읽기 순서 3단계
- superpowers 폴더 경고

### 4.3 `docs/specification.md` §6

- 날짜 `2026-06-24`, tests `202`
- 브랜치명 제거
- Phase 4~6에 `lib/project-activities.ts`, `lib/timesheet-week.ts` 코드 힌트
- 검증 명령 테스트 수 수정

### 4.4 Superseded 배너

- `2026-06-20-project-types-design.md` — §3.3·`lib/project-types.ts`가 정본
- `2026-06-20-firmflow-design.md` — MVP 히스토리; 현재 상태는 §6

### 4.5 `docs/deploy-vercel.md`

- §5 Git: `feat/mvp-implementation` merge 예시 → 일반 push 흐름
- §1.10: `querySrv ECONNREFUSED` → `MONGODB_DNS_SERVERS`

## 5. 의도적 제외

- `specification.md` §1~§5 본문 재작성
- superpowers `plans/` 이동·수정
- AGENTS.md / Cursor rules 추가
- WeekdayHours UI 상세 명세 (코드·테스트로 충분)

## 6. 완료 기준

- [ ] Agent가 `@docs` 시 `docs/README.md`에서 SSOT 확인 가능
- [ ] 구 project-types 설계를 따라 구 enum으로 재구현하지 않음
- [ ] `npm test` 결과(202)와 §6 일치
