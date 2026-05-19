# CLAUDE.md — Tarmeem ERP

## What Tarmeem Is

جمعية ترميم الخيرية — a Saudi charity that fully renovates homes for needy beneficiaries. The app is its internal operations platform ("منصة العمليات الموحّدة"), Arabic-first (RTL), Tajawal font, dark-mode-first, brand colors purple `#4A1F66` + teal `#43bba1`. The Odoo plan is dead. This is an internal app for ~9 departments, focused on a 5-phase project workflow and an ERP dashboard.

**Stack:** React + TypeScript + Tailwind + Firebase (Firestore, Auth, Storage)

## 7 Architectural Decisions

> These are final. Do not reverse without re-reading docs/AUDIT_HISTORY.md first.

**Decision 1: Keep all 9 departments, but tag the "Active 7" vs "Reference 2"**
Active in the project workflow: EXEC, RESEARCH, PROJECTS, FINANCE, SUPPORT, PARTNERSHIP, COMMS. Reference-only (have portals & members but no forms in the project pipeline yet): VOLUNTEER, MARKETING. This matches the current data.tsx and the "stick to what we have" instruction.

**Decision 2: Drop the standalone ADMIN role**
Admin is now strictly a flag (`isAdmin: true`) on top of any real role, not a role itself. This kills the "ghost privileges" bug from the Gemini audit. Admins keep their real department/role for portal visibility but gain global override.

**Decision 3: Move FormRenderers from one 80KB monolith into per-form files**
```
src/components/forms/F02_SocialResearch.tsx
src/components/forms/F03_ResearchApproval.tsx
... (22 files)
src/components/forms/_shared.tsx     ← FormShell, CroquisViewer, GenericFallback
src/components/forms/index.ts        ← RENDERERS + CREATORS registry
```
This is non-negotiable for maintainability — Gemini's monolith is what caused the skeletons.

**Decision 4: Replace client-side SLA with Firestore `serverTimestamp()` + business-day calculator**
Skips Friday/Saturday (Saudi weekend). Lives in `src/lib/sla.ts`.

**Decision 5: Add Firestore Security Rules + bounded listeners**
- notifications listener filtered server-side by `where('recipients', 'array-contains', uid)`.
- forms and projects listeners use `orderBy('updatedAt', 'desc') + limit(500)`.
- Firestore rules enforce role checks (defense in depth — the React `formAwaitsUser` becomes UX, not security).

**Decision 6: Decouple advanceForm cascades into a "trigger map"**
Each form's "what happens after I'm approved" lives in a declarative `TRIGGER_MAP` in `src/lib/workflow.ts`, not inside App.tsx. The God Function dies. Trigger fns get a writeBatch and commit atomically.

**Decision 7: Make Light Mode actually work — but keep Dark as the default**
Every hardcoded `bg-[#0a0a0a]` becomes `bg-white dark:bg-[#0a0a0a]` etc. The `<ThemeToggle />` works for real. Default: dark.

## Brand

| Token | Value |
|---|---|
| Purple (primary) | `#4A1F66` |
| Purple light | `#6B3D87` |
| Purple dark | `#3A1652` |
| Teal (accent) | `#43bba1` |
| Teal light | `#7AC8AD` |
| Accent violet | `#a871f7` |
| Cream | `#FFF8E7` |

Font: **Tajawal** (Arabic-optimized, RTL-first)

## RTL / Arabic Constraints

- All UI is `dir="rtl"` by default.
- Arabic text must be preserved exactly as written in planning docs — do not paraphrase Arabic form titles, role names, or department names.
- Tailwind RTL variants (`start-*`, `end-*`, `ms-*`, `me-*`) over `left-*`/`right-*` where possible.
- Tajawal at `font-sans` via `tailwind.config.js`. No other fonts.
- Text alignment: `text-right` is the default; only use `text-left` for code/numbers.

## File Tree (33 source files)

```
src/
├── App.tsx                                ← Shell + auth + global state
├── main.tsx
├── index.css                              ← Tailwind base + CSS vars + splash choreography
├── lib/
│   ├── firebase.ts
│   ├── data.ts                            ← Departments, roles, forms dictionary
│   ├── workflow.ts                        ← TRIGGER_MAP + DECLINE_MAP + applyCascade
│   ├── sla.ts                             ← Business-day SLA calculator
│   ├── rbac.ts                            ← formAwaitsUser, portalAccess
│   ├── audit.ts                           ← writeAuditEntry (project + user events only)
│   └── migrations.ts                      ← migrateF20Messages()
├── hooks/
│   ├── useAuth.ts
│   ├── useFirestoreCollection.ts          ← key is required (non-optional)
│   └── useNotifications.ts
├── components/
│   ├── ui.tsx / ui/index.tsx
│   ├── TarmeemLogo.tsx                    ← 5 variants × 3 color modes, hand-authored SVG
│   ├── ThemeProvider.tsx
│   ├── Auth.tsx
│   ├── Home.tsx
│   ├── Forms.tsx
│   ├── Departments.tsx
│   ├── Projects.tsx
│   ├── EmployeeProfile.tsx
│   ├── Admin.tsx
│   └── forms/
│       ├── _shared.tsx                    ← FormShell, CroquisEditor, GenericFallback,
│       │                                     MultiStageActionBar, RENDERER_CONTRACT,
│       │                                     ACTIVATE_DATA_PROPAGATIONS
│       ├── F02_SocialResearch.tsx
│       ├── F03_ResearchApproval.tsx
│       ├── F03_1_ExecApproval.tsx
│       ├── F03_2_FinalTransfer.tsx
│       ├── F04_AssignDiagnosisEngineer.tsx
│       ├── F08_DiagnosisBinder.tsx
│       ├── F14_SupervisionReport.tsx
│       ├── F15_InstallmentPayment.tsx
│       ├── F18_EvacuationPledge.tsx
│       ├── F19_InternalSupply.tsx
│       ├── F20_MaterialSupply.tsx
│       ├── F21_FurnitureInventory.tsx
│       ├── F22_AltHousing.tsx
│       ├── F23_AdditionalWorks.tsx
│       ├── F32_AssignSupervisor.tsx
│       ├── F33_StartDocumentation.tsx
│       ├── F34_MaterialTransfer.tsx
│       ├── F35_FirstPayment.tsx
│       ├── F52_MediaCoverage.tsx
│       ├── F07_HandoverCertificate.tsx
│       ├── F84_ContractorPricing.tsx
│       ├── F85_TenderingAward.tsx
│       └── index.ts                       ← RENDERERS registry
└── firestore.rules
```

## Detail Files

- **@docs/RBAC.md** — 9 departments, 24 roles, 22-form routing table, RBAC rule
- **@docs/WORKFLOW.md** — TRIGGER_MAP, DECLINE_MAP, applyCascade, ACTIVATE_DATA_PROPAGATIONS, RENDERER_CONTRACT, cascade patterns
- **@docs/UI_SPECS.md** — TarmeemLogo SVG spec, splash choreography, theme tokens, RTL rules
- **@docs/AUDIT_HISTORY.md** — chronological log of all defects found and fixed across 4 planning rounds
