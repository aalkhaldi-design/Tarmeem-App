import React, { useMemo, useState } from 'react';
import {
  Send, CheckCircle, XCircle, Clock, ArrowLeft,
  AlertTriangle, Inbox, Plus, GitBranch, ListChecks, X
} from 'lucide-react';
import {
  FORMS, FORM_BY_CODE, FORM_STATUS_LABELS, FORM_STATUS_COLORS,
  FormCode, FormDef, FormStatus, RoleKey, roleName,
  DepartmentKey, departmentName,
} from '../lib/data';
import { Card } from './ui';
import type { UserProfile } from './Auth';

/* ──────────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────────── */

export interface FormRecord {
  id: string;
  code: FormCode;
  title: string;
  projectId?: string | null;
  status: FormStatus;
  /** الترتيب الحالي ضمن سلسلة الاعتماد: المؤشر يدل على الدور المنتظَر */
  approvalIndex: number;
  approvalChain: RoleKey[];
  /** قائمة الاعتمادات السابقة */
  approvals: { role: RoleKey; actorId: string; at: string; decision: 'approved' | 'rejected' | 'deferred'; note?: string }[];
  createdBy: string;
  createdByRole: RoleKey;
  createdAt: string;
  updatedAt: string;
  ownerDept: DepartmentKey;
  bridgesTo: DepartmentKey[];
  refKey?: string;
  notes?: string;
  /** بيانات النموذج (سيتم لاحقاً تخصيصها لكل نموذج) */
  data?: Record<string, any>;
  triggeredBy?: string; // مرجع نموذج آخر أطلق هذا
}

export interface FormsApi {
  forms: FormRecord[];
  createForm: (input: {
    code: FormCode;
    user: UserProfile;
    projectId?: string | null;
    notes?: string;
    data?: Record<string, any>;
    triggeredBy?: string;
  }) => Promise<string | null>;
  approveForm: (formId: string, user: UserProfile, note?: string) => Promise<void>;
  rejectForm: (formId: string, user: UserProfile, note?: string) => Promise<void>;
  deferForm: (formId: string, user: UserProfile, note?: string) => Promise<void>;
}

/* ──────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────── */

export function formCanBeOriginatedBy(form: FormDef, role: RoleKey): boolean {
  const origins = Array.isArray(form.originRole) ? form.originRole : [form.originRole];
  return origins.includes(role);
}

export function formAwaitsRole(record: FormRecord, role: RoleKey): boolean {
  if (record.status !== 'pending') return false;
  const next = record.approvalChain[record.approvalIndex];
  return next === role;
}

/* ──────────────────────────────────────────────────────────────────
   FormCard — مختصر سطري للنموذج
   ────────────────────────────────────────────────────────────────── */

export const FormCard: React.FC<{ rec: FormRecord; onOpen: () => void; highlight?: boolean }> = ({ rec, onOpen, highlight }) => {
  const def = FORM_BY_CODE[rec.code];
  const nextRole = rec.approvalChain[rec.approvalIndex];
  return (
    <button onClick={onOpen}
      className={`w-full text-right rounded-lg border p-3 hover:shadow-md transition flex items-start gap-3
        ${highlight ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white hover:border-[#4A1F66]/30'}`}>
      <div className="w-9 h-9 rounded-lg bg-[#4A1F66]/10 text-[#4A1F66] flex items-center justify-center font-bold text-[11px] shrink-0">
        {rec.code}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-800 truncate">{rec.title || def?.title}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${FORM_STATUS_COLORS[rec.status]}`}>
            {FORM_STATUS_LABELS[rec.status]}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
          <span>إدارة: {departmentName(rec.ownerDept)}</span>
          {rec.status === 'pending' && nextRole && (
            <span className="text-amber-700 font-bold">بانتظار: {roleName(nextRole)}</span>
          )}
          {rec.refKey && <span className="text-gray-400">{rec.refKey}</span>}
        </div>
      </div>
      <ArrowLeft className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
    </button>
  );
};

/* ──────────────────────────────────────────────────────────────────
   FormDetailModal — عرض النموذج وعملياته
   ────────────────────────────────────────────────────────────────── */

export const FormDetailModal: React.FC<{
  rec: FormRecord; user: UserProfile; api: FormsApi; users: UserProfile[]; onClose: () => void;
}> = ({ rec, user, api, users, onClose }) => {
  const def = FORM_BY_CODE[rec.code];
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const isAdmin = user.role === 'ADMIN';
  const awaitsMe = !isAdmin && (formAwaitsRole(rec, user.role as RoleKey) || (user.isManager && rec.approvalChain[rec.approvalIndex] === user.role));

  const act = async (kind: 'approve' | 'reject' | 'defer') => {
    setBusy(true);
    try {
      if (kind === 'approve') await api.approveForm(rec.id, user, note);
      else if (kind === 'reject') await api.rejectForm(rec.id, user, note);
      else await api.deferForm(rec.id, user, note);
      onClose();
    } finally { setBusy(false); }
  };

  const userById = (id: string) => users.find(u => u.id === id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center font-bold text-xs">
              {rec.code}
            </div>
            <div>
              <h2 className="font-bold text-lg">{rec.title || def?.title}</h2>
              <p className="text-[11px] text-white/70">{def?.titleEn}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 mb-1">الحالة</p>
              <span className={`inline-block px-2 py-0.5 rounded-full font-bold ${FORM_STATUS_COLORS[rec.status]}`}>{FORM_STATUS_LABELS[rec.status]}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 mb-1">الإدارة المالكة</p>
              <p className="font-bold text-gray-800">{departmentName(rec.ownerDept)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 mb-1">المرجع</p>
              <p className="font-bold text-gray-800">{rec.refKey || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 col-span-2 md:col-span-3">
              <p className="text-gray-500 mb-1">المُنشِئ</p>
              <p className="font-bold text-gray-800">
                {userById(rec.createdBy)?.fullName || rec.createdBy} <span className="text-gray-400 text-[10px]">— {roleName(rec.createdByRole)}</span>
              </p>
            </div>
          </div>

          {/* Description */}
          {def?.description && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 leading-relaxed">
              {def.description}
            </div>
          )}

          {/* Bridges */}
          {(rec.bridgesTo || []).length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5">
                <GitBranch className="w-4 h-4" /> الجسور (إدارات أخرى تتلقى نسخة)
              </p>
              <div className="flex flex-wrap gap-2">
                {rec.bridgesTo.map(b => (
                  <span key={b} className="px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 text-[11px] font-bold border border-pink-200">
                    {departmentName(b)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Approval chain */}
          <div>
            <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5">
              <ListChecks className="w-4 h-4" /> سلسلة الاعتماد
            </p>
            <ol className="space-y-2">
              {rec.approvalChain.map((r, idx) => {
                const passed = idx < rec.approvalIndex;
                const current = idx === rec.approvalIndex && rec.status === 'pending';
                const approval = rec.approvals.find(a => a.role === r);
                return (
                  <li key={r + idx} className={`flex items-center gap-3 p-2 rounded-lg border
                    ${current ? 'border-amber-300 bg-amber-50' : passed ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold
                      ${current ? 'bg-amber-500 text-white' : passed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800">{roleName(r)}</p>
                      {approval && (
                        <p className="text-[10px] text-gray-500">
                          {approval.decision === 'approved' ? 'اعتمد' : approval.decision === 'rejected' ? 'رفض' : 'أجَّل'}{' '}
                          {new Date(approval.at).toLocaleString('ar-SA')}{approval.note ? ` — ${approval.note}` : ''}
                        </p>
                      )}
                    </div>
                    {passed && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {current && <Clock className="w-4 h-4 text-amber-500" />}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Notes */}
          {rec.notes && (
            <div>
              <p className="text-xs font-bold text-gray-600 mb-1">ملاحظات المُنشِئ</p>
              <p className="text-sm bg-gray-50 rounded-lg p-3 text-gray-700">{rec.notes}</p>
            </div>
          )}

          {/* Approver actions */}
          {awaitsMe && (
            <div className="border-t pt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700">ملاحظتك على القرار</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                  placeholder="اختياري..."
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] resize-y" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => act('approve')} disabled={busy}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> اعتماد
                </button>
                <button onClick={() => act('defer')} disabled={busy}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold text-sm hover:bg-blue-200 transition disabled:opacity-50 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> تأجيل
                </button>
                <button onClick={() => act('reject')} disabled={busy}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5">
                  <XCircle className="w-4 h-4" /> رفض
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   NewFormModal — إنشاء نموذج جديد
   ────────────────────────────────────────────────────────────────── */

export const NewFormModal: React.FC<{
  user: UserProfile; api: FormsApi; preselect?: FormCode; onClose: () => void;
}> = ({ user, api, preselect, onClose }) => {
  const myRole = user.role as RoleKey;
  const allowed = useMemo(
    () => FORMS.filter(f => formCanBeOriginatedBy(f, myRole) || user.role === 'ADMIN'),
    [myRole, user.role],
  );
  const [code, setCode] = useState<FormCode>(preselect || (allowed[0]?.code as FormCode));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  if (allowed.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-700 mb-3">لا تملك صلاحية إنشاء نماذج بدورك الحالي.</p>
          <button onClick={onClose} className="px-5 py-2 bg-gray-200 rounded-lg text-sm font-bold">إغلاق</button>
        </div>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true);
    try {
      await api.createForm({ code, user, notes });
      onClose();
    } finally { setBusy(false); }
  };

  const def = FORM_BY_CODE[code];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Plus className="w-5 h-5" />
            <h2 className="font-bold text-lg">نموذج جديد</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-700">اختر النموذج</label>
            <select value={code} onChange={e => setCode(e.target.value as FormCode)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] bg-white">
              {allowed.map(f => (
                <option key={f.code} value={f.code}>{f.code} — {f.title}</option>
              ))}
            </select>
          </div>
          {def && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 leading-relaxed">
              {def.description}
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <span className="font-bold">سلسلة الاعتماد:</span>
                <span>{def.approvalChain.map(r => roleName(r)).join(' ← ')}</span>
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-gray-700">ملاحظات أولية (اختياري)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] resize-y"
              placeholder="نقاط رئيسية، رقم مرجع، ..." />
          </div>
        </div>
        <div className="border-t p-4 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition">إلغاء</button>
          <button onClick={submit} disabled={busy}
            className="px-5 py-2 rounded-lg text-sm font-bold bg-[#4A1F66] text-white hover:bg-[#3A1652] transition disabled:opacity-50 flex items-center gap-1.5">
            <Send className="w-4 h-4" /> {busy ? 'جاري...' : 'إرسال للاعتماد'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   InboxPanel — صندوق الوارد للأدوار التي تنتظر اعتماداً
   ────────────────────────────────────────────────────────────────── */

export const InboxPanel: React.FC<{
  user: UserProfile; api: FormsApi; onOpen: (id: string) => void;
}> = ({ user, api, onOpen }) => {
  const myRole = user.role as RoleKey;
  const inbox = api.forms.filter(f => formAwaitsRole(f, myRole));

  return (
    <Card title={`صندوق الوارد (${inbox.length})`} icon={Inbox}>
      {inbox.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold">لا توجد طلبات معلّقة على دورك حالياً</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inbox.map(f => <FormCard key={f.id} rec={f} highlight onOpen={() => onOpen(f.id)} />)}
        </div>
      )}
    </Card>
  );
};
