/**
 * FormF52.tsx — طلب تصوير وتوثيق
 * Phase 5 | Chain: [HEAD_SUPERVISION] | SLA: 7 business days
 * Bridges to COMMS. Activated by F-07 trigger (mediaRequested=true)
 * or manually by HEAD_SUPERVISION / DIAGNOSIS_ENGINEER.
 * After approval, COMMS users log deliverables directly on this form.
 */

import React, { useState } from 'react';
import { uploadFileToDrive } from './TitledFileUploader';
import {
  Camera, FileText, Link2, CalendarDays, ClipboardList, CheckCircle2, Upload,
} from 'lucide-react';
import { Card, Input, TextArea, ReadOnlyField, FileUploader } from '../ui';
import { FormRenderer, FormCreator, formIsEditableByUser } from '../Forms';
import type { FormRecord, FormsApi } from '../Forms';
import type { UserProfile } from '../Auth';
import { FormShell } from './FormShell';

/* ─── Domain type ────────────────────────────────────────────────── */

interface F52Data {
  type: string;
  details: string;
  preferredDate: string;
  publishLinks: string;
  deliveryNotes: string;
}

const COVERAGE_TYPES = ['قبل/بعد', 'فيديو ميداني', 'مقابلة مع المستفيد', 'تصوير حدث'] as const;

const EMPTY_F52: F52Data = {
  type:          'قبل/بعد',
  details:       '',
  preferredDate: '',
  publishLinks:  '',
  deliveryNotes: '',
};

function toF52(raw: unknown): F52Data {
  const d = (raw ?? {}) as Partial<F52Data>;
  return { ...EMPTY_F52, ...d };
}

type FileEntry = NonNullable<FormRecord['files']>[number];

/* ─── CommsDeliverySection ────────────────────────────────────────── */

const CommsDeliverySection: React.FC<{
  rec: FormRecord;
  api: FormsApi;
  user: UserProfile;
}> = ({ rec, api, user }) => {
  const d = toF52(rec.data);
  const [publishLinks, setPublishLinks]   = useState(d.publishLinks);
  const [deliveryNotes, setDeliveryNotes] = useState(d.deliveryNotes);
  const [localFiles, setLocalFiles]       = useState<FileEntry[]>(rec.files ?? []);
  const [saving, setSaving]               = useState(false);
  const [uploading, setUploading]         = useState(false);

  const isCommsEditor = (user.department === 'COMMS' || user.role === 'PR_OFFICER')
    && rec.status === 'approved';

  const handleAddFiles = async (fileList: FileList) => {
    if (!rec.projectRefId) return;
    setUploading(true);
    try {
      const uploaded: FileEntry[] = [];
      for (const file of Array.from(fileList)) {
        const up = await uploadFileToDrive(file);
        uploaded.push({ name: file.name, url: up.url, size: up.size, uploadedAt: new Date().toISOString() });
      }
      await api.attachFiles(rec.id, uploaded);
      setLocalFiles(prev => [...prev, ...uploaded]);
    } finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.updateFormData(rec.id, { publishLinks, deliveryNotes } as Record<string, unknown>);
    } finally { setSaving(false); }
  };

  if (isCommsEditor) {
    return (
      <Card title="المخرجات الإعلامية" icon={Upload} accent="teal">
        <div className="bg-[#43bba1]/10 border border-[#43bba1]/30 rounded-lg p-3 text-xs text-[#43bba1] mb-3">
          أدخل روابط النشر والمخرجات النهائية بعد تنفيذ التغطية.
        </div>
        <TextArea
          label="روابط النشر (رابط لكل سطر)"
          rows={4}
          value={publishLinks}
          onChange={e => setPublishLinks(e.target.value)}
          placeholder="https://..."
        />
        <TextArea
          className="mt-3"
          label="ملاحظات التسليم"
          rows={2}
          value={deliveryNotes}
          onChange={e => setDeliveryNotes(e.target.value)}
        />
        <div className="mt-3">
          {uploading && <p className="text-xs text-fg-muted mb-2">جارٍ رفع الملفات…</p>}
          <FileUploader
            files={localFiles}
            onAdd={handleAddFiles}
            onRemove={i => setLocalFiles(f => f.filter((_, idx) => idx !== i))}
            label="رفع المخرجات (صور / مقاطع)"
            accept="image/*,video/*,.pdf"
          />
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-[#43bba1] text-white hover:bg-[#3aa592] disabled:opacity-50 transition"
        >
          {saving ? 'جارٍ الحفظ…' : 'حفظ المخرجات'}
        </button>
      </Card>
    );
  }

  // Read-only deliverables for non-COMMS viewers — only shown when data exists
  const hasDeliverables = !!d.publishLinks || !!d.deliveryNotes || localFiles.length > 0;
  if (!hasDeliverables) return null;

  return (
    <Card title="المخرجات الإعلامية" icon={CheckCircle2} accent="teal">
      {d.publishLinks && (
        <div className="mb-3">
          <p className="text-xs font-bold text-fg-muted mb-1 flex items-center gap-1"><Link2 className="w-3 h-3" /> روابط النشر</p>
          <div className="space-y-1">
            {d.publishLinks.split('\n').filter(Boolean).map((link, i) => (
              <a key={i} href={link.trim()} target="_blank" rel="noopener noreferrer"
                className="block text-xs text-[#43bba1] hover:underline truncate">
                {link.trim()}
              </a>
            ))}
          </div>
        </div>
      )}
      {d.deliveryNotes && (
        <ReadOnlyField label="ملاحظات التسليم" value={d.deliveryNotes} />
      )}
      {localFiles.length > 0 && (
        <ul className="mt-2 space-y-1.5">
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
      )}
    </Card>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   F52Creator
   ═══════════════════════════════════════════════════════════════════ */

export const F52Creator: FormCreator = ({ user, api, context, onClose }) => {
  const projects: Array<{ id: string; projectId: string; beneficiaryName: string }> = context?.projects ?? [];
  const [projectRefId, setProjectRefId]   = useState<string>(projects[0]?.id || '');
  const [type, setType]                   = useState<string>(COVERAGE_TYPES[0]);
  const [details, setDetails]             = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [busy, setBusy]                   = useState(false);

  const canSubmit = !!projectRefId && !!details.trim();

  const submit = async () => {
    const p = projects.find(x => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-52', user,
        projectId: p.projectId,
        projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { type, details, preferredDate, publishLinks: '', deliveryNotes: '' },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-lg bg-surface rounded-2xl shadow-card-hover border border-subtle flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle">
          <h2 className="text-base font-bold text-fg">F-52 · طلب تصوير وتوثيق</h2>
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

          {/* Coverage details */}
          <Card title="تفاصيل التغطية" icon={Camera} accent="purple">
            <div className="mb-3">
              <label className="block text-xs font-bold text-fg-muted mb-1">نوع التغطية</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border-default bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]"
              >
                {COVERAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <TextArea
              label="تفاصيل (الموقع، الزاوية، الأشخاص المعنيون…)"
              rows={3}
              required
              value={details}
              onChange={e => setDetails(e.target.value)}
            />
            <div className="mt-3">
              <Input
                type="date"
                label="التاريخ المفضّل للتصوير (اختياري)"
                value={preferredDate}
                onChange={e => setPreferredDate(e.target.value)}
              />
            </div>
          </Card>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-subtle">
          <button onClick={onClose} className="px-4 py-2 text-sm text-fg-muted hover:text-fg transition">إلغاء</button>
          <button onClick={submit} disabled={busy || !canSubmit}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg bg-[#4A1F66] text-white hover:bg-[#3A1652] disabled:opacity-50 transition">
            {busy ? 'جارٍ الرفع…' : 'رفع للاتصال المؤسسي'}
          </button>
        </div>

      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   F52Renderer
   ═══════════════════════════════════════════════════════════════════ */

export const F52Renderer: FormRenderer = ({ rec, user, api }) => {
  const canEdit = formIsEditableByUser(rec, user);
  const d = toF52(rec.data);

  const [draft, setDraft]           = useState<Pick<F52Data, 'type' | 'details' | 'preferredDate'>>({
    type: d.type, details: d.details, preferredDate: d.preferredDate,
  });
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [localFiles, setLocalFiles] = useState<FileEntry[]>(rec.files ?? []);

  const handleAddFiles = async (fileList: FileList) => {
    if (!rec.projectRefId) return;
    setUploading(true);
    try {
      const uploaded: FileEntry[] = [];
      for (const file of Array.from(fileList)) {
        const up = await uploadFileToDrive(file);
        uploaded.push({ name: file.name, url: up.url, size: up.size, uploadedAt: new Date().toISOString() });
      }
      await api.attachFiles(rec.id, uploaded);
      setLocalFiles(prev => [...prev, ...uploaded]);
    } finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.updateFormData(rec.id, draft as unknown as Record<string, unknown>);
    } finally { setSaving(false); }
  };

  // Auto-complete banner (F-07 skipped media)
  const isAutoSkipped = rec.status === 'completed'
    && (rec.approvals ?? []).some(a => a.role === 'SYSTEM' && a.note?.includes('تخطي تلقائي'));

  return (
    <FormShell rec={rec} user={user} api={api} approveLabel="إرسال الطلب للاتصال المؤسسي">

      {/* Auto-skip banner */}
      {isAutoSkipped && (
        <div className="bg-surface-up border border-subtle rounded-lg p-3 flex items-start gap-2 text-xs text-fg-muted">
          <Camera className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>أُغلق هذا النموذج تلقائياً — لم يُطلب توثيق إعلامي في شهادة التسليم.</span>
        </div>
      )}

      {canEdit ? (
        /* ── EDIT MODE (HEAD_SUPERVISION) ─────────────────────────── */
        <>
          <Card title="تفاصيل التغطية" icon={Camera} accent="purple">
            <div className="mb-3">
              <label className="block text-xs font-bold text-fg-muted mb-1">نوع التغطية</label>
              <select
                value={draft.type}
                onChange={e => setDraft(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border-default bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]"
              >
                {COVERAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <TextArea
              label="تفاصيل التغطية"
              rows={3}
              value={draft.details}
              onChange={e => setDraft(prev => ({ ...prev, details: e.target.value }))}
            />
            <div className="mt-3">
              <Input
                type="date"
                label="التاريخ المفضّل للتصوير (اختياري)"
                value={draft.preferredDate}
                onChange={e => setDraft(prev => ({ ...prev, preferredDate: e.target.value }))}
              />
            </div>
          </Card>

          <Card title="ملفات الإحاطة" icon={FileText}>
            {uploading && <p className="text-xs text-fg-muted mb-2">جارٍ رفع الملفات…</p>}
            <FileUploader
              files={localFiles}
              onAdd={handleAddFiles}
              onRemove={i => setLocalFiles(f => f.filter((_, idx) => idx !== i))}
              label="ارفع الإحاطة أو المواد المرجعية"
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
        /* ── REVIEW MODE ──────────────────────────────────────────── */
        <>
          <Card title="تفاصيل التغطية" icon={Camera} accent="purple">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ReadOnlyField label="نوع التغطية" value={d.type} />
              {d.preferredDate && (
                <ReadOnlyField label="التاريخ المفضّل" value={d.preferredDate} />
              )}
            </div>
            {d.details && (
              <div className="mt-3 bg-surface-up rounded-lg p-3 text-sm text-fg leading-relaxed border border-subtle">
                {d.details}
              </div>
            )}
          </Card>

          {/* Briefing files (uploaded by HEAD_SUPERVISION) */}
          {localFiles.filter(f => {
            // Show briefing files only — delivery files share the same list
            // so we show all files here; COMMS section handles display separately
            return true;
          }).length > 0 && !isAutoSkipped && (
            <Card title="ملفات الإحاطة" icon={FileText}>
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

      {/* COMMS delivery section — always rendered; internal logic controls edit vs read-only */}
      {!isAutoSkipped && <CommsDeliverySection rec={rec} api={api} user={user} />}

    </FormShell>
  );
};
