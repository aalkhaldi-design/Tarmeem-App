# WORKFLOW.md — Cascade Engine Reference

> Verbatim patterns from `src/lib/workflow.ts` and `src/components/forms/_shared.tsx`.
> Do not paraphrase code blocks — these are load-bearing contracts.

---

## 1. TRIGGER_MAP

Fires after a form's chain ends with `status='approved'`. Lives in `src/lib/workflow.ts`.

```ts
export const TRIGGER_MAP: Partial<Record<FormCode, (ctx: CascadeContext) => CascadeResult>> = {

  'F-02': (ctx) => {
    // FIX: chain ends with research manager → activate F-03 (created as draft by the F-02 wizard)
    const f03 = ctx.forms.find(f => f.code === 'F-03' && f.projectRefId === ctx.approvedRecord.projectRefId);
    return { activate: f03 ? [{ formId: f03.id }] : [] };
  },

  'F-03': (ctx) => {
    const f031 = ctx.forms.find(f => f.code === 'F-03.1' && f.projectRefId === ctx.approvedRecord.projectRefId);
    const src = (ctx.approvedRecord.data || {}) as { managerNotes?: string; eligibilityVerdict?: string };
    return {
      activate: f031 ? [{
        formId: f031.id,
        data: {
          managerNotes: src.managerNotes,
          eligibilityVerdict: src.eligibilityVerdict,
        },
      }] : [],
    };
  },

  'F-03.1': (ctx) => {
    const f032 = ctx.forms.find(f => f.code === 'F-03.2' && f.projectRefId === ctx.approvedRecord.projectRefId);
    return { activate: f032 ? [{ formId: f032.id }] : [] };
  },

  'F-03.2': (ctx) => {
    const f04 = ctx.forms.find(f => f.code === 'F-04' && f.projectRefId === ctx.approvedRecord.projectRefId);
    return {
      projectPatch: { phase: 'DIAGNOSIS' as ProjectPhase, progressPct: 15 },
      activate: f04 ? [{ formId: f04.id }] : [],
    };
  },

  'F-04': (ctx) => {
    const engineerId = (ctx.dataPatch?.engineerId as string) || (ctx.approvedRecord.data?.engineerId as string);
    const f08 = ctx.forms.find(f => f.code === 'F-08' && f.projectRefId === ctx.approvedRecord.projectRefId);
    return {
      projectPatch: { diagnosisEngineerId: engineerId },
      activate: f08 ? [{ formId: f08.id, assigneeId: engineerId }] : [],
    };
  },

  'F-08': (ctx) => {
    const projectRefId = ctx.approvedRecord.projectRefId!;
    const f20 = ctx.forms.find(f => f.code === 'F-20' && f.projectRefId === projectRefId);
    const f21 = ctx.forms.find(f => f.code === 'F-21' && f.projectRefId === projectRefId);
    const f18 = ctx.forms.find(f => f.code === 'F-18' && f.projectRefId === projectRefId);
    const f22 = ctx.forms.find(f => f.code === 'F-22' && f.projectRefId === projectRefId);
    // SINGLE SOURCE: top-level data.safetyHazard only, per RENDERER_CONTRACT
    const safetyHazard = !!(ctx.dataPatch?.safetyHazard ?? (ctx.approvedRecord.data as { safetyHazard?: boolean })?.safetyHazard);
    const project = ctx.projects.find(p => p.id === projectRefId);

    const result: CascadeResult = {
      activate: [
        ...(f20 ? [{ formId: f20.id }] : []),
        ...(f21 ? [{ formId: f21.id, assigneeId: project?.diagnosisEngineerId || null }] : []),
      ],
    };

    if (safetyHazard) {
      if (f18) result.activate!.push({ formId: f18.id, assigneeId: project?.createdBy || null });
      if (f22) result.activate!.push({ formId: f22.id, assigneeId: project?.createdBy || null });
      result.projectPatch = { phase: 'EVACUATION' as ProjectPhase, progressPct: 30 };
    } else {
      result.autoComplete = [
        ...(f18 ? [{ formId: f18.id, note: 'تخطي تلقائي — لا يحتاج إخلاء' }] : []),
        ...(f22 ? [{ formId: f22.id, note: 'تخطي تلقائي — لا يحتاج سكن بديل' }] : []),
      ];
      result.projectPatch = { progressPct: 30 };
    }
    return result;
  },

  'F-20': (ctx) => {
    const f84 = ctx.forms.find(f => f.code === 'F-84' && f.projectRefId === ctx.approvedRecord.projectRefId);
    return {
      projectPatch: { phase: 'TENDERING' as ProjectPhase, progressPct: 45 },
      activate: f84 ? [{ formId: f84.id }] : [],
    };
  },

  'F-84': (ctx) => {
    const f85 = ctx.forms.find(f => f.code === 'F-85' && f.projectRefId === ctx.approvedRecord.projectRefId);
    return { activate: f85 ? [{ formId: f85.id }] : [] };
  },

  'F-85': (ctx) => {
    const projectRefId = ctx.approvedRecord.projectRefId!;
    const f32 = ctx.forms.find(f => f.code === 'F-32' && f.projectRefId === projectRefId);
    const f35 = ctx.forms.find(f => f.code === 'F-35' && f.projectRefId === projectRefId);
    return {
      projectPatch: {
        contractorName: (ctx.dataPatch?.winnerContractor as string) || null,
        awardedPrice: Number(ctx.dataPatch?.winnerPrice) || null,
        progressPct: 55,
      },
      activate: [
        ...(f32 ? [{ formId: f32.id }] : []),
        ...(f35 ? [{ formId: f35.id }] : []),
      ],
    };
  },

  'F-32': (ctx) => {
    const supervisorId = (ctx.dataPatch?.engineerId as string) || (ctx.approvedRecord.data?.engineerId as string);
    const f33 = ctx.forms.find(f => f.code === 'F-33' && f.projectRefId === ctx.approvedRecord.projectRefId);
    return {
      projectPatch: { supervisingEngineerId: supervisorId },
      activate: f33 ? [{ formId: f33.id, assigneeId: supervisorId }] : [],
    };
  },

  'F-33': (ctx) => {
    const projectRefId = ctx.approvedRecord.projectRefId!;
    const f14 = ctx.forms.find(f => f.code === 'F-14' && f.projectRefId === projectRefId);
    const f19 = ctx.forms.find(f => f.code === 'F-19' && f.projectRefId === projectRefId);
    const f34 = ctx.forms.find(f => f.code === 'F-34' && f.projectRefId === projectRefId);
    const f20 = ctx.forms.find(f => f.code === 'F-20' && f.projectRefId === projectRefId);
    const f08 = ctx.forms.find(f => f.code === 'F-08' && f.projectRefId === projectRefId);

    const f08works = ((f08?.data as { works?: Array<{ id: string; name: string }> })?.works || [])
      .map(w => ({ id: w.id, name: w.name })); // denormalize only what F-14 needs

    const f20src = (f20?.data || {}) as {
      items?: unknown[]; directNotes?: string; inkindNotes?: string; partnershipNotes?: string;
    };

    return {
      projectPatch: { phase: 'EXECUTION' as ProjectPhase, progressPct: 60 },
      activate: [
        ...(f14 ? [{ formId: f14.id, data: { f08_works: f08works, visitNumber: 1 } }] : []),
        ...(f19 ? [{ formId: f19.id }] : []),
        ...(f34 ? [{
          formId: f34.id,
          data: {
            f20_items: f20src.items || [],
            f20_directNotes: f20src.directNotes,
            f20_inkindNotes: f20src.inkindNotes,
            f20_partnershipNotes: f20src.partnershipNotes,
          },
        }] : []),
      ],
    };
  },

  'F-14': (ctx) => {
    const projectRefId = ctx.approvedRecord.projectRefId!;
    const overall = Number(
      ctx.dataPatch?.overallProgress
      ?? (ctx.approvedRecord.data as { overallProgress?: number })?.overallProgress
      ?? 0
    );
    const existingF15 = ctx.forms.filter(f => f.code === 'F-15' && f.projectRefId === projectRefId);
    const createForms: NonNullable<CascadeResult['createForms']> = [];

    // Payment milestones
    if (overall >= 60  && !existingF15.some(f => (f.data as { paymentIndex?: number })?.paymentIndex === 2))
      createForms.push({ code: 'F-15', data: { paymentIndex: 2 }, title: 'طلب صرف الدفعة الثانية (30%)' });
    if (overall >= 90  && !existingF15.some(f => (f.data as { paymentIndex?: number })?.paymentIndex === 3))
      createForms.push({ code: 'F-15', data: { paymentIndex: 3 }, title: 'طلب صرف الدفعة الثالثة (30%)' });
    if (overall >= 100 && !existingF15.some(f => (f.data as { paymentIndex?: number })?.paymentIndex === 4))
      createForms.push({ code: 'F-15', data: { paymentIndex: 4 }, title: 'طلب صرف الدفعة الأخيرة (10%)' });

    // Scope change → spawn F-23
    if (ctx.dataPatch?.requestScopeChange || (ctx.approvedRecord.data as { requestScopeChange?: boolean })?.requestScopeChange) {
      createForms.push({
        code: 'F-23',
        data: { triggeredByF14: ctx.approvedRecord.id },
        title: 'اعتماد بنود أعمال إضافية (مولّد آلياً)',
      });
    }

    // Auto-create next supervision visit when execution is ongoing
    // Gate: overall < 100 (includes 0% — "contractor absent" is a legitimate visit)
    if (overall < 100) {
      const f08 = ctx.forms.find(f => f.code === 'F-08' && f.projectRefId === projectRefId);
      const f08works = ((f08?.data as { works?: Array<{ id: string; name: string }> })?.works || [])
        .map(w => ({ id: w.id, name: w.name }));
      const currentVisit = Number((ctx.approvedRecord.data as { visitNumber?: number })?.visitNumber || 1);
      const nextVisit = currentVisit + 1;
      createForms.push({
        code: 'F-14',
        data: {
          f08_works: f08works,
          visitNumber: nextVisit,
          previousVisitProgress: overall,
        },
        title: `تقرير الإشراف — الزيارة ${nextVisit}`,
      });
    }

    return {
      projectPatch: { progressPct: Math.max(60, Math.min(99, overall)) },
      createForms,
    };
  },

  'F-15': (ctx) => {
    const paymentIndex = Number((ctx.approvedRecord.data as { paymentIndex?: number })?.paymentIndex || 1);
    if (paymentIndex !== 4) return {};
    const f07 = ctx.forms.find(f => f.code === 'F-07' && f.projectRefId === ctx.approvedRecord.projectRefId);
    return {
      projectPatch: { phase: 'HANDOVER' as ProjectPhase, progressPct: 95 },
      activate: f07 ? [{ formId: f07.id }] : [],
    };
  },

  'F-07': (ctx) => {
    const f52 = ctx.forms.find(f => f.code === 'F-52' && f.projectRefId === ctx.approvedRecord.projectRefId);
    const mediaRequested = !!(ctx.dataPatch?.mediaRequested ?? (ctx.approvedRecord.data as { mediaRequested?: boolean })?.mediaRequested);
    const project = ctx.projects.find(p => p.id === ctx.approvedRecord.projectRefId);
    const result: CascadeResult = { projectPatch: { phase: 'CLOSED' as ProjectPhase, progressPct: 100 } };
    if (f52) {
      if (mediaRequested) result.activate = [{ formId: f52.id, assigneeId: project?.supervisingEngineerId || null }];
      else                result.autoComplete = [{ formId: f52.id, note: 'تخطي تلقائي — لم يُطلب توثيق إعلامي' }];
    }
    return result;
  },

  'F-52': (ctx) => {
    const commsUsers = ctx.users
      .filter(u => u.status === 'active' && (u.department === 'COMMS' || u.role === 'PR_OFFICER'))
      .map(u => u.id);
    return {
      notify: commsUsers.length ? [{
        recipients: commsUsers,
        text: `طلب توثيق إعلامي جاهز للمشروع ${ctx.approvedRecord.projectId || ''}`,
        subject: 'تنبيه تغطية إعلامية',
        type: 'media_coverage',
        link: ctx.approvedRecord.id,
      }] : [],
    };
  },
};
```

---

## 2. DECLINE_MAP

Fires after a form is declined (terminal "no" outcome). Only invoked for forms in `DECLINE_ELIGIBLE_FORMS` (`['F-03.1', 'F-08', 'F-23']`).

```ts
export const DECLINE_MAP: Partial<Record<FormCode, (ctx: CascadeContext) => CascadeResult>> = {

  'F-03.1': (ctx) => {
    const draftsOnProject = ctx.forms.filter(f =>
      f.projectRefId === ctx.approvedRecord.projectRefId &&
      f.status === 'draft' &&
      f.id !== ctx.approvedRecord.id,
    );
    const stakeholders = ctx.users
      .filter(u => u.status === 'active' && (u.role === 'RESEARCH_MANAGER' || u.role === 'SOCIAL_RESEARCHER'))
      .map(u => u.id);
    return {
      projectPatch: { phase: 'REJECTED' as ProjectPhase, progressPct: 0, lastActivePhase: ctx.projects.find(p => p.id === ctx.approvedRecord.projectRefId)?.phase },
      autoComplete: draftsOnProject.map(f => ({ formId: f.id, note: 'تم رفض الاستحقاق من الإدارة التنفيذية' })),
      notify: stakeholders.length ? [{
        recipients: stakeholders,
        text: `تم رفض الاستحقاق للمشروع ${ctx.approvedRecord.projectId || ''}`,
        subject: 'رفض الاستحقاق',
        type: 'project_rejected',
      }] : [],
    };
  },

  'F-08': (ctx) => {
    const draftsOnProject = ctx.forms.filter(f =>
      f.projectRefId === ctx.approvedRecord.projectRefId &&
      f.status === 'draft' &&
      f.id !== ctx.approvedRecord.id,
    );
    const stakeholders = ctx.users
      .filter(u => u.status === 'active' && ['RESEARCH_MANAGER', 'PROJECTS_MANAGER', 'EXEC_DIRECTOR'].includes(u.role as RoleKey))
      .map(u => u.id);
    return {
      projectPatch: { phase: 'REJECTED' as ProjectPhase, progressPct: 0, lastActivePhase: ctx.projects.find(p => p.id === ctx.approvedRecord.projectRefId)?.phase },
      autoComplete: draftsOnProject.map(f => ({ formId: f.id, note: 'المبنى غير قابل للترميم' })),
      notify: stakeholders.length ? [{
        recipients: stakeholders,
        text: `المبنى غير قابل للترميم — مشروع ${ctx.approvedRecord.projectId || ''}`,
        subject: 'عدم قابلية الترميم',
        type: 'project_not_renovable',
      }] : [],
    };
  },

  // F-23 decline: variation noted as denied, project state unchanged.
  // Status='declined' on the form (set by declineForm in App.tsx) is sufficient; no cascade needed.
  'F-23': () => ({}),
};
```

---

## 3. `applyCascade` — Hardened Version

```ts
export async function applyCascade(result: CascadeResult, ctx: CascadeContext): Promise<void> {
  const batch = writeBatch(db);
  const now = serverTimestamp();

  if (result.projectPatch && ctx.approvedRecord.projectRefId) {
    batch.update(doc(db, 'projects', ctx.approvedRecord.projectRefId), {
      ...result.projectPatch,
      updatedAt: now,
    });
  }

  for (const a of result.activate || []) {
    const update: Record<string, unknown> = {
      status: 'pending',
      stepStartedAt: now,
      assigneeId: a.assigneeId ?? null,
      updatedAt: now,
    };
    if (a.data) {
      const target = ctx.forms.find(f => f.id === a.formId);
      update.data = { ...(target?.data || {}), ...a.data };  // merge, not replace
    }
    batch.update(doc(db, 'forms', a.formId), update);
  }

  for (const a of result.autoComplete || []) {
    batch.update(doc(db, 'forms', a.formId), {
      status: 'completed',
      completedAt: now,
      approvals: arrayUnion({
        role: 'SYSTEM' as RoleKey,
        actorId: 'system',
        actorName: 'النظام',
        at: new Date().toISOString(),
        decision: 'approved',
        note: a.note,
      }),
      updatedAt: now,
    });
  }

  for (const cf of result.createForms || []) {
    const def = FORM_BY_CODE[cf.code];
    const ref = doc(collection(db, 'forms'));
    batch.set(ref, {
      code: cf.code,
      title: cf.title || def.title,
      projectId: ctx.approvedRecord.projectId || null,
      projectRefId: ctx.approvedRecord.projectRefId || null,
      beneficiaryName: ctx.approvedRecord.beneficiaryName || '',
      status: 'pending',
      approvalIndex: 0,
      approvalChain: def.approvalChain,
      approvals: [],
      createdBy: 'system',
      createdByName: 'النظام',
      createdByRole: 'SYSTEM' as RoleKey,
      createdAt: now,
      updatedAt: now,
      ownerDept: def.ownerDept,
      bridgesTo: def.bridgesTo || [],
      notes: '',
      data: cf.data,
      assigneeId: cf.assigneeId ?? null,
      files: [],
      stepStartedAt: now,
    });
    // newFormRefs removed — was collected but never used
  }

  await batch.commit();

  for (const n of result.notify || []) {
    if (!n.recipients.length) continue;
    await addDoc(collection(db, 'notifications'), {
      ...n,
      readBy: [],
      createdAt: new Date().toISOString(),
    });
  }
}
```

**Key invariants:**
- `autoComplete` uses `arrayUnion(...)` (not direct array assignment) for defensiveness.
- `completedAt: now` is stamped on every auto-completed form.
- `activate[].data` is **merged** into the target form's existing data, never replacing it.
- `newFormRefs` is not collected — was dead code, removed.
- Notifications are `addDoc`'d post-commit; they don't need atomicity with workflow writes.

---

## 4. `CascadeResult` Interface

```ts
export interface CascadeResult {
  projectPatch?: Partial<ProjectRecord> & { data?: Record<string, unknown> };
  activate?:     { formId: string; assigneeId?: string | null; data?: Record<string, unknown> }[];
  autoComplete?: { formId: string; note: string }[];
  createForms?:  { code: FormCode; data: Record<string, unknown>; title?: string; assigneeId?: string | null }[];
  notify?:       { recipients: string[]; text: string; subject: string; link?: string; type: string }[];
}
```

The optional `data` on `activate` entries is the cross-form propagation primitive. Use it only for form-specific decision support. Project-wide state (`contractorName`, `awardedPrice`, `engineerId`) lives on the project record — never duplicated into form data.

---

## 5. ACTIVATE_DATA_PROPAGATIONS (authoritative registry)

Defined in `src/components/forms/_shared.tsx`. When a trigger needs to seed downstream form data, the keys it propagates must be listed here.

```ts
export const ACTIVATE_DATA_PROPAGATIONS = {
  'F-03 → F-03.1': ['managerNotes', 'eligibilityVerdict'],
  'F-84 → F-85':   ['f84_bids', 'f84_pricingNotes'],
  'F-33 → F-14':   ['f08_works', 'visitNumber'],
  'F-33 → F-34':   ['f20_items', 'f20_directNotes', 'f20_inkindNotes', 'f20_partnershipNotes'],
  // Subsequent F-14 instances are auto-created by F-14's own trigger (createForms),
  // which passes f08_works + visitNumber + previousVisitProgress at creation time.
} as const;
```

**Rules:**
1. Use this ONLY for form-specific decision support (e.g., manager's notes shown to the exec, or prior-stage stamps that must persist for audit).
2. Project-wide state (`contractorName`, `awardedPrice`, `engineerId`) lives on `project`, NEVER duplicated into form data.
3. Add new propagation keys here before adding them to a trigger — this is the single source of truth.
4. Prefixed keys (e.g., `f84_bids`, `f20_items`) make origin obvious in the audit trail. Use prefixes for all new propagations.

---

## 6. RENDERER_CONTRACT

Defines the **exact top-level keys** that each renderer must write to `form.data` for triggers to read. Renderers must not bury these under nested objects.

```ts
export const RENDERER_CONTRACT = {
  'F-04': ['engineerId'],
  'F-08': ['safetyHazard'],     // TOP LEVEL only — NOT data.basic.safetyHazard
  'F-85': ['winnerContractor', 'winnerPrice'],
  'F-32': ['engineerId'],
  'F-14': ['overallProgress', 'requestScopeChange'],
  'F-07': ['mediaRequested'],
} as const;
```

---

## 7. `rejectForm` Multi-Stage Semantic

```ts
// In App.tsx formsApi
rejectForm: async (formId, user, note) => {
  const rec = stateRef.current.forms.find((f) => f.id === formId);
  if (!rec) throw new Error('Form not found');
  if (!formAwaitsUser(rec, user)) throw new Error('Not authorized to reject');

  const isMultiStage = rec.approvalChain.length > 1;
  const approval = {
    role: rec.approvalChain[rec.approvalIndex],
    actorId: user.id, actorName: user.fullName,
    at: new Date().toISOString(), decision: 'rejected' as const, note: note || '',
  };

  if (isMultiStage) {
    // Reset to stage 0; preserve form.data (audit-correct re-edit context).
    await updateDoc(doc(db, 'forms', formId), {
      status: 'pending',
      approvalIndex: 0,
      stepStartedAt: serverTimestamp(),
      approvals: arrayUnion(approval),
      updatedAt: serverTimestamp(),
    });
    // Notify first-stage role (not all admins)
    const firstStageRole = rec.approvalChain[0];
    const def = ROLE_BY_KEY[firstStageRole as RoleKey];
    const recipients = stateRef.current.users
      .filter(u => u.status === 'active')
      .filter(u => u.role === firstStageRole || (u.isAdmin && def?.department && u.department === def.department))
      .map(u => u.id);
    // ... addDoc notification
  } else {
    // Single-stage: bounce to rejected.
    await updateDoc(doc(db, 'forms', formId), {
      status: 'rejected',
      approvals: arrayUnion(approval),
      updatedAt: serverTimestamp(),
    });
    // Notify createdBy
  }
},
```

---

## 8. `notifyNextStep` Admin Spam Fix

```ts
// CORRECT pattern — not the original `.filter(u => u.role === nextRole || u.isAdmin)`
const recipients = users
  .filter(u => {
    if (u.role === nextRole) return true;
    // Admins get pinged only if they share the role's department (admin acting in-line)
    if (u.isAdmin && def?.department && u.department === def.department) return true;
    return false;
  });
// Fallback: if recipients list is empty (no one holds the role), notify all active admins.
const finalRecipients = recipients.length > 0
  ? recipients
  : users.filter(u => u.isAdmin && u.status === 'active');
```

---

## 9. `updatedRec` — Load-Bearing Comment

```ts
// LOAD-BEARING: reconstruct updatedRec with dataPatch BEFORE passing to TRIGGER_MAP.
// Without this, triggers read stale data from the pre-patch snapshot.
// e.g. F-08's trigger reads safetyHazard from the just-submitted data, not the old snapshot.
// Same pattern applies in every multi-stage trigger (F-14 reading overallProgress, F-07 reading mediaRequested).
const updatedRec: FormRecord = {
  ...rec,
  data: { ...(rec.data || {}), ...(dataPatch || {}) },
  approvalIndex: nextIndex,
  status: 'approved',
};
```

---

## 10. MultiStageActionBar Interface

Defined in `src/components/forms/_shared.tsx`. Used by F-35, F-15, F-23.

```ts
interface StageDef {
  index: number;
  label: string;             // "إعداد المحاسب" / "اعتماد المدير التنفيذي" / "صرف الدفعة"
  role: RoleKey;
  /** Stage-specific input panel. Receives the form record + a draft setter
   *  that updates the form's `data` via api.updateFormData (debounced). */
  StageContent: React.FC<{
    rec: FormRecord;
    user: UserProfile;
    api: FormsApiLike;
    readOnly: boolean;
  }>;
  /** Optional gate that must return null for Approve to fire from this stage. */
  canApprove?: () => string | null;
}
```

- The bar owns: chip strip, role/awaitsMe gate, action buttons.
- Each form owns: `stages` array with per-stage `StageContent` components.
- Decline button appears if `DECLINE_ELIGIBLE_FORMS.includes(rec.code)` — same check FormShell uses. F-35 and F-15 are not decline-eligible; F-23 is.

---

## 11. F-15 Payment Labels

```ts
const F15_LABELS: Record<number, { title: string; pct: string }> = {
  2: { title: 'الدفعة الثانية',   pct: '30%' },
  3: { title: 'الدفعة الثالثة',  pct: '30%' },
  4: { title: 'الدفعة الأخيرة',  pct: '10%' },
};
```

---

## 12. SLA Calculator (`src/lib/sla.ts`)

```ts
export type SlaTone = 'ok' | 'warn' | 'late' | 'neutral' | 'frozen';

/** Count business days between two dates (Sun–Thu working week, skips Fri/Sat). */
export function businessDaysBetween(start: Date, end: Date): number { ... }

/** Returns SlaStatus with tone 'frozen' when project is on_hold. */
export function slaStatus(
  stepStartedAtIso: string | null | undefined,
  slaDays: number | undefined,
  hold?: ProjectHoldState,
): SlaStatus { ... }
```

- Returns `{ text: 'بدون SLA', tone: 'neutral' }` when `slaDays` is falsy — used by F-19 (`slaDays: null`).
- Returns `tone: 'frozen'` when `hold?.status === 'on_hold'`.
- `pastHoldDays` on the project record accumulates hold time across past hold periods (recorded on Resume).

---

## 13. Registered Renderers (`src/components/forms/index.ts`)

As of Batch 7 (16 of 22):

```
F-03, F-03.1, F-03.2, F-04, F-08, F-14,
F-18, F-19, F-20, F-21, F-22,
F-32, F-33, F-34, F-84, F-85
```

Remaining (6): F-02 (wizard), F-07, F-15, F-23, F-35, F-52

`GenericFallback` from `_shared.tsx` handles all unmapped codes — approval chain still works, data shown in collapsible JSON dump for admins.
