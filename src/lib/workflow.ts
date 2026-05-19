/**
 * workflow.ts — Cascade Engine (Decision 6)
 * TRIGGER_MAP, DECLINE_MAP, and applyCascade live here.
 * All post-approval cascade logic is decoupled from App.tsx.
 */

import {
  writeBatch, doc, collection, serverTimestamp, arrayUnion, addDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { FORM_BY_CODE, type FormCode, type RoleKey } from './data';
import type { FormRecord } from '../components/Forms';
import type { ProjectRecord } from '../components/forms/FormRenderers';
import type { UserProfile } from '../components/Auth';

/* ──────────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────────── */

export type ProjectPhase =
  | 'RESEARCH' | 'DIAGNOSIS' | 'EVACUATION' | 'TENDERING'
  | 'EXECUTION' | 'HANDOVER' | 'CLOSED' | 'REJECTED' | 'CANCELLED';

export interface CascadeResult {
  projectPatch?: Partial<ProjectRecord> & { data?: Record<string, unknown> };
  activate?:     { formId: string; assigneeId?: string | null; data?: Record<string, unknown> }[];
  autoComplete?: { formId: string; note: string }[];
  createForms?:  { code: FormCode; data: Record<string, unknown>; title?: string; assigneeId?: string | null }[];
  notify?:       { recipients: string[]; text: string; subject: string; link?: string; type: string }[];
}

export interface CascadeContext {
  approvedRecord: FormRecord;
  forms: FormRecord[];
  projects: ProjectRecord[];
  users: UserProfile[];
  dataPatch?: Record<string, unknown>;
}

/* ──────────────────────────────────────────────────────────────────
   TRIGGER_MAP — fires when form.status reaches 'approved'
   ────────────────────────────────────────────────────────────────── */

export const TRIGGER_MAP: Partial<Record<FormCode, (ctx: CascadeContext) => CascadeResult>> = {

  'F-02': (ctx) => {
    const f03 = ctx.forms.find(f => f.code === 'F-03' && f.projectRefId === ctx.approvedRecord.projectRefId);
    return { activate: f03 ? [{ formId: f03.id }] : [] };
  },

  'F-03': (ctx) => {
    const f031 = ctx.forms.find(f => f.code === 'F-03.1' && f.projectRefId === ctx.approvedRecord.projectRefId);
    const src = (ctx.approvedRecord.data || {}) as { managerNotes?: string; eligibilityVerdict?: string };
    return {
      activate: f031 ? [{
        formId: f031.id,
        data: { managerNotes: src.managerNotes, eligibilityVerdict: src.eligibilityVerdict },
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
      projectPatch: { diagnosisEngineerId: engineerId } as Partial<ProjectRecord>,
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
      } as Partial<ProjectRecord>,
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
      projectPatch: { supervisingEngineerId: supervisorId } as Partial<ProjectRecord>,
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
      .map(w => ({ id: w.id, name: w.name }));

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

    // دفعات الدفع حسب نسبة الإنجاز
    if (overall >= 60  && !existingF15.some(f => (f.data as { paymentIndex?: number })?.paymentIndex === 2))
      createForms.push({ code: 'F-15', data: { paymentIndex: 2 }, title: 'طلب صرف الدفعة الثانية (30%)' });
    if (overall >= 90  && !existingF15.some(f => (f.data as { paymentIndex?: number })?.paymentIndex === 3))
      createForms.push({ code: 'F-15', data: { paymentIndex: 3 }, title: 'طلب صرف الدفعة الثالثة (30%)' });
    if (overall >= 100 && !existingF15.some(f => (f.data as { paymentIndex?: number })?.paymentIndex === 4))
      createForms.push({ code: 'F-15', data: { paymentIndex: 4 }, title: 'طلب صرف الدفعة الأخيرة (10%)' });

    // تغيير النطاق → إنشاء F-23
    if (ctx.dataPatch?.requestScopeChange || (ctx.approvedRecord.data as { requestScopeChange?: boolean })?.requestScopeChange) {
      createForms.push({
        code: 'F-23',
        data: { triggeredByF14: ctx.approvedRecord.id },
        title: 'اعتماد بنود أعمال إضافية (مولّد آلياً)',
      });
    }

    // إنشاء زيارة إشراف تالية عندما يكون التنفيذ جارياً
    if (overall < 100) {
      const f08 = ctx.forms.find(f => f.code === 'F-08' && f.projectRefId === projectRefId);
      const f08works = ((f08?.data as { works?: Array<{ id: string; name: string }> })?.works || [])
        .map(w => ({ id: w.id, name: w.name }));
      const currentVisit = Number((ctx.approvedRecord.data as { visitNumber?: number })?.visitNumber || 1);
      const nextVisit = currentVisit + 1;
      createForms.push({
        code: 'F-14',
        data: { f08_works: f08works, visitNumber: nextVisit, previousVisitProgress: overall },
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

/* ──────────────────────────────────────────────────────────────────
   DECLINE_MAP — fires on terminal رفض نهائي
   ────────────────────────────────────────────────────────────────── */

export const DECLINE_ELIGIBLE_FORMS: FormCode[] = ['F-03.1', 'F-08', 'F-23'];

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
      projectPatch: { phase: 'REJECTED' as ProjectPhase, progressPct: 0 } as Partial<ProjectRecord>,
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
      .filter(u => u.status === 'active' && (['RESEARCH_MANAGER', 'PROJECTS_MANAGER', 'EXEC_DIRECTOR'] as RoleKey[]).includes(u.role as RoleKey))
      .map(u => u.id);
    return {
      projectPatch: { phase: 'REJECTED' as ProjectPhase, progressPct: 0 } as Partial<ProjectRecord>,
      autoComplete: draftsOnProject.map(f => ({ formId: f.id, note: 'المبنى غير قابل للترميم' })),
      notify: stakeholders.length ? [{
        recipients: stakeholders,
        text: `المبنى غير قابل للترميم — مشروع ${ctx.approvedRecord.projectId || ''}`,
        subject: 'عدم قابلية الترميم',
        type: 'project_not_renovable',
      }] : [],
    };
  },

  // F-23: رفض بنود إضافية — لا يغيّر حالة المشروع
  'F-23': () => ({}),
};

/* ──────────────────────────────────────────────────────────────────
   applyCascade — commits all cascade writes atomically
   ────────────────────────────────────────────────────────────────── */

export async function applyCascade(
  result: CascadeResult,
  ctx: CascadeContext,
  existingBatch?: ReturnType<typeof writeBatch>,
): Promise<void> {
  const batch = existingBatch || writeBatch(db);
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
      update.data = { ...(target?.data || {}), ...a.data }; // merge, not replace
    }
    batch.update(doc(db, 'forms', a.formId), update);
  }

  for (const a of result.autoComplete || []) {
    batch.update(doc(db, 'forms', a.formId), {
      status: 'completed',
      completedAt: now,
      approvals: arrayUnion({
        role: 'SYSTEM' as unknown as RoleKey,
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
      title: cf.title || def?.title || cf.code,
      projectId: ctx.approvedRecord.projectId || null,
      projectRefId: ctx.approvedRecord.projectRefId || null,
      beneficiaryName: ctx.approvedRecord.beneficiaryName || '',
      status: 'pending',
      approvalIndex: 0,
      approvalChain: def?.approvalChain || [],
      approvals: [],
      createdBy: 'system',
      createdByName: 'النظام',
      createdByRole: 'SYSTEM' as unknown as RoleKey,
      createdAt: now,
      updatedAt: now,
      ownerDept: def?.ownerDept || 'PROJECTS',
      bridgesTo: def?.bridgesTo || [],
      notes: '',
      data: cf.data,
      assigneeId: cf.assigneeId ?? null,
      files: [],
      stepStartedAt: now,
      triggeredBy: ctx.approvedRecord.id,
    });
  }

  await batch.commit();

  // إشعارات لا تحتاج أتمتة (post-commit)
  for (const n of result.notify || []) {
    if (!n.recipients.length) continue;
    await addDoc(collection(db, 'notifications'), {
      ...n,
      readBy: [],
      createdAt: new Date().toISOString(),
    });
  }
}
