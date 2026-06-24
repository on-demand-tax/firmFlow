# Project Types 확장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `Project` with 9 `projectType` values, billing metadata, type registry validation, and dynamic `/app/projects` UI — metadata + tracking only (no auto-billing).

**Architecture:** Single `Project` collection + `lib/project-types.ts` as the master registry for defaults, required fields, labels, and validation. APIs derive `billingModel` from type unless Admin/Approver overrides. TimeLog/Expense/Dashboard unchanged for MVP.

**Tech Stack:** Next.js App Router, TypeScript, Mongoose, Jest, mongodb-memory-server, existing Shadcn UI patterns

**Spec:** `docs/superpowers/specs/2026-06-20-project-types-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/project-types.ts` | Create | Registry, labels, `deriveBillingDefaults`, `validateProjectPayload`, `buildProjectNameTemplate` |
| `__tests__/unit/lib/project-types.test.ts` | Create | Registry + validation unit tests |
| `models/Project.ts` | Modify | Extended schema per spec §3.4 |
| `__tests__/unit/models/Project.test.ts` | Modify | Defaults `General`/`Hourly`/`KRW`, enum rejection |
| `app/api/project-types/route.ts` | Create | GET master JSON |
| `__tests__/api/project-types.test.ts` | Create | API smoke + shape |
| `app/api/projects/route.ts` | Modify | Extended serialize, POST validation, duplicate warning |
| `app/api/projects/[id]/route.ts` | Modify | Extended serialize, PATCH validation, billingModel RBAC |
| `app/api/projects/options/route.ts` | Modify | Add `projectType`, `projectTypeLabel` |
| `__tests__/api/projects.test.ts` | Modify | Type-specific POST/PATCH cases |
| `app/(app)/app/projects/page.tsx` | Modify | Dynamic form, table columns, filters |
| `lib/currency.ts` | Reuse | `formatMoney` for contract display (no change unless type alias needed) |

---

## Task 1: Project type registry

**Files:**
- Create: `lib/project-types.ts`
- Test: `__tests__/unit/lib/project-types.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/unit/lib/project-types.test.ts
import {
  deriveBillingDefaults,
  validateProjectPayload,
  getProjectTypeLabel,
  PROJECT_TYPES,
} from '@/lib/project-types';

describe('deriveBillingDefaults', () => {
  it('returns Retainer + Monthly for MonthlyBookkeeping', () => {
    expect(deriveBillingDefaults('MonthlyBookkeeping')).toEqual({
      billingModel: 'Retainer',
      billingCycle: 'Monthly',
    });
  });

  it('returns BasePlusSuccess for TaxAmendment', () => {
    expect(deriveBillingDefaults('TaxAmendment')).toEqual({
      billingModel: 'BasePlusSuccess',
    });
  });
});

describe('validateProjectPayload', () => {
  it('rejects TaxAmendment without baseFeeAmount', () => {
    const result = validateProjectPayload(
      {
        clientId: 'x',
        projectName: '경정',
        projectType: 'TaxAmendment',
        currency: 'KRW',
        successFeeRate: 20,
      },
      { isPatch: false, userRole: 'Approver' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('기본금');
  });

  it('rejects billingModel override from Preparer', () => {
    const result = validateProjectPayload(
      {
        clientId: 'x',
        projectName: '기장',
        projectType: 'MonthlyBookkeeping',
        billingModel: 'Hourly',
        contractAmount: 100000,
        currency: 'KRW',
        billingAnchorDay: 15,
      },
      { isPatch: false, userRole: 'Preparer' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });
});

describe('getProjectTypeLabel', () => {
  it('returns Korean label', () => {
    expect(getProjectTypeLabel('Audit')).toBe('회계감사');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/unit/lib/project-types.test.ts -v`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement `lib/project-types.ts`**

Export types: `ProjectType`, `BillingModel`, `BillingCycle`, `FilingSubtype`, `EngagementSubtype`.

Implement:
- `PROJECT_TYPE_REGISTRY` with `label`, `defaultBillingModel`, `defaultBillingCycle?`, `requiredFields`, `lifespan`, `nameTemplate(ctx)`
- `deriveBillingDefaults(projectType)`
- `validateProjectPayload(body, { isPatch, userRole, existing? })` → `{ ok: true, data } | { ok: false, error, status }`
- `getProjectTypeLabel`, `getBillingModelLabel`
- `canChangeBillingModel(role)` → Admin | Approver
- `checkDuplicateWarning(clientId, projectType)` helper signature (DB call stays in route)

- [ ] **Step 4: Run tests**

Run: `npm test -- __tests__/unit/lib/project-types.test.ts -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/project-types.ts __tests__/unit/lib/project-types.test.ts
git commit -m "feat: add project type registry and validation"
```

---

## Task 2: Extend Project model

**Files:**
- Modify: `models/Project.ts`
- Modify: `__tests__/unit/models/Project.test.ts`

- [ ] **Step 1: Write failing test for defaults**

```typescript
it('defaults projectType General, billingModel Hourly, currency KRW', async () => {
  const project = await ProjectModel.create({ clientId, projectName: 'Legacy' });
  expect(project.projectType).toBe('General');
  expect(project.billingModel).toBe('Hourly');
  expect(project.currency).toBe('KRW');
});

it('stores TaxAmendment fields', async () => {
  const project = await ProjectModel.create({
    clientId,
    projectName: '경정 2024',
    projectType: 'TaxAmendment',
    billingModel: 'BasePlusSuccess',
    currency: 'KRW',
    baseFeeAmount: 500000,
    successFeeRate: 15,
  });
  expect(project.successFeeRate).toBe(15);
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -- __tests__/unit/models/Project.test.ts -v`

- [ ] **Step 3: Update `models/Project.ts`**

Copy enum + field definitions from `docs/specification.md` §3.3.8. Add index on `projectType` and compound `{ clientId: 1, projectType: 1, status: 1 }`.

- [ ] **Step 4: Run tests + sync indexes in API test setup**

Run: `npm test -- __tests__/unit/models/Project.test.ts -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add models/Project.ts __tests__/unit/models/Project.test.ts
git commit -m "feat: extend Project schema with type and billing metadata"
```

---

## Task 3: GET /api/project-types

**Files:**
- Create: `app/api/project-types/route.ts`
- Create: `__tests__/api/project-types.test.ts`

- [ ] **Step 1: Write failing API test**

```typescript
describe('GET /api/project-types', () => {
  it('returns registry for Preparer', async () => {
    mockSession('Preparer');
    const res = await getProjectTypes(makeRequest('GET', 'http://localhost/api/project-types'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.types).toHaveLength(9);
    expect(data.types.find((t: { id: string }) => t.id === 'MonthlyBookkeeping').label).toBe('기장대리');
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement route**

`requireRole('Preparer')`, return `{ types: [...], billingModels: [...] }` mapped from registry (no DB).

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

---

## Task 4: Extend POST/PATCH /api/projects

**Files:**
- Modify: `app/api/projects/route.ts`
- Modify: `app/api/projects/[id]/route.ts`
- Modify: `__tests__/api/projects.test.ts`

- [ ] **Step 1: Add failing tests**

Cases to add:
1. POST `MonthlyBookkeeping` with required fields → 201, `billingModel: 'Retainer'`, `billingCycle: 'Monthly'`
2. POST `TaxAmendment` missing `baseFeeAmount` → 400
3. POST `MonthlyBookkeeping` duplicate Active same client → 201 + `warning` in body
4. PATCH `billingModel` as Approver → 200
5. GET list includes `projectTypeLabel`

- [ ] **Step 2: Run — new tests FAIL**

Run: `npm test -- __tests__/api/projects.test.ts -v`

- [ ] **Step 3: Implement**

- Shared `serializeProject()` including all new fields + labels
- POST: `validateProjectPayload` → `deriveBillingDefaults` if needed → `ProjectModel.create`
- After create: if `lifespan === 'long-lived'`, count duplicates → attach `warning`
- PATCH: merge body, re-validate; block `billingModel` change for non-Admin/Approver via `canChangeBillingModel`
- Preserve existing DELETE 409 behavior for linked TimeLogs/Expenses

- [ ] **Step 4: Run full projects API tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add app/api/projects/ __tests__/api/projects.test.ts
git commit -m "feat: project API type validation and extended serialization"
```

---

## Task 5: Extend GET /api/projects/options

**Files:**
- Modify: `app/api/projects/options/route.ts`
- Modify: `__tests__/api/projects.test.ts` (options section)

- [ ] **Step 1: Failing test**

```typescript
it('includes projectTypeLabel in options', async () => {
  mockSession('Preparer');
  await ProjectModel.create({
    clientId,
    projectName: '기장',
    projectType: 'MonthlyBookkeeping',
    billingModel: 'Retainer',
    currency: 'KRW',
    contractAmount: 100000,
    billingAnchorDay: 1,
  });
  const res = await getProjectOptions(makeRequest('GET', 'http://localhost/api/projects/options'));
  const data = await res.json();
  expect(data[0].projectTypeLabel).toBe('기장대리');
  expect(data[0].label).toContain('기장');
});
```

- [ ] **Step 2–4: Implement label `{projectName} ({projectTypeLabel})`, run PASS**

- [ ] **Step 5: Commit**

---

## Task 6: Dynamic projects UI

**Files:**
- Modify: `app/(app)/app/projects/page.tsx`

- [ ] **Step 1: Load `/api/project-types` on mount** alongside clients/projects

- [ ] **Step 2: Form state**

```typescript
const emptyForm = {
  clientId: '',
  projectType: 'MonthlyBookkeeping' as ProjectType,
  billingModel: '',
  projectName: '',
  status: 'Active' as const,
  currency: 'KRW' as const,
  // optional fields...
};
```

- [ ] **Step 3: On `projectType` change** — fetch defaults from client-side registry mirror OR from `/api/project-types` response; set `billingModel` read-only unless session role is Admin/Approver (fetch session or infer from page — projects page is Approver-only today, keep billingModel editable)

- [ ] **Step 4: Render dynamic fields** from `requiredFields` per type (date inputs for fiscal/event, number for amounts, selects for subtypes)

- [ ] **Step 5: Auto-fill `projectName`** via `nameTemplate` when client/type/subtype changes; user edits preserved if manually touched (track `nameTouched` flag)

- [ ] **Step 6: Table columns** — 유형, 청구 (label + formatted amount), filters by type/status

- [ ] **Step 7: Edit flow** — load full project via GET `[id]`, populate all fields

- [ ] **Step 8: Show API `warning` toast** on duplicate long-lived project

- [ ] **Step 9: Manual smoke test**

Run: `npm run dev` → `/app/projects` → create MonthlyBookkeeping + TaxAmendment → verify list + edit

- [ ] **Step 10: Commit**

```bash
git add app/(app)/app/projects/page.tsx
git commit -m "feat: dynamic project registration form by type"
```

---

## Task 7: Regression & docs sync

**Files:**
- Modify: `docs/superpowers/specs/2026-06-20-firmflow-design.md` (add pointer to project-types design in Project section)

- [ ] **Step 1: Run full test suite**

Run: `npm test`  
Expected: all pass (baseline ~152+ tests)

- [ ] **Step 2: Fix any broken tests** that create `ProjectModel` without new required fields — only `General` defaults needed; explicit types need full payloads in tests

- [ ] **Step 3: Add one-line cross-reference** in firmflow-design.md §Project → `2026-06-20-project-types-design.md`

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-06-20-firmflow-design.md
git commit -m "docs: link MVP design to project types extension"
```

---

## Verification Checklist

- [ ] `npm test` green
- [ ] POST each critical type: `MonthlyBookkeeping`, `TaxAmendment`, `Audit` — 201
- [ ] Legacy projects without new fields still load as `General`
- [ ] Preparer `projects/options` shows type in label
- [ ] Dashboard unchanged (spot-check `/api/dashboard`)

---

## Out of Scope (Phase 2)

- `refundAmount`, billing calendar, invoice generation
- Dashboard billing forecast cards
- Auto-blocking duplicate long-lived projects
