import React, { useState } from 'react';
import { ApprovalChainView, FormRecord, FormsApi, ApprovalActions, formAwaitsUser } from '../Forms';
import { Card, Pill } from '../ui';
import { FORM_BY_CODE, FORM_STATUS_LABELS, FORM_STATUS_COLORS, departmentName, roleName, slaStatus } from '../../lib/data';
import type { UserProfile } from '../Auth';
import { GitBranch, ListChecks, Activity, Clock, FileText } from 'lucide-react';

/**
 * FormShell — قشرة موحّدة لجميع نماذج F-XX.
 * تعرض البيانات الفوقية (المشروع، السلسلة، الجسور، SLA) بشكل احترافي،
 * ثم تتيح للمكوّن المتخصص تمرير أقسام البيانات والإجراءات.
 */

export const FormHeaderMeta: React.FC<{ rec: FormRecord }> = ({ rec }) => {
  const def = FORM_BY_CODE[rec.code];
  const sla = slaStatus(rec.stepStartedAt || rec.updatedAt, def?.slaDays);
  return (
    <div className="space-y-3">
      {def?.description && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
          {def.description}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
          <p className="text-gray-500 dark:text-slate-400">الحالة</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full font-bold ${FORM_STATUS_COLORS[rec.status]}`}>{FORM_STATUS_LABELS[rec.status]}</span>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
          <p className="text-gray-500 dark:text-slate-400">المشروع</p>
          <p className="font-bold mt-1">{rec.projectId || '—'}</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
          <p className="text-gray-500 dark:text-slate-400">المنشئ</p>
          <p className="font-bold mt-1 truncate">{rec.createdByName || '—'}</p>
          <p className="text-[10px] text-gray-400">{roleName(rec.createdByRole)}</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
          <p className="text-gray-500 dark:text-slate-400">SLA</p>
          <p className={`font-bold mt-1 ${sla.tone === 'late' ? 'text-red-600' : sla.tone === 'warn' ? 'text-orange-600' : 'text-green-700'}`}>
            {def?.slaDays ? sla.text : '—'}
          </p>
        </div>
      </div>

      {(rec.bridgesTo || []).length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5" /> الجسور
          </p>
          <div className="flex flex-wrap gap-2">
            {rec.bridgesTo.map(b => <Pill key={b} tone="purple">{departmentName(b)}</Pill>)}
          </div>
        </div>
      )}
    </div>
  );
};

export const FormApprovalChain: React.FC<{ rec: FormRecord }> = ({ rec }) => (
  <Card title="سلسلة الاعتماد" icon={ListChecks} accent="purple">
    <ApprovalChainView rec={rec} />
  </Card>
);

const SingleSubmitBar: React.FC<{ rec: FormRecord; user: UserProfile; api: FormsApi; onAfter?: () => void; submitLabel?: string }> = ({ rec, user, api, onAfter, submitLabel }) => {
  const [busy, setBusy] = useState(false);
  if (!formAwaitsUser(rec, user)) return null;
  return (
    <button disabled={busy} onClick={async () => { setBusy(true); try { await api.approveForm(rec.id, user, ''); onAfter?.(); } finally { setBusy(false); } }}
      className="w-full py-2.5 bg-[#4A1F66] text-white rounded-lg font-bold text-sm hover:bg-[#3A1652] disabled:opacity-50 transition">
      {busy ? 'جارٍ التقديم…' : (submitLabel || 'اعتماد وتقديم')}
    </button>
  );
};

export const FormShell: React.FC<{
  rec: FormRecord;
  user: UserProfile;
  api: FormsApi;
  children: React.ReactNode;
  /** قسم اعتماد مخصّص (إن لم يُمَرّر يُستخدم ApprovalActions الافتراضي) */
  approvalSection?: React.ReactNode;
  onAfter?: () => void;
  approveLabel?: string;
}> = ({ rec, user, api, children, approvalSection, onAfter, approveLabel }) => {
  const isMulti = rec.approvalChain.length > 1;
  return (
    <div className="space-y-4">
      <FormHeaderMeta rec={rec} />
      {children}
      {isMulti && <FormApprovalChain rec={rec} />}
      {approvalSection ?? (isMulti
        ? <ApprovalActions rec={rec} user={user} api={api} onAfter={onAfter} approveLabel={approveLabel} />
        : <SingleSubmitBar rec={rec} user={user} api={api} onAfter={onAfter} submitLabel={approveLabel} />)}
    </div>
  );
};

export const HistoryRow: React.FC<{ icon?: React.ElementType; title: string; subtitle?: string; meta?: string }> = ({ icon: Icon = Activity, title, subtitle, meta }) => (
  <div className="flex items-start gap-2 text-xs py-1.5 border-b last:border-0 dark:border-slate-700">
    <Icon className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="font-bold text-gray-700 dark:text-slate-200">{title}</p>
      {subtitle && <p className="text-gray-500 dark:text-slate-400 text-[11px]">{subtitle}</p>}
    </div>
    {meta && <p className="text-[10px] text-gray-400 dark:text-slate-500 whitespace-nowrap"><Clock className="w-3 h-3 inline ml-0.5" />{meta}</p>}
  </div>
);

export const SectionTitle: React.FC<{ icon?: React.ElementType; title: string; hint?: string }> = ({ icon: Icon = FileText, title, hint }) => (
  <div className="flex items-center gap-2 mb-2 mt-2">
    <Icon className="w-4 h-4 text-[#56B894]" />
    <h4 className="text-sm font-bold text-[#4A1F66] dark:text-purple-300">{title}</h4>
    {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
  </div>
);
