# AUDIT_HISTORY.md — Tarmeem Defect & Fix Log

Chronological record of all defects found and fixed across 4 planning rounds.

---

## Round 1 — Initial Codebase Audit (19 Defects)

| # | Defect | Where | Severity |
|---|---|---|---|
| 1 | 8 forms are skeletons (`<div>F-02 SKELETON</div>`) | FormRenderers.tsx lines 69–78 | BLOCKING |
| 2 | F-23 wired to F-08 stub by mistake | FormRenderers.tsx line 639 | BLOCKING |
| 3 | `Building2` and `Clock` icons used but never imported | Home.tsx / Projects.tsx lines 58–59 | BLOCKING (crashes UI) |
| 4 | `ROLE_BY_KEY` referenced inside `usersByDepartment` in App.tsx but not imported | App.tsx line 61 | BLOCKING (crashes runtime) |
| 5 | `FormStatus` type used but not imported in App.tsx phase trigger code | App.tsx lines 155, 163 | BLOCKING (type-check fails) |
| 6 | Notification privacy leak — every client downloads every notification | App.tsx line 47 | BLOCKING (GDPR-level) |
| 7 | Unbounded Firestore listeners on users, forms, projects, notifications | App.tsx lines 44–47 | BLOCKING (cost & scale) |
| 8 | No `writeBatch` / `runTransaction` in `advanceForm` cascade triggers | App.tsx lines 132–192 | BLOCKING (corruption risk) |
| 9 | SLA uses client time + raw calendar days (counts Fri/Sat) | data.tsx line 87 | wrong data |
| 10 | Theme lock-in — most components use hardcoded `bg-[#0a0a0a]` with no `dark:` variants, making `<ThemeToggle/>` cosmetic only | Home.tsx, Departments.tsx, Projects.tsx, EmployeeProfile.tsx | broken feature |
| 11 | Hardcoded admin emails duplicated in App.tsx and data.tsx | App.tsx line 32, data.tsx line 48 | DRY violation |
| 12 | `(e:any)` and `as any` everywhere | All files | type safety |
| 13 | The "God Function" `advanceForm` (90+ lines, branches on every form code) | App.tsx | maintainability |
| 14 | `Form data?: Record<string, any>` — no strict schema per form | Forms.tsx line 9 | type safety |
| 15 | No ProjectsManager/Admin department guard on Admin portal beyond `isAdmin` flag | Admin.tsx | RBAC hole |
| 16 | F-20 chat messages stored inline (will hit Firestore 1 MB doc limit) | FormRenderers.tsx line 89 | scale risk |
| 17 | `onCreateForm` only accepts F-02 despite portal asking for it for other forms | Projects.tsx line 78 | UX bug |
| 18 | Auth screen passes `onAuth` callback that is `() => {}` (no-op) | App.tsx line 212 | dead code |
| 19 | firebase.ts is imported but not in the file dump — must be re-created | All files | setup |

**Fixes applied in Batch 1:**
- Created `src/lib/firebase.ts`
- Created `src/lib/workflow.ts` with `TRIGGER_MAP` (replaces God Function)
- Created `src/lib/sla.ts` with business-day calculator (skips Fri/Sat)
- Created `src/lib/rbac.ts` with `formAwaitsUser`
- Created `src/lib/data.ts` (canonical dictionary)
- Added bounded listeners (`limit(500)`, `orderBy('updatedAt','desc')`)
- Notifications filtered server-side by `where('recipients','array-contains',uid)`
- All cascades now use `writeBatch`

---

## Batch 1 Issues (found after Batch 1 ship)

### Issue 1 — TarmeemLogo is a placeholder (BLOCKING)
**What shipped:** gradient circle with abstract house shapes.
**Correct spec:** Crown (two purple `#4A1F66` rotated squares) + Wall (3 rows 5/3/4 layout, P-T alternating, 12 bricks, 60ms stagger). Wordmark "ترميم Tarmeem" below.
**Fix:** Hand-authored SVG with individually animatable `.trm-brick` elements in Batch 2.

### Issue 2 — Splash is generic (BLOCKING)
**What shipped:** logo + pulsing dot.
**Correct spec:** brick-rise → crown-drop with bounce → wordmark-rise → crown-pulse (pure CSS, ~1800ms).
**Fix:** CSS keyframes with per-class animations in Batch 2 `index.css`.

### Issue 3 — `notifyNextStep` spams all admins
**Original code:** `.filter((u) => u.role === nextRole || u.isAdmin)` — pings every admin org-wide on every form transition.
**Fix in Batch 2:**
```ts
.filter(u => {
  if (u.role === nextRole) return true;
  if (u.isAdmin && def?.department && u.department === def.department) return true;
  return false;
});
// Fallback: if recipients list is empty, notify all active admins.
if (recipients.length === 0) recipients = users.filter(u => u.isAdmin && u.status === 'active').map(u => u.id);
```

---

## Batch 2 Fixes

**`src/lib/data.ts` patches:**
- Added `'declined'` to `FormStatus` union (terminal "no" distinct from `'rejected'`)
- Added `REJECTED` and `CANCELLED` to `ProjectPhase` union
- Added `ProjectStatus = 'active' | 'on_hold'`
- Added `DECLINE_ELIGIBLE_FORMS: ['F-03.1', 'F-08', 'F-23']`
- Added `FORM_REJECT_TARGET` map (who owns the resubmit)
- Added `REASSIGNABLE_FORMS: ['F-04', 'F-08', 'F-32', 'F-33', 'F-14']`
- Added `TERMINAL_PHASES: ['CLOSED', 'REJECTED', 'CANCELLED']`
- Fixed `PROJECT_PHASE_TO_TAB` — REJECTED/CANCELLED mapped to `1` with comment; `lastActivePhase` captures the pre-terminal phase

**`src/lib/workflow.ts` v2:**
- Fixed F-02 trigger: was `() => ({ activate: [] })` (dead-ended). Fixed to find and activate the F-03 draft form.
- Added `DECLINE_MAP` for F-03.1 (project → REJECTED), F-08 (not renovable → REJECTED), F-23 (no cascade, form declined only)
- Hardened `applyCascade`: `arrayUnion` on autoComplete, `completedAt` timestamp, removed dead `newFormRefs`

**`src/lib/sla.ts` v2:**
- Added hold state support (`ProjectHoldState` interface)
- Added `SlaTone: 'frozen'` for on-hold projects
- Added `holdElapsedBusinessDays()` helper

**`src/lib/audit.ts` (new):**
- `AuditAction` union (project lifecycle + user lifecycle events only)
- `writeAuditEntry()` — per-form decisions live in `form.approvals[]`, NOT duplicated here

**`src/index.css`:**
- CSS variables for light/dark themes (full token set)
- Splash choreography (brick-rise, crown-drop, wordmark-rise, crown-pulse)
- Skeleton shimmer animation

**`src/components/TarmeemLogo.tsx` v2:**
- 5 variants (icon, horizontal, stacked, full, monogram)
- 3 color modes (brand, white, mono)
- Hand-authored SVG: crown (2 rotated squares) + 12 bricks with `--d` stagger
- `TarmeemSplash` with `onComplete` callback

**`src/components/Auth.tsx` v2:**
- Added `'rejected'` user status handling

**`src/App.tsx` v2:**
- Added `declineForm` in FormsApi
- Fixed `notifyNextStep` (admin spam fix)
- Load-bearing comment on `updatedRec` reconstruction before trigger
- `DECLINE_MAP` cascade wired

**`src/hooks/useFirestoreCollection.ts`:**
- `key` made required (non-optional) — prevents stale listener footgun

---

## Batch 3 Fixes

### F-03 → F-03.1 Data Propagation Gap (BLOCKING)
**Bug:** F-03 trigger activated F-03.1 (status → pending) but never copied `managerNotes` or `eligibilityVerdict` to F-03.1's data. Exec Director opened F-03.1 and saw empty fields.
**Fix — 3-step patch:**
1. Extended `CascadeResult.activate` with optional `data?: Record<string, unknown>` payload.
2. `applyCascade` activate loop merges `a.data` with target form's existing data (not replace).
3. F-03 trigger propagates `{ managerNotes, eligibilityVerdict }` to F-03.1 on activation.

**`ACTIVATE_DATA_PROPAGATIONS` constant added to `_shared.tsx`:**
```ts
export const ACTIVATE_DATA_PROPAGATIONS = {
  'F-03 → F-03.1': ['managerNotes', 'eligibilityVerdict'],
} as const;
```

**`RENDERER_CONTRACT` exported from `_shared.tsx`:**
```ts
export const RENDERER_CONTRACT = {
  'F-04': ['engineerId'],
  'F-08': ['safetyHazard'],     // TOP LEVEL only, not data.basic.safetyHazard
  'F-85': ['winnerContractor', 'winnerPrice'],
  'F-32': ['engineerId'],
  'F-14': ['overallProgress', 'requestScopeChange'],
  'F-07': ['mediaRequested'],
} as const;
```

### FileUploader Progress State Collision
**Bug:** Progress keyed by `file.name`. Two files named `IMG_0001.jpg` (common from camera rolls) collide UI-side.
**Fix:** Key progress by UUID instead. Keep display name alongside.

### FileUploader Missing Drag-and-Drop
**Bug:** Label text said "السحب والإفلات أو الضغط للاختيار" but no `onDragOver`/`onDrop` handlers existed.
**Fix:** Added `onDragOver` (preventDefault + stopPropagation) and `onDrop` (extract files, call uploadOne) handlers.

### `GenericFallback` Referenced but Not Defined
**Bug:** `Forms.tsx` dispatch referenced `<GenericFallback />` but component didn't exist anywhere. Unmapped form codes would crash.
**Fix:** Added `GenericFallback` to `_shared.tsx` — read-only card showing form status, approval chain, data JSON dump (collapsible), and functional action bar. Approval chain still works for unmapped codes.

### CroquisViewer Theme Token Violation
**Bug:** Canvas SVG used `className="bg-white dark:bg-slate-950"` — hardcoded, not a theme token.
**Fix:** Changed to `className="bg-surface-up rounded"`.

### Nice-to-haves landed in Batch 3:
- `Cmd/Ctrl+Enter` to send comment in `FormComments`
- F-04 helper filter softened from `u.department === 'PROJECTS'` to any active user (except assigned engineer)

---

## Batch 4 Fixes

**F-22 missing TRIGGER_MAP entry:**
- Partnership never got notified when F-22 was approved.
- Fix: Added F-22 trigger to TRIGGER_MAP notifying PARTNERSHIP department users.

**F-20 SUPPORT helpers read-only:**
- `FormShell` only honored `formAwaitsUser`. SUPPORT helpers in F-20 needed edit access but couldn't get it.
- Fix: Added `additionalEditAccess` prop on `FormShell`. Set from `isSupportHelper = user.department === 'SUPPORT' && rec.status === 'pending'`.

**`migrateF20Messages` timestamp clustering:**
- Old migration wrote `createdAt: serverTimestamp()` for all migrated messages, losing original ordering.
- Fix: Changed to `createdAt: Timestamp.fromDate(legacyDate)` to preserve original order.

**Renderers shipped:** F-18, F-22, F-21, F-20

---

## Batch 5 Fixes

**F-08 trigger two read paths:**
- Original: `dataPatch?.safetyHazard ?? data.basic.safetyHazard` — inconsistent with RENDERER_CONTRACT.
- Fix: Single source — top-level `data.safetyHazard` only, per RENDERER_CONTRACT.

**`applyCascade.autoComplete` replaced array:**
- Used direct array assignment `approvals: [...]` — not defensive.
- Fix: Changed to `arrayUnion(...)` for defensiveness. Also added `completedAt: now` timestamp.

**Dead `newFormRefs`:**
- Variable collected DocumentReferences but was never used after batch.commit().
- Fix: Removed entirely.

**Renderer shipped:** `CroquisEditor` in `_shared.tsx`
- pointer events + `getCoalescedEvents()` for smooth iOS strokes
- per-instance undo stack, capped at 20
- inline pin labels via `<foreignObject>`

---

## Batch 6 (Clean Batch — 7 Fixes)

All fixes folded cleanly. Six renderers shipped: F-34, F-84, F-85, F-32, F-33, F-19.

**`ACTIVATE_DATA_PROPAGATIONS` expanded:**
```ts
'F-84 → F-85':   ['f84_bids', 'f84_pricingNotes'],
'F-33 → F-34':   ['f20_items', 'f20_directNotes', 'f20_inkindNotes', 'f20_partnershipNotes'],
```

**F-08 not_renovable UX:** Added amber callout when `diagnosisResult = 'not_renovable'` is selected. Approve blocked with explicit error.

**F-19 `additionalEditAccess`:** Mirrors F-20 pattern for SUPPORT helpers.

---

## Batch 7 Fixes

**F-19 SLA silenced:**
- F-19 is a permanent tracker for the full EXECUTION phase. With a normal `slaDays`, the row shows "متأخر X يوم" within days and stays red until handover.
- Fix: Set `slaDays: null` in F-19's `FormDef`. `slaStatus()` already returns `'بدون SLA' / tone: 'neutral'` for falsy `slaDays`.

**F-32 conflict-of-interest warning:**
- Supervisor pool listed diagnosis engineer (same person did F-08) without warning. Same person doing both diagnosis and supervision is a conflict of interest.
- Fix (soft): Diagnosis engineer sorted to bottom of list with label `"${u.fullName} · ⚠ مهندس التشخيص (تعارض)"`. Not blocked — allows legitimate small-team override.

**F-33 trigger updated:**
- Now propagates F-08 works snapshot + `visitNumber: 1` to F-14 on activation.
- `ACTIVATE_DATA_PROPAGATIONS` updated with `'F-33 → F-14': ['f08_works', 'visitNumber']`.

**F-14 trigger gate relaxed:**
- Old gate: `if (overall > 0 && overall < 100)` — left no successor F-14 when visit reported 0% (contractor absent).
- Fix: Changed to `if (overall < 100)`. Zero-progress visits produce a successor F-14 (legitimate "absent" case).

**Renderer shipped:** F-14 (per-work checklist + computed/overridable `overallProgress` + `requestScopeChange` + auto-creates next visit)

---

## Batch 8 Fixes

**Multi-stage rejection silently broken (behavioral fix):**
- `rejectForm` in App.tsx unconditionally set `status='rejected'` regardless of chain length.
- Spec said: multi-stage forms reject back to stage 0, stay `'pending'`, notify first-stage role.
- Fix: Added `isMultiStage = rec.approvalChain.length > 1` branch. Multi-stage: reset to `approvalIndex: 0`, keep `status: 'pending'`. Single-stage: existing `status: 'rejected'` behavior.

**F-14 `canApprove` forced engineers to lie at 0%:**
- Old validation: `if (!anyUpdated) return 'يجب تحديث تقدم العمل قبل الاعتماد'` — blocked all-zero visits.
- Fix: Replaced with "no progress reason" requirement:
  ```ts
  const allZero = workProgress.every(w => w.progressPct === 0);
  if (allZero && !generalNotes.trim()) {
    return 'تقرير بصفر إنجاز يتطلب توضيح السبب في «ملاحظات عامة»';
  }
  ```

**Renderers shipped:** `MultiStageActionBar` in `_shared.tsx`, F-35, F-15

---

## Known Deferred Items

| Item | Deferred to |
|---|---|
| F-02 wizard renderer | Batch 9 |
| F-07 HandoverCertificate + handover PDF | Batch 9 |
| F-23 AdditionalWorks renderer | Batch 9 |
| F-52 MediaCoverage renderer | Batch 9 |
| Per-work photos in F-14 (FileUploader per F14WorkProgress) | Polish batch |
| Reports page + Closure Report PDF | v2.1 |
| DepartmentWorkload stacked-bar | v2.1 |
| WeeklyStars leaderboard | v2.1 |
| ProjectActionsMenu "أنشئ زيارة إشراف جديدة" button | Future |
| F-03 → F-03.1 propagation key prefix normalization (uses plain keys vs prefixed) | Future cleanup batch |
| Settings page | MVP |
| Cmd+K global search | MVP |
