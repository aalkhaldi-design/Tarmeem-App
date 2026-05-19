/* ──────────────────────────────────────────────────────────────────
   نماذج F-XX — مكوّنات المعاينة والإنشاء
   كل نموذج يحترم سلسلة الاعتماد الخاصّة به ويمتلك UX خاص
   ────────────────────────────────────────────────────────────────── */
import { FormF04Renderer } from './FormF04';

import React, { useEffect, useState } from 'react';
import {
  X, Send, Plus, Building2, Users as UsersIcon, Home as HomeIcon, Activity,
  ClipboardList, Calculator, Trophy, ShieldCheck, Camera, Truck, ShoppingCart,
  DollarSign, Briefcase, FileSignature, AlertTriangle, CheckCircle2,
  Calendar,
} from 'lucide-react';

import {
  Card, Input, Select, TextArea, ReadOnlyField, FileUploader, Pill, NumberCounter,
  ProgressBar,
} from '../ui';
import { DEFAULT_LISTS, FormCode } from '../../lib/data';
import {
  FormCreator, FormRenderer, formAwaitsUser, FormRecord,
} from '../Forms';
import { FormShell, SectionTitle } from './FormShell';
import type { UserProfile } from '../Auth';

/* ──────────────────────────────────────────────────────────────────
   Types passed via the registry context
   ────────────────────────────────────────────────────────────────── */

export interface FormsContext {
  /** المشاريع الكاملة لخدمة استرجاع البيانات بين النماذج */
  projects: ProjectRecord[];
  /** ينشئ مشروعاً جديداً ويولّد TRM-ID */
  generateProjectId: () => Promise<{ projectId: string; serial: number }>;
  /** يبحث عن نموذج بكود ضمن نفس المشروع */
  findProjectForm: (projectRefId: string | null | undefined, code: FormCode) => FormRecord | null;
  /** يحدّث وثيقة المشروع (عند التحويل، حالة، إلخ) */
  updateProject: (projectRefId: string, patch: Partial<ProjectRecord>) => Promise<void>;
  /** ينشئ مشروعاً جديداً (يستخدم في F-03.transfer) */
  createProject: (data: Partial<ProjectRecord>) => Promise<string | null>;
  /** الحصول على المستخدم */
  userById: (id: string) => UserProfile | undefined;
}

export interface ProjectRecord {
  id: string;
  projectId: string;       // TRM-YYYY-NNN
  beneficiaryName: string;
  beneficiaryId?: string;
  city: string;
  neighborhood?: string;
  region?: string;
  caseRef?: string;        // CS-XXXX
  /** المرحلة الحالية: تتغيّر مع كل F-XX يكتمل */
  phase: 'RESEARCH' | 'DIAGNOSIS' | 'EVACUATION' | 'TENDERING' | 'EXECUTION' | 'HANDOVER' | 'CLOSED' | 'REJECTED' | 'CANCELLED';
  /** نسبة التقدم */
  progressPct: number;
  /** المهندس المسند للتشخيص (إن وُجد) */
  diagnosisEngineerId?: string | null;
  /** المهندس المسند للإشراف (إن وُجد) */
  supervisingEngineerId?: string | null;
  contractorName?: string | null;
  awardedPrice?: number | null;
  safetyHazard?: boolean;
  partnerEntity?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  /** بيانات إضافية — مفتوحة لكنها مصنّفة */
  extraData?: Record<string, unknown>;
}

/* ──────────────────────────────────────────────────────────────────
   F-02 — استمارة البحث الاجتماعي (Creator + Renderer)
   ────────────────────────────────────────────────────────────────── */

const F02_INIT = {
  caseRef: `CS-${Math.floor(1000 + Math.random() * 9000)}`,
  personal: { fullName: '', idNumber: '', nationality: 'سعودي', gender: 'ذكر', dob: '', mobile1: '', mobile2: '', city: '', neighborhood: '', gps: '', socialStatus: '', education: '' },
  work: { commercialReg: 'لا يوجد', currentJob: 'لا يعمل' },
  income: { socialSecurity: 0, salary: 0, pension: 0, rehab: 0, citizenAccount: 0, realEstate: 0 },
  debts: { car: 0, loans: 0, bills: 0, others: 0 },
  family: { wives: 0, sons: 0, daughters: 0, total: 0, under15: 0, over64: 0, specialNeeds: 0, healthStatus: 'سليم', socialSecurityStatus: 'غير مسجل' },
  housing: { ownership: '', type: '', age: '', furniture: '', need: '' },
  researcher: { name: '', mobile: '', visitDate: '', opinion: '' },
  manager: { name: '', title: '', mobile: '' },
  pledge: false,
};

export const F02Creator: FormCreator = ({ user, api, onClose }) => {
  const [data, setData] = useState<any>({ ...F02_INIT, researcher: { ...F02_INIT.researcher, name: user.fullName, mobile: '' } });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const update = (sec: string, key: string, value: any) => setData((d: any) => ({ ...d, [sec]: { ...d[sec], [key]: value } }));

  const totalIncome: number = Object.values(data.income).reduce<number>((a, b) => a + Number(b || 0), 0);
  const totalDebts: number = Object.values(data.debts).reduce<number>((a, b) => a + Number(b || 0), 0);

  const submit = async () => {
    if (!data.pledge) return;
    if (!data.personal.fullName || !data.personal.idNumber) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-02', user,
        beneficiaryName: data.personal.fullName,
        notes: data.researcher.opinion,
        data,
      });
      onClose();
    } finally { setBusy(false); }
  };

  const steps = ['البيانات الأساسية', 'العمل والدخل', 'الأسرة والسكن', 'الباحث والاعتماد'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <FileSignature className="w-5 h-5" />
            <h2 className="font-bold">F-02 · استمارة البحث الاجتماعي</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15"><X className="w-5 h-5" /></button>
        </div>

        {/* stepper */}
        <div className="px-5 py-3 border-b dark:border-slate-700 flex gap-2 overflow-x-auto">
          {steps.map((s, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition
                ${i === step ? 'bg-[#4A1F66] text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
              {i + 1}. {s}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-5 flex-1 space-y-4">
          {step === 0 && (
            <Card title="بيانات المستفيد" icon={UsersIcon} accent="purple">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="الاسم الكامل" required value={data.personal.fullName} onChange={e => update('personal', 'fullName', e.target.value)} />
                <Input label="رقم الهوية" required value={data.personal.idNumber} onChange={e => update('personal', 'idNumber', e.target.value)} />
                <Select label="الجنسية" required options={['سعودي', 'مقيم']} value={data.personal.nationality} onChange={e => update('personal', 'nationality', e.target.value)} />
                <Select label="الجنس" required options={['ذكر', 'أنثى']} value={data.personal.gender} onChange={e => update('personal', 'gender', e.target.value)} />
                <Input type="date" label="تاريخ الميلاد" value={data.personal.dob} onChange={e => update('personal', 'dob', e.target.value)} />
                <Select label="الحالة الاجتماعية" options={DEFAULT_LISTS.socialStatus} value={data.personal.socialStatus} onChange={e => update('personal', 'socialStatus', e.target.value)} />
                <Select label="المستوى التعليمي" options={DEFAULT_LISTS.educationLevels} value={data.personal.education} onChange={e => update('personal', 'education', e.target.value)} />
                <Input type="tel" label="جوال المستفيد" value={data.personal.mobile1} onChange={e => update('personal', 'mobile1', e.target.value)} />
                <Input type="tel" label="جوال إضافي" value={data.personal.mobile2} onChange={e => update('personal', 'mobile2', e.target.value)} />
                <Select label="المدينة" options={DEFAULT_LISTS.cities} value={data.personal.city} onChange={e => update('personal', 'city', e.target.value)} />
                <Input label="الحي" value={data.personal.neighborhood} onChange={e => update('personal', 'neighborhood', e.target.value)} />
                <Input label="رابط الخريطة (GPS)" value={data.personal.gps} onChange={e => update('personal', 'gps', e.target.value)} placeholder="https://maps.google.com/..." />
              </div>
            </Card>
          )}
          {step === 1 && (
            <>
              <Card title="بيانات العمل" icon={Briefcase}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select label="السجل التجاري" options={['يوجد', 'لا يوجد']} value={data.work.commercialReg} onChange={e => update('work', 'commercialReg', e.target.value)} />
                  <Select label="العمل الحالي" options={['يعمل', 'لا يعمل']} value={data.work.currentJob} onChange={e => update('work', 'currentJob', e.target.value)} />
                </div>
              </Card>
              <Card title="الدخل والديون الشهرية (ر.س)" icon={DollarSign} accent="teal">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <SectionTitle title="الدخل" />
                    {[
                      ['socialSecurity', 'ضمان اجتماعي'], ['salary', 'راتب عمل'], ['pension', 'تقاعد'],
                      ['rehab', 'تأهيل شامل'], ['citizenAccount', 'حساب المواطن'], ['realEstate', 'عقارات'],
                    ].map(([k, l]) => (
                      <Input key={k} type="number" label={l} value={data.income[k]} onChange={e => update('income', k, Number(e.target.value || 0))} />
                    ))}
                    <p className="text-xs font-bold text-green-700 mt-2">إجمالي الدخل: {totalIncome} ر.س</p>
                  </div>
                  <div>
                    <SectionTitle title="الديون" />
                    {[
                      ['car', 'أقساط سيارة'], ['loans', 'أقساط قروض'],
                      ['bills', 'كهرباء/ماء'], ['others', 'ديون أخرى'],
                    ].map(([k, l]) => (
                      <Input key={k} type="number" label={l} value={data.debts[k]} onChange={e => update('debts', k, Number(e.target.value || 0))} />
                    ))}
                    <p className="text-xs font-bold text-red-700 mt-2">إجمالي الديون: {totalDebts} ر.س</p>
                  </div>
                </div>
              </Card>
            </>
          )}
          {step === 2 && (
            <>
              <Card title="حالة الأسرة" icon={UsersIcon}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  {[['wives', 'الزوجات'], ['sons', 'البنين'], ['daughters', 'البنات'], ['total', 'إجمالي'], ['under15', 'أقل من 15'], ['over64', 'فوق 64'], ['specialNeeds', 'ذوي احتياجات']].map(([k, l]) => (
                    <Input key={k} type="number" label={l} value={data.family[k]} onChange={e => update('family', k, Number(e.target.value || 0))} />
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t dark:border-slate-700">
                  <Select label="الحالة الصحية" options={['سليم', 'غير سليم']} value={data.family.healthStatus} onChange={e => update('family', 'healthStatus', e.target.value)} />
                  <Select label="الضمان الاجتماعي" options={['مسجل', 'غير مسجل']} value={data.family.socialSecurityStatus} onChange={e => update('family', 'socialSecurityStatus', e.target.value)} />
                </div>
              </Card>
              <Card title="بيانات السكن" icon={HomeIcon}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select label="ملكية السكن" options={DEFAULT_LISTS.housings} value={data.housing.ownership} onChange={e => update('housing', 'ownership', e.target.value)} />
                  <Select label="نوع السكن" options={DEFAULT_LISTS.housingTypes} value={data.housing.type} onChange={e => update('housing', 'type', e.target.value)} />
                  <Input label="عمر السكن (سنوات)" type="number" value={data.housing.age} onChange={e => update('housing', 'age', e.target.value)} />
                  <Select label="حالة الأثاث" options={DEFAULT_LISTS.furnitureCondition} value={data.housing.furniture} onChange={e => update('housing', 'furniture', e.target.value)} />
                  <Select label="الاحتياج" options={DEFAULT_LISTS.needs} value={data.housing.need} onChange={e => update('housing', 'need', e.target.value)} />
                </div>
              </Card>
            </>
          )}
          {step === 3 && (
            <>
              <Card title="الباحث الاجتماعي" icon={Activity}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input label="اسم الباحث" required value={data.researcher.name} onChange={e => update('researcher', 'name', e.target.value)} />
                  <Input type="tel" label="جوال الباحث" value={data.researcher.mobile} onChange={e => update('researcher', 'mobile', e.target.value)} />
                  <Input type="date" label="تاريخ الزيارة" value={data.researcher.visitDate} onChange={e => update('researcher', 'visitDate', e.target.value)} />
                </div>
                <TextArea className="mt-3" label="رأي الباحث وتقييمه" rows={3} value={data.researcher.opinion} onChange={e => update('researcher', 'opinion', e.target.value)} />
              </Card>
              <Card title="إقرار وإرسال للمدير" icon={ShieldCheck}>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={data.pledge} onChange={e => setData((d: any) => ({ ...d, pledge: e.target.checked }))} className="mt-1 rounded border-gray-300 text-[#4A1F66] focus:ring-[#4A1F66]" />
                  <span className="text-sm">أُقرّ بصحة البيانات الميدانية والمستندات المرفقة، وأعلم أن أي معلومات غير صحيحة تُعرّضني للمساءلة.</span>
                </label>
              </Card>
            </>
          )}
        </div>
        <div className="border-t dark:border-slate-700 p-3 flex items-center justify-between gap-2">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-200 disabled:opacity-40">السابق</button>
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} className="px-5 py-2 text-sm font-bold rounded-lg bg-[#4A1F66] text-white hover:bg-[#3A1652] transition">التالي</button>
          ) : (
            <button onClick={submit} disabled={busy || !data.pledge || !data.personal.fullName}
              className="px-5 py-2 text-sm font-bold rounded-lg bg-[#56B894] text-white hover:bg-[#3F9B7A] transition disabled:opacity-50 flex items-center gap-1.5">
              <Send className="w-4 h-4" /> رفع لمدير البحث
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const F02Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  return (
    <FormShell rec={rec} user={user} api={api} approveLabel="اعتماد ورفعه لقرار الاستحقاق">
      <Card title="بيانات المستفيد" icon={UsersIcon}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReadOnlyField label="الاسم الكامل" value={d.personal?.fullName} />
          <ReadOnlyField label="رقم الهوية" value={d.personal?.idNumber} />
          <ReadOnlyField label="الجنسية" value={d.personal?.nationality} />
          <ReadOnlyField label="الجنس" value={d.personal?.gender} />
          <ReadOnlyField label="المدينة" value={d.personal?.city} />
          <ReadOnlyField label="الحي" value={d.personal?.neighborhood} />
          <ReadOnlyField label="الجوال" value={d.personal?.mobile1} />
          <ReadOnlyField label="رقم الحالة" value={d.caseRef} />
        </div>
      </Card>
      <Card title="الدخل والديون" icon={DollarSign}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {Object.entries(d.income || {}).map(([k, v]) => <Pill key={k} tone="green">{k}: {String(v)}</Pill>)}
        </div>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {Object.entries(d.debts || {}).map(([k, v]) => <Pill key={k} tone="red">{k}: {String(v)}</Pill>)}
        </div>
      </Card>
      <Card title="الأسرة والسكن" icon={HomeIcon}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReadOnlyField label="عدد الأفراد" value={d.family?.total} />
          <ReadOnlyField label="ذوي الإحتياجات" value={d.family?.specialNeeds} />
          <ReadOnlyField label="نوع السكن" value={d.housing?.type} />
          <ReadOnlyField label="ملكية السكن" value={d.housing?.ownership} />
          <ReadOnlyField label="عمر السكن" value={d.housing?.age} />
          <ReadOnlyField label="الاحتياج" value={d.housing?.need} />
        </div>
      </Card>
      <Card title="رأي الباحث" icon={Activity}>
        <ReadOnlyField label="رأي الباحث" value={d.researcher?.opinion} />
      </Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-03 — اعتماد استحقاق الخدمة
   سلسلة: مدير البحث ➡️ المدير التنفيذي ➡️ مدير البحث (للتحويل)
   عند الخطوة الأخيرة يولّد مشروعاً وينشئ F-08 ويُسند مهندس التشخيص.
   ────────────────────────────────────────────────────────────────── */

export const F03Creator: FormCreator = ({ user, api, onClose }) => {
  const f02s = api.forms.filter(f => f.code === 'F-02' && f.status === 'approved');
  const [f02Id, setF02Id] = useState<string>(f02s[0]?.id || '');
  const [eligibility, setEligibility] = useState<'مستحق' | 'غير مستحق' | ''>('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const f02 = api.forms.find(f => f.id === f02Id);

  const submit = async () => {
    if (!f02 || !eligibility) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-03', user,
        beneficiaryName: f02.beneficiaryName,
        notes,
        data: { f02Id, eligibility, managerNotes: notes, f02Snapshot: f02.data },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
          <h2 className="font-bold">F-03 · اعتماد استحقاق الخدمة</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-3">
          <Select label="استمارة البحث المرتبطة (F-02)"
            options={f02s.map(f => ({ value: f.id, label: `${f.beneficiaryName || '—'} — ${new Date(f.createdAt).toLocaleDateString('ar-SA')}` }))}
            value={f02Id} onChange={e => setF02Id(e.target.value)} />
          {f02 && (
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 text-xs space-y-1">
              <p><span className="font-bold">المستفيد:</span> {f02.beneficiaryName}</p>
              <p><span className="font-bold">المدينة:</span> {f02.data?.personal?.city}</p>
              <p><span className="font-bold">رأي الباحث:</span> {f02.data?.researcher?.opinion}</p>
            </div>
          )}
          <Select label="قرار الاستحقاق" required
            options={['مستحق', 'غير مستحق']} value={eligibility} onChange={e => setEligibility(e.target.value as any)} />
          <TextArea label="ملاحظات مدير البحث" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div className="border-t dark:border-slate-700 p-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold bg-gray-100 dark:bg-slate-700 rounded-lg">إلغاء</button>
          <button onClick={submit} disabled={busy || !f02 || !eligibility} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg hover:bg-[#3A1652] transition disabled:opacity-50 flex items-center gap-1.5">
            <Send className="w-4 h-4" /> رفع للمدير التنفيذي
          </button>
        </div>
      </div>
    </div>
  );
};

export const F03Renderer: FormRenderer = ({ rec, user, api, context, onClose }) => {
  const [busy, setBusy] = useState(false);
  const [extraNote, setExtraNote] = useState('');
  const f02 = api.forms.find(f => f.id === rec.data?.f02Id);
  const awaitsMe = formAwaitsUser(rec, user);
  const isFinalStep = rec.approvalIndex === rec.approvalChain.length - 1;
  const isResearchManagerFinal = awaitsMe && user.role === 'RESEARCH_MANAGER' && isFinalStep;

  const transferToProjects = async () => {
    setBusy(true);
    try {
      // أنشئ المشروع برقم TRM-YYYY-NNN
      const { projectId } = await context.generateProjectId();
      const projectRefId = await context.createProject({
        projectId,
        beneficiaryName: rec.beneficiaryName || f02?.beneficiaryName || 'مستفيد',
        city: f02?.data?.personal?.city || '',
        neighborhood: f02?.data?.personal?.neighborhood || '',
        caseRef: f02?.data?.caseRef,
        phase: 'DIAGNOSIS',
        progressPct: 10,
        createdBy: user.id,
        data: { f02Id: f02?.id, f03Id: rec.id },
      });
      // اعتمد الخطوة الأخيرة (تنتقل تلقائياً إلى المشاريع عبر trigger F-08)
      await api.approveForm(rec.id, user, extraNote || 'تحويل إلى إدارة المشاريع', { projectId, projectRefId });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={
      isResearchManagerFinal ? (
        <div className="border border-purple-200 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-900/20 rounded-lg p-3 space-y-3">
          <div className="text-xs font-bold text-[#4A1F66] dark:text-purple-300">الخطوة النهائية: تحويل المستفيد إلى إدارة المشاريع.</div>
          <p className="text-xs text-purple-800 dark:text-purple-300">سيتم إنشاء رقم مشروع تلقائي بالصيغة <code className="bg-white dark:bg-slate-800 px-1 rounded">TRM-{new Date().getFullYear()}-NNN</code> وفتح كراسة التشخيص F-08.</p>
          <textarea value={extraNote} onChange={e => setExtraNote(e.target.value)} rows={2} placeholder="ملاحظات التحويل (اختياري)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-[#56B894]" />
          <button onClick={transferToProjects} disabled={busy} className="w-full py-2 bg-[#4A1F66] text-white rounded-lg font-bold text-sm hover:bg-[#3A1652] transition flex items-center justify-center gap-1.5">
            <Send className="w-4 h-4" /> {busy ? 'جاري التحويل...' : 'إنشاء مشروع وتحويل لإدارة المشاريع'}
          </button>
        </div>
      ) : undefined
    }>
      <Card title="ملخص البحث الاجتماعي" icon={UsersIcon}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReadOnlyField label="المستفيد" value={f02?.beneficiaryName} />
          <ReadOnlyField label="المدينة" value={f02?.data?.personal?.city} />
          <ReadOnlyField label="نوع السكن" value={f02?.data?.housing?.type} />
          <ReadOnlyField label="الاحتياج" value={f02?.data?.housing?.need} />
        </div>
        <ReadOnlyField className="mt-3" label="رأي الباحث" value={f02?.data?.researcher?.opinion} />
      </Card>
      <Card title="قرار الاستحقاق" icon={ShieldCheck}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReadOnlyField label="القرار" value={rec.data?.eligibility} />
          <ReadOnlyField label="ملاحظات مدير البحث" value={rec.data?.managerNotes} />
        </div>
      </Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-08 — كراسة تشخيص المبنى
   سلسلة: مهندس التشخيص ➡️ رئيس التشخيص ➡️ مدير المشاريع
   ────────────────────────────────────────────────────────────────── */

export const F08Creator: FormCreator = ({ user, api, context, onClose }) => {
  const myAssignments = api.forms.filter(f => f.code === 'F-08' && f.assigneeId === user.id);
  const projects = context.projects.filter((p: ProjectRecord) => p.diagnosisEngineerId === user.id);

  const [projectRefId, setProjectRefId] = useState<string>(projects[0]?.id || '');
  const [data, setData] = useState({
    visitDate: '', team: user.fullName,
    area: '', age: '', summary: '',
    safetyHazard: false,
    civilNotes: '', elecNotes: '', plumbingNotes: '',
    finalRecommendation: '',
  });
  const [busy, setBusy] = useState(false);

  void myAssignments;

  const submit = async () => {
    const project = context.projects.find((p: ProjectRecord) => p.id === projectRefId);
    if (!project) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-08', user,
        projectId: project.projectId,
        projectRefId: project.id,
        beneficiaryName: project.beneficiaryName,
        notes: data.summary,
        data,
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
          <h2 className="font-bold">F-08 · كراسة تشخيص المبنى</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-3">
          <Card title="المشروع" icon={Building2}>
            <Select label="اختر المشروع المسند إليك"
              options={projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
              value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
          </Card>
          <Card title="بيانات الزيارة" icon={Calendar}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input type="date" label="تاريخ الزيارة" value={data.visitDate} onChange={e => setData(d => ({ ...d, visitDate: e.target.value }))} />
              <Input label="فريق التشخيص" value={data.team} onChange={e => setData(d => ({ ...d, team: e.target.value }))} />
              <Input label="المساحة التقريبية (م²)" type="number" value={data.area} onChange={e => setData(d => ({ ...d, area: e.target.value }))} />
              <Input label="العمر التقديري للبناء" value={data.age} onChange={e => setData(d => ({ ...d, age: e.target.value }))} />
            </div>
            <TextArea className="mt-3" label="ملخص تقييم المبنى" rows={3} value={data.summary} onChange={e => setData(d => ({ ...d, summary: e.target.value }))} />
          </Card>
          <Card title="ملاحظات حسب التخصص" icon={ClipboardList}>
            <TextArea label="الأعمال المدنية" rows={2} value={data.civilNotes} onChange={e => setData(d => ({ ...d, civilNotes: e.target.value }))} />
            <TextArea className="mt-2" label="الأعمال الكهربائية" rows={2} value={data.elecNotes} onChange={e => setData(d => ({ ...d, elecNotes: e.target.value }))} />
            <TextArea className="mt-2" label="أعمال السباكة" rows={2} value={data.plumbingNotes} onChange={e => setData(d => ({ ...d, plumbingNotes: e.target.value }))} />
          </Card>
          <Card title="السلامة والتوصية" icon={AlertTriangle}>
            <label className={`flex items-start gap-2 cursor-pointer p-3 rounded-lg border-2 transition ${data.safetyHazard ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-slate-700'}`}>
              <input type="checkbox" checked={data.safetyHazard} onChange={e => setData(d => ({ ...d, safetyHazard: e.target.checked }))} className="mt-1" />
              <span className="text-sm">
                <strong className="text-red-700 dark:text-red-300">المنزل غير صالح للسكن أثناء الترميم</strong>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">عند التفعيل سيتم فتح F-18 (إخلاء) و F-22 (سكن بديل) تلقائياً.</p>
              </span>
            </label>
            <TextArea className="mt-3" label="التوصية النهائية" rows={2} value={data.finalRecommendation} onChange={e => setData(d => ({ ...d, finalRecommendation: e.target.value }))} />
          </Card>
        </div>
        <div className="border-t dark:border-slate-700 p-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold bg-gray-100 dark:bg-slate-700 rounded-lg">إلغاء</button>
          <button onClick={submit} disabled={busy || !projectRefId} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg hover:bg-[#3A1652] transition disabled:opacity-50 flex items-center gap-1.5">
            <Send className="w-4 h-4" /> رفع لرئيس قسم التشخيص
          </button>
        </div>
      </div>
    </div>
  );
};

export const F08Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="بيانات الزيارة" icon={Calendar}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ReadOnlyField label="تاريخ الزيارة" value={d.visitDate} />
          <ReadOnlyField label="فريق التشخيص" value={d.team} />
          <ReadOnlyField label="المساحة التقريبية" value={d.area} />
          <ReadOnlyField label="العمر التقديري" value={d.age} />
        </div>
        <ReadOnlyField className="mt-3" label="ملخص التقييم" value={d.summary} />
      </Card>
      <Card title="الملاحظات الفنية" icon={ClipboardList}>
        <ReadOnlyField label="الأعمال المدنية" value={d.civilNotes} />
        <ReadOnlyField className="mt-2" label="الأعمال الكهربائية" value={d.elecNotes} />
        <ReadOnlyField className="mt-2" label="أعمال السباكة" value={d.plumbingNotes} />
      </Card>
      <Card title="السلامة" icon={AlertTriangle}>
        <div className={`p-3 rounded-lg ${d.safetyHazard ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200'} text-sm font-bold flex items-center gap-2`}>
          {d.safetyHazard ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {d.safetyHazard ? 'منزل غير صالح للسكن أثناء الترميم — سيُفتح F-18 و F-22.' : 'المنزل صالح لاستمرار السكن أثناء الترميم.'}
        </div>
        <ReadOnlyField className="mt-3" label="التوصية النهائية" value={d.finalRecommendation} />
      </Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-18 — تعهد إخلاء المنزل
   ────────────────────────────────────────────────────────────────── */

export const F18Creator: FormCreator = ({ user, api, context, onClose }) => {
  const projects = context.projects;
  const [projectRefId, setProjectRefId] = useState<string>(projects[0]?.id || '');
  const [evacDate, setEvacDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [pledgeFiles, setPledgeFiles] = useState<{ name: string; url?: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const p = projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-18', user,
        projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { evacDate, returnDate },
        notes, files: pledgeFiles,
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-18 · تعهد إخلاء المنزل" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع التعهد</button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="تواريخ الإخلاء" icon={Calendar}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input type="date" label="تاريخ الإخلاء" value={evacDate} onChange={e => setEvacDate(e.target.value)} />
          <Input type="date" label="تاريخ العودة المتوقع" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
        </div>
      </Card>
      <Card title="رفع التعهد الموقّع" icon={FileSignature}>
        <FileUploader files={pledgeFiles}
          onAdd={f => setPledgeFiles([...pledgeFiles, ...Array.from(f).map(file => ({ name: file.name }))])}
          onRemove={i => setPledgeFiles(pledgeFiles.filter((_, idx) => idx !== i))}
          label="أرفق التعهد (PDF أو صورة)" accept=".pdf,.jpg,.jpeg,.png" />
        <TextArea className="mt-3" label="ملاحظات" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

export const F18Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="تواريخ الإخلاء" icon={Calendar}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReadOnlyField label="تاريخ الإخلاء" value={d.evacDate} />
          <ReadOnlyField label="تاريخ العودة" value={d.returnDate} />
        </div>
      </Card>
      {(rec.files || []).length > 0 && (
        <Card title="مرفقات التعهد" icon={FileSignature}>
          <FileUploader files={rec.files || []} onAdd={() => {}} onRemove={() => {}} label="" />
        </Card>
      )}
      {rec.notes && <Card title="ملاحظات" icon={ClipboardList}><ReadOnlyField label="" value={rec.notes} /></Card>}
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-22 — طلب توفير سكن بديل (يُولَّد آلياً مع F-18)
   ────────────────────────────────────────────────────────────────── */

export const F22Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="نص الخطاب الآلي للجهة الشريكة" icon={FileSignature}>
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-sm leading-7">
          إلى مدير الجهة الشريكة المحترم،<br />
          نرجو منكم التكرم بتوفير سكن بديل وأثاث للأسرة المستفيدة <strong>{rec.beneficiaryName}</strong>{' '}
          في مدينة <strong>{d.city || '—'}</strong> خلال فترة الترميم{' '}
          {d.evacDate && <>اعتباراً من <strong>{d.evacDate}</strong></>}{' '}
          {d.returnDate && <>وحتى <strong>{d.returnDate}</strong></>}.
          <br /><br />
          مع جزيل الشكر،<br />
          إدارة البحث الاجتماعي — جمعية ترميم.
        </div>
      </Card>
      {(rec.files || []).length > 0 && (
        <Card title="مرفقات (بيان الأثاث)" icon={ClipboardList}>
          <FileUploader files={rec.files || []} onAdd={() => {}} onRemove={() => {}} label="" />
        </Card>
      )}
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-21 — حصر الأثاث والأجهزة
   ────────────────────────────────────────────────────────────────── */

const FURNITURE_CATALOG = [
  { key: 'bed15', label: 'سرير نفر ونص', avgPrice: 800 },
  { key: 'bed1',   label: 'سرير نفر', avgPrice: 600 },
  { key: 'bedDouble', label: 'سرير مزدوج', avgPrice: 1200 },
  { key: 'mattress15', label: 'مرتبة نفر ونص', avgPrice: 500 },
  { key: 'wardrobe2', label: 'دولاب درفتين', avgPrice: 900 },
  { key: 'wardrobe3', label: 'دولاب 3 درف', avgPrice: 1300 },
  { key: 'sofa', label: 'كنب', avgPrice: 2500 },
  { key: 'carpet', label: 'سجاد/موكيت', avgPrice: 600 },
];
const APPLIANCE_CATALOG = [
  { key: 'fridge', label: 'ثلاجة', avgPrice: 2200 },
  { key: 'washer', label: 'غسالة', avgPrice: 1800 },
  { key: 'stove', label: 'طباخ/فرن', avgPrice: 1500 },
  { key: 'acSplit12', label: 'مكيف سبليت 12', avgPrice: 2000 },
  { key: 'acSplit18', label: 'مكيف سبليت 18', avgPrice: 2700 },
  { key: 'waterCooler', label: 'برادة مياه', avgPrice: 600 },
];

export const F21Creator: FormCreator = ({ user, api, context, onClose }) => {
  const projects = context.projects;
  const [projectRefId, setProjectRefId] = useState<string>(projects[0]?.id || '');
  const [furniture, setFurniture] = useState<Record<string, number>>({});
  const [appliances, setAppliances] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const totalFurniture = FURNITURE_CATALOG.reduce((s, i) => s + (furniture[i.key] || 0) * i.avgPrice, 0);
  const totalAppliance = APPLIANCE_CATALOG.reduce((s, i) => s + (appliances[i.key] || 0) * i.avgPrice, 0);

  const submit = async () => {
    const p = projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-21', user, projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { furniture, appliances, totalFurniture, totalAppliance, total: totalFurniture + totalAppliance },
      });
      onClose();
    } finally { setBusy(false); }
  };

  const QtyGrid = ({ catalog, qty, setQty }: { catalog: typeof FURNITURE_CATALOG; qty: any; setQty: any }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {catalog.map(item => (
        <div key={item.key} className={`border rounded-lg p-2 ${qty[item.key] > 0 ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300' : 'border-gray-200 dark:border-slate-700'}`}>
          <p className="text-xs font-bold text-gray-700 dark:text-slate-200 mb-1">{item.label}</p>
          <p className="text-[10px] text-gray-400">{item.avgPrice} ر.س / وحدة</p>
          <NumberCounter value={qty[item.key] || 0} onChange={v => setQty({ ...qty, [item.key]: v })} />
        </div>
      ))}
    </div>
  );

  return (
    <CreatorShell title="F-21 · حصر الأثاث والأجهزة" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع الحصر</button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="الأثاث" icon={HomeIcon}>
        <QtyGrid catalog={FURNITURE_CATALOG} qty={furniture} setQty={setFurniture} />
        <p className="text-xs font-bold text-purple-700 mt-3">إجمالي الأثاث: {totalFurniture} ر.س</p>
      </Card>
      <Card title="الأجهزة" icon={Activity}>
        <QtyGrid catalog={APPLIANCE_CATALOG} qty={appliances} setQty={setAppliances} />
        <p className="text-xs font-bold text-purple-700 mt-3">إجمالي الأجهزة: {totalAppliance} ر.س</p>
      </Card>
    </CreatorShell>
  );
};

export const F21Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="ملخص الحصر" icon={ClipboardList}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ReadOnlyField label="إجمالي الأثاث" value={`${d.totalFurniture || 0} ر.س`} />
          <ReadOnlyField label="إجمالي الأجهزة" value={`${d.totalAppliance || 0} ر.س`} />
          <ReadOnlyField label="الإجمالي العام" value={`${d.total || 0} ر.س`} />
        </div>
      </Card>
      <Card title="الأثاث" icon={HomeIcon}>
        <div className="flex flex-wrap gap-2">
          {Object.entries(d.furniture || {}).map(([k, v]) => Number(v) > 0 ? <Pill key={k} tone="purple">{FURNITURE_CATALOG.find(i => i.key === k)?.label || k}: {v as any}</Pill> : null)}
        </div>
      </Card>
      <Card title="الأجهزة" icon={Activity}>
        <div className="flex flex-wrap gap-2">
          {Object.entries(d.appliances || {}).map(([k, v]) => Number(v) > 0 ? <Pill key={k} tone="teal">{APPLIANCE_CATALOG.find(i => i.key === k)?.label || k}: {v as any}</Pill> : null)}
        </div>
      </Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-20 — خطة توريد المواد
   ────────────────────────────────────────────────────────────────── */

interface SupplyItem { id: string; name: string; unit: string; qty: number; supplier?: string; eta?: string; }

export const F20Creator: FormCreator = ({ user, api, context, onClose }) => {
  const projects = context.projects;
  const [projectRefId, setProjectRefId] = useState<string>(projects[0]?.id || '');
  const [items, setItems] = useState<SupplyItem[]>([
    { id: '1', name: '', unit: '', qty: 1 },
  ]);
  const [busy, setBusy] = useState(false);

  const updateItem = (id: string, k: keyof SupplyItem, v: any) =>
    setItems(it => it.map(x => x.id === id ? { ...x, [k]: v } : x));
  const addItem = () => setItems(it => [...it, { id: Date.now() + '', name: '', unit: '', qty: 1 }]);
  const removeItem = (id: string) => setItems(it => it.filter(x => x.id !== id));

  const submit = async () => {
    const p = projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-20', user, projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { items },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-20 · خطة توريد المواد" onClose={onClose}
      footer={<button onClick={submit} disabled={busy} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع للخدمات المساندة</button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="بنود المواد" icon={ShoppingCart}>
        <div className="space-y-2">
          {items.map(it => (
            <div key={it.id} className="grid grid-cols-12 gap-2 items-end">
              <Input className="col-span-5" label="اسم المادة" value={it.name} onChange={e => updateItem(it.id, 'name', e.target.value)} />
              <Input className="col-span-3" label="الوحدة" value={it.unit} onChange={e => updateItem(it.id, 'unit', e.target.value)} />
              <Input className="col-span-2" type="number" label="الكمية" value={it.qty} onChange={e => updateItem(it.id, 'qty', Number(e.target.value || 0))} />
              <button onClick={() => removeItem(it.id)} className="col-span-2 h-9 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 text-xs font-bold">حذف</button>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="mt-3 px-3 py-1.5 rounded-lg bg-[#56B894] text-white text-xs font-bold flex items-center gap-1.5"><Plus className="w-3 h-3" /> إضافة بند</button>
      </Card>
    </CreatorShell>
  );
};

export const F20Renderer: FormRenderer = ({ rec, user, api }) => {
  const items: SupplyItem[] = rec.data?.items || [];
  const awaitsSupport = formAwaitsUser(rec, user) && user.role === 'SUPPORT_MANAGER';
  const [edited, setEdited] = useState(items);
  useEffect(() => setEdited(items), [rec.id]);

  const persist = async () => api.updateFormData(rec.id, { items: edited });

  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="بنود التوريد" icon={Truck}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-2 py-2 text-right font-bold">المادة</th>
                <th className="px-2 py-2 text-right font-bold">الوحدة</th>
                <th className="px-2 py-2 text-right font-bold">الكمية</th>
                <th className="px-2 py-2 text-right font-bold">المورد المقترح</th>
                <th className="px-2 py-2 text-right font-bold">تاريخ التسليم</th>
              </tr>
            </thead>
            <tbody>
              {edited.map(it => (
                <tr key={it.id} className="border-t dark:border-slate-700">
                  <td className="px-2 py-1.5">{it.name}</td>
                  <td className="px-2 py-1.5">{it.unit}</td>
                  <td className="px-2 py-1.5">{it.qty}</td>
                  <td className="px-2 py-1.5">
                    {awaitsSupport ? (
                      <input value={it.supplier || ''} onChange={e => setEdited(arr => arr.map(x => x.id === it.id ? { ...x, supplier: e.target.value } : x))}
                        className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-xs w-full" />
                    ) : (it.supplier || '—')}
                  </td>
                  <td className="px-2 py-1.5">
                    {awaitsSupport ? (
                      <input type="date" value={it.eta || ''} onChange={e => setEdited(arr => arr.map(x => x.id === it.id ? { ...x, eta: e.target.value } : x))}
                        className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-xs" />
                    ) : (it.eta || '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {awaitsSupport && (
          <button onClick={persist} className="mt-3 px-4 py-1.5 rounded-lg bg-[#56B894] text-white text-xs font-bold">حفظ التعديلات</button>
        )}
      </Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-19 — تعميد المقاول بتوريد الموارد
   ────────────────────────────────────────────────────────────────── */

export const F19Creator: FormCreator = ({ user, api, context, onClose }) => {
  const projects = context.projects;
  const [projectRefId, setProjectRefId] = useState<string>(projects[0]?.id || '');
  const [contractor, setContractor] = useState('');
  const [amount, setAmount] = useState('');
  const [items, setItems] = useState('');
  const [supplyMethod, setSupplyMethod] = useState('شراء مباشر');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const p = projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-19', user, projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { contractor, amount: Number(amount || 0), items, supplyMethod },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-19 · تعميد المقاول بالتوريد" onClose={onClose}
      footer={<button onClick={submit} disabled={busy} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع للمدير</button>}>
      <Card title="المشروع والمورد" icon={Truck}>
        <Select label="المشروع" options={projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <Input label="اسم المقاول" value={contractor} onChange={e => setContractor(e.target.value)} />
          <Input type="number" label="القيمة الإجمالية (ر.س)" value={amount} onChange={e => setAmount(e.target.value)} />
          <Select label="آلية التوريد" options={['شراء مباشر', 'عقد مع مورد', 'مستودع الجمعية']} value={supplyMethod} onChange={e => setSupplyMethod(e.target.value)} />
        </div>
        <TextArea className="mt-3" label="تفاصيل المواد" rows={3} value={items} onChange={e => setItems(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

export const F19Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="تفاصيل التعميد" icon={Truck}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReadOnlyField label="المقاول" value={d.contractor} />
          <ReadOnlyField label="القيمة" value={`${d.amount || 0} ر.س`} />
          <ReadOnlyField label="آلية التوريد" value={d.supplyMethod} />
        </div>
        <ReadOnlyField className="mt-3" label="تفاصيل المواد" value={d.items} />
      </Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-85 — اعتماد التسعيرات والترسية
   ────────────────────────────────────────────────────────────────── */

interface BidRow { id: string; contractor: string; price: number; notes?: string; }

export const F85Creator: FormCreator = ({ user, api, context, onClose }) => {
  const projects = context.projects;
  const [projectRefId, setProjectRefId] = useState<string>(projects[0]?.id || '');
  const [bids, setBids] = useState<BidRow[]>([{ id: '1', contractor: '', price: 0 }]);
  const [winnerId, setWinnerId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const updateBid = (id: string, k: keyof BidRow, v: any) =>
    setBids(b => b.map(x => x.id === id ? { ...x, [k]: v } : x));

  const submit = async () => {
    const p = projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p || !winnerId) return;
    const winner = bids.find(b => b.id === winnerId);
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-85', user, projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { bids, winnerId, winnerContractor: winner?.contractor, winnerPrice: winner?.price },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-85 · التسعيرات والترسية" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !winnerId} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع للمالية</button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="عروض المقاولين" icon={Calculator}>
        <div className="space-y-2">
          {bids.map(b => (
            <div key={b.id} className={`grid grid-cols-12 gap-2 items-end p-2 rounded-lg border ${winnerId === b.id ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-slate-700'}`}>
              <Input className="col-span-5" label="اسم المقاول" value={b.contractor} onChange={e => updateBid(b.id, 'contractor', e.target.value)} />
              <Input className="col-span-3" type="number" label="السعر (ر.س)" value={b.price} onChange={e => updateBid(b.id, 'price', Number(e.target.value || 0))} />
              <Input className="col-span-3" label="ملاحظات" value={b.notes || ''} onChange={e => updateBid(b.id, 'notes', e.target.value)} />
              <button onClick={() => setWinnerId(b.id)} className={`col-span-1 h-9 rounded-lg text-xs font-bold ${winnerId === b.id ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-slate-700'}`}>
                <Trophy className="w-4 h-4 mx-auto" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setBids(b => [...b, { id: Date.now() + '', contractor: '', price: 0 }])} className="mt-3 px-3 py-1.5 rounded-lg bg-[#56B894] text-white text-xs font-bold flex items-center gap-1.5"><Plus className="w-3 h-3" /> إضافة عرض</button>
      </Card>
    </CreatorShell>
  );
};

export const F85Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="عروض الأسعار" icon={Calculator}>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th className="px-2 py-2 text-right">المقاول</th>
              <th className="px-2 py-2 text-right">السعر</th>
              <th className="px-2 py-2 text-right">ملاحظات</th>
              <th className="px-2 py-2 text-right">الفائز</th>
            </tr>
          </thead>
          <tbody>
            {(d.bids || []).map((b: BidRow) => (
              <tr key={b.id} className="border-t dark:border-slate-700">
                <td className="px-2 py-1.5 font-bold">{b.contractor}</td>
                <td className="px-2 py-1.5">{b.price} ر.س</td>
                <td className="px-2 py-1.5 text-gray-500">{b.notes}</td>
                <td className="px-2 py-1.5">{d.winnerId === b.id && <Pill tone="amber"><Trophy className="w-3 h-3" /> الفائز</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-sm font-bold text-purple-700 dark:text-purple-300">قيمة الترسية: {d.winnerPrice || 0} ر.س — {d.winnerContractor}</p>
      </Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-14 — تقرير الزيارة الميدانية
   ────────────────────────────────────────────────────────────────── */

export const F14Creator: FormCreator = ({ user, api, context, onClose }) => {
  const myProjects = context.projects.filter((p: ProjectRecord) =>
    p.supervisingEngineerId === user.id || p.diagnosisEngineerId === user.id);
  const [projectRefId, setProjectRefId] = useState<string>(myProjects[0]?.id || '');
  const [visitDate, setVisitDate] = useState('');
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [requestScopeChange, setRequestScopeChange] = useState(false);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<{ name: string; url?: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const p = myProjects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-14', user, projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { visitDate, overallProgress, requestScopeChange, notes },
        files: photos,
      });
      onClose();
    } finally { setBusy(false); }
  };

  const paymentHint =
    overallProgress >= 100 ? 'الدفعة الأخيرة (10%)' :
    overallProgress >= 90  ? 'الدفعة الثالثة (30%)' :
    overallProgress >= 60  ? 'الدفعة الثانية (30%)' : null;

  return (
    <CreatorShell title="F-14 · تقرير الزيارة الميدانية" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع التقرير</button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={myProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="تقدم الإنجاز" icon={Activity}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input type="date" label="تاريخ الزيارة" value={visitDate} onChange={e => setVisitDate(e.target.value)} />
          <Input type="number" label="نسبة الإنجاز الكلية %" value={overallProgress}
            onChange={e => setOverallProgress(Math.min(100, Math.max(0, Number(e.target.value || 0))))} />
        </div>
        <div className="mt-3"><ProgressBar value={overallProgress} /></div>
        <label className="mt-3 flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={requestScopeChange} onChange={e => setRequestScopeChange(e.target.checked)} className="rounded border-gray-300 text-[#4A1F66]" />
          <span>تغيير في نطاق العمل (سيُفتح F-23 آلياً)</span>
        </label>
      </Card>
      <Card title="الصور والملاحظات" icon={Camera}>
        <FileUploader files={photos}
          onAdd={f => setPhotos([...photos, ...Array.from(f).map(file => ({ name: file.name }))])}
          onRemove={i => setPhotos(photos.filter((_, idx) => idx !== i))}
          label="ارفع صور التقدم" accept="image/*" />
        <TextArea className="mt-3" label="ملاحظات" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
      </Card>
      {paymentHint && (
        <Card title="إشعار المالية" icon={DollarSign} accent="teal">
          <p className="text-xs text-teal-800 dark:text-teal-200">عند اعتماد التقرير سيتم فتح F-15 (طلب صرف دفعة) تلقائياً — <strong>{paymentHint}</strong>.</p>
        </Card>
      )}
    </CreatorShell>
  );
};

export const F14Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  const overall = Number(d.overallProgress ?? 0);
  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="ملخص التقرير" icon={Activity}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ReadOnlyField label="تاريخ الزيارة" value={d.visitDate as string} />
          <ReadOnlyField label="نسبة الإنجاز الكلية" value={`${overall}%`} />
          <ReadOnlyField label="رقم الزيارة" value={String(d.visitNumber ?? '—')} />
        </div>
        <div className="mt-3"><ProgressBar value={overall} /></div>
        <ReadOnlyField className="mt-3" label="ملاحظات" value={d.notes as string} />
        {d.requestScopeChange && <Pill tone="amber" className="mt-2">تغيير نطاق — يستلزم F-23</Pill>}
      </Card>
      {(rec.files || []).length > 0 && (
        <Card title="الصور" icon={Camera}>
          <FileUploader files={rec.files || []} onAdd={() => {}} onRemove={() => {}} label="" />
        </Card>
      )}
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-23 — اعتماد بنود الأعمال الإضافية
   ────────────────────────────────────────────────────────────────── */

export const F23Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState<string>(context.projects[0]?.id || '');
  const [items, setItems] = useState([{ id: '1', description: '', dimensions: '', price: 0, contractor: '' }]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      const total = items.reduce((s, i) => s + Number(i.price || 0), 0);
      await api.createForm({
        code: 'F-23', user, projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { items, reason, total },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-23 · اعتماد بنود الأعمال الإضافية" onClose={onClose}
      footer={<button onClick={submit} disabled={busy} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع للسلسلة</button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={context.projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="البنود الإضافية" icon={Plus}>
        {items.map((it, idx) => (
          <div key={it.id} className="grid grid-cols-12 gap-2 items-end mb-2">
            <Input className="col-span-5" label={idx === 0 ? 'وصف العمل' : ''} value={it.description} onChange={e => setItems(arr => arr.map(x => x.id === it.id ? { ...x, description: e.target.value } : x))} />
            <Input className="col-span-2" label={idx === 0 ? 'الأبعاد' : ''} value={it.dimensions} onChange={e => setItems(arr => arr.map(x => x.id === it.id ? { ...x, dimensions: e.target.value } : x))} />
            <Input className="col-span-3" label={idx === 0 ? 'المقاول' : ''} value={it.contractor} onChange={e => setItems(arr => arr.map(x => x.id === it.id ? { ...x, contractor: e.target.value } : x))} />
            <Input className="col-span-2" label={idx === 0 ? 'السعر' : ''} type="number" value={it.price} onChange={e => setItems(arr => arr.map(x => x.id === it.id ? { ...x, price: Number(e.target.value || 0) } : x))} />
          </div>
        ))}
        <button onClick={() => setItems(arr => [...arr, { id: Date.now() + '', description: '', dimensions: '', price: 0, contractor: '' }])}
          className="px-3 py-1.5 rounded-lg bg-[#56B894] text-white text-xs font-bold flex items-center gap-1.5"><Plus className="w-3 h-3" /> إضافة بند</button>
      </Card>
      <Card title="مبرّر التغيير" icon={ClipboardList}>
        <TextArea label="السبب" rows={3} value={reason} onChange={e => setReason(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

export const F23Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="البنود الإضافية" icon={Plus}>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th className="px-2 py-2 text-right">العمل</th>
              <th className="px-2 py-2 text-right">الأبعاد</th>
              <th className="px-2 py-2 text-right">المقاول</th>
              <th className="px-2 py-2 text-right">السعر</th>
            </tr>
          </thead>
          <tbody>
            {(d.items || []).map((it: any) => (
              <tr key={it.id} className="border-t dark:border-slate-700">
                <td className="px-2 py-1.5">{it.description}</td>
                <td className="px-2 py-1.5">{it.dimensions}</td>
                <td className="px-2 py-1.5">{it.contractor}</td>
                <td className="px-2 py-1.5">{it.price} ر.س</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-sm font-bold text-purple-700 dark:text-purple-300">الإجمالي: {d.total || 0} ر.س</p>
      </Card>
      <Card title="المبرر" icon={ClipboardList}><ReadOnlyField label="" value={d.reason} /></Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-15 — طلب صرف دفعة
   ────────────────────────────────────────────────────────────────── */

export const F15Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState<string>(context.projects[0]?.id || '');
  const [milestone, setMilestone] = useState('30%');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-15', user, projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { milestone, amount: Number(amount || 0) }, notes,
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-15 · طلب صرف دفعة" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !amount} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع للمالية</button>}>
      <Card title="المشروع والمحطة" icon={DollarSign}>
        <Select label="المشروع" options={context.projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <Select label="محطة الإنجاز" options={['30%', '60%', '90%', '100%']} value={milestone} onChange={e => setMilestone(e.target.value)} />
          <Input type="number" label="قيمة الدفعة (ر.س)" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <TextArea className="mt-3" label="ملاحظات" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

export const F15Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="بيانات الدفعة" icon={DollarSign}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReadOnlyField label="محطة الإنجاز" value={d.milestone} />
          <ReadOnlyField label="القيمة" value={`${d.amount || 0} ر.س`} />
        </div>
        <ReadOnlyField className="mt-3" label="ملاحظات" value={rec.notes} />
      </Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-07 — شهادة تسليم المنزل
   ────────────────────────────────────────────────────────────────── */

export const F07Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState<string>(context.projects[0]?.id || '');
  const [data, setData] = useState({
    actualStartDate: '', actualEndDate: '', supervisingEngineer: user.fullName,
    contractorName: '', insulationGuarantee: '', mediaRequested: false,
  });
  const [files, setFiles] = useState<{ name: string; url?: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-07', user, projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName, data, files,
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-07 · شهادة تسليم المنزل" onClose={onClose}
      footer={<button onClick={submit} disabled={busy} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع الشهادة</button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={context.projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="بيانات التسليم" icon={CheckCircle2}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input type="date" label="تاريخ بدء التنفيذ" value={data.actualStartDate} onChange={e => setData(d => ({ ...d, actualStartDate: e.target.value }))} />
          <Input type="date" label="تاريخ التسليم الفعلي" value={data.actualEndDate} onChange={e => setData(d => ({ ...d, actualEndDate: e.target.value }))} />
          <Input label="المهندس المشرف" value={data.supervisingEngineer} onChange={e => setData(d => ({ ...d, supervisingEngineer: e.target.value }))} />
          <Input label="المقاول المنفذ" value={data.contractorName} onChange={e => setData(d => ({ ...d, contractorName: e.target.value }))} className="md:col-span-2" />
          <Input label="ضمان العزل (إن وجد)" value={data.insulationGuarantee} onChange={e => setData(d => ({ ...d, insulationGuarantee: e.target.value }))} placeholder="مثال: 10 سنوات" />
        </div>
      </Card>
      <Card title="رفع الشهادة" icon={FileSignature}>
        <FileUploader files={files}
          onAdd={f => setFiles([...files, ...Array.from(f).map(file => ({ name: file.name }))])}
          onRemove={i => setFiles(files.filter((_, idx) => idx !== i))}
          label="ارفع شهادة التسليم الموقعة" accept=".pdf,.jpg,.jpeg,.png" />
      </Card>
      <Card title="التغطية الإعلامية" icon={Camera}>
        <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 dark:border-slate-700">
          <input type="checkbox" checked={data.mediaRequested} onChange={e => setData(d => ({ ...d, mediaRequested: e.target.checked }))} className="mt-1" />
          <span className="text-sm">طلب تغطية إعلامية وتوثيق (سيُفتح F-52 آلياً)</span>
        </label>
      </Card>
    </CreatorShell>
  );
};

export const F07Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="بيانات التسليم" icon={CheckCircle2}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ReadOnlyField label="بدء التنفيذ" value={d.actualStartDate} />
          <ReadOnlyField label="تاريخ التسليم" value={d.actualEndDate} />
          <ReadOnlyField label="المهندس المشرف" value={d.supervisingEngineer} />
          <ReadOnlyField label="المقاول" value={d.contractorName} />
          <ReadOnlyField label="ضمان العزل" value={d.insulationGuarantee} />
        </div>
      </Card>
      {(rec.files || []).length > 0 && (
        <Card title="الشهادة" icon={FileSignature}>
          <FileUploader files={rec.files || []} onAdd={() => {}} onRemove={() => {}} label="" />
        </Card>
      )}
      {d.mediaRequested && <Pill tone="purple">تم طلب تغطية إعلامية — F-52</Pill>}
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-52 — طلب تصوير وتوثيق
   ────────────────────────────────────────────────────────────────── */

export const F52Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState<string>(context.projects[0]?.id || '');
  const [type, setType] = useState('قبل/بعد');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-52', user, projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { type, details },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-52 · طلب تصوير وتوثيق" onClose={onClose}
      footer={<button onClick={submit} disabled={busy} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع للاتصال المؤسسي</button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={context.projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="تفاصيل المهمة" icon={Camera}>
        <Select label="نوع التغطية" options={['قبل/بعد', 'فيديو ميداني', 'مقابلة مع المستفيد', 'تصوير حدث']} value={type} onChange={e => setType(e.target.value)} />
        <TextArea className="mt-3" label="تفاصيل" rows={3} value={details} onChange={e => setDetails(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

export const F52Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  const [links, setLinks] = useState<string>(d.links || '');
  const [files, setFiles] = useState(rec.files || []);
  const isPR = formAwaitsUser(rec, user) && user.role === 'PR_OFFICER';
  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="تفاصيل التغطية" icon={Camera}>
        <ReadOnlyField label="نوع التغطية" value={d.type} />
        <ReadOnlyField className="mt-3" label="تفاصيل" value={d.details} />
      </Card>
      <Card title="المخرجات الإعلامية" icon={CheckCircle2}>
        {isPR ? (
          <>
            <TextArea label="روابط النشر" rows={3} value={links} onChange={e => setLinks(e.target.value)} placeholder="https://..." />
            <FileUploader files={files}
              onAdd={f => setFiles([...files, ...Array.from(f).map(file => ({ name: file.name }))])}
              onRemove={i => setFiles(files.filter((_, idx) => idx !== i))}
              label="رفع المخرجات (صور/فيديوهات)" />
            <button onClick={() => api.updateFormData(rec.id, { links }).then(() => api.attachFiles(rec.id, files))}
              className="mt-3 px-4 py-1.5 rounded-lg bg-[#56B894] text-white text-xs font-bold">حفظ المخرجات</button>
          </>
        ) : (
          <>
            <ReadOnlyField label="روابط النشر" value={d.links} />
            {(rec.files || []).length > 0 && <FileUploader files={rec.files || []} onAdd={() => {}} onRemove={() => {}} label="" />}
          </>
        )}
      </Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   Reusable Creator Shell
   ────────────────────────────────────────────────────────────────── */

const CreatorShell: React.FC<{ title: string; onClose: () => void; footer: React.ReactNode; children: React.ReactNode }> = ({ title, onClose, footer, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" dir="rtl">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
      <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
        <h2 className="font-bold">{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15"><X className="w-5 h-5" /></button>
      </div>
      <div className="overflow-y-auto p-5 space-y-4 flex-1">{children}</div>
      <div className="border-t dark:border-slate-700 p-3 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm font-bold bg-gray-100 dark:bg-slate-700 rounded-lg">إلغاء</button>
        {footer}
      </div>
    </div>
  </div>
);

/* ──────────────────────────────────────────────────────────────────
   Registries
   ────────────────────────────────────────────────────────────────── */

export const RENDERERS: Record<string, FormRenderer | undefined> = {
  'F-02': F02Renderer,
  'F-03': F03Renderer,
  'F-04': FormF04Renderer,
  'F-08': F08Renderer,
  'F-18': F18Renderer,
  'F-22': F22Renderer,
  'F-21': F21Renderer,
  'F-20': F20Renderer,
  'F-19': F19Renderer,
  'F-85': F85Renderer,
  'F-14': F14Renderer,
  'F-23': F23Renderer,
  'F-15': F15Renderer,
  'F-07': F07Renderer,
  'F-52': F52Renderer,
};

/* ──────────────────────────────────────────────────────────────────
   F-04 Creator — تعيين مهندس التشخيص (HEAD_DIAGNOSIS originates)
   Data written: { engineerId } per RENDERER_CONTRACT
   ────────────────────────────────────────────────────────────────── */

export const F04Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState('');
  const [engineerId, setEngineerId] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const eligibleProjects = context.projects.filter(
    (p: ProjectRecord) => p.phase === 'DIAGNOSIS' && !p.diagnosisEngineerId
  );
  const engineers = context.projects.length > 0
    ? [] // populated from users prop — injected via context.userById scan
    : [];

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p || !engineerId) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-04', user,
        projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        notes,
        data: { engineerId },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-04 · تعيين مهندس التشخيص" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId || !engineerId}
        className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5">
        <Send className="w-4 h-4" /> إرسال التعيين
      </button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={eligibleProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="المهندس" icon={UsersIcon}>
        <Input label="معرّف المهندس (engineerId)" value={engineerId} onChange={e => setEngineerId(e.target.value)}
          placeholder="أدخل معرّف المستخدم من الإدارة" />
        <TextArea className="mt-3" label="ملاحظات" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-03.1 Creator — اعتماد المدير التنفيذي (EXEC_DIRECTOR originates)
   Data written: { eligibilityVerdict, managerNotes } per ACTIVATE_DATA_PROPAGATIONS
   ────────────────────────────────────────────────────────────────── */

export const F03_1Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState('');
  const [eligibilityVerdict, setEligibilityVerdict] = useState<'eligible' | 'ineligible' | ''>('');
  const [managerNotes, setManagerNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const eligibleProjects = context.projects.filter((p: ProjectRecord) => p.phase === 'RESEARCH');

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p || !eligibilityVerdict) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-03.1', user,
        projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { eligibilityVerdict, managerNotes },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-03.1 · اعتماد المدير التنفيذي" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId || !eligibilityVerdict}
        className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5">
        <Send className="w-4 h-4" /> إرسال للاعتماد
      </button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={eligibleProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="قرار الاستحقاق" icon={ShieldCheck}>
        <Select label="الحكم" required options={['', 'eligible', 'ineligible']}
          value={eligibilityVerdict} onChange={e => setEligibilityVerdict(e.target.value as 'eligible' | 'ineligible' | '')} />
        <TextArea className="mt-3" label="ملاحظات مدير البحث" rows={3} value={managerNotes} onChange={e => setManagerNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-03.2 Creator — الاعتماد النهائي للإحالة (RESEARCH_MANAGER originates)
   ────────────────────────────────────────────────────────────────── */

export const F03_2Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState('');
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const eligibleProjects = context.projects.filter((p: ProjectRecord) => p.phase === 'RESEARCH');

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-03.2', user,
        projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { confirmationNotes },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-03.2 · الاعتماد النهائي للإحالة" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId}
        className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5">
        <Send className="w-4 h-4" /> إرسال الإحالة
      </button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={eligibleProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="ملاحظات الإحالة" icon={FileSignature}>
        <TextArea label="ملاحظات الاعتماد النهائي" rows={3} value={confirmationNotes} onChange={e => setConfirmationNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-32 Creator — تعيين المهندس المشرف (HEAD_SUPERVISION originates)
   Data written: { engineerId } per RENDERER_CONTRACT
   ────────────────────────────────────────────────────────────────── */

export const F32Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState('');
  const [engineerId, setEngineerId] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const eligibleProjects = context.projects.filter(
    (p: ProjectRecord) => p.phase === 'TENDERING' && !p.supervisingEngineerId
  );

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p || !engineerId) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-32', user,
        projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        notes,
        data: { engineerId },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-32 · تعيين المهندس المشرف" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId || !engineerId}
        className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5">
        <Send className="w-4 h-4" /> إرسال التعيين
      </button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={eligibleProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="المهندس المشرف" icon={UsersIcon}>
        <Input label="معرّف المهندس (engineerId)" value={engineerId} onChange={e => setEngineerId(e.target.value)}
          placeholder="أدخل معرّف المستخدم من الإدارة" />
        <TextArea className="mt-3" label="ملاحظات" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-33 Creator — توثيق البدء (DIAGNOSIS_ENGINEER / assigned supervisor)
   Data written: seeds f08_works, visitNumber, f20_* for downstream F-14 and F-34
   ────────────────────────────────────────────────────────────────── */

export const F33Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const eligibleProjects = context.projects.filter(
    (p: ProjectRecord) => p.phase === 'TENDERING' && p.supervisingEngineerId
  );

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p || !startDate) return;
    setBusy(true);
    try {
      const f08 = context.findProjectForm(p.id, 'F-08');
      const f08Works = (f08?.data?.f08_works as unknown[] | undefined) ||
        ((f08?.data as Record<string, unknown>)?.works as unknown[] | undefined) || [];
      const f20 = context.findProjectForm(p.id, 'F-20');
      const f20data = (f20?.data || {}) as Record<string, unknown>;

      await api.createForm({
        code: 'F-33', user,
        projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        assigneeId: p.supervisingEngineerId,
        data: {
          startDate,
          supervisorNotes,
          f08_works: f08Works,
          visitNumber: 1,
          f20_items:           f20data.items || [],
          f20_directNotes:     f20data.directNotes as string || '',
          f20_inkindNotes:     f20data.inkindNotes as string || '',
          f20_partnershipNotes: f20data.partnershipNotes as string || '',
        },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-33 · توثيق البدء" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId || !startDate}
        className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5">
        <Send className="w-4 h-4" /> إرسال توثيق البدء
      </button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={eligibleProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="تفاصيل البدء" icon={Calendar}>
        <Input type="date" label="تاريخ البدء الفعلي" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <TextArea className="mt-3" label="ملاحظات المشرف" rows={3} value={supervisorNotes} onChange={e => setSupervisorNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-34 Creator — إحالة حصر المواد (DIAGNOSIS_ENGINEER / HEAD_SUPERVISION)
   ────────────────────────────────────────────────────────────────── */

export const F34Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState('');
  const [materialSummary, setMaterialSummary] = useState('');
  const [totalCost, setTotalCost] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  const eligibleProjects = context.projects.filter((p: ProjectRecord) => p.phase === 'EXECUTION');

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      const f20 = context.findProjectForm(p.id, 'F-20');
      const f20data = (f20?.data || {}) as Record<string, unknown>;
      await api.createForm({
        code: 'F-34', user,
        projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: {
          materialSummary,
          totalCost,
          f20_items:            f20data.items || [],
          f20_directNotes:      f20data.directNotes as string || '',
          f20_inkindNotes:      f20data.inkindNotes as string || '',
          f20_partnershipNotes: f20data.partnershipNotes as string || '',
        },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-34 · إحالة حصر المواد" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId}
        className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5">
        <Send className="w-4 h-4" /> إرسال الإحالة
      </button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={eligibleProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="ملخص المواد" icon={ShoppingCart}>
        <TextArea label="وصف المواد المطلوبة" rows={4} value={materialSummary} onChange={e => setMaterialSummary(e.target.value)} />
        <Input className="mt-3" type="number" label="التكلفة التقديرية (ر.س)" value={totalCost}
          onChange={e => setTotalCost(Number(e.target.value || 0))} />
      </Card>
    </CreatorShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-84 Creator — تسعيرات المقاولين (HEAD_DIAGNOSIS / DIAGNOSIS_ENGINEER)
   Data written: { f84_bids, f84_pricingNotes } per ACTIVATE_DATA_PROPAGATIONS
   ────────────────────────────────────────────────────────────────── */

export const F84Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState('');
  const [f84_pricingNotes, setF84PricingNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const eligibleProjects = context.projects.filter((p: ProjectRecord) => p.phase === 'TENDERING');

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-84', user,
        projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { f84_bids: [], f84_pricingNotes },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-84 · تسعيرات المقاولين" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId}
        className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5">
        <Send className="w-4 h-4" /> فتح جدول التسعير
      </button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={eligibleProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="ملاحظات التسعير" icon={Calculator}>
        <TextArea label="ملاحظات أولية (يُكمّل المهندس الجدول لاحقاً)" rows={3}
          value={f84_pricingNotes} onChange={e => setF84PricingNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

export const CREATORS: Record<string, FormCreator | undefined> = {
  'F-02':   F02Creator,
  'F-03':   F03Creator,
  'F-03.1': F03_1Creator,
  'F-03.2': F03_2Creator,
  'F-04':   F04Creator,
  'F-08':   F08Creator,
  'F-18':   F18Creator,
  'F-21':   F21Creator,
  'F-20':   F20Creator,
  'F-19':   F19Creator,
  'F-32':   F32Creator,
  'F-33':   F33Creator,
  'F-34':   F34Creator,
  'F-84':   F84Creator,
  'F-85':   F85Creator,
  'F-14':   F14Creator,
  'F-23':   F23Creator,
  // F-15 يُولَّد آلياً من TRIGGER_MAP (F-14 milestones) — لا Creator يدوي
  'F-07':   F07Creator,
  'F-52':   F52Creator,
  // F-22 ينشأ تلقائياً مع F-18 — لا يحتاج Creator يدوي
};
