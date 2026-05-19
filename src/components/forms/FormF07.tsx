/**
 * FormF07.tsx — شهادة تسليم المنزل
 * Phase 5 | Chain: [RESEARCH_MANAGER] (single-stage) | SLA: 2 business days
 * System-activated by TRIGGER_MAP after F-15 final payment is approved.
 * No manual creator — this form is never originated by a user directly.
 *
 * RENDERER_CONTRACT: writes `mediaRequested` at top level.
 * Trigger reads it to activate F-52 (YES) or auto-complete it (NO).
 */

import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  CheckCircle2, FileSignature, Camera, Printer, Activity,
  ShieldCheck, FileText, Users as UsersIcon,
} from 'lucide-react';
import { Card, Input, TextArea, ReadOnlyField, FileUploader } from '../ui';
import { FormRenderer, formIsEditableByUser } from '../Forms';
import type { FormRecord } from '../Forms';
import { FormShell, SectionTitle } from './FormShell';
import { storage } from '../../lib/firebase';

/* ─── Domain type ────────────────────────────────────────────────── */

interface F07Data {
  actualStartDate:       string;
  actualEndDate:         string;
  supervisingEngineer:   string;
  contractorName:        string;
  insulationGuarantee:   string;
  handoverNotes:         string;
  beneficiaryAcknowledged: boolean;
  /** RENDERER_CONTRACT — top-level, read by TRIGGER_MAP F-07 handler */
  mediaRequested:        boolean;
}

const EMPTY_F07: F07Data = {
  actualStartDate:         '',
  actualEndDate:           '',
  supervisingEngineer:     '',
  contractorName:          '',
  insulationGuarantee:     '',
  handoverNotes:           '',
  beneficiaryAcknowledged: false,
  mediaRequested:          false,
};

function toF07(raw: unknown): F07Data {
  const d = (raw ?? {}) as Partial<F07Data>;
  return { ...EMPTY_F07, ...d };
}

type FileEntry = NonNullable<FormRecord['files']>[number];

/* ═══════════════════════════════════════════════════════════════════
   F07Renderer
   ═══════════════════════════════════════════════════════════════════ */

export const F07Renderer: FormRenderer = ({ rec, user, api }) => {
  const canEdit = formIsEditableByUser(rec, user);
  const [draft,      setDraft]      = useState<F07Data>(() => {
    const base = toF07(rec.data);
    // Pre-fill supervisor name when blank (RESEARCH_MANAGER opening for the first time)
    return base.supervisingEngineer ? base : { ...base, supervisingEngineer: user.fullName };
  });
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [localFiles, setLocalFiles] = useState<FileEntry[]>(rec.files ?? []);

  const set = <K extends keyof F07Data>(k: K, v: F07Data[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try { await api.updateFormData(rec.id, draft as unknown as Record<string, unknown>); }
    finally { setSaving(false); }
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

  const d = toF07(rec.data);

  return (
    <>
      {/* ── Print-only certificate (hidden on screen) ── */}
      <div className="hidden print:block p-8 font-sans text-gray-900" dir="rtl">
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold">جمعية ترميم الخيرية</h1>
          <h2 className="text-lg font-semibold mt-1">شهادة تسليم منزل</h2>
          <p className="text-sm text-gray-600 mt-1">{rec.projectId} — {rec.beneficiaryName}</p>
        </div>
        <p className="leading-loose text-sm mb-6">
          تُقرّ جمعية ترميم الخيرية بأنها أتمّت أعمال الترميم الكاملة للمنزل المملوك للمستفيد/ـة
          <strong className="mx-1">{rec.beneficiaryName}</strong>
          وفق ما تم الاتفاق عليه، وقد جرى التسليم الرسمي بتاريخ
          <strong className="mx-1">{d.actualEndDate || '___________'}</strong>.
        </p>
        <table className="w-full text-sm border-collapse mb-6">
          <tbody>
            {[
              ['تاريخ بدء التنفيذ',   d.actualStartDate       || '—'],
              ['تاريخ التسليم',        d.actualEndDate         || '—'],
              ['المهندس المشرف',       d.supervisingEngineer   || '—'],
              ['المقاول المنفذ',       d.contractorName        || '—'],
              ['ضمان العزل',           d.insulationGuarantee   || '—'],
            ].map(([label, value]) => (
              <tr key={label} className="border border-gray-300">
                <td className="p-2 font-bold bg-gray-50 w-40">{label}</td>
                <td className="p-2">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {d.handoverNotes && (
          <p className="text-sm mb-6"><strong>ملاحظات:</strong> {d.handoverNotes}</p>
        )}
        <div className="grid grid-cols-2 gap-12 mt-10 text-sm">
          <div className="border-t border-gray-400 pt-2 text-center">توقيع مدير البحث الاجتماعي</div>
          <div className="border-t border-gray-400 pt-2 text-center">توقيع المستفيد / ختمه</div>
        </div>
      </div>

      {/* ── Screen view ── */}
      <div className="print:hidden">
        <FormShell rec={rec} user={user} api={api} approveLabel="اعتماد شهادة التسليم وإغلاق المشروع">

          {canEdit ? (
            /* ── EDIT MODE ─────────────────────────────────────────── */
            <>
              {/* Section 1: Handover details */}
              <Card title="بيانات التسليم" icon={CheckCircle2} accent="teal">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input type="date" label="تاريخ بدء التنفيذ"
                    value={draft.actualStartDate}
                    onChange={e => set('actualStartDate', e.target.value)} />
                  <Input type="date" label="تاريخ التسليم الفعلي"
                    value={draft.actualEndDate}
                    onChange={e => set('actualEndDate', e.target.value)} />
                  <Input label="المهندس المشرف" required
                    value={draft.supervisingEngineer}
                    onChange={e => set('supervisingEngineer', e.target.value)} />
                  <Input label="المقاول المنفذ"
                    value={draft.contractorName}
                    onChange={e => set('contractorName', e.target.value)}
                    className="md:col-span-2" />
                  <Input label="ضمان العزل (إن وجد)" placeholder="مثال: 10 سنوات"
                    value={draft.insulationGuarantee}
                    onChange={e => set('insulationGuarantee', e.target.value)} />
                </div>
              </Card>

              {/* Section 2: Beneficiary acknowledgment */}
              <Card title="إقرار المستفيد" icon={ShieldCheck} accent="purple">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={draft.beneficiaryAcknowledged}
                    onChange={e => set('beneficiaryAcknowledged', e.target.checked)}
                    className="mt-1 rounded border-border-default text-[#4A1F66] focus:ring-[#4A1F66]" />
                  <span className="text-sm text-fg leading-relaxed">
                    يُقرّ المستفيد/ـة باستلام المنزل مكتمل الترميم وفق الشروط والمواصفات المتفق عليها مع جمعية ترميم الخيرية.
                  </span>
                </label>
              </Card>

              {/* Section 3: Notes */}
              <Card title="ملاحظات التسليم" icon={Activity}>
                <TextArea label="ملاحظات ختامية (اختياري)" rows={3}
                  value={draft.handoverNotes}
                  onChange={e => set('handoverNotes', e.target.value)} />
              </Card>

              {/* Section 4: Media coverage — cascade-critical */}
              <Card title="التغطية الإعلامية" icon={Camera} accent="purple">
                <SectionTitle title="هل تطلب تغطية إعلامية لهذا التسليم؟" />
                <label className="flex items-start gap-3 cursor-pointer mb-3">
                  <input type="checkbox" checked={draft.mediaRequested}
                    onChange={e => set('mediaRequested', e.target.checked)}
                    className="mt-1 rounded border-border-default text-[#4A1F66] focus:ring-[#4A1F66]" />
                  <span className="text-sm text-fg">نعم، أطلب توثيقاً إعلامياً لهذا التسليم</span>
                </label>
                {draft.mediaRequested ? (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200">
                    عند الاعتماد، سيُفتح نموذج F-52 آلياً وتُبلَّغ إدارة الاتصال المؤسسي لتنسيق التغطية.
                  </div>
                ) : (
                  <div className="bg-surface-up border border-subtle rounded-lg p-3 text-xs text-fg-muted">
                    لم يُطلب تغطية إعلامية — سيُغلق نموذج F-52 تلقائياً عند الاعتماد.
                  </div>
                )}
              </Card>

              {/* Section 5: File uploads */}
              <Card title="المستندات المرفقة" icon={FileText}>
                {uploading && <p className="text-xs text-fg-muted mb-2">جارٍ رفع الملفات…</p>}
                <FileUploader
                  files={localFiles}
                  onAdd={handleAddFiles}
                  onRemove={i => setLocalFiles(f => f.filter((_, idx) => idx !== i))}
                  label="ارفع صور التسليم والشهادة الموقعة"
                  accept="image/*,.pdf"
                />
              </Card>

              {/* Action row */}
              <div className="flex items-center gap-3 pt-1">
                <button onClick={save} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg bg-[#4A1F66] text-white hover:bg-[#3A1652] disabled:opacity-50 transition">
                  {saving ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}
                </button>
                <button onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-surface-up text-fg-muted hover:bg-border-subtle border border-subtle transition">
                  <Printer className="w-4 h-4" />
                  طباعة الشهادة
                </button>
              </div>
            </>
          ) : (
            /* ── REVIEW MODE ──────────────────────────────────────── */
            <>
              {/* Section 1: Handover details */}
              <Card title="بيانات التسليم" icon={CheckCircle2} accent="teal">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <ReadOnlyField label="تاريخ بدء التنفيذ"  value={d.actualStartDate} />
                  <ReadOnlyField label="تاريخ التسليم"       value={d.actualEndDate} />
                  <ReadOnlyField label="المهندس المشرف"      value={d.supervisingEngineer} />
                  <ReadOnlyField label="المقاول المنفذ"      value={d.contractorName} />
                  <ReadOnlyField label="ضمان العزل"          value={d.insulationGuarantee} />
                </div>
              </Card>

              {/* Section 2: Beneficiary acknowledgment */}
              <Card title="إقرار المستفيد" icon={ShieldCheck}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${d.beneficiaryAcknowledged ? 'bg-[#43bba1]' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <span className="text-sm text-fg">
                    {d.beneficiaryAcknowledged ? 'أقرّ المستفيد باستلام المنزل' : 'لم يُسجَّل إقرار المستفيد'}
                  </span>
                </div>
              </Card>

              {/* Section 3: Notes */}
              {d.handoverNotes && (
                <Card title="ملاحظات التسليم" icon={Activity}>
                  <div className="bg-surface-up rounded-lg p-3 text-sm text-fg leading-relaxed border border-subtle">
                    {d.handoverNotes}
                  </div>
                </Card>
              )}

              {/* Section 4: Media decision */}
              <Card title="قرار التغطية الإعلامية" icon={Camera}>
                {d.mediaRequested ? (
                  <div className="flex items-center gap-3 bg-[#43bba1]/10 border border-[#43bba1]/40 rounded-lg p-3">
                    <Camera className="w-5 h-5 text-[#43bba1] shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-[#43bba1]">تم طلب التغطية الإعلامية</p>
                      <p className="text-xs text-fg-muted">F-52 نشط — إدارة الاتصال المؤسسي مُبلَّغة</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-surface-up border border-subtle rounded-lg p-3">
                    <Camera className="w-5 h-5 text-fg-faint shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-fg-muted">لم تُطلب تغطية إعلامية</p>
                      <p className="text-xs text-fg-faint">F-52 أُغلق تلقائياً</p>
                    </div>
                  </div>
                )}
              </Card>

              {/* Section 5: Files */}
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

              {/* Print button in review mode */}
              <div className="flex justify-start pt-1">
                <button onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-surface-up text-fg-muted hover:bg-border-subtle border border-subtle transition">
                  <Printer className="w-4 h-4" />
                  طباعة الشهادة
                </button>
              </div>
            </>
          )}

        </FormShell>
      </div>
    </>
  );
};
