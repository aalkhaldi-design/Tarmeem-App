/**
 * FormF02.tsx — استمارة البحث الاجتماعي
 * Phase 1 | Chain: [SOCIAL_RESEARCHER → RESEARCH_MANAGER] | SLA: 5 business days
 * Originated by SOCIAL_RESEARCHER; RESEARCH_MANAGER reviews and approves.
 */

import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  X, Send, Users as UsersIcon, Home as HomeIcon, Activity,
  Briefcase, DollarSign, FileSignature, ShieldCheck, Save, FileText,
} from 'lucide-react';
import { Card, Input, Select, TextArea, ReadOnlyField, FileUploader } from '../ui';
import { DEFAULT_LISTS } from '../../lib/data';
import { FormCreator, FormRenderer, formIsEditableByUser } from '../Forms';
import type { FormRecord } from '../Forms';
import { FormShell, SectionTitle } from './FormShell';
import { storage } from '../../lib/firebase';

/* ─── Domain types ───────────────────────────────────────────────── */

interface F02Personal {
  fullName: string; idNumber: string; nationality: string; gender: string;
  dob: string; mobile1: string; mobile2: string;
  city: string; neighborhood: string; gps: string;
  socialStatus: string; education: string;
}
interface F02Income { socialSecurity: number; salary: number; pension: number; rehab: number; citizenAccount: number; realEstate: number }
interface F02Debts  { car: number; loans: number; bills: number; others: number }
interface F02Family { wives: number; sons: number; daughters: number; total: number; under15: number; over64: number; specialNeeds: number; healthStatus: string; socialSecurityStatus: string }
interface F02Housing { ownership: string; type: string; age: string; furniture: string; need: string }
interface F02Researcher { name: string; mobile: string; visitDate: string; opinion: string }

interface F02Data {
  caseRef:    string;
  personal:   F02Personal;
  work:       { commercialReg: string; currentJob: string };
  income:     F02Income;
  debts:      F02Debts;
  family:     F02Family;
  housing:    F02Housing;
  researcher: F02Researcher;
  pledge:     boolean;
}

/* ─── Constants ──────────────────────────────────────────────────── */

const EMPTY_F02: F02Data = {
  caseRef:    '',
  personal:   { fullName: '', idNumber: '', nationality: 'سعودي', gender: 'ذكر', dob: '', mobile1: '', mobile2: '', city: '', neighborhood: '', gps: '', socialStatus: '', education: '' },
  work:       { commercialReg: 'لا يوجد', currentJob: 'لا يعمل' },
  income:     { socialSecurity: 0, salary: 0, pension: 0, rehab: 0, citizenAccount: 0, realEstate: 0 },
  debts:      { car: 0, loans: 0, bills: 0, others: 0 },
  family:     { wives: 0, sons: 0, daughters: 0, total: 0, under15: 0, over64: 0, specialNeeds: 0, healthStatus: 'سليم', socialSecurityStatus: 'غير مسجل' },
  housing:    { ownership: '', type: '', age: '', furniture: '', need: '' },
  researcher: { name: '', mobile: '', visitDate: '', opinion: '' },
  pledge:     false,
};

const INCOME_LABELS: Record<keyof F02Income, string> = {
  socialSecurity: 'ضمان اجتماعي',
  salary:         'راتب عمل',
  pension:        'تقاعد',
  rehab:          'تأهيل شامل',
  citizenAccount: 'حساب المواطن',
  realEstate:     'عقارات',
};

const DEBT_LABELS: Record<keyof F02Debts, string> = {
  car:    'أقساط سيارة',
  loans:  'أقساط قروض',
  bills:  'كهرباء / ماء',
  others: 'ديون أخرى',
};

const FAMILY_NUM_FIELDS: [keyof F02Family, string][] = [
  ['wives', 'الزوجات'], ['sons', 'البنين'], ['daughters', 'البنات'],
  ['total', 'إجمالي'], ['under15', 'أقل من 15'], ['over64', 'فوق 64'], ['specialNeeds', 'ذوو احتياجات'],
];

type FileEntry = NonNullable<FormRecord['files']>[number];

/* ─── Helper: merge raw form data with typed defaults ────────────── */

function toF02(raw: unknown): F02Data {
  const d = (raw ?? {}) as Partial<F02Data>;
  return {
    ...EMPTY_F02,
    ...d,
    personal:   { ...EMPTY_F02.personal,   ...(d.personal   ?? {}) },
    work:       { ...EMPTY_F02.work,        ...(d.work       ?? {}) },
    income:     { ...EMPTY_F02.income,      ...(d.income     ?? {}) },
    debts:      { ...EMPTY_F02.debts,       ...(d.debts      ?? {}) },
    family:     { ...EMPTY_F02.family,      ...(d.family     ?? {}) },
    housing:    { ...EMPTY_F02.housing,     ...(d.housing    ?? {}) },
    researcher: { ...EMPTY_F02.researcher,  ...(d.researcher ?? {}) },
  };
}

function sumValues(obj: Record<string, unknown>): number {
  return Object.values(obj).reduce<number>((a, b) => a + Number(b || 0), 0);
}

/* ═══════════════════════════════════════════════════════════════════
   F02Creator — 4-step wizard modal
   ═══════════════════════════════════════════════════════════════════ */

export const F02Creator: FormCreator = ({ user, api, onClose }) => {
  const today = new Date().toISOString().split('T')[0];
  const [data, setData] = useState<F02Data>(() => ({
    ...EMPTY_F02,
    caseRef:    `CS-${Math.floor(1000 + Math.random() * 9000)}`,
    researcher: { ...EMPTY_F02.researcher, name: user.fullName, visitDate: today },
  }));
  const [step, setStep]  = useState(0);
  const [busy, setBusy]  = useState(false);

  const upd = (sec: keyof F02Data, key: string, val: unknown) =>
    setData(d => ({ ...d, [sec]: { ...(d[sec] as Record<string, unknown>), [key]: val } }));

  const totalIncome = sumValues(data.income as unknown as Record<string, unknown>);
  const totalDebts  = sumValues(data.debts  as unknown as Record<string, unknown>);

  const submit = async () => {
    if (!data.pledge || !data.personal.fullName || !data.personal.idNumber) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-02',
        user,
        beneficiaryName: data.personal.fullName,
        notes:           data.researcher.opinion,
        data,
      });
      onClose();
    } finally { setBusy(false); }
  };

  const STEPS = ['البيانات الأساسية', 'العمل والدخل', 'الأسرة والسكن', 'الباحث والاعتماد'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col border border-subtle">

        {/* ── Header ── */}
        <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <FileSignature className="w-5 h-5" />
            <h2 className="font-bold">F-02 · استمارة البحث الاجتماعي</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Step indicator ── */}
        <div className="px-5 py-3 border-b border-subtle flex gap-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition
                ${i === step ? 'bg-[#4A1F66] text-white' : 'bg-surface-up text-fg-muted'}`}>
              {i + 1}. {s}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="overflow-y-auto p-5 flex-1 space-y-4">

          {/* STEP 0 — Personal data */}
          {step === 0 && (
            <Card title="بيانات المستفيد" icon={UsersIcon} accent="purple">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="الاسم الكامل" required value={data.personal.fullName}      onChange={e => upd('personal', 'fullName',     e.target.value)} />
                <Input label="رقم الهوية"   required value={data.personal.idNumber}      onChange={e => upd('personal', 'idNumber',     e.target.value)} />
                <Select label="الجنسية" options={['سعودي', 'مقيم']}                       value={data.personal.nationality}  onChange={e => upd('personal', 'nationality',  e.target.value)} />
                <Select label="الجنس"   options={['ذكر', 'أنثى']}                         value={data.personal.gender}       onChange={e => upd('personal', 'gender',       e.target.value)} />
                <Input  type="date" label="تاريخ الميلاد"                                 value={data.personal.dob}          onChange={e => upd('personal', 'dob',          e.target.value)} />
                <Select label="الحالة الاجتماعية" options={DEFAULT_LISTS.socialStatus}    value={data.personal.socialStatus} onChange={e => upd('personal', 'socialStatus', e.target.value)} />
                <Select label="المستوى التعليمي"  options={DEFAULT_LISTS.educationLevels} value={data.personal.education}    onChange={e => upd('personal', 'education',    e.target.value)} />
                <Input  type="tel" label="جوال المستفيد"                                  value={data.personal.mobile1}      onChange={e => upd('personal', 'mobile1',      e.target.value)} />
                <Input  type="tel" label="جوال إضافي"                                     value={data.personal.mobile2}      onChange={e => upd('personal', 'mobile2',      e.target.value)} />
                <Select label="المدينة" options={DEFAULT_LISTS.cities}                    value={data.personal.city}         onChange={e => upd('personal', 'city',         e.target.value)} />
                <Input  label="الحي"                                                      value={data.personal.neighborhood} onChange={e => upd('personal', 'neighborhood', e.target.value)} />
                <Input  label="رابط الخريطة (GPS)" placeholder="https://maps.google.com/..." value={data.personal.gps}    onChange={e => upd('personal', 'gps',          e.target.value)} />
              </div>
            </Card>
          )}

          {/* STEP 1 — Work & Income */}
          {step === 1 && (
            <>
              <Card title="بيانات العمل" icon={Briefcase}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select label="السجل التجاري" options={['يوجد', 'لا يوجد']} value={data.work.commercialReg} onChange={e => upd('work', 'commercialReg', e.target.value)} />
                  <Select label="العمل الحالي"  options={['يعمل', 'لا يعمل']} value={data.work.currentJob}    onChange={e => upd('work', 'currentJob',    e.target.value)} />
                </div>
              </Card>
              <Card title="الدخل والديون الشهرية (ر.س)" icon={DollarSign} accent="teal">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <SectionTitle title="الدخل" />
                    {(Object.keys(INCOME_LABELS) as (keyof F02Income)[]).map(k => (
                      <Input key={k} type="number" label={INCOME_LABELS[k]} value={data.income[k]}
                        onChange={e => upd('income', k, Number(e.target.value || 0))} />
                    ))}
                    <p className="text-xs font-bold text-green-700 dark:text-green-400 mt-2">الإجمالي: {totalIncome.toLocaleString('ar-SA')} ر.س</p>
                  </div>
                  <div>
                    <SectionTitle title="الديون" />
                    {(Object.keys(DEBT_LABELS) as (keyof F02Debts)[]).map(k => (
                      <Input key={k} type="number" label={DEBT_LABELS[k]} value={data.debts[k]}
                        onChange={e => upd('debts', k, Number(e.target.value || 0))} />
                    ))}
                    <p className="text-xs font-bold text-red-700 dark:text-red-400 mt-2">الإجمالي: {totalDebts.toLocaleString('ar-SA')} ر.س</p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* STEP 2 — Family & Housing */}
          {step === 2 && (
            <>
              <Card title="حالة الأسرة" icon={UsersIcon}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  {FAMILY_NUM_FIELDS.map(([k, l]) => (
                    <Input key={k} type="number" label={l} value={data.family[k] as number}
                      onChange={e => upd('family', k, Number(e.target.value || 0))} />
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-subtle">
                  <Select label="الحالة الصحية"    options={['سليم', 'غير سليم']}  value={data.family.healthStatus}         onChange={e => upd('family', 'healthStatus',         e.target.value)} />
                  <Select label="الضمان الاجتماعي" options={['مسجل', 'غير مسجل']} value={data.family.socialSecurityStatus} onChange={e => upd('family', 'socialSecurityStatus', e.target.value)} />
                </div>
              </Card>
              <Card title="بيانات السكن" icon={HomeIcon}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select label="ملكية السكن" options={DEFAULT_LISTS.housings}          value={data.housing.ownership} onChange={e => upd('housing', 'ownership', e.target.value)} />
                  <Select label="نوع السكن"   options={DEFAULT_LISTS.housingTypes}       value={data.housing.type}      onChange={e => upd('housing', 'type',      e.target.value)} />
                  <Input  type="number" label="عمر السكن (سنوات)"                        value={data.housing.age}       onChange={e => upd('housing', 'age',       e.target.value)} />
                  <Select label="حالة الأثاث" options={DEFAULT_LISTS.furnitureCondition} value={data.housing.furniture} onChange={e => upd('housing', 'furniture', e.target.value)} />
                  <Select label="الاحتياج"    options={DEFAULT_LISTS.needs}              value={data.housing.need}      onChange={e => upd('housing', 'need',      e.target.value)} />
                </div>
              </Card>
            </>
          )}

          {/* STEP 3 — Researcher & Pledge */}
          {step === 3 && (
            <>
              <Card title="الباحث الاجتماعي" icon={Activity}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input label="اسم الباحث"   required value={data.researcher.name}      onChange={e => upd('researcher', 'name',      e.target.value)} />
                  <Input type="tel" label="جوال الباحث"  value={data.researcher.mobile}    onChange={e => upd('researcher', 'mobile',    e.target.value)} />
                  <Input type="date" label="تاريخ الزيارة" value={data.researcher.visitDate} onChange={e => upd('researcher', 'visitDate', e.target.value)} />
                </div>
                <TextArea className="mt-3" label="رأي الباحث وتقييمه" rows={4}
                  value={data.researcher.opinion} onChange={e => upd('researcher', 'opinion', e.target.value)} />
              </Card>
              <Card title="إقرار وإرسال للمدير" icon={ShieldCheck}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={data.pledge}
                    onChange={e => setData(d => ({ ...d, pledge: e.target.checked }))}
                    className="mt-1 rounded border-border-default text-[#4A1F66] focus:ring-[#4A1F66]" />
                  <span className="text-sm text-fg leading-relaxed">
                    أُقرّ بصحة البيانات الميدانية والمستندات المرفقة، وأعلم أن أي معلومات غير صحيحة تُعرّضني للمساءلة.
                  </span>
                </label>
              </Card>
            </>
          )}
        </div>

        {/* ── Footer navigation ── */}
        <div className="border-t border-subtle p-3 flex items-center justify-between gap-2">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-surface-up text-fg-muted disabled:opacity-40 transition">
            السابق
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)}
              className="px-5 py-2 text-sm font-bold rounded-lg bg-[#4A1F66] text-white hover:bg-[#3A1652] transition">
              التالي
            </button>
          ) : (
            <button onClick={submit}
              disabled={busy || !data.pledge || !data.personal.fullName || !data.personal.idNumber}
              className="px-5 py-2 text-sm font-bold rounded-lg bg-[#43bba1] text-white hover:bg-[#3aa892] transition disabled:opacity-50 flex items-center gap-1.5">
              <Send className="w-4 h-4" />
              {busy ? 'جارٍ الإرسال…' : 'رفع لمدير البحث'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   F02Renderer — inline view; editable for SOCIAL_RESEARCHER,
   read-only review mode for RESEARCH_MANAGER and other viewers.
   ═══════════════════════════════════════════════════════════════════ */

export const F02Renderer: FormRenderer = ({ rec, user, api }) => {
  const canEdit = formIsEditableByUser(rec, user);
  const [draft,      setDraft]      = useState<F02Data>(() => toF02(rec.data));
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [localFiles, setLocalFiles] = useState<FileEntry[]>(rec.files ?? []);

  const upd = (sec: keyof F02Data, key: string, val: unknown) =>
    setDraft(d => ({ ...d, [sec]: { ...(d[sec] as Record<string, unknown>), [key]: val } }));

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
        const uuid  = crypto.randomUUID();
        const path  = `projects/${rec.projectRefId}/forms/${rec.id}/${uuid}-${file.name}`;
        const sRef  = ref(storage, path);
        await uploadBytes(sRef, file);
        const url   = await getDownloadURL(sRef);
        uploaded.push({ name: file.name, url, size: file.size, uploadedAt: new Date().toISOString() });
      }
      await api.attachFiles(rec.id, uploaded);
      setLocalFiles(prev => [...prev, ...uploaded]);
    } finally { setUploading(false); }
  };

  const totalIncome = sumValues(draft.income as unknown as Record<string, unknown>);
  const totalDebts  = sumValues(draft.debts  as unknown as Record<string, unknown>);
  const revIncome   = sumValues((rec.data as Partial<F02Data>)?.income as unknown as Record<string, unknown> ?? {});
  const revDebts    = sumValues((rec.data as Partial<F02Data>)?.debts  as unknown as Record<string, unknown> ?? {});

  const d = toF02(rec.data);

  return (
    <FormShell rec={rec} user={user} api={api} approveLabel="اعتماد الاستمارة ورفعها لقرار الاستحقاق">

      {canEdit ? (
        /* ── EDIT MODE ─────────────────────────────────────────────── */
        <>
          {/* Section 1: Personal */}
          <Card title="بيانات المستفيد" icon={UsersIcon} accent="purple">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="الاسم الكامل" required value={draft.personal.fullName}      onChange={e => upd('personal', 'fullName',     e.target.value)} />
              <Input label="رقم الهوية"   required value={draft.personal.idNumber}      onChange={e => upd('personal', 'idNumber',     e.target.value)} />
              <Select label="الجنسية" options={['سعودي', 'مقيم']}                       value={draft.personal.nationality}  onChange={e => upd('personal', 'nationality',  e.target.value)} />
              <Select label="الجنس"   options={['ذكر', 'أنثى']}                         value={draft.personal.gender}       onChange={e => upd('personal', 'gender',       e.target.value)} />
              <Input  type="date" label="تاريخ الميلاد"                                 value={draft.personal.dob}          onChange={e => upd('personal', 'dob',          e.target.value)} />
              <Select label="الحالة الاجتماعية" options={DEFAULT_LISTS.socialStatus}    value={draft.personal.socialStatus} onChange={e => upd('personal', 'socialStatus', e.target.value)} />
              <Select label="المستوى التعليمي"  options={DEFAULT_LISTS.educationLevels} value={draft.personal.education}    onChange={e => upd('personal', 'education',    e.target.value)} />
              <Input  type="tel" label="جوال المستفيد"                                  value={draft.personal.mobile1}      onChange={e => upd('personal', 'mobile1',      e.target.value)} />
              <Input  type="tel" label="جوال إضافي"                                     value={draft.personal.mobile2}      onChange={e => upd('personal', 'mobile2',      e.target.value)} />
              <Select label="المدينة" options={DEFAULT_LISTS.cities}                    value={draft.personal.city}         onChange={e => upd('personal', 'city',         e.target.value)} />
              <Input  label="الحي"                                                      value={draft.personal.neighborhood} onChange={e => upd('personal', 'neighborhood', e.target.value)} />
              <Input  label="رابط الخريطة (GPS)" placeholder="https://maps.google.com/..." value={draft.personal.gps}    onChange={e => upd('personal', 'gps',          e.target.value)} />
            </div>
          </Card>

          {/* Section 2: Work */}
          <Card title="بيانات العمل" icon={Briefcase}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select label="السجل التجاري" options={['يوجد', 'لا يوجد']} value={draft.work.commercialReg} onChange={e => upd('work', 'commercialReg', e.target.value)} />
              <Select label="العمل الحالي"  options={['يعمل', 'لا يعمل']} value={draft.work.currentJob}    onChange={e => upd('work', 'currentJob',    e.target.value)} />
            </div>
          </Card>

          {/* Section 3: Income & Debts */}
          <Card title="الدخل والديون الشهرية (ر.س)" icon={DollarSign} accent="teal">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <SectionTitle title="الدخل" />
                {(Object.keys(INCOME_LABELS) as (keyof F02Income)[]).map(k => (
                  <Input key={k} type="number" label={INCOME_LABELS[k]} value={draft.income[k]}
                    onChange={e => upd('income', k, Number(e.target.value || 0))} />
                ))}
                <p className="text-xs font-bold text-green-700 dark:text-green-400 mt-2">الإجمالي: {totalIncome.toLocaleString('ar-SA')} ر.س</p>
              </div>
              <div>
                <SectionTitle title="الديون" />
                {(Object.keys(DEBT_LABELS) as (keyof F02Debts)[]).map(k => (
                  <Input key={k} type="number" label={DEBT_LABELS[k]} value={draft.debts[k]}
                    onChange={e => upd('debts', k, Number(e.target.value || 0))} />
                ))}
                <p className="text-xs font-bold text-red-700 dark:text-red-400 mt-2">الإجمالي: {totalDebts.toLocaleString('ar-SA')} ر.س</p>
              </div>
            </div>
          </Card>

          {/* Section 4: Family */}
          <Card title="حالة الأسرة" icon={UsersIcon}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {FAMILY_NUM_FIELDS.map(([k, l]) => (
                <Input key={k} type="number" label={l} value={draft.family[k] as number}
                  onChange={e => upd('family', k, Number(e.target.value || 0))} />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-subtle">
              <Select label="الحالة الصحية"    options={['سليم', 'غير سليم']}  value={draft.family.healthStatus}         onChange={e => upd('family', 'healthStatus',         e.target.value)} />
              <Select label="الضمان الاجتماعي" options={['مسجل', 'غير مسجل']} value={draft.family.socialSecurityStatus} onChange={e => upd('family', 'socialSecurityStatus', e.target.value)} />
            </div>
          </Card>

          {/* Section 5: Housing */}
          <Card title="بيانات السكن" icon={HomeIcon}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select label="ملكية السكن" options={DEFAULT_LISTS.housings}          value={draft.housing.ownership} onChange={e => upd('housing', 'ownership', e.target.value)} />
              <Select label="نوع السكن"   options={DEFAULT_LISTS.housingTypes}       value={draft.housing.type}      onChange={e => upd('housing', 'type',      e.target.value)} />
              <Input  type="number" label="عمر السكن (سنوات)"                        value={draft.housing.age}       onChange={e => upd('housing', 'age',       e.target.value)} />
              <Select label="حالة الأثاث" options={DEFAULT_LISTS.furnitureCondition} value={draft.housing.furniture} onChange={e => upd('housing', 'furniture', e.target.value)} />
              <Select label="الاحتياج"    options={DEFAULT_LISTS.needs}              value={draft.housing.need}      onChange={e => upd('housing', 'need',      e.target.value)} />
            </div>
          </Card>

          {/* Section 6: Researcher */}
          <Card title="الباحث الاجتماعي" icon={Activity}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="اسم الباحث"    value={draft.researcher.name}      onChange={e => upd('researcher', 'name',      e.target.value)} />
              <Input type="tel" label="جوال الباحث" value={draft.researcher.mobile}    onChange={e => upd('researcher', 'mobile',    e.target.value)} />
              <Input type="date" label="تاريخ الزيارة" value={draft.researcher.visitDate} onChange={e => upd('researcher', 'visitDate', e.target.value)} />
            </div>
            <TextArea className="mt-3" label="رأي الباحث وتقييمه" rows={4}
              value={draft.researcher.opinion} onChange={e => upd('researcher', 'opinion', e.target.value)} />
          </Card>

          {/* Section 7: File uploads */}
          <Card title="المستندات المرفقة" icon={FileText}>
            {uploading && <p className="text-xs text-fg-muted mb-2">جارٍ رفع الملفات…</p>}
            <FileUploader
              files={localFiles}
              onAdd={handleAddFiles}
              onRemove={i => setLocalFiles(f => f.filter((_, idx) => idx !== i))}
              label="إرفاق صور المبنى والمستندات الداعمة"
              accept="image/*,.pdf"
            />
          </Card>

          {/* Save button */}
          <div className="flex justify-start pt-1">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg bg-[#4A1F66] text-white hover:bg-[#3A1652] disabled:opacity-50 transition">
              <Save className="w-4 h-4" />
              {saving ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}
            </button>
          </div>
        </>
      ) : (
        /* ── REVIEW MODE ───────────────────────────────────────────── */
        <>
          {/* Section 1: Personal */}
          <Card title="البيانات الشخصية" icon={UsersIcon} accent="purple">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ReadOnlyField label="الاسم الكامل"      value={d.personal.fullName} />
              <ReadOnlyField label="رقم الهوية"        value={d.personal.idNumber} />
              <ReadOnlyField label="الجنسية"           value={d.personal.nationality} />
              <ReadOnlyField label="الجنس"             value={d.personal.gender} />
              <ReadOnlyField label="تاريخ الميلاد"     value={d.personal.dob} />
              <ReadOnlyField label="الحالة الاجتماعية" value={d.personal.socialStatus} />
              <ReadOnlyField label="المستوى التعليمي"  value={d.personal.education} />
              <ReadOnlyField label="جوال المستفيد"     value={d.personal.mobile1} />
              <ReadOnlyField label="جوال إضافي"        value={d.personal.mobile2} />
              <ReadOnlyField label="المدينة"           value={d.personal.city} />
              <ReadOnlyField label="الحي"              value={d.personal.neighborhood} />
              <ReadOnlyField label="رقم الحالة"        value={d.caseRef} />
            </div>
            {d.personal.gps && (
              <a href={d.personal.gps} target="_blank" rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-[#43bba1] hover:underline">
                عرض الموقع على الخريطة ↗
              </a>
            )}
          </Card>

          {/* Section 2: Work & Income */}
          <Card title="العمل والدخل" icon={DollarSign} accent="teal">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <ReadOnlyField label="السجل التجاري" value={d.work.commercialReg} />
              <ReadOnlyField label="العمل الحالي"  value={d.work.currentJob} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <SectionTitle title="الدخل الشهري" />
                <table className="w-full text-xs">
                  <tbody>
                    {(Object.entries(INCOME_LABELS) as [keyof F02Income, string][]).map(([k, label]) =>
                      d.income[k] > 0 ? (
                        <tr key={k} className="border-b border-subtle last:border-0">
                          <td className="py-1 text-fg-muted">{label}</td>
                          <td className="py-1 text-left font-mono text-fg">{d.income[k].toLocaleString('ar-SA')} ر.س</td>
                        </tr>
                      ) : null
                    )}
                    <tr>
                      <td className="py-1.5 font-bold text-green-700 dark:text-green-400">الإجمالي</td>
                      <td className="py-1.5 text-left font-mono font-bold text-green-700 dark:text-green-400">{revIncome.toLocaleString('ar-SA')} ر.س</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <SectionTitle title="الديون الشهرية" />
                <table className="w-full text-xs">
                  <tbody>
                    {(Object.entries(DEBT_LABELS) as [keyof F02Debts, string][]).map(([k, label]) =>
                      d.debts[k] > 0 ? (
                        <tr key={k} className="border-b border-subtle last:border-0">
                          <td className="py-1 text-fg-muted">{label}</td>
                          <td className="py-1 text-left font-mono text-fg">{d.debts[k].toLocaleString('ar-SA')} ر.س</td>
                        </tr>
                      ) : null
                    )}
                    <tr>
                      <td className="py-1.5 font-bold text-red-700 dark:text-red-400">الإجمالي</td>
                      <td className="py-1.5 text-left font-mono font-bold text-red-700 dark:text-red-400">{revDebts.toLocaleString('ar-SA')} ر.س</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Section 3: Family & Housing */}
          <Card title="الأسرة والسكن" icon={HomeIcon}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <ReadOnlyField label="الزوجات"         value={d.family.wives} />
              <ReadOnlyField label="البنين"           value={d.family.sons} />
              <ReadOnlyField label="البنات"           value={d.family.daughters} />
              <ReadOnlyField label="الإجمالي"         value={d.family.total} />
              <ReadOnlyField label="أقل من 15"        value={d.family.under15} />
              <ReadOnlyField label="فوق 64"           value={d.family.over64} />
              <ReadOnlyField label="ذوو احتياجات"     value={d.family.specialNeeds} />
              <ReadOnlyField label="الحالة الصحية"    value={d.family.healthStatus} />
              <ReadOnlyField label="الضمان الاجتماعي" value={d.family.socialSecurityStatus} />
            </div>
            <div className="pt-3 border-t border-subtle grid grid-cols-1 md:grid-cols-2 gap-3">
              <ReadOnlyField label="ملكية السكن" value={d.housing.ownership} />
              <ReadOnlyField label="نوع السكن"   value={d.housing.type} />
              <ReadOnlyField label="عمر السكن"   value={d.housing.age ? `${d.housing.age} سنة` : ''} />
              <ReadOnlyField label="حالة الأثاث" value={d.housing.furniture} />
              <ReadOnlyField label="الاحتياج"    value={d.housing.need} />
            </div>
          </Card>

          {/* Section 4: Researcher */}
          <Card title="رأي الباحث الاجتماعي" icon={Activity}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <ReadOnlyField label="اسم الباحث"    value={d.researcher.name} />
              <ReadOnlyField label="جوال الباحث"   value={d.researcher.mobile} />
              <ReadOnlyField label="تاريخ الزيارة" value={d.researcher.visitDate} />
            </div>
            {d.researcher.opinion && (
              <div className="bg-surface-up rounded-lg p-3 text-sm text-fg leading-relaxed border border-subtle">
                {d.researcher.opinion}
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
        </>
      )}

    </FormShell>
  );
};
