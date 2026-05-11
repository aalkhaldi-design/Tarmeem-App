/* ──────────────────────────────────────────────────────────────────
   workflowState — pure helpers for the WorkflowDetailBody:
   - RBAC role aliases (user's vocabulary -> existing RoleKey)
   - per-form editor role lookup
   - isFormEditable (originator + chained-approval aware)
   - FORM_ID_TO_META (numeric workflow id -> backend FormCode + step)
   - deriveDynamicP4Forms (F-14 reports + F-15 payments, seq-paired)
   ────────────────────────────────────────────────────────────────── */

import type { FormCode, RoleKey } from '../../lib/data';
import type { FormRecord } from '../Forms';
import type { UserProfile } from '../Auth';

/* ───── 1. Role-name aliases (user's mental model -> RoleKey) ───── */

export const ROLE_ALIASES = {
  SOCIAL_RESEARCHER:    ['SOCIAL_RESEARCHER'] as RoleKey[],
  RESEARCH_MANAGER:     ['RESEARCH_MANAGER'] as RoleKey[],
  EXECUTIVE_DIRECTOR:   ['EXEC_DIRECTOR'] as RoleKey[],
  DIAGNOSIS_ENGINEER:   ['DIAGNOSIS_ENGINEER', 'HEAD_DIAGNOSIS'] as RoleKey[],
  SUPERVISING_ENGINEER: ['DIAGNOSIS_ENGINEER', 'HEAD_SUPERVISION'] as RoleKey[],
  SUPPORT_SERVICES:     ['SUPPORT_MANAGER', 'PROCUREMENT_OFFICER'] as RoleKey[],
  PROJECT_MANAGER:      ['PROJECTS_MANAGER'] as RoleKey[],
  FINANCE:              ['FINANCE_HEAD', 'ACCOUNTANT'] as RoleKey[],
  SAMAYA:               ['VOLUNTEER_MANAGER'] as RoleKey[],
  MEDIA_DEPT:           ['PR_OFFICER'] as RoleKey[],
};

/* ───── 2. Per-form originator role gate ───── */

export const FORM_EDIT_ROLES: Record<string, RoleKey[]> = {
  'F-02':   ROLE_ALIASES.SOCIAL_RESEARCHER,
  'F-03':   ROLE_ALIASES.RESEARCH_MANAGER,
  'F-04':   ROLE_ALIASES.DIAGNOSIS_ENGINEER,
  'F-08':   ROLE_ALIASES.DIAGNOSIS_ENGINEER,
  'F-18':   ROLE_ALIASES.SUPPORT_SERVICES,
  'F-22':   ROLE_ALIASES.SUPPORT_SERVICES,
  'F-20':   ROLE_ALIASES.SUPPORT_SERVICES,
  'F-85':   [...ROLE_ALIASES.PROJECT_MANAGER, ...ROLE_ALIASES.FINANCE, ...ROLE_ALIASES.EXECUTIVE_DIRECTOR],
  'F-09':   ROLE_ALIASES.SUPERVISING_ENGINEER,
  'F-33':   ROLE_ALIASES.SUPERVISING_ENGINEER,
  'F-14':   ROLE_ALIASES.SUPERVISING_ENGINEER,
  'F-15':   [...ROLE_ALIASES.PROJECT_MANAGER, ...ROLE_ALIASES.FINANCE],
  'F-23':   [...ROLE_ALIASES.SUPERVISING_ENGINEER, ...ROLE_ALIASES.PROJECT_MANAGER, ...ROLE_ALIASES.SAMAYA, ...ROLE_ALIASES.FINANCE, ...ROLE_ALIASES.EXECUTIVE_DIRECTOR],
  'F-19':   ROLE_ALIASES.SUPPORT_SERVICES,
  'F-07':   ROLE_ALIASES.SUPERVISING_ENGINEER,
  'F-52':   ROLE_ALIASES.MEDIA_DEPT,
};

/* ───── 3. Editability resolver ───── */

export const isFormEditable = (
  formCode: FormCode,
  rec: FormRecord | undefined,
  user: UserProfile,
): boolean => {
  if (user.role === 'ADMIN') return true;
  if (rec?.status === 'approved' || rec?.status === 'rejected') return false;

  if (rec && rec.status === 'pending') {
    return rec.approvalChain[rec.approvalIndex] === user.role;
  }

  const allowed = FORM_EDIT_ROLES[formCode] || [];
  return allowed.includes(user.role as RoleKey);
};

export const isFormCompleted = (rec: FormRecord | undefined): boolean =>
  rec?.status === 'approved';

/* ───── 4. Form ID metadata ───── */

export interface FormIdMeta {
  code: FormCode;
  step?: 0 | 1 | 2;
}

export const FORM_ID_TO_META: Record<number, FormIdMeta> = {
  11: { code: 'F-02' },
  12: { code: 'F-03', step: 0 },
  13: { code: 'F-03', step: 1 },
  14: { code: 'F-03', step: 2 },
  21: { code: 'F-04' },
  22: { code: 'F-08' },
  23: { code: 'F-22' },
  24: { code: 'F-18' },
  25: { code: 'F-20' },
  31: { code: 'F-85' },
  32: { code: 'F-09' },
  33: { code: 'F-33' },
  43: { code: 'F-23' },
  44: { code: 'F-19' },
  51: { code: 'F-07' },
  52: { code: 'F-52' },
};

/* ───── 5. Dynamic Phase-4 derivation ───── */

export type DynamicP4Form = {
  id: number;
  title: string;
  isDynamicReport?: boolean;
  isDynamicPayment?: boolean;
  isFloating?: boolean;
  seq: number;
  recId?: string;
};

export function deriveDynamicP4Forms(projectForms: FormRecord[]): DynamicP4Form[] {
  const reports = projectForms
    .filter(f => f.code === 'F-14')
    .sort((a, b) => ((a.data?.seq ?? 0) as number) - ((b.data?.seq ?? 0) as number));
  const payments = projectForms
    .filter(f => f.code === 'F-15')
    .sort((a, b) => ((a.data?.seq ?? 0) as number) - ((b.data?.seq ?? 0) as number));

  const out: DynamicP4Form[] = [];

  reports.forEach((rep) => {
    const seq = (rep.data?.seq ?? 1) as number;
    out.push({
      id: 41000 + seq,
      title: `تقرير مهندس الإشراف ${seq}`,
      isDynamicReport: true,
      seq,
      recId: rep.id,
    });
    if (rep.data?.triggersPayment) {
      const pay = payments.find(p => ((p.data?.seq ?? 0) as number) === seq);
      out.push({
        id: 42000 + seq,
        title: `طلب صرف دفعة ${seq}`,
        isDynamicPayment: true,
        seq,
        recId: pay?.id,
      });
    }
  });

  // Floating placeholder at the bottom: only if there are NO reports yet,
  // or the latest report hasn't triggered payment.
  if (reports.length === 0) {
    out.push({
      id: 42000 + 1,
      title: `طلب صرف دفعة 1`,
      isDynamicPayment: true,
      isFloating: true,
      seq: 1,
    });
  } else {
    const last = reports[reports.length - 1];
    if (!last.data?.triggersPayment) {
      const seq = (last.data?.seq ?? 1) as number;
      out.push({
        id: 42000 + seq,
        title: `طلب صرف دفعة ${seq}`,
        isDynamicPayment: true,
        isFloating: true,
        seq,
      });
    }
  }

  return out;
}

/* ───── 6. Project phase -> tracker tab ───── */

export const projectPhaseToTracker = (phase: string | undefined): 1 | 2 | 3 | 4 | 5 => {
  switch (phase) {
    case 'RESEARCH': return 1;
    case 'DIAGNOSIS':
    case 'EVACUATION': return 2;
    case 'TENDERING': return 3;
    case 'EXECUTION': return 4;
    case 'HANDOVER':
    case 'CLOSED': return 5;
    default: return 1;
  }
};
