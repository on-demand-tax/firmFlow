# specification.md Agent-Optimized SSOT 정리 설계

**작성일:** 2026-06-24  
**상태:** Approved  
**목적:** `docs/specification.md`를 AI Agent 맥락 전달용 단일 정본(SSOT)으로 정비

---

## 1. 배경

리뷰(2026-06-24)에서 확인된 Critical 갭:

- `PeriodLock` §3 누락
- §2 RBAC: `"Locked"` status vs `lockedAt`, Approver "담당" vs 전체 접근
- §3.5 Expense 필드 구식 (`currency`, `lockedAt` 등)
- §3.3.9 팬텀 테스트 `ProjectForm.test.tsx`
- embedded TS 블록 ↔ `models/` 드리프트

## 2. 접근 (B안)

- §3 embedded TypeScript 제거 → 필드 테이블 + `models/`·`lib/` 포인터
- §2 RBAC 정정 + **§2.1 API 인덱스** 신규
- **§3.6 PeriodLock** 신규
- 상단 **Agent 가이드 + TOC**
- §5를 실제 `__tests__/` 맵으로 교체
- §3.3~3.4 도메인 본문 유지

## 3. 의도적 제외

- specification 파일 분할 (`spec-api.md` 등)
- §3.3 프로젝트 유형 표 전면 재작성
- 코드 변경

## 4. 완료 기준

- [ ] Agent가 §3.6만으로 PeriodLock·`lockedAt` 이해 가능
- [ ] §2.1에 모든 `app/api` 라우트 수록
- [ ] §3.5 Expense 필드가 `models/Expense.ts`와 일치
- [ ] 팬텀 테스트 참조 제거
