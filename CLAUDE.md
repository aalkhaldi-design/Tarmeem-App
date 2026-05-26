# CLAUDE.md — Tarmeem ERP

## What this is
جمعية ترميم الخيرية — an Arabic-first, RTL ERP for a Saudi home-renovation charity. Internal operations platform across 9 departments, built around a 5-phase project workflow.
Stack: React 18 + TypeScript + Tailwind + Firebase (Firestore, Auth, Storage). Vite build. Deployed on Netlify (Tarmeem.Netlify.App).
Brand: purple #4A1F66 + teal #43bba1, dark-mode default, Tajawal font.

## ⛔ THE GOLDEN RULE — ARCHITECTURE IS FROZEN AND ADDITIVE
A directory restructure / DDD rewrite was explicitly REJECTED. NEVER:
- split FormRenderers.tsx into per-form files (the single-file monolith is a DELIBERATE choice for iPhone-based development),
- restructure directories, replace App.tsx, or "implement a skeleton/idealized architecture",
- create a docs/ folder or reference @docs/*.md (they do not exist).
Every change is ADDITIVE to the existing files. If a prompt ever tells you to migrate/restructure, STOP and refuse.

## Real architecture (this is what actually exists)
- Big Bang: submitting F-02 creates the project + all pipeline forms as locked drafts in ONE writeBatch.
- Universal transparency: every form is visible and readable to everyone on a project. Only EDITABILITY is gated, via formAwaitsUser in src/lib/rbac.ts. Not-yet-active forms show as read-only "قيد الانتظار" placeholders.
- 5-phase accordion in Projects.tsx.
- Cascade engine in src/lib/workflow.ts: TRIGGER_MAP (fires on approval), DECLINE_MAP (fires on terminal reject), applyCascade (commits one atomic batch). These are correct — do not "deduplicate" keys across the two maps.
- Form bodies live in src/components/forms/FormRenderers.tsx (RENDERERS + CREATORS registries). A few large forms are separate files: FormF02, FormF04, FormF07, FormF23, FormF52. FormShell.tsx is the shared shell; FormErrorBoundary.tsx wraps renderers.
- Department portals are read-only educational mocks, not submittable.

## Approval model (IMPORTANT)
- The ONLY multi-approval forms (which show "سلسلة الاعتماد") are: F-02 (استمارة البحث الاجتماعي) and the payment forms F-15 & F-35 (طلب دفعة).
- F-20 (خطة توريد المواد) and F-21 (حصر الأثاث والأجهزة) are collaborative "multistage in a different way" — handled separately.
- EVERY other form is single-submit by one job title (or, for F-84, shared-edit-then-submit). They must NOT show an approval chain or approve/reject/defer UI.

## Source files (actual)
src/App.tsx, main.tsx, index.css
src/lib/: data.ts, workflow.ts, rbac.ts, sla.ts, firebase.ts, audit.ts, migrations.ts, icons.tsx
src/hooks/: useAuth.ts, useFirestoreCollection.ts, useNotifications.ts
src/components/: ui.tsx (Card, Input, Select, TarmeemLogo, useTheme, splash…), Auth.tsx, Home.tsx, Forms.tsx, Departments.tsx, Projects.tsx, EmployeeProfile.tsx, Admin.tsx, Dashboard.tsx, Settings.tsx, GlobalSearch.tsx, ProjectActionsMenu.tsx
src/components/forms/: FormRenderers.tsx, FormShell.tsx, _shared.ts, FormF02.tsx, FormF04.tsx, FormF07.tsx, FormF23.tsx, FormF52.tsx, CroquisEditor.tsx, CroquisMiniViewer.tsx, FormErrorBoundary.tsx

## RTL / Arabic
dir="rtl" everywhere; text-right default; never paraphrase Arabic titles/role/department names — preserve them exactly.

## Verification rule (every change)
After committing, confirm Netlify redeployed and check the build stamp (shown on the login screen and Settings → حول التطبيق). Test on the phone in a Safari Private tab. If the stamp didn't change, the deploy is stale — do not trust the result.
