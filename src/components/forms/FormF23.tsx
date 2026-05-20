/**
 * FormF23.tsx — اعتماد بنود أعمال إضافية
 * Phase 4 | Chain: [PROJECTS_MANAGER, EXEC_DIRECTOR] | SLA: 3 business days
 * Decline-eligible. Auto-created by F-14 trigger when requestScopeChange=true.
 * Can also be manually created by DIAGNOSIS_ENGINEER or PROJECTS_MANAGER.
 */

import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Plus, Trash2, ClipboardList, FileText, AlertCircle,
  CheckCircle, Activity, XCircle, ShieldAlert,
} from 'lucide-react';
import { Card, Input, TextArea, FileUploader } from '../ui';
import { SaudiRiyalGlassIcon } from '../../lib/data';
import { FormRenderer, FormCreator, formIsEditableByUser, formAwaitsUser } from '../Forms';
import type { FormRecord, FormsApi } from '../Forms';
import type { UserProfile } from '../Auth';
import { FormShell } from './FormShell';
import { storage } from '../../lib/firebase';

/* ─── Domain type ────────────────────────────────────────────────── */

interface F23Item {
  id: string;
  description: string;
  dimensions: string;
  price: number;
  contractor: string;
}

interface F23Data {
  items: F23Item[];
  reason: string;
  total: number;
  triggeredByF14?: string;
}

const EMPTY_ITEM = (): F23Item => ({
  id: crypto.randomUUID(),
  description: '',
  dimensions: '',
  price: 0,
  contractor: '',
});

const EMPTY_F23: F23Data = {
  items: [],
  reason: '',
  total: 0,
};

function toF23(raw: unknown): F23Data {
  const d = (raw ?? {}) as Partial<F23Data>;
  return {
    ...EMPTY_F23,
    ...d,
    items: Array.isArray(d.items) && d.items.length > 0 ? d.items : [EMPTY_ITEM()],
  };
}

function computeTotal(items: F23Item[]): number {
  return items.reduce((s, i) => s + Number(i.price || 0), 0);
}

type FileEntry = NonNullable<FormRecord['files']>[number];

/* ─── DeclineAwareActions ─────────────────────────────────────────── */

const DeclineAwareActions: React.FC<{ rec: FormRecord; user: UserProfile; api: FormsApi }> = ({ rec, user, api }) => {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const awaits = formAwaitsUser(rec, user);
  if (!awaits) return null;

  const act = async (kind: 'approve' | 'reject' | 'defer' | 'decline') => {
    setBusy(true);
    try {
      if (kind === 'approve')      await api.approveForm(rec.id, user, note);
      else if (kind === 'reject')  await api.rejectForm(rec.id, user, note);
      else if (kind === 'defer')   await api.deferForm(rec.id, user, note);
      else                         await api.declineForm(rec.id, user, note);
    } finally { setBusy(false); }
  };

  return (
    <div className="border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
        <Activity className="w-4 h-4" />
        <span className="text-xs font-bold">هذا الطلب بانتظار اعتمادك (المدير التنفيذي)</span>
      </div>
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 text-xs text-red-700 dark:text-red-300 flex items-start gap-1.5">
        <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>الرفض النهائي يوقف الأعمال الإضافية دون أن يؤثر على المشروع الرئيسي.</span>
      </div>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={2}
        placeholder="ملاحظتك (اختياري)"
        className="w-full px-3 py-2 border border-border-default rounded-lg text-sm bg-input-bg text-fg outline-none focus:ring-2 focus:ring-[#4A1F66]"
      />
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => act('approve')} disabled={busy}
          className="flex-1 min-w-[120px] py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition flex items-center justify-center gap-1.5">
          <CheckCircle className="w-4 h-4" /> اعتماد الأعمال الإضافية
        </button>
        <button onClick={() => act('defer')} disabled={busy}
          className="px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 rounded-lg font-bold text-sm transition">
          تأجيل
        </button>
        <button onClick={() => act('reject')} disabled={busy}
          className="px-4 py-2 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-lg font-bold text-sm hover:bg-orange-200 dark:hover:bg-orange-900/60 transition flex items-center gap-1.5">
          <XCircle className="w-4 h-4" /> إعادة للتعديل
        </button>
        <button onClick={() => act('decline')} disabled={busy}
          className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" /> رفض نهائي
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   F23Creator
   ═══════════════════════════════════════════════════════════════════ */

export const F23Creator: FormCreator = ({ user, api, context, onClose }) => {
  const projects: Array<{ id: string; projectId: string; beneficiaryName: string }> = context?.projects ?? [];
  const [projectRefId, setProjectRefId] = useState<string>(projects[0]?.id || '');
  const [items, setItems] = useState<F23Item[]>([EMPTY_ITEM()]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = !!projectRefId && !!reason.trim() && items.some(i => i.description.trim() && i.price > 0);

  const updateItem = (id: string, patch: Partial<F23Item>) =>
    setItems(arr => arr.map(it => it.id === id ? { ...it, ...patch } : it));

  const submit = async () => {
    const p = projects.find(x => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      const total = computeTotal(items);
      await api.createForm({
        code: 'F-23', user,
        projectId: p.projectId,
        projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { items, reason, total },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-2xl bg-surface rounded-2xl shadow-card-hover border border-subtle flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle">
          <h2 className="text-base font-bold text-fg">F-23 · اعتماد بنود الأعمال الإضافية</h2>
          <button onClick={onClose} className="text-fg-faint hover:text-fg text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">

          {/* Project */}
          <Card title="المشروع" icon={ClipboardList}>
            <select
              value={projectRefId}
              onChange={e => setProjectRefId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-default bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]"
            >
              {projects.length === 0 && <option value="">— لا توجد مشاريع —</option>}
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.projectId} — {p.beneficiaryName}</option>
              ))}
            </select>
          </Card>

          {/* Items */}
          <Card title="البنود الإضافية" icon={Plus} accent="purple">
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={it.id} className="grid grid-cols-12 gap-2 items-end">
                  <Input className="col-span-4" label={idx === 0 ? 'وصف العمل' : ''}
                    value={it.description} placeholder="وصف العمل"
                    onChange={e => updateItem(it.id, { description: e.target.value })} />
                  <Input className="col-span-2" label={idx === 0 ? 'الأبعاد' : ''}
                    value={it.dimensions} placeholder="اختياري"
                    onChange={e => updateItem(it.id, { dimensions: e.target.value })} />
                  <Input className="col-span-3" label={idx === 0 ? 'المقاول' : ''}
                    value={it.contractor} placeholder="اسم المقاول"
                    onChange={e => updateItem(it.id, { contractor: e.target.value })} />
                  <Input className="col-span-2" label={idx === 0 ? <span className="flex items-center gap-1">السعر <SaudiRiyalGlassIcon className="w-4 h-4 inline" /></span> : ''}
                    type="number" value={it.price || ''}
                    onChange={e => updateItem(it.id, { price: Number(e.target.value || 0) })} />
                  <button
                    onClick={() => setItems(arr => arr.filter(x => x.id !== it.id))}
                    disabled={items.length === 1}
                    className="col-span-1 mb-0.5 flex items-center justify-center w-8 h-8 rounded-lg text-fg-faint hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setItems(arr => [...arr, EMPTY_ITEM()])}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#43bba1] text-white hover:bg-[#3aa592] transition">
              <Plus className="w-3 h-3" /> إضافة بند
            </button>
            <div className="mt-3 text-sm font-bold text-[#4A1F66] dark:text-purple-300 flex items-center gap-1">
              الإجمالي: {computeTotal(items).toLocaleString('ar-SA')} <SaudiRiyalGlassIcon className="w-4 h-4 inline" />
            </div>
          </Card>

          {/* Reason */}
          <Card title="مبرّر التغيير" icon={ClipboardList}>
            <TextArea label="السبب" rows={3} required
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="اشرح مبرّر إضافة هذه البنود وأثرها على الجدول الزمني والميزانية" />
          </Card>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-subtle">
          <button onClick={onClose} className="px-4 py-2 text-sm text-fg-muted hover:text-fg transition">إلغاء</button>
          <button onClick={submit} disabled={busy || !canSubmit}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg bg-[#4A1F66] text-white hover:bg-[#3A1652] disabled:opacity-50 transition">
            {busy ? 'جارٍ الرفع…' : 'رفع للسلسلة'}
          </button>
        </div>

      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   F23Renderer
   ═══════════════════════════════════════════════════════════════════ */

export const F23Renderer: FormRenderer = ({ rec, user, api }) => {
  const canEdit = formIsEditableByUser(rec, user);
  const atStage = rec.approvalIndex ?? 0;

  const [draft, setDraft] = useState<F23Data>(() => toF23(rec.data));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localFiles, setLocalFiles] = useState<FileEntry[]>(rec.files ?? []);

  const d = toF23(rec.data);
  const isManagerStage = canEdit && atStage === 0;
  const isExecStage = canEdit && atStage === 1;

  const updateItem = (id: string, patch: Partial<F23Item>) =>
    setDraft(prev => {
      const updated = prev.items.map(it => it.id === id ? { ...it, ...patch } : it);
      return { ...prev, items: updated, total: computeTotal(updated) };
    });

  const save = async () => {
    setSaving(true);
    try {
      await api.updateFormData(rec.id, {
        ...draft,
        total: computeTotal(draft.items),
      } as unknown as Record<string, unknown>);
    } finally { setSaving(false); }
  };

  const handleAddFiles = async (fileList: FileList) => {
    if (!rec.projectRefId) return;
    setUploading(true);
    try {
      const uploaded: FileEntry[] = [];
      for (const file of Array.from(fileList)) {
        const uuid = crypto.randomUUID();
        const path = `projects/${rec.projectRefId}/forms/${rec.id}/${uuid}-${file.name}`;
        await uploadBytes(ref(storage, path), file);
        const url = await getDownloadURL(ref(storage, path));
        uploaded.push({ name: file.name, url, size: file.size, uploadedAt: new Date().toISOString() });
      }
      await api.attachFiles(rec.id, uploaded);
      setLocalFiles(prev => [...prev, ...uploaded]);
    } finally { setUploading(false); }
  };

  return (
    <FormShell
      rec={rec}
      user={user}
      api={api}
      approveLabel="اعتماد الأعمال الإضافية"
      approvalSection={isExecStage ? <DeclineAwareActions rec={rec} user={user} api={api} /> : undefined}
    >

      {/* Auto-created banner */}
      {d.triggeredByF14 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-3 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>هذا النموذج مولَّد آلياً من تقرير إشراف #{d.triggeredByF14.slice(-6).toUpperCase()}</span>
        </div>
      )}

      {isManagerStage ? (
        /* ── STAGE 0 EDIT MODE (PROJECTS_MANAGER) ─────────────────── */
        <>
          <Card title="البنود الإضافية" icon={Plus} accent="purple">
            <div className="space-y-2">
              {draft.items.map((it, idx) => (
                <div key={it.id} className="grid grid-cols-12 gap-2 items-end">
                  <Input className="col-span-4" label={idx === 0 ? 'وصف العمل' : ''}
                    value={it.description}
                    onChange={e => updateItem(it.id, { description: e.target.value })} />
                  <Input className="col-span-2" label={idx === 0 ? 'الأبعاد' : ''}
                    value={it.dimensions}
                    onChange={e => updateItem(it.id, { dimensions: e.target.value })} />
                  <Input className="col-span-3" label={idx === 0 ? 'المقاول' : ''}
                    value={it.contractor}
                    onChange={e => updateItem(it.id, { contractor: e.target.value })} />
                  <Input className="col-span-2" label={idx === 0 ? <span className="flex items-center gap-1">السعر <SaudiRiyalGlassIcon className="w-4 h-4 inline" /></span> : ''}
                    type="number" value={it.price || ''}
                    onChange={e => updateItem(it.id, { price: Number(e.target.value || 0) })} />
                  <button
                    onClick={() => setDraft(prev => ({ ...prev, items: prev.items.filter(x => x.id !== it.id) }))}
                    disabled={draft.items.length === 1}
                    className="col-span-1 mb-0.5 flex items-center justify-center w-8 h-8 rounded-lg text-fg-faint hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setDraft(prev => ({ ...prev, items: [...prev.items, EMPTY_ITEM()] }))}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#43bba1] text-white hover:bg-[#3aa592] transition">
              <Plus className="w-3 h-3" /> إضافة بند
            </button>
            <div className="mt-3 text-sm font-bold text-[#4A1F66] dark:text-purple-300 flex items-center gap-1">
              الإجمالي: {computeTotal(draft.items).toLocaleString('ar-SA')} <SaudiRiyalGlassIcon className="w-4 h-4 inline" />
            </div>
          </Card>

          <Card title="مبرّر التغيير" icon={ClipboardList}>
            <TextArea label="السبب" rows={3} required
              value={draft.reason}
              onChange={e => setDraft(prev => ({ ...prev, reason: e.target.value }))} />
          </Card>

          <Card title="المستندات المرفقة" icon={FileText}>
            {uploading && <p className="text-xs text-fg-muted mb-2">جارٍ رفع الملفات…</p>}
            <FileUploader
              files={localFiles}
              onAdd={handleAddFiles}
              onRemove={i => setLocalFiles(f => f.filter((_, idx2) => idx2 !== i))}
              label="ارفع العروض أو المستندات الداعمة"
              accept="image/*,.pdf"
            />
          </Card>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg bg-[#4A1F66] text-white hover:bg-[#3A1652] disabled:opacity-50 transition">
              {saving ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}
            </button>
          </div>
        </>
      ) : (
        /* ── REVIEW / EXEC MODE ──────────────────────────────────── */
        <>
          <Card title="البنود الإضافية" icon={Plus} accent="purple">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-surface-up">
                  <th className="px-3 py-2 text-right font-bold text-fg-muted border border-subtle">وصف العمل</th>
                  <th className="px-3 py-2 text-right font-bold text-fg-muted border border-subtle">الأبعاد</th>
                  <th className="px-3 py-2 text-right font-bold text-fg-muted border border-subtle">المقاول</th>
                  <th className="px-3 py-2 text-right font-bold text-fg-muted border border-subtle">السعر</th>
                </tr>
              </thead>
              <tbody>
                {d.items.map(it => (
                  <tr key={it.id} className="border-t border-subtle">
                    <td className="px-3 py-2 border border-subtle">{it.description || '—'}</td>
                    <td className="px-3 py-2 border border-subtle">{it.dimensions || '—'}</td>
                    <td className="px-3 py-2 border border-subtle">{it.contractor || '—'}</td>
                    <td className="px-3 py-2 border border-subtle font-bold">{Number(it.price || 0).toLocaleString('ar-SA')} <SaudiRiyalGlassIcon className="w-3.5 h-3.5 inline" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 text-sm font-bold text-[#4A1F66] dark:text-purple-300 flex items-center gap-1">
              الإجمالي: {Number(d.total || 0).toLocaleString('ar-SA')} <SaudiRiyalGlassIcon className="w-4 h-4 inline" />
            </div>
          </Card>

          <Card title="مبرّر التغيير" icon={ClipboardList}>
            <div className="bg-surface-up rounded-lg p-3 text-sm text-fg leading-relaxed border border-subtle">
              {d.reason || '—'}
            </div>
          </Card>

          {localFiles.length > 0 && (
            <Card title="المستندات المرفقة" icon={FileText}>
              <ul className="space-y-1.5">
                {localFiles.map((f, i) => (
                  <li key={i}>
                    <a href={f.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-[#43bba1] hover:underline">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      {f.name}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

    </FormShell>
  );
};
