import React, { useMemo, useState } from 'react';
import { Send, CheckCircle, XCircle, Clock, ArrowLeft, AlertTriangle, Inbox, Plus, GitBranch, ListChecks, X, Activity } from 'lucide-react';
import { FORMS, FORM_BY_CODE, FORM_STATUS_LABELS, FormCode, FormDef, FormStatus, RoleKey, roleName, DepartmentKey, departmentName, slaStatus, ROLE_BY_KEY } from '../lib/data';
import { Card, Pill, EmptyState } from './ui';
import type { UserProfile } from './Auth';

export interface FormApproval {
  role: RoleKey;
  actorId: string;
  actorName?: string;
  at: string;
  decision: 'approved' | 'rejected' | 'deferred';
  note?: string;
  isLate?: boolean;
  daysTaken?: number;
}

export interface FormRecord {
  id: string;
  code: FormCode;
  title: string;
  projectId?: string | null;
  projectRefId?: string | null;
  beneficiaryName?: string;
  status: FormStatus;
  approvalIndex: number;
  approvalChain: RoleKey[];
  approvals: FormApproval[];
  createdBy: string;
  createdByName?: string;
  createdByRole: RoleKey;
  createdAt: string;
  updatedAt: string;
  ownerDept: DepartmentKey;
  bridgesTo: DepartmentKey[];
  notes?: string;
  data?: Record<string, any>;
  triggeredBy?: string | null;
  assigneeId?: string | null;
  files?: { name: string; url?: string; size?: number; uploadedAt?: string }[];
  stepStartedAt?: string;
}

export interface FormsApi {
  forms: FormRecord[];
  createForm: (input: {
    code: FormCode;
    user: UserProfile;
    projectId?: string | null;
    projectRefId?: string | null;
    beneficiaryName?: string;
    notes?: string;
    data?: Record<string, any>;
    triggeredBy?: string | null;
    assigneeId?: string | null;
    files?: FormRecord['files'];
    status?: FormStatus;
    title?: string;
  }) => Promise<string | null>;
  activateForm: (formId: string, assigneeId?: string) => Promise<void>;
  approveForm: (formId: string, user: UserProfile, note?: string, dataPatch?: Record<string, any>) => Promise<void>;
  rejectForm: (formId: string, user: UserProfile, note?: string) => Promise<void>;
  deferForm: (formId: string, user: UserProfile, note?: string) => Promise<void>;
  updateFormData: (formId: string, dataPatch: Record<string, any>) => Promise<void>;
  attachFiles: (formId: string, files: FormRecord['files']) => Promise<void>;
}

export function formCanBeOriginatedBy(form: FormDef, role: RoleKey): boolean {
  return form.originRoles.includes(role);
}

// 🚨 FIXED: RBAC Authorization Engine. Now deeply evaluates origin roles, cross-dept rules, and specific project assignments.
export function formAwaitsUser(record: FormRecord, user: UserProfile, projectContext?: any): boolean {
  if (record.status !== 'pending') return false;
  if (user.isAdmin || user.role === 'ADMIN' || user.role === 'EXEC_DIRECTOR') return true;

  const def = FORM_BY_CODE[record.code];
  if (!def) return false;

  const userRoleDef = ROLE_BY_KEY[user.role as RoleKey];
  const userDept = user.department || userRoleDef?.department;

  // 1. Base Check: Does the user's role match the origin roles meant to act on this form?
  let hasBaseRole = def.originRoles.includes(user.role as RoleKey);

  // Supply specific override mapping
  if (['F-20', 'F-19', 'F-34', 'F-84'].includes(record.code) && userDept === 'SUPPLY') {
    hasBaseRole = true;
  }

  // 2. Department Manager Override (Managers can act on any form originating in their department)
  const isDeptManager = (userRoleDef?.isManager || user.isManager) && def.ownerDept === userDept;

  // 3. Cross-Role Department Override (e.g. Exec/Finance employees handling all respective forms)
  let isCrossRoleAuth = false;
  if (['FINANCE', 'EXEC', 'SUPPLY'].includes(def.ownerDept)) {
    if (userDept === def.ownerDept) isCrossRoleAuth = true;
  }

  // 4. Engineering Context & Field Helpers
  let isHelper = record.data?.helpers?.includes(user.id) || false;
  let isAssigned = false;

  if (projectContext) {
    const helpersArray: string[] = projectContext.helpers || projectContext.data?.helpers || [];
    if (helpersArray.includes(user.id)) isHelper = true;

    if (def.ownerDept === 'PROJECTS') {
      const isDiagnosis = def.originRoles.includes('DIAGNOSIS_ENGINEER');
      const isExecution = def.originRoles.includes('EXECUTION_ENGINEER');

      // Secure specific assignments: Revoke base role if someone else is exclusively assigned
      if (isDiagnosis) {
         if (projectContext.diagnosisEngineerId === user.id) isAssigned = true;
         else if (projectContext.diagnosisEngineerId) hasBaseRole = false;
      }
      if (isExecution) {
         if (projectContext.supervisingEngineerId === user.id) isAssigned = true;
         else if (projectContext.supervisingEngineerId) hasBaseRole = false;
      }
    }
  }

  // Evaluate the final authorization matrix
  if (hasBaseRole || isDeptManager || isCrossRoleAuth || isHelper || isAssigned) {
    // Final explicit check: if the record explicitly locks an assigneeId, respect it.
    if (record.assigneeId && record.assigneeId !== user.id && !isDeptManager) return false;
    return true;
  }

  return false;
}

export const FormCard: React.FC<{ rec: FormRecord; onOpen: () => void; highlight?: boolean; }> = ({ rec, onOpen, highlight }) => {
  const def = FORM_BY_CODE[rec.code];
  const nextRole = rec.approvalChain[rec.approvalIndex];
  const sla = slaStatus(rec.stepStartedAt || rec.updatedAt, def?.slaDays);

  return (
    <button onClick={onOpen} className={`w-full text-right rounded-lg border p-3 hover:shadow-md transition flex items-start gap-3 ${highlight ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700' : 'border-gray-200 bg-white hover:border-[#4A1F66]/30 dark:bg-slate-800 dark:border-slate-700'}`}>
      <div className="w-10 h-10 rounded-lg bg-[#4A1F66]/10 dark:bg-purple-900/40 text-[#4A1F66] dark:text-purple-300 flex items-center justify-center font-bold text-[11px] shrink-0">
        {rec.code}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{rec.title || def?.title}</span>
          <Pill tone={rec.status === 'approved' ? 'green' : rec.status === 'rejected' ? 'red' : rec.status === 'pending' ? 'amber' : rec.status === 'deferred' ? 'blue' : 'gray'}>
            {FORM_STATUS_LABELS[rec.status]}
          </Pill>
          {rec.projectId && <Pill tone="purple">{rec.projectId}</Pill>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 dark:text-slate-400 flex-wrap">
          {rec.beneficiaryName && <span>المستفيد: {rec.beneficiaryName}</span>}
          {rec.status === 'pending' && nextRole && <span className="text-amber-700 dark:text-amber-300 font-bold">بانتظار: {roleName(nextRole)}</span>}
          {rec.status === 'pending' && def?.slaDays && <span className={`font-bold ${sla.tone === 'late' ? 'text-red-600' : sla.tone === 'warn' ? 'text-orange-600' : 'text-gray-500'}`}>{sla.text}</span>}
        </div>
      </div>
      <ArrowLeft className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
    </button>
  );
};

export const ApprovalChainView: React.FC<{ rec: FormRecord }> = ({ rec }) => (
  <ol className="space-y-2">
    {rec.approvalChain.map((r, idx) => {
      const passed = idx < rec.approvalIndex;
      const current = idx === rec.approvalIndex && rec.status === 'pending';
      const approval = rec.approvals.find(a => a.role === r);

      return (
        <li key={r + '-' + idx} className={`flex items-center gap-3 p-2 rounded-lg border ${current ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700' : passed ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800' : 'border-gray-200 dark:border-slate-700'}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${current ? 'bg-amber-500 text-white' : passed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
            {idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 dark:text-slate-200">{roleName(r)}</p>
            {approval && (
              <p className="text-[10px] text-gray-500 dark:text-slate-400">
                {approval.decision === 'approved' ? 'اعتمد' : approval.decision === 'rejected' ? 'رفض' : 'أجَّل'}
                {' '}{new Date(approval.at).toLocaleString('ar-SA')}
                {approval.actorName ? ` — ${approval.actorName}` : ''}
                {approval.note ? ` — ${approval.note}` : ''}
                {approval.isLate && <span className="text-red-500 font-bold mr-1">(تجاوز المدة)</span>}
              </p>
            )}
          </div>
          {passed && <CheckCircle className="w-4 h-4 text-green-500" />}
          {current && <Clock className="w-4 h-4 text-amber-500" />}
        </li>
      );
    })}
  </ol>
);

export const InboxPanel: React.FC<{ user: UserProfile; api: FormsApi; onOpen: (id: string) => void; context?: any }> = ({ user, api, onOpen, context }) => {
  const inbox = useMemo(() => api.forms.filter(f => {
    const proj = context?.projects?.find((p: any) => p.id === f.projectRefId);
    return formAwaitsUser(f, user, proj);
  }), [api.forms, user, context]);

  return (
    <Card title={`صندوق الوارد (${inbox.length})`} icon={Inbox}>
      {inbox.length === 0 ? (
        <EmptyState icon={CheckCircle} title="لا توجد طلبات معلّقة على دورك حالياً" />
      ) : (
        <div className="space-y-2">
          {inbox.map(f => <FormCard key={f.id} rec={f} highlight onOpen={() => onOpen(f.id)} />)}
        </div>
      )}
    </Card>
  );
};

export type FormRenderer = React.FC<{ rec: FormRecord; user: UserProfile; api: FormsApi; users: UserProfile[]; context: any; onClose: () => void; }>;
export interface FormRendererRegistry { [code: string]: FormRenderer | undefined; }

export const FormDetailModal: React.FC<{ rec: FormRecord; user: UserProfile; api: FormsApi; users: UserProfile[]; registry: FormRendererRegistry; context: any; onClose: () => void; }> = ({ rec, user, api, users, registry, context, onClose }) => {
  const def = FORM_BY_CODE[rec.code];
  const Renderer = registry[rec.code];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center font-bold text-xs">{rec.code}</div>
            <div>
              <h2 className="font-bold text-lg">{rec.title || def?.title}</h2>
              <p className="text-[11px] text-white/70">{def?.titleEn} {rec.projectId && `· ${rec.projectId}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">
          {Renderer ? (
            <Renderer rec={rec} user={user} api={api} users={users} context={context} onClose={onClose} />
          ) : (
            <DefaultFormView rec={rec} user={user} api={api} context={context} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
};

const DefaultFormView: React.FC<{ rec: FormRecord; user: UserProfile; api: FormsApi; context?: any; onClose: () => void; }> = ({ rec, user, api, context, onClose }) => {
  const def = FORM_BY_CODE[rec.code];
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const proj = context?.projects?.find((p: any) => p.id === rec.projectRefId);
  const awaits = formAwaitsUser(rec, user, proj);

  const act = async (kind: 'approve' | 'reject' | 'defer') => {
    setBusy(true);
    try {
      if (kind === 'approve') await api.approveForm(rec.id, user, note);
      else if (kind === 'reject') await api.rejectForm(rec.id, user, note);
      else await api.deferForm(rec.id, user, note);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {def?.description && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
          {def.description}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
          <p className="text-gray-500 mb-1">الحالة</p>
          <Pill tone={rec.status === 'approved' ? 'green' : rec.status === 'rejected' ? 'red' : rec.status === 'pending' ? 'amber' : rec.status === 'deferred' ? 'blue' : 'gray'}>
            {FORM_STATUS_LABELS[rec.status]}
          </Pill>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
          <p className="text-gray-500 mb-1">المُنشِئ</p>
          <p className="font-bold text-gray-800 dark:text-slate-200">{rec.createdByName || '—'}</p>
          <p className="text-[10px] text-gray-400">{roleName(rec.createdByRole)}</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
          <p className="text-gray-500 mb-1">المرجع</p>
          <p className="font-bold text-gray-800 dark:text-slate-200">{rec.projectId || '—'}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-gray-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
          <ListChecks className="w-4 h-4" /> سلسلة الاعتماد
        </p>
        <ApprovalChainView rec={rec} />
      </div>

      {rec.notes && (
        <div>
          <p className="text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">ملاحظات</p>
          <p className="text-sm bg-gray-50 dark:bg-slate-800 rounded-lg p-3 text-gray-700 dark:text-slate-200">{rec.notes}</p>
        </div>
      )}

      {awaits && (
        <div className="border-t pt-4 space-y-3 dark:border-slate-700">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="ملاحظتك على القرار (اختياري)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#56B894]"
          />
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => act('approve')} disabled={busy} className="flex-1 min-w-[120px] py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition flex items-center justify-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> اعتماد
            </button>
            <button onClick={() => act('reject')} disabled={busy} className="flex-1 min-w-[120px] py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition flex items-center justify-center gap-1.5">
              <XCircle className="w-4 h-4" /> رفض
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export type FormCreator = React.FC<{ user: UserProfile; api: FormsApi; users: UserProfile[]; context: any; onClose: () => void; preselect?: FormCode; }>;
export interface FormCreatorRegistry { [code: string]: FormCreator | undefined; }

export const NewFormModal: React.FC<{ user: UserProfile; api: FormsApi; users: UserProfile[]; context: any; creators: FormCreatorRegistry; preselect?: FormCode; onClose: () => void; }> = ({ user, api, users, context, creators, preselect, onClose }) => {
  const allowed = useMemo(() => FORMS.filter(f => formCanBeOriginatedBy(f, user.role as RoleKey) || user.role === 'ADMIN'), [user.role]);
  const [code, setCode] = useState<FormCode | null>(preselect && allowed.some(f => f.code === preselect) ? preselect : null);

  if (allowed.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-700 dark:text-slate-200 mb-3">لا تملك صلاحية إنشاء نماذج بدورك الحالي.</p>
          <button onClick={onClose} className="px-5 py-2 bg-gray-200 dark:bg-slate-700 rounded-lg text-sm font-bold">إغلاق</button>
        </div>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Plus className="w-5 h-5" />
              <h2 className="font-bold text-lg">نموذج جديد</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-y-auto p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allowed.map(f => (
                <button key={f.code} onClick={() => setCode(f.code)} className="text-right p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-[#4A1F66]/30 hover:shadow transition bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#4A1F66]/10 dark:bg-purple-900/40 text-[#4A1F66] dark:text-purple-300">{f.code}</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-slate-100">{f.title}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2">{f.description}</p>
                  <div className="mt-2 text-[10px] text-gray-500 dark:text-slate-400">
                    سلسلة: {f.approvalChain.map(r => roleName(r)).join(' ← ')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const Creator = creators[code];
  if (Creator) return <Creator user={user} api={api} users={users} context={context} onClose={onClose} preselect={code} />;

  return <GenericCreator user={user} api={api} code={code} onClose={onClose} />;
};

const GenericCreator: React.FC<{ user: UserProfile; api: FormsApi; code: FormCode; onClose: () => void; }> = ({ user, api, code, onClose }) => {
  const def = FORM_BY_CODE[code];
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.createForm({ code, user, notes });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
          <h2 className="font-bold">إنشاء {def?.title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-900 dark:text-blue-200">
            {def?.description}
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            placeholder="ملاحظات أولية"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-[#56B894]"
          />
        </div>
        <div className="border-t dark:border-slate-700 p-4 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-200">
            إلغاء
          </button>
          <button onClick={submit} disabled={busy} className="px-5 py-2 rounded-lg text-sm font-bold bg-[#4A1F66] text-white hover:bg-[#3A1652] transition flex items-center gap-1.5">
            <Send className="w-4 h-4" /> إرسال
          </button>
        </div>
      </div>
    </div>
  );
};
