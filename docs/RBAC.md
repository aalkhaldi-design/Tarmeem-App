# RBAC.md — Tarmeem Departments × Roles × Forms

> Authoritative spec. Stick this on the wall. All routing decisions derive from this table.

---

## 1. Departments (9 total)

| Key | Arabic | Short | Active in workflow? |
|---|---|---|---|
| EXEC | الإدارة التنفيذية | تنفيذية | ✅ |
| RESEARCH | البحث الاجتماعي | البحث | ✅ |
| PROJECTS | إدارة المشاريع | المشاريع | ✅ |
| FINANCE | الشؤون المالية | المالية | ✅ |
| SUPPORT | الخدمات المساندة | الخدمات | ✅ |
| PARTNERSHIP | الشراكات | الشراكات | ✅ (F-22 bridge) |
| COMMS | الاتصال المؤسسي | الاتصال | ✅ (F-52 bridge) |
| VOLUNTEER | التطوع - مركز سمايا | التطوع | ⚪ portal only |
| MARKETING | التسويق والاستدامة | التسويق | ⚪ portal only |

---

## 2. Roles per Department (24 roles)

| Department | Role Key | Job Title (AR) | isManager | Originates / Approves |
|---|---|---|---|---|
| EXEC | SECRETARY_GENERAL | الأمين العام | ✅ | — |
| EXEC | EXEC_DIRECTOR | المدير التنفيذي | ✅ | Originates F-03.1; approves F-15 stage 1, F-35 stage 1, F-23 stage 2 |
| EXEC | BOARD_MEMBER | عضو مجلس الإدارة | — | view-only |
| EXEC | EXEC_SECRETARY | السكرتير التنفيذي | — | view-only |
| RESEARCH | RESEARCH_MANAGER | مدير البحث الاجتماعي | ✅ | Originates F-03, F-03.2, F-07; approves F-02 |
| RESEARCH | SOCIAL_RESEARCHER | باحث اجتماعي | — | Originates F-02, F-18, F-22 |
| RESEARCH | COMPLAINTS_OFFICER | مسؤولة الشكاوى | — | view-only |
| PROJECTS | PROJECTS_MANAGER | رئيس قسم المشاريع | ✅ | Originates F-85; approves F-21 stage 2, F-23 stage 1 |
| PROJECTS | HEAD_DIAGNOSIS | رئيس قسم التشخيص | ✅ | Originates F-04; co-originates F-84 |
| PROJECTS | HEAD_SUPERVISION | رئيس قسم الإشراف | ✅ | Originates F-32, F-14, F-52; approves F-14 stage 1 |
| PROJECTS | DIAGNOSIS_ENGINEER | مهندس التشخيص / الإشراف | — | Originates F-08, F-21, F-20, F-33, F-34, F-23; approves F-14 stage 2 |
| PROJECTS | ITQAN_HEAD | رئيس لجنة إتقان | ✅ | quality audit view |
| PROJECTS | ITQAN_MEMBER | عضو لجنة إتقان | — | quality audit view |
| FINANCE | FINANCE_HEAD | المدير المالي | ✅ | approves F-15/F-35 if escalated |
| FINANCE | ACCOUNTANT | محاسب | — | Originates F-15, F-35; approves stage 0 & stage 2 |
| SUPPORT | SUPPORT_MANAGER | مدير الخدمات المساندة | ✅ | F-20 collaboration; F-19 oversight |
| SUPPORT | PROCUREMENT_OFFICER | مسؤول المشتريات | — | Originates F-19; collaborates F-20 |
| SUPPORT | WAREHOUSE_CLERK | أمين المستودع | — | F-19 fulfillment |
| VOLUNTEER | VOLUNTEER_MANAGER | مدير التطوع | ✅ | volunteer portal only |
| MARKETING | MARKETING_MANAGER | مدير التسويق | ✅ | marketing portal only |
| MARKETING | DIGITAL_MARKETING | مسؤول التسويق الرقمي | — | marketing portal only |
| PARTNERSHIP | PARTNERSHIP_MANAGER | مدير الشراكات | ✅ | receives F-22 bridge |
| COMMS | PR_OFFICER | مسؤول الإعلام | ✅ | receives F-52 bridge |
| (any) | SYSTEM | النظام الآلي | — | auto-skip approvals only |

Bolded roles = active workflow actors.

---

## 3. The 22 Forms — Authoritative Routing Table

| Code | Title (AR) | Phase | Owner Dept | Originated by | Approval Chain | Bridges to | SLA (business days) |
|---|---|---|---|---|---|---|---|
| F-02 | استمارة البحث الاجتماعي | 1 | RESEARCH | SOCIAL_RESEARCHER | SOCIAL_RESEARCHER → RESEARCH_MANAGER | — | 5 |
| F-03 | اعتماد مدير البحث | 1 | RESEARCH | RESEARCH_MANAGER | RESEARCH_MANAGER | — | 3 |
| F-03.1 | اعتماد المدير التنفيذي | 1 | EXEC | EXEC_DIRECTOR | EXEC_DIRECTOR | RESEARCH | 3 |
| F-03.2 | الاعتماد النهائي للإحالة | 1 | RESEARCH | RESEARCH_MANAGER | RESEARCH_MANAGER | PROJECTS | 2 |
| F-04 | تعيين مهندس التشخيص | 2 | PROJECTS | HEAD_DIAGNOSIS | HEAD_DIAGNOSIS | — | 2 |
| F-08 | كراسة التشخيص | 2 | PROJECTS | DIAGNOSIS_ENGINEER | DIAGNOSIS_ENGINEER → HEAD_DIAGNOSIS | — | 7 |
| F-18 | تعهد إخلاء المبنى | 2 | RESEARCH | SOCIAL_RESEARCHER | SOCIAL_RESEARCHER | — | 5 |
| F-22 | توفير سكن بديل | 2 | RESEARCH | SOCIAL_RESEARCHER | SOCIAL_RESEARCHER | PARTNERSHIP | 3 |
| F-21 | حصر الأثاث والأجهزة | 2 | PROJECTS | DIAGNOSIS_ENGINEER | DIAGNOSIS_ENGINEER → PROJECTS_MANAGER | — | 7 |
| F-20 | خطة توريد المواد (Workspace) | 2/3 | PROJECTS | DIAGNOSIS_ENGINEER + HEAD_DIAGNOSIS | DIAGNOSIS_ENGINEER (with SUPPORT collab) | SUPPORT | 5 |
| F-84 | تسعيرات المقاولين | 3 | PROJECTS | HEAD_DIAGNOSIS, DIAGNOSIS_ENGINEER | DIAGNOSIS_ENGINEER | — | 4 |
| F-85 | اعتماد الترسية | 3 | PROJECTS | PROJECTS_MANAGER | PROJECTS_MANAGER | FINANCE | 2 |
| F-32 | تعيين المهندس المشرف | 3 | PROJECTS | HEAD_SUPERVISION | HEAD_SUPERVISION | — | 2 |
| F-33 | توثيق البدء | 3 | PROJECTS | DIAGNOSIS_ENGINEER (assigned supervisor) | DIAGNOSIS_ENGINEER | — | 2 |
| F-35 | طلب دفعة أولى (30%) | 4 | FINANCE | ACCOUNTANT | ACCOUNTANT → EXEC_DIRECTOR → ACCOUNTANT | — | 4 |
| F-34 | إحالة حصر المواد | 4 | PROJECTS | DIAGNOSIS_ENGINEER, HEAD_SUPERVISION | DIAGNOSIS_ENGINEER | — | 3 |
| F-19 | طلب توريد داخلي (tracker) | 4 | SUPPORT | PROCUREMENT_OFFICER | PROCUREMENT_OFFICER | — | null (permanent tracker) |
| F-14 | تقرير الإشراف (يتكرر) | 4 | PROJECTS | HEAD_SUPERVISION (assign sec.) → DIAGNOSIS_ENGINEER (report sec.) | HEAD_SUPERVISION → DIAGNOSIS_ENGINEER | — | 2 |
| F-23 | اعتماد بنود أعمال إضافية | 4 | PROJECTS | DIAGNOSIS_ENGINEER, PROJECTS_MANAGER | PROJECTS_MANAGER → EXEC_DIRECTOR | — | 3 |
| F-15 | طلب صرف دفعة (يتولد آلياً) | 4 | FINANCE | SYSTEM (auto on F-14 milestones) | ACCOUNTANT → EXEC_DIRECTOR → ACCOUNTANT | — | 4 |
| F-07 | شهادة تسليم المنزل | 5 | RESEARCH | RESEARCH_MANAGER | RESEARCH_MANAGER | — | 2 |
| F-52 | طلب تصوير وتوثيق | 5 | PROJECTS | HEAD_SUPERVISION, DIAGNOSIS_ENGINEER | HEAD_SUPERVISION | COMMS | 7 |

---

## 4. The 5-Phase Workflow + Cascade Triggers

```
PHASE 1 — البحث والاعتماد            [forms: F-02, F-03, F-03.1, F-03.2]
   F-02 created  →  approves to F-03  →  approves to F-03.1  →  approves to F-03.2
   F-03.2 approved  ⇒  project.phase = "DIAGNOSIS", activate F-04

PHASE 2 — التشخيص والتجهيز           [forms: F-04, F-08, F-18, F-22, F-21, F-20]
   F-04 assigns engineer  ⇒  activate F-08 (assignee = engineer)
   F-08 approved  ⇒  activate F-21 + F-20
                 ⇒  if safetyHazard=true → activate F-18 & F-22
                    else → auto-complete F-18 & F-22 with SYSTEM note "لا يحتاج إخلاء"
   F-21 approved  ⇒  bridges furniture inventory to F-20
   F-20 approved (Projects side)  ⇒  project.phase = "TENDERING", activate F-84

PHASE 3 — الترسية والبدء             [forms: F-84, F-85, F-32, F-33]
   F-84 approved (bids collected)  ⇒  activate F-85
   F-85 approved (winner)  ⇒  set project.contractorName, project.awardedPrice
                          ⇒  activate F-32 (+ F-35)
   F-32 approved (supervisor assigned)  ⇒  activate F-33 (assignee = supervisor)
   F-33 approved  ⇒  project.phase = "EXECUTION", activate F-14 (1st report), F-19, F-34

PHASE 4 — التنفيذ والمالية            [forms: F-34, F-19, F-35, F-14*, F-23, F-15*]
   F-35 approved (3-stage: accountant→exec→accountant=transfer)  ⇒  payment 1 of 4 done
   F-14 each report carries overallProgress %
       overall ≥ 60%  ⇒  auto-create F-15 (payment 2 of 4)
       overall ≥ 90%  ⇒  auto-create F-15 (payment 3 of 4)
       overall = 100% ⇒  auto-create F-15 (payment 4 of 4, final)
   F-14 with requestScopeChange=true  ⇒  auto-create F-23
   F-14 approved with overall < 100   ⇒  auto-create next F-14 (next visit number)
   F-15 (final, paymentIndex=4) approved  ⇒  project.phase = "HANDOVER", activate F-07

PHASE 5 — الإغلاق والتوثيق            [forms: F-07, F-52]
   F-07 approved  ⇒  if mediaRequested=true → activate F-52 (to HEAD_SUPERVISION → COMMS broadcast)
                                  else → auto-complete F-52
   F-07 approved  ⇒  project.phase = "CLOSED", progress = 100
```

### Terminal Phases

| Phase | Arabic | Trigger |
|---|---|---|
| CLOSED | مغلق | F-07 approval |
| REJECTED | مرفوض (غير مستحق / غير قابل للترميم) | F-03.1 decline OR F-08 decline |
| CANCELLED | ملغى | Admin action |

Forms eligible for terminal "Decline" (رفض نهائي): **F-03.1, F-08, F-23** only.

---

## 5. The RBAC Rule (`formAwaitsUser`, final version)

A user can approve/edit a form **iff** all of the following hold:

1. `form.status === 'pending'` (not draft, approved, rejected, deferred, completed)
2. AND one of:
   - The user is Super Admin (`user.isAdmin === true`), OR
   - The user's role strictly equals `form.approvalChain[form.approvalIndex]`, AND
   - If `form.assigneeId` is set, then `form.assigneeId === user.id`
3. **Manager override:** if the user's role is `isManager: true` AND the user's department equals the next-role's department, they can act on behalf of a subordinate (used for sick days, recovery).
4. **Helper override:** if `user.id ∈ form.data.helpers[]`, they can edit collaboratively but not finally approve.
5. **Cross-dept collab:** F-20 (Material Supply) explicitly grants edit access to SUPPORT department members while it's pending. Also applied to F-19 via `additionalEditAccess` prop on FormShell.

Any user (regardless of role) can **view** any form on a project that's visible to them — the portal is the gate, the action button is the lock.

---

## 6. Action Vocabulary (4 verbs)

| Verb | Arabic | Meaning |
|---|---|---|
| Approve | اعتماد | Advance the form to next stage or to approved |
| Reject | إعادة للتعديل | Bounce back for rework (resubmittable) |
| Decline | رفض نهائي | Terminal "no" — only on F-03.1, F-08, F-23 |
| Defer | تأجيل | Pause awaiting external input |

### Reject Semantics (multi-stage vs single-stage)

- **Multi-stage forms** (chain.length > 1): reset to `approvalIndex=0`, stay `status='pending'`, notify first-stage role. Form data is preserved for re-edit context.
- **Single-stage forms**: set `status='rejected'`, notify `createdBy`.

### `FORM_REJECT_TARGET` (who owns the resubmit)

```ts
'F-02':   'SOCIAL_RESEARCHER'
'F-03':   'SOCIAL_RESEARCHER'
'F-03.1': 'RESEARCH_MANAGER'
'F-03.2': 'RESEARCH_MANAGER'
'F-04':   'HEAD_DIAGNOSIS'
'F-08':   'DIAGNOSIS_ENGINEER'
'F-18':   'SOCIAL_RESEARCHER'
'F-22':   'SOCIAL_RESEARCHER'
'F-21':   'DIAGNOSIS_ENGINEER'
'F-84':   'DIAGNOSIS_ENGINEER'
'F-85':   'PROJECTS_MANAGER'
'F-32':   'HEAD_SUPERVISION'
'F-33':   'DIAGNOSIS_ENGINEER'
'F-34':   'DIAGNOSIS_ENGINEER'
'F-07':   'RESEARCH_MANAGER'
// F-14, F-15, F-23, F-35 reject to their own stage 0 (multi-stage logic)
```

### Reassignable Forms

`REASSIGNABLE_FORMS: ['F-04', 'F-08', 'F-32', 'F-33', 'F-14']`
