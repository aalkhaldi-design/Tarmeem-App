/* ──────────────────────────────────────────────────────────────────
   نماذج F-XX — مكوّنات المعاينة والإنشاء
   كل نموذج يحترم سلسلة الاعتماد الخاصّة به ويمتلك UX خاص
   ────────────────────────────────────────────────────────────────── */

import React, { useEffect, useState } from 'react';
import {
  X, Send, Plus, Building2, Users as UsersIcon, Home as HomeIcon, Activity,
  ClipboardList, Calculator, Trophy, ShieldCheck, Camera, Truck, ShoppingCart,
  DollarSign, Briefcase, FileSignature, AlertTriangle, CheckCircle2,
  Calendar, Trash2, ChevronUp, ChevronDown, Image as ImageIcon, Sofa, PenTool,
} from 'lucide-react';

import {
  Card, Input, Select, TextArea, ReadOnlyField, FileUploader, Pill, NumberCounter,
  ProgressBar,
} from '../ui';
import { DEFAULT_LISTS, FormCode, canCreateForm } from '../../lib/data';
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
  phase: 'RESEARCH' | 'DIAGNOSIS' | 'EVACUATION' | 'TENDERING' | 'EXECUTION' | 'HANDOVER' | 'CLOSED';
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
  /** عند true: رقم المشروع تم تأكيده وتجميده ولا يمكن تعديله. */
  projectIdLocked?: boolean;
  /** مسودات النماذج التي لم تُنشأ بعد كسجلات FormRecord. مفتاح المسودة عادة FormCode (مثلاً 'F-02'، 'F-08')
   *  أو للنماذج الديناميكية في المرحلة 4 يكون 'F-14-seq-3'. */
  formDrafts?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  /** بيانات إضافية مفتوحة */
  data?: Record<string, any>;
}

/* ──────────────────────────────────────────────────────────────────
   F-02 — استمارة البحث الاجتماعي (Creator + Renderer)
   ────────────────────────────────────────────────────────────────── */

const F02_INIT = {
  caseRef: `CS-${Math.floor(1000 + Math.random() * 9000)}`,
  projectNumber: '',
  projectNumberLocked: false,
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

export const F02Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [data, setData] = useState<any>({ ...F02_INIT, researcher: { ...F02_INIT.researcher, name: user.fullName, mobile: '' } });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const update = (sec: string, key: string, value: any) => setData((d: any) => ({ ...d, [sec]: { ...d[sec], [key]: value } }));
  const updateRoot = (key: string, value: any) => setData((d: any) => ({ ...d, [key]: value }));

  const totalIncome: number = Object.values(data.income).reduce<number>((a, b) => a + Number(b || 0), 0);
  const totalDebts: number = Object.values(data.debts).reduce<number>((a, b) => a + Number(b || 0), 0);

  const submit = async () => {
    if (!canCreateForm('F-02', user)) return;
    if (!data.pledge) return;
    if (!data.personal.fullName || !data.personal.idNumber) return;
    setBusy(true);
    try {
      const projectRefId = await context.createProject({
        projectId: data.projectNumber || '',
        projectIdLocked: !!data.projectNumberLocked,
        beneficiaryName: data.personal.fullName,
        beneficiaryId: data.personal.idNumber,
        city: data.personal.city,
        neighborhood: data.personal.neighborhood,
        caseRef: data.caseRef,
        phase: 'RESEARCH',
        progressPct: 0,
        createdBy: user.id,
        data: {},
      });
      await api.createForm({
        code: 'F-02', user,
        projectId: data.projectNumber || '',
        projectRefId: projectRefId,
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
            <>
            <Card title="رقم المشروع (اختياري)" icon={Building2} accent="teal">
              <div className="flex items-end gap-3 flex-wrap">
                <Input
                  label="رقم المشروع"
                  className="flex-1 min-w-[220px]"
                  value={data.projectNumber}
                  readOnly={!!data.projectNumberLocked}
                  onChange={e => updateRoot('projectNumber', e.target.value)}
                  placeholder="اتركه فارغاً ليُملأ لاحقاً" />
                {data.projectNumberLocked ? (
                  <Pill tone="green" className="mb-1.5"><CheckCircle2 className="w-3 h-3" /> مُعتمَد ومُجمَّد</Pill>
                ) : (
                  data.projectNumber.trim() && (
                    <button
                      type="button"
                      onClick={() => updateRoot('projectNumberLocked', true)}
                      className="mb-0 px-4 py-2 rounded-lg text-xs font-bold bg-[#3F9B7A] text-white hover:bg-[#2f7a5e] transition flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> تأكيد وتجميد رقم المشروع
                    </button>
                  )
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-2 leading-relaxed">
                اختياري — يمكنك تركه فارغاً، أو إدخاله هنا أو لاحقاً من شاشة المشروع. بعد التأكيد لا يمكن تعديله.
              </p>
            </Card>
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
            </>
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

/** قراءة فقط لمحتوى F-02 — يُعاد استخدامه في عرض المشروع. */
export const F02ReadOnlyBody: React.FC<{ rec: FormRecord }> = ({ rec }) => {
  const d = rec.data || {};
  return (
    <>
      {(d.projectNumber || d.projectNumberLocked) && (
        <Card title="رقم المشروع" icon={Building2} accent="teal">
          <div className="flex items-center gap-3 flex-wrap">
            <ReadOnlyField label="رقم المشروع" value={d.projectNumber || '—'} className="flex-1 min-w-[220px]" />
            {d.projectNumberLocked && (
              <Pill tone="green" className="mb-1.5"><CheckCircle2 className="w-3 h-3" /> مُجمَّد</Pill>
            )}
          </div>
        </Card>
      )}
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
    </>
  );
};

export const F02Renderer: FormRenderer = ({ rec, user, api }) => (
  <FormShell rec={rec} user={user} api={api} approveLabel="اعتماد ورفعه لقرار الاستحقاق">
    <F02ReadOnlyBody rec={rec} />
  </FormShell>
);

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
    if (!canCreateForm('F-03', user)) return;
    if (!f02 || !eligibility) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-03', user,
        projectId: f02.projectId || '',
        projectRefId: f02.projectRefId || null,
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
  const isResearchManagerFinal =
    awaitsMe && user.role === 'RESEARCH_MANAGER' && user.department === 'RESEARCH' && isFinalStep;

  const transferToProjects = async () => {
    setBusy(true);
    try {
      let projectRefId = rec.projectRefId || null;
      let projectId = rec.projectId || '';

      // المشروع موجود مسبقاً منذ تقديم F-02 — نُحدِّث المرحلة فقط.
      if (projectRefId) {
        await context.updateProject(projectRefId, { phase: 'DIAGNOSIS', progressPct: 25 });
      } else {
        // مسار احتياطي للسجلات القديمة التي لا تحمل projectRefId.
        const gen = await context.generateProjectId();
        projectId = gen.projectId;
        projectRefId = await context.createProject({
          projectId,
          beneficiaryName: rec.beneficiaryName || f02?.beneficiaryName || 'مستفيد',
          city: f02?.data?.personal?.city || '',
          neighborhood: f02?.data?.personal?.neighborhood || '',
          caseRef: f02?.data?.caseRef,
          phase: 'DIAGNOSIS',
          progressPct: 25,
          createdBy: user.id,
          data: { f02Id: f02?.id, f03Id: rec.id },
        });
      }

      await api.approveForm(rec.id, user, extraNote || 'تحويل إلى إدارة المشاريع', { projectId, projectRefId });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={
      isResearchManagerFinal ? (
        <div className="border border-purple-200 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-900/20 rounded-lg p-3 space-y-3">
          <div className="text-xs font-bold text-[#4A1F66] dark:text-purple-300">الخطوة النهائية: تحويل المستفيد إلى إدارة المشاريع.</div>
          <p className="text-xs text-purple-800 dark:text-purple-300">سيتم تحديث مرحلة المشروع إلى <strong>التشخيص</strong> وفتح كراسة التشخيص F-08.</p>
          <textarea value={extraNote} onChange={e => setExtraNote(e.target.value)} rows={2} placeholder="ملاحظات التحويل (اختياري)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-[#56B894]" />
          <button onClick={transferToProjects} disabled={busy} className="w-full py-2 bg-[#4A1F66] text-white rounded-lg font-bold text-sm hover:bg-[#3A1652] transition flex items-center justify-center gap-1.5">
            <Send className="w-4 h-4" /> {busy ? 'جاري التحويل...' : 'تحويل المشروع لإدارة المشاريع'}
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
   البنية: 4 خطوات — البيانات الأساسية، حصر الأعمال، الأثاث والأجهزة، الاعتماد
   ────────────────────────────────────────────────────────────────── */

interface F08WorkSpace {
  id: number;
  name: string;
  isExpanded: boolean;
  images: { name: string; url?: string }[];
  civil: {
    concrete: string; roof: string; insulation: string; shinko: string; ceramic: string;
    paint: string; plaster: string; wood: string; aluminum: string; steel: string; notes: string;
  };
  electrical: {
    panel: number; ceilingLight: number; concreteLight: number; spotlight: number;
    sockets: number; doubleSwitch: number; acSwitch: number; heaterSocket: number;
  };
  plumbing: {
    toiletFr: number; toiletAr: number; heater: number; bidet: number;
    showerMixer: number; sink: number; sinkMixer: number; exhaust: number;
  };
}

const newF08WorkSpace = (): F08WorkSpace => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  name: '', isExpanded: true, images: [],
  civil: { concrete: '', roof: '', insulation: '', shinko: '', ceramic: '', paint: '', plaster: '', wood: '', aluminum: '', steel: '', notes: '' },
  electrical: { panel: 0, ceilingLight: 0, concreteLight: 0, spotlight: 0, sockets: 0, doubleSwitch: 0, acSwitch: 0, heaterSocket: 0 },
  plumbing: { toiletFr: 0, toiletAr: 0, heater: 0, bidet: 0, showerMixer: 0, sink: 0, sinkMixer: 0, exhaust: 0 },
});

export const F08Creator: FormCreator = ({ user, api, context, onClose }) => {
  const projects = context.projects.filter((p: ProjectRecord) => p.diagnosisEngineerId === user.id);
  const [projectRefId, setProjectRefId] = useState<string>(projects[0]?.id || '');
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const linkedProject = context.projects.find((p: ProjectRecord) => p.id === projectRefId);

  const [data, setData] = useState<any>({
    /* top-level — تستهلكها محرّك سير العمل (App.tsx) */
    safetyHazard: false,
    visitDate: new Date().toISOString().split('T')[0],
    team: user.fullName,
    area: '', age: '', summary: '',
    finalRecommendation: '',

    /* أقسام مفصّلة */
    general: {
      caseRef: '', projectNumber: '', familyName: '', contactNumber: '',
      cityNeighborhood: '', partnerEntity: '', partnerRep: '', repContact: '',
    },
    visit: { type: 'منزل', diagnosis: 'المبنى قابل للترميم' },
    works: [] as F08WorkSpace[],
    furnitureInfo: { type: 'منزل', condition: 'ترميم', males: 0, females: 0 },
    furnitureItems: {
      bed15: 0, mattress15: 0, bed1: 0, mattress1: 0, bedDouble: 0, mattressDouble: 0,
      carpet: 0, sofaSeats: 0, sofaMeters: 0, floorSeating: 0,
      nightstand: 0, dresser: 0, wardrobe2: 0, wardrobe3: 0, wardrobe4: 0,
    },
    appliances: {
      acSplit1: 0, acSplit15: 0, acWindow15: 0,
      washer: 0, fridge: 0, stove: 0, vacuum: 0, waterCooler: 0,
    },
    diagnosisNotes: '',
    pledge: false,
  });

  /* جلب البيانات تلقائياً من سجل المشروع المرتبط (يقابل F-02 في الكراسة) */
  useEffect(() => {
    if (!linkedProject) return;
    setData((d: any) => ({
      ...d,
      general: {
        ...d.general,
        familyName: linkedProject.beneficiaryName || d.general.familyName,
        caseRef: linkedProject.caseRef || d.general.caseRef,
        projectNumber: linkedProject.projectId || d.general.projectNumber,
        cityNeighborhood: [linkedProject.city, linkedProject.neighborhood].filter(Boolean).join(' — ') || d.general.cityNeighborhood,
        partnerEntity: linkedProject.partnerEntity || d.general.partnerEntity,
      },
    }));
  }, [linkedProject?.id]);

  const updateNested = (section: string, field: string, value: any) =>
    setData((d: any) => ({ ...d, [section]: { ...d[section], [field]: value } }));

  const addWorkSpace = () =>
    setData((d: any) => ({ ...d, works: [...d.works, newF08WorkSpace()] }));

  const toggleExpand = (id: number) =>
    setData((d: any) => ({ ...d, works: d.works.map((w: F08WorkSpace) => w.id === id ? { ...w, isExpanded: !w.isExpanded } : w) }));

  const removeWorkSpace = (id: number) =>
    setData((d: any) => ({ ...d, works: d.works.filter((w: F08WorkSpace) => w.id !== id) }));

  const updateWorkSpace = (id: number, category: keyof F08WorkSpace | null, field: string, value: any) =>
    setData((d: any) => ({
      ...d,
      works: d.works.map((w: F08WorkSpace) => {
        if (w.id !== id) return w;
        if (category) return { ...w, [category]: { ...(w as any)[category], [field]: value } };
        return { ...w, [field]: value };
      }),
    }));

  const handleSpaceImageNames = (id: number, fileList: FileList) => {
    const names = Array.from(fileList).map(f => ({ name: f.name }));
    setData((d: any) => ({
      ...d,
      works: d.works.map((w: F08WorkSpace) => w.id === id ? { ...w, images: [...w.images, ...names] } : w),
    }));
  };

  const removeSpaceImage = (id: number, idx: number) =>
    setData((d: any) => ({
      ...d,
      works: d.works.map((w: F08WorkSpace) => w.id === id ? { ...w, images: w.images.filter((_, i) => i !== idx) } : w),
    }));

  const submit = async () => {
    if (!linkedProject || !data.pledge) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-08', user,
        projectId: linkedProject.projectId,
        projectRefId: linkedProject.id,
        beneficiaryName: linkedProject.beneficiaryName,
        notes: data.summary,
        data,
      });
      onClose();
    } finally { setBusy(false); }
  };

  const steps = [
    { id: 0, title: 'البيانات الأساسية', icon: HomeIcon },
    { id: 1, title: 'حصر الأعمال', icon: ClipboardList },
    { id: 2, title: 'الأثاث والأجهزة', icon: Sofa },
    { id: 3, title: 'الاعتماد والرفع', icon: FileSignature },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <FileSignature className="w-5 h-5" />
            <h2 className="font-bold">F-08 · كراسة تشخيص المبنى</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15"><X className="w-5 h-5" /></button>
        </div>

        {/* Stepper */}
        <div className="px-5 py-3 border-b dark:border-slate-700 flex gap-2 overflow-x-auto hide-scrollbar">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <button key={s.id} onClick={() => setStep(i)}
                className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition
                  ${i === step
                    ? 'bg-[#4A1F66] text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                <Icon className="w-3.5 h-3.5" />
                {i + 1}. {s.title}
              </button>
            );
          })}
        </div>

        <div className="overflow-y-auto p-5 flex-1 space-y-4">

          {/* Step 0 — البيانات الأساسية */}
          {step === 0 && (
            <>
              <Card title="المشروع المُسنَد" icon={Building2}>
                {projects.length === 0 ? (
                  <div className="text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                    لا توجد مشاريع مُسنَدة إليك حالياً كمهندس تشخيص.
                  </div>
                ) : (
                  <Select label="اختر المشروع المسند إليك" required
                    options={projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
                    value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
                )}
              </Card>

              <Card title="بيانات الأسرة والمنزل (تُجلب من F-02)" icon={UsersIcon}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Input label="اسم الأسرة" value={data.general.familyName} onChange={e => updateNested('general', 'familyName', e.target.value)} />
                  <Input label="رقم التواصل" value={data.general.contactNumber} onChange={e => updateNested('general', 'contactNumber', e.target.value)} />
                  <Input label="رقم الحالة المرجعي" value={data.general.caseRef} onChange={e => updateNested('general', 'caseRef', e.target.value)} />
                  <Input label="رقم المشروع" value={data.general.projectNumber} onChange={e => updateNested('general', 'projectNumber', e.target.value)} readOnly />
                  <Input label="المدينة – الحي" value={data.general.cityNeighborhood} onChange={e => updateNested('general', 'cityNeighborhood', e.target.value)} />
                  <Input label="الجهة الشريكة" value={data.general.partnerEntity} onChange={e => updateNested('general', 'partnerEntity', e.target.value)} />
                  <Input label="ممثل الجهة الشريكة" value={data.general.partnerRep} onChange={e => updateNested('general', 'partnerRep', e.target.value)} />
                  <Input label="رقم تواصل الممثل" value={data.general.repContact} onChange={e => updateNested('general', 'repContact', e.target.value)} />
                </div>
              </Card>

              <Card title="زيارة التشخيص" icon={Calendar} accent="teal">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Input type="date" label="تاريخ الزيارة" value={data.visitDate} onChange={e => setData((d: any) => ({ ...d, visitDate: e.target.value }))} />
                  <Select label="نوع المبنى" options={['منزل', 'شقة', 'فيلا', 'شعبي']} value={data.visit.type} onChange={e => updateNested('visit', 'type', e.target.value)} />
                  <Input label="المساحة التقريبية (م²)" type="number" value={data.area} onChange={e => setData((d: any) => ({ ...d, area: e.target.value }))} />
                  <Input label="العمر التقديري للبناء" value={data.age} onChange={e => setData((d: any) => ({ ...d, age: e.target.value }))} />
                  <Input className="md:col-span-2 lg:col-span-4" label="فريق التشخيص" value={data.team} onChange={e => setData((d: any) => ({ ...d, team: e.target.value }))} />
                </div>

                <div className="mt-4 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">النتيجة المبدئية للزيارة</label>
                  <div className="flex flex-wrap gap-2">
                    {['المبنى قابل للترميم', 'المبنى لا يحتاج للترميم', 'المبنى آيل للسقوط', 'يحول صيانة'].map(opt => (
                      <label key={opt} className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-md border text-xs font-medium transition
                        ${data.visit.diagnosis === opt
                          ? 'bg-[#56B894]/10 border-[#56B894] text-[#3F9B7A] dark:bg-[#56B894]/20 dark:text-[#7AC8AD]'
                          : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-[#56B894]'}`}>
                        <input type="radio" value={opt} checked={data.visit.diagnosis === opt}
                          onChange={() => updateNested('visit', 'diagnosis', opt)}
                          className="text-[#56B894] focus:ring-[#56B894] w-3 h-3" />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Safety Hazard — يحرّك F-18 و F-22 */}
                <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 transition border-2
                  ${data.safetyHazard
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'}`}>
                  <input
                    type="checkbox"
                    id="safetyHazard"
                    checked={data.safetyHazard}
                    onChange={e => setData((d: any) => ({ ...d, safetyHazard: e.target.checked }))}
                    className="mt-1 w-5 h-5 text-red-600 rounded focus:ring-red-500 cursor-pointer" />
                  <label htmlFor="safetyHazard" className="cursor-pointer select-none">
                    <div className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300">
                      <AlertTriangle className="w-4 h-4" />
                      تنبيه سلامة: المنزل غير صالح للسكن أثناء الترميم
                    </div>
                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                      تحديد هذا الخيار سيقوم النظام تلقائياً بإنشاء (F-18 طلب إخلاء) و (F-22 إسكان بديل) وتحويلها في سلسلة الاعتمادات.
                    </p>
                  </label>
                </div>

                <TextArea className="mt-4" label="ملخص تقييم المبنى (أسباب قابلية أو عدم قابلية الترميم)" rows={3}
                  value={data.summary} onChange={e => setData((d: any) => ({ ...d, summary: e.target.value }))} />
              </Card>
            </>
          )}

          {/* Step 1 — حصر الأعمال */}
          {step === 1 && (
            <Card title="حصر كميات الأعمال (البنود المبدئية)" icon={ClipboardList}>
              <div className="space-y-4">
                {data.works.length === 0 ? (
                  <div className="bg-gray-50 dark:bg-slate-800 p-8 rounded-xl text-center border-2 border-dashed border-gray-200 dark:border-slate-700">
                    <ClipboardList className="w-10 h-10 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-gray-600 dark:text-slate-300 mb-1">لا توجد مساحات مضافة</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">أضف غرفة، صالة، مطبخ، أو أي مساحة لتفصيل الأعمال.</p>
                    <button onClick={addWorkSpace} className="inline-flex items-center gap-2 bg-[#56B894] hover:bg-[#3F9B7A] text-white px-4 py-2 rounded-lg text-sm font-bold transition">
                      <Plus className="w-4 h-4" /> إضافة مساحة
                    </button>
                  </div>
                ) : (
                  data.works.map((space: F08WorkSpace, index: number) => (
                    <div key={space.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                      <div className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 p-2.5 flex items-center justify-between gap-3">
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <button onClick={() => toggleExpand(space.id)} className="p-1.5 text-gray-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-md">
                            {space.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <span className="font-bold text-gray-500 dark:text-slate-300 text-sm shrink-0">{index + 1}.</span>
                          <input
                            type="text"
                            placeholder="اسم المساحة (مثال: غرفة النوم 1)"
                            value={space.name}
                            onChange={e => updateWorkSpace(space.id, null, 'name', e.target.value)}
                            className="w-full text-sm font-bold bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-[#4A1F66] outline-none" />
                        </div>
                        <button onClick={() => removeWorkSpace(space.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {space.isExpanded && (
                        <div className="p-4 space-y-5">
                          {/* صور الموقع */}
                          <div className="bg-purple-50/50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-100 dark:border-purple-800">
                            <div className="flex justify-between items-center mb-2 gap-2">
                              <label className="text-xs font-bold text-[#4A1F66] dark:text-purple-200 flex items-center gap-1.5">
                                <ImageIcon className="w-4 h-4" /> صور الموقع / المساحة (لا محدودة)
                              </label>
                              <label className="cursor-pointer bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 text-[#4A1F66] dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/40 px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1">
                                <Plus className="w-3 h-3" /> إرفاق صور
                                <input type="file" multiple accept="image/*" className="hidden"
                                  onChange={e => { if (e.target.files) handleSpaceImageNames(space.id, e.target.files); e.target.value = ''; }} />
                              </label>
                            </div>
                            {space.images.length > 0 ? (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {space.images.map((img, i) => (
                                  <div key={i} className="relative group">
                                    <div className="w-20 h-12 px-2 flex items-center justify-center text-[10px] font-bold rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 truncate">
                                      <ImageIcon className="w-3 h-3 ml-1 shrink-0" />
                                      <span className="truncate">{img.name}</span>
                                    </div>
                                    <button onClick={() => removeSpaceImage(space.id, i)}
                                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">يمكنك إرفاق أي عدد من الصور للمساحة لتوثيق الحالة.</p>
                            )}
                          </div>

                          {/* الأعمال المدنية */}
                          <div>
                            <h4 className="text-xs font-bold text-[#3F9B7A] dark:text-[#7AC8AD] mb-2 border-b border-gray-100 dark:border-slate-700 pb-1">الأعمال المدنية والتشطيبات</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                              <Input label="المعالجة الخرسانية" value={space.civil.concrete} onChange={e => updateWorkSpace(space.id, 'civil', 'concrete', e.target.value)} />
                              <Input label="أعمال الأسقف" value={space.civil.roof} onChange={e => updateWorkSpace(space.id, 'civil', 'roof', e.target.value)} />
                              <Input label="أعمال العزل" value={space.civil.insulation} onChange={e => updateWorkSpace(space.id, 'civil', 'insulation', e.target.value)} />
                              <Input label="أعمال الشينكو" value={space.civil.shinko} onChange={e => updateWorkSpace(space.id, 'civil', 'shinko', e.target.value)} />
                              <Input label="سيراميك (أرض/جدار)" value={space.civil.ceramic} onChange={e => updateWorkSpace(space.id, 'civil', 'ceramic', e.target.value)} />
                              <Input label="دهانات (داخلي/خارجي)" value={space.civil.paint} onChange={e => updateWorkSpace(space.id, 'civil', 'paint', e.target.value)} />
                              <Input label="أعمال المساح" value={space.civil.plaster} onChange={e => updateWorkSpace(space.id, 'civil', 'plaster', e.target.value)} />
                              <Input label="نجارة (أبواب)" value={space.civil.wood} onChange={e => updateWorkSpace(space.id, 'civil', 'wood', e.target.value)} />
                              <Input label="ألمنيوم (نوافذ)" value={space.civil.aluminum} onChange={e => updateWorkSpace(space.id, 'civil', 'aluminum', e.target.value)} />
                              <Input label="أعمال الحدادة" value={space.civil.steel} onChange={e => updateWorkSpace(space.id, 'civil', 'steel', e.target.value)} />
                            </div>
                            <TextArea className="mt-2.5" label="ملاحظات" rows={1} value={space.civil.notes} onChange={e => updateWorkSpace(space.id, 'civil', 'notes', e.target.value)} />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-xs font-bold text-[#3F9B7A] dark:text-[#7AC8AD] mb-2 border-b border-gray-100 dark:border-slate-700 pb-1">أعمال الكهرباء</h4>
                              <div className="grid grid-cols-2 gap-2">
                                <NumberCounter label="لوح/بريكر" value={space.electrical.panel} onChange={v => updateWorkSpace(space.id, 'electrical', 'panel', v)} />
                                <NumberCounter label="مصباح مستعار" value={space.electrical.ceilingLight} onChange={v => updateWorkSpace(space.id, 'electrical', 'ceilingLight', v)} />
                                <NumberCounter label="مصباح خرساني" value={space.electrical.concreteLight} onChange={v => updateWorkSpace(space.id, 'electrical', 'concreteLight', v)} />
                                <NumberCounter label="سبوت لايت" value={space.electrical.spotlight} onChange={v => updateWorkSpace(space.id, 'electrical', 'spotlight', v)} />
                                <NumberCounter label="أفياش عادية" value={space.electrical.sockets} onChange={v => updateWorkSpace(space.id, 'electrical', 'sockets', v)} />
                                <NumberCounter label="مفتاح مزدوج" value={space.electrical.doubleSwitch} onChange={v => updateWorkSpace(space.id, 'electrical', 'doubleSwitch', v)} />
                                <NumberCounter label="مفتاح مكيف" value={space.electrical.acSwitch} onChange={v => updateWorkSpace(space.id, 'electrical', 'acSwitch', v)} />
                                <NumberCounter label="فيش سخان" value={space.electrical.heaterSocket} onChange={v => updateWorkSpace(space.id, 'electrical', 'heaterSocket', v)} />
                              </div>
                            </div>

                            <div>
                              <h4 className="text-xs font-bold text-[#3F9B7A] dark:text-[#7AC8AD] mb-2 border-b border-gray-100 dark:border-slate-700 pb-1">أعمال السباكة</h4>
                              <div className="grid grid-cols-2 gap-2">
                                <NumberCounter label="كرسي إفرنجي" value={space.plumbing.toiletFr} onChange={v => updateWorkSpace(space.id, 'plumbing', 'toiletFr', v)} />
                                <NumberCounter label="كرسي عربي" value={space.plumbing.toiletAr} onChange={v => updateWorkSpace(space.id, 'plumbing', 'toiletAr', v)} />
                                <NumberCounter label="سخانة" value={space.plumbing.heater} onChange={v => updateWorkSpace(space.id, 'plumbing', 'heater', v)} />
                                <NumberCounter label="شطاف" value={space.plumbing.bidet} onChange={v => updateWorkSpace(space.id, 'plumbing', 'bidet', v)} />
                                <NumberCounter label="خلاط دش" value={space.plumbing.showerMixer} onChange={v => updateWorkSpace(space.id, 'plumbing', 'showerMixer', v)} />
                                <NumberCounter label="مغاسل خزف" value={space.plumbing.sink} onChange={v => updateWorkSpace(space.id, 'plumbing', 'sink', v)} />
                                <NumberCounter label="خلاط مغسلة" value={space.plumbing.sinkMixer} onChange={v => updateWorkSpace(space.id, 'plumbing', 'sinkMixer', v)} />
                                <NumberCounter label="شفاط" value={space.plumbing.exhaust} onChange={v => updateWorkSpace(space.id, 'plumbing', 'exhaust', v)} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {data.works.length > 0 && (
                  <button onClick={addWorkSpace}
                    className="w-full bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-[#4A1F66] dark:text-purple-200 border border-dashed border-purple-300 dark:border-purple-700 py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition">
                    <Plus className="w-4 h-4" /> مساحة إضافية
                  </button>
                )}
              </div>
            </Card>
          )}

          {/* Step 2 — الأثاث والأجهزة */}
          {step === 2 && (
            <Card title="جرد الأثاث والأجهزة (يغذي نظام التسويق لاحقاً)" icon={Sofa} accent="teal">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg mb-5 border border-gray-100 dark:border-slate-700">
                <Select label="نوع السكن" options={['منزل', 'شقة']} value={data.furnitureInfo.type} onChange={e => updateNested('furnitureInfo', 'type', e.target.value)} />
                <Select label="حالة المنزل" options={['ترميم', 'حريق']} value={data.furnitureInfo.condition} onChange={e => updateNested('furnitureInfo', 'condition', e.target.value)} />
                <Input type="number" label="عدد الذكور" value={data.furnitureInfo.males} onChange={e => updateNested('furnitureInfo', 'males', Number(e.target.value || 0))} />
                <Input type="number" label="عدد الإناث" value={data.furnitureInfo.females} onChange={e => updateNested('furnitureInfo', 'females', Number(e.target.value || 0))} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-[#3F9B7A] dark:text-[#7AC8AD] mb-3 pb-1 border-b border-gray-100 dark:border-slate-700">الأثاث المطلوب</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <NumberCounter label="سرير نفر ونص مع مرتبة" value={data.furnitureItems.bed15} onChange={v => updateNested('furnitureItems', 'bed15', v)} />
                    <NumberCounter label="مرتبة نفر ونص فقط" value={data.furnitureItems.mattress15} onChange={v => updateNested('furnitureItems', 'mattress15', v)} />
                    <NumberCounter label="سرير نفر مع مرتبة" value={data.furnitureItems.bed1} onChange={v => updateNested('furnitureItems', 'bed1', v)} />
                    <NumberCounter label="مراتب نفر فقط" value={data.furnitureItems.mattress1} onChange={v => updateNested('furnitureItems', 'mattress1', v)} />
                    <NumberCounter label="سرير مزدوج مع مراتب" value={data.furnitureItems.bedDouble} onChange={v => updateNested('furnitureItems', 'bedDouble', v)} />
                    <NumberCounter label="مراتب نفرين فقط" value={data.furnitureItems.mattressDouble} onChange={v => updateNested('furnitureItems', 'mattressDouble', v)} />
                    <NumberCounter label="سجاد" value={data.furnitureItems.carpet} onChange={v => updateNested('furnitureItems', 'carpet', v)} />
                    <NumberCounter label="كنب (مقاعد)" value={data.furnitureItems.sofaSeats} onChange={v => updateNested('furnitureItems', 'sofaSeats', v)} />
                    <NumberCounter label="كنب (بالمتر)" value={data.furnitureItems.sofaMeters} onChange={v => updateNested('furnitureItems', 'sofaMeters', v)} />
                    <NumberCounter label="جلسة أرضية" value={data.furnitureItems.floorSeating} onChange={v => updateNested('furnitureItems', 'floorSeating', v)} />
                    <NumberCounter label="كومدينة درجين" value={data.furnitureItems.nightstand} onChange={v => updateNested('furnitureItems', 'nightstand', v)} />
                    <NumberCounter label="تسريحة" value={data.furnitureItems.dresser} onChange={v => updateNested('furnitureItems', 'dresser', v)} />
                    <NumberCounter label="دولاب بابين" value={data.furnitureItems.wardrobe2} onChange={v => updateNested('furnitureItems', 'wardrobe2', v)} />
                    <NumberCounter label="دولاب 3 أبواب" value={data.furnitureItems.wardrobe3} onChange={v => updateNested('furnitureItems', 'wardrobe3', v)} />
                    <NumberCounter label="دولاب 4 أبواب" value={data.furnitureItems.wardrobe4} onChange={v => updateNested('furnitureItems', 'wardrobe4', v)} />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#3F9B7A] dark:text-[#7AC8AD] mb-3 pb-1 border-b border-gray-100 dark:border-slate-700">الأجهزة الكهربائية</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <NumberCounter label="مكيف سبلت طن" value={data.appliances.acSplit1} onChange={v => updateNested('appliances', 'acSplit1', v)} />
                    <NumberCounter label="مكيف سبلت 1.5" value={data.appliances.acSplit15} onChange={v => updateNested('appliances', 'acSplit15', v)} />
                    <NumberCounter label="مكيف شباك 1.5" value={data.appliances.acWindow15} onChange={v => updateNested('appliances', 'acWindow15', v)} />
                    <NumberCounter label="غسالة" value={data.appliances.washer} onChange={v => updateNested('appliances', 'washer', v)} />
                    <NumberCounter label="ثلاجة" value={data.appliances.fridge} onChange={v => updateNested('appliances', 'fridge', v)} />
                    <NumberCounter label="فرن غاز" value={data.appliances.stove} onChange={v => updateNested('appliances', 'stove', v)} />
                    <NumberCounter label="مكنسة كهربائية" value={data.appliances.vacuum} onChange={v => updateNested('appliances', 'vacuum', v)} />
                    <NumberCounter label="براد ماء" value={data.appliances.waterCooler} onChange={v => updateNested('appliances', 'waterCooler', v)} />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Step 3 — الاعتماد والرفع */}
          {step === 3 && (
            <>
              <Card title="ملاحظات التشخيص الإضافية (اختياري)" icon={PenTool}>
                <TextArea
                  label="هل توجد أي ملاحظات أو توصيات استثنائية ظهرت أثناء الزيارة الميدانية؟"
                  rows={3}
                  placeholder="اكتب هنا أي ملاحظات غير مشمولة في بنود الحصر..."
                  value={data.diagnosisNotes}
                  onChange={e => setData((d: any) => ({ ...d, diagnosisNotes: e.target.value }))} />
                <TextArea className="mt-3" label="التوصية النهائية" rows={2}
                  value={data.finalRecommendation}
                  onChange={e => setData((d: any) => ({ ...d, finalRecommendation: e.target.value }))} />
              </Card>

              <Card title="اعتماد كراسة التشخيص" icon={ShieldCheck} accent="gradient">
                <p className="text-xs text-gray-600 dark:text-slate-300 mb-4 leading-relaxed">
                  بموجب الاعتماد الرقمي من خلال النظام، سيتم تحويل هذه الكراسة لتُبنى عليها الخطط التنفيذية، وتغذي باقي النماذج
                  <span className="font-bold text-[#4A1F66] dark:text-purple-300"> (F-20, F-21) </span>
                  في النظام آلياً.
                </p>

                <label className="flex items-start gap-2 cursor-pointer bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={data.pledge}
                    onChange={e => setData((d: any) => ({ ...d, pledge: e.target.checked }))}
                    className="mt-1 w-5 h-5 rounded text-[#56B894] focus:ring-[#56B894] cursor-pointer" />
                  <span>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-1">أتعهد بأن المدخلات والحصر دقيق ومطابق للواقع الميداني</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400">أقر بمراجعتي للبيانات والمساحات والصور المرفقة، وسيتم الاعتماد برقم حسابي المسجل بالنظام.</p>
                  </span>
                </label>
              </Card>
            </>
          )}
        </div>

        <div className="border-t dark:border-slate-700 p-3 flex items-center justify-between gap-2">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-200 disabled:opacity-40 transition">
            السابق
          </button>
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)}
              className="px-5 py-2 text-sm font-bold rounded-lg bg-[#4A1F66] text-white hover:bg-[#3A1652] transition">
              التالي
            </button>
          ) : (
            <button onClick={submit} disabled={busy || !projectRefId || !data.pledge}
              className="px-5 py-2 text-sm font-bold rounded-lg bg-[#56B894] text-white hover:bg-[#3F9B7A] transition disabled:opacity-50 flex items-center gap-1.5">
              <Send className="w-4 h-4" /> {busy ? 'جاري الرفع...' : 'رفع لرئيس قسم التشخيص'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const F08Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  const works: F08WorkSpace[] = Array.isArray(d.works) ? d.works : [];
  const fi = d.furnitureItems || {};
  const ap = d.appliances || {};

  const totalFurniture = Object.values(fi).reduce<number>((a, b) => a + Number(b || 0), 0);
  const totalAppliances = Object.values(ap).reduce<number>((a, b) => a + Number(b || 0), 0);

  return (
    <FormShell rec={rec} user={user} api={api}>
      {d.general && (
        <Card title="بيانات الأسرة والمنزل" icon={UsersIcon}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <ReadOnlyField label="اسم الأسرة" value={d.general.familyName} />
            <ReadOnlyField label="رقم التواصل" value={d.general.contactNumber} />
            <ReadOnlyField label="رقم الحالة" value={d.general.caseRef} />
            <ReadOnlyField label="رقم المشروع" value={d.general.projectNumber} />
            <ReadOnlyField label="المدينة – الحي" value={d.general.cityNeighborhood} />
            <ReadOnlyField label="الجهة الشريكة" value={d.general.partnerEntity} />
            <ReadOnlyField label="ممثل الجهة" value={d.general.partnerRep} />
            <ReadOnlyField label="رقم تواصل الممثل" value={d.general.repContact} />
          </div>
        </Card>
      )}

      <Card title="بيانات الزيارة" icon={Calendar} accent="teal">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <ReadOnlyField label="تاريخ الزيارة" value={d.visitDate} />
          <ReadOnlyField label="نوع المبنى" value={d.visit?.type} />
          <ReadOnlyField label="المساحة التقريبية (م²)" value={d.area} />
          <ReadOnlyField label="العمر التقديري" value={d.age} />
          <ReadOnlyField className="md:col-span-2 lg:col-span-4" label="فريق التشخيص" value={d.team} />
        </div>
        <div className="mt-3">
          <ReadOnlyField label="النتيجة المبدئية" value={d.visit?.diagnosis} />
        </div>
        <ReadOnlyField className="mt-3" label="ملخص التقييم" value={d.summary} />
      </Card>

      <Card title="السلامة" icon={AlertTriangle}>
        <div className={`p-3 rounded-lg text-sm font-bold flex items-center gap-2
          ${d.safetyHazard
            ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200'
            : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200'}`}>
          {d.safetyHazard ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {d.safetyHazard
            ? 'منزل غير صالح للسكن أثناء الترميم — سيُفتح F-18 و F-22.'
            : 'المنزل صالح لاستمرار السكن أثناء الترميم.'}
        </div>
      </Card>

      {works.length > 0 && (
        <Card title={`حصر الأعمال — ${works.length} مساحة`} icon={ClipboardList}>
          <div className="space-y-3">
            {works.map((w, i) => (
              <div key={w.id ?? i} className="bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-bold text-[#4A1F66] dark:text-purple-200">{i + 1}. {w.name || `مساحة ${i + 1}`}</h5>
                  {w.images && w.images.length > 0 && (
                    <Pill tone="purple"><ImageIcon className="w-3 h-3" /> {w.images.length} صور</Pill>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mt-2">
                  {Object.entries(w.civil || {}).filter(([k, v]) => k !== 'notes' && v).map(([k, v]) => (
                    <Pill key={k} tone="gray">{k}: {String(v)}</Pill>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {Object.entries(w.electrical || {}).filter(([, v]) => Number(v) > 0).map(([k, v]) => (
                    <Pill key={k} tone="amber">⚡ {k}: {String(v)}</Pill>
                  ))}
                  {Object.entries(w.plumbing || {}).filter(([, v]) => Number(v) > 0).map(([k, v]) => (
                    <Pill key={k} tone="blue">🚰 {k}: {String(v)}</Pill>
                  ))}
                </div>
                {w.civil?.notes && <ReadOnlyField className="mt-2" label="ملاحظات" value={w.civil.notes} />}
              </div>
            ))}
          </div>
        </Card>
      )}

      {(totalFurniture > 0 || totalAppliances > 0) && (
        <Card title="جرد الأثاث والأجهزة" icon={Sofa} accent="teal">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <ReadOnlyField label="نوع السكن" value={d.furnitureInfo?.type} />
            <ReadOnlyField label="حالة المنزل" value={d.furnitureInfo?.condition} />
            <ReadOnlyField label="عدد الذكور" value={d.furnitureInfo?.males} />
            <ReadOnlyField label="عدد الإناث" value={d.furnitureInfo?.females} />
          </div>
          {totalFurniture > 0 && (
            <>
              <p className="text-xs font-bold text-[#4A1F66] dark:text-purple-200 mt-3 mb-1">الأثاث:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(fi).filter(([, v]) => Number(v) > 0).map(([k, v]) => (
                  <Pill key={k} tone="purple">{k}: {String(v)}</Pill>
                ))}
              </div>
            </>
          )}
          {totalAppliances > 0 && (
            <>
              <p className="text-xs font-bold text-[#3F9B7A] dark:text-[#7AC8AD] mt-3 mb-1">الأجهزة:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(ap).filter(([, v]) => Number(v) > 0).map(([k, v]) => (
                  <Pill key={k} tone="teal">{k}: {String(v)}</Pill>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {(d.diagnosisNotes || d.finalRecommendation) && (
        <Card title="الملاحظات والتوصية" icon={PenTool}>
          {d.diagnosisNotes && <ReadOnlyField label="ملاحظات إضافية" value={d.diagnosisNotes} />}
          {d.finalRecommendation && <ReadOnlyField className="mt-2" label="التوصية النهائية" value={d.finalRecommendation} />}
        </Card>
      )}
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
  const [progressPct, setProgressPct] = useState<number>(0);
  const [milestone, setMilestone] = useState<'' | '30%' | '60%' | '90%' | '100%'>('');
  const [scopeChange, setScopeChange] = useState(false);
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
        data: { visitDate, progressPct, milestone, scopeChange, notes },
        files: photos,
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-14 · تقرير الزيارة الميدانية" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع التقرير</button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={myProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="تقدم الإنجاز" icon={Activity}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input type="date" label="تاريخ الزيارة" value={visitDate} onChange={e => setVisitDate(e.target.value)} />
          <Input type="number" label="نسبة الإنجاز %" value={progressPct} onChange={e => setProgressPct(Number(e.target.value || 0))} />
          <Select label="محطة دفعة" options={['', '30%', '60%', '90%', '100%']} placeholder="بدون"
            value={milestone} onChange={e => setMilestone(e.target.value as any)} />
        </div>
        <div className="mt-3"><ProgressBar value={progressPct} /></div>
        <label className="mt-3 flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={scopeChange} onChange={e => setScopeChange(e.target.checked)} className="rounded border-gray-300 text-[#4A1F66]" />
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
      {milestone && (
        <Card title="إشعار المالية" icon={DollarSign} accent="teal">
          <p className="text-xs text-teal-800 dark:text-teal-200">عند اعتماد التقرير سيتم فتح F-15 (طلب صرف دفعة) تلقائياً للمحطة <strong>{milestone}</strong>.</p>
        </Card>
      )}
    </CreatorShell>
  );
};

export const F14Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="ملخص التقرير" icon={Activity}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ReadOnlyField label="تاريخ الزيارة" value={d.visitDate} />
          <ReadOnlyField label="النسبة" value={`${d.progressPct || 0}%`} />
          <ReadOnlyField label="محطة الدفعة" value={d.milestone || '—'} />
        </div>
        <div className="mt-3"><ProgressBar value={d.progressPct || 0} /></div>
        <ReadOnlyField className="mt-3" label="ملاحظات" value={d.notes} />
        {d.scopeChange && <Pill tone="amber" className="mt-2">تغيير نطاق — يستلزم F-23</Pill>}
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
   F-04 — تعيين مهندس التشخيص (HEAD_DIAGNOSIS, single-step)
   F-09 — تعيين مشرف التشخيص (HEAD_SUPERVISION, single-step)
   ────────────────────────────────────────────────────────────────── */

const engineerOptionsFor = (users: UserProfile[]) =>
  users.filter(u => u.role === 'DIAGNOSIS_ENGINEER').map(u => ({ value: u.id, label: u.fullName }));

const AssignmentCreatorComponent: React.FC<{
  user: UserProfile;
  api: any;
  users: UserProfile[];
  context: any;
  onClose: () => void;
  formCode: 'F-04' | 'F-09';
  title: string;
  selectLabel: string;
  buttonLabel: string;
}> = ({ user, api, users, context, onClose, formCode, title, selectLabel, buttonLabel }) => {
  const projects = context.projects as ProjectRecord[];
  const [projectRefId, setProjectRefId] = useState<string>(projects[0]?.id || '');
  const [engineerId, setEngineerId] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!canCreateForm(formCode, user)) return;
    const p = projects.find(x => x.id === projectRefId);
    if (!p || !engineerId) return;
    setBusy(true);
    try {
      const engineer = users.find(u => u.id === engineerId);
      await api.createForm({
        code: formCode, user,
        projectId: p.projectId || '', projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        notes,
        data: { engineerId, engineerName: engineer?.fullName || '' },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title={`${formCode} · ${title}`} onClose={onClose}
      footer={
        <button onClick={submit} disabled={busy || !engineerId || !projectRefId}
          className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5">
          <Send className="w-4 h-4" /> {buttonLabel}
        </button>
      }>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع"
          options={projects.map(p => ({ value: p.id, label: `${p.projectId || '—'} · ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title={selectLabel} icon={UsersIcon}>
        <Select label={selectLabel} required
          options={engineerOptionsFor(users)}
          value={engineerId} onChange={e => setEngineerId(e.target.value)} />
        <TextArea className="mt-3" label="ملاحظات (اختياري)" rows={2}
          value={notes} onChange={e => setNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

export const F04Creator: FormCreator = (props) => (
  <AssignmentCreatorComponent {...props} formCode="F-04" title="تعيين مهندس التشخيص"
    selectLabel="مهندس ومشرف التشخيص" buttonLabel="تعيين وإطلاق F-08" />
);

export const F09Creator: FormCreator = (props) => (
  <AssignmentCreatorComponent {...props} formCode="F-09" title="تعيين مشرف التشخيص"
    selectLabel="المهندس المشرف" buttonLabel="تعيين" />
);

const AssignmentRendererComponent: React.FC<{
  rec: FormRecord;
  user: UserProfile;
  api: any;
  users: UserProfile[];
  selectLabel: string;
  approveLabel: string;
}> = ({ rec, user, api, users, selectLabel, approveLabel }) => {
  const awaitsMe = formAwaitsUser(rec, user);
  const [engineerId, setEngineerId] = useState<string>(rec.data?.engineerId || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!engineerId) return;
    setBusy(true);
    try {
      const engineer = users.find(u => u.id === engineerId);
      await api.approveForm(rec.id, user, note || approveLabel, {
        engineerId, engineerName: engineer?.fullName || '',
      });
    } finally { setBusy(false); }
  };

  const chosenName =
    rec.data?.engineerName ||
    users.find(u => u.id === rec.data?.engineerId)?.fullName ||
    '';

  return (
    <FormShell rec={rec} user={user} api={api}
      approvalSection={
        awaitsMe ? (
          <div className="border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 rounded-lg p-3 space-y-3">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
              {selectLabel} — اختر اسماً ثم اضغط {approveLabel}.
            </p>
            <Select label={selectLabel} required
              options={engineerOptionsFor(users)}
              value={engineerId} onChange={e => setEngineerId(e.target.value)} />
            <TextArea label="ملاحظات (اختياري)" rows={2} value={note} onChange={e => setNote(e.target.value)} />
            <button onClick={submit} disabled={busy || !engineerId}
              className="w-full py-2 bg-[#3F9B7A] text-white rounded-lg font-bold text-sm hover:bg-[#2f7a5e] transition disabled:opacity-50 flex items-center justify-center gap-1.5">
              <Send className="w-4 h-4" /> {busy ? 'جاري الإرسال...' : approveLabel}
            </button>
          </div>
        ) : undefined
      }>
      <Card title={selectLabel} icon={UsersIcon}>
        <ReadOnlyField label={selectLabel} value={chosenName} />
        {rec.notes && <ReadOnlyField className="mt-3" label="ملاحظات" value={rec.notes} />}
      </Card>
    </FormShell>
  );
};

export const F04Renderer: FormRenderer = (props) => (
  <AssignmentRendererComponent {...props}
    selectLabel="مهندس ومشرف التشخيص" approveLabel="تعيين وإطلاق كراسة التشخيص" />
);

export const F09Renderer: FormRenderer = (props) => (
  <AssignmentRendererComponent {...props}
    selectLabel="المهندس المشرف" approveLabel="تعيين" />
);

/* ──────────────────────────────────────────────────────────────────
   Inline section components used by ProjectDetail's brick accordion
   ────────────────────────────────────────────────────────────────── */

/** قسم F-04 (داخل لوحة المرحلة الثانية في عرض المشروع). */
export const F04InlineSection: React.FC<{
  rec?: FormRecord;
  mode: 'view' | 'edit';
  user: UserProfile;
  users: UserProfile[];
  api: any;
  project: ProjectRecord;
}> = ({ rec, mode, user, users, api, project }) => {
  const [engineerId, setEngineerId] = useState<string>(rec?.data?.engineerId || '');
  const [notes, setNotes] = useState<string>(rec?.notes || '');
  const [busy, setBusy] = useState(false);

  const chosenName =
    rec?.data?.engineerName ||
    users.find(u => u.id === (rec?.data?.engineerId || engineerId))?.fullName ||
    '';

  const submit = async () => {
    if (!engineerId) return;
    setBusy(true);
    try {
      const engineer = users.find(u => u.id === engineerId);
      const dataPatch = { engineerId, engineerName: engineer?.fullName || '' };
      if (rec) {
        await api.approveForm(rec.id, user, notes || 'تعيين مهندس التشخيص', dataPatch);
      } else {
        await api.createForm({
          code: 'F-04', user,
          projectId: project.projectId || '', projectRefId: project.id,
          beneficiaryName: project.beneficiaryName, notes, data: dataPatch,
        });
      }
    } finally { setBusy(false); }
  };

  if (mode === 'view') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-70">
        <ReadOnlyField label="مهندس ومشرف التشخيص" value={chosenName} />
        <ReadOnlyField label="ملاحظات" value={rec?.notes} />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <Select label="مهندس ومشرف التشخيص" required
        options={engineerOptionsFor(users)}
        value={engineerId} onChange={e => setEngineerId(e.target.value)} />
      <TextArea label="ملاحظات (اختياري)" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      <button onClick={submit} disabled={busy || !engineerId}
        className="px-4 py-2 rounded-lg text-sm font-bold bg-[#3F9B7A] text-white hover:bg-[#2f7a5e] transition disabled:opacity-50 flex items-center gap-1.5">
        <Send className="w-4 h-4" /> {busy ? 'جاري الإرسال...' : 'تعيين وإطلاق كراسة التشخيص'}
      </button>
    </div>
  );
};

/** قسم F-09 — تعيين مشرف التشخيص. */
export const F09InlineSection: React.FC<{
  rec?: FormRecord;
  mode: 'view' | 'edit';
  user: UserProfile;
  users: UserProfile[];
  api: any;
  project: ProjectRecord;
}> = ({ rec, mode, user, users, api, project }) => {
  const [engineerId, setEngineerId] = useState<string>(rec?.data?.engineerId || '');
  const [notes, setNotes] = useState<string>(rec?.notes || '');
  const [busy, setBusy] = useState(false);

  const chosenName =
    rec?.data?.engineerName ||
    users.find(u => u.id === (rec?.data?.engineerId || engineerId))?.fullName ||
    '';

  const submit = async () => {
    if (!engineerId) return;
    setBusy(true);
    try {
      const engineer = users.find(u => u.id === engineerId);
      const dataPatch = { engineerId, engineerName: engineer?.fullName || '' };
      if (rec) {
        await api.approveForm(rec.id, user, notes || 'تعيين مشرف التشخيص', dataPatch);
      } else {
        await api.createForm({
          code: 'F-09', user,
          projectId: project.projectId || '', projectRefId: project.id,
          beneficiaryName: project.beneficiaryName, notes, data: dataPatch,
        });
      }
    } finally { setBusy(false); }
  };

  if (mode === 'view') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-70">
        <ReadOnlyField label="المهندس المشرف" value={chosenName} />
        <ReadOnlyField label="ملاحظات" value={rec?.notes} />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <Select label="المهندس المشرف" required
        options={engineerOptionsFor(users)}
        value={engineerId} onChange={e => setEngineerId(e.target.value)} />
      <TextArea label="ملاحظات (اختياري)" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      <button onClick={submit} disabled={busy || !engineerId}
        className="px-4 py-2 rounded-lg text-sm font-bold bg-[#3F9B7A] text-white hover:bg-[#2f7a5e] transition disabled:opacity-50 flex items-center gap-1.5">
        <Send className="w-4 h-4" /> {busy ? 'جاري الإرسال...' : 'تعيين'}
      </button>
    </div>
  );
};

/** قسم F-03 لخطوة معيّنة (داخل لوحة المرحلة الأولى). */
export const F03StepInlineSection: React.FC<{
  rec?: FormRecord;
  step: 0 | 1 | 2;
  mode: 'view' | 'edit';
  user: UserProfile;
  users: UserProfile[];
  api: any;
}> = ({ rec, step, mode, user, api }) => {
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const approval = rec?.approvals?.[step];
  const dimWrap = mode === 'view' ? 'opacity-70' : '';

  const act = async () => {
    if (!rec) return;
    setBusy(true);
    try {
      if (decision === 'approved') {
        await api.approveForm(rec.id, user, note);
      } else {
        await api.rejectForm(rec.id, user, note);
      }
    } finally { setBusy(false); }
  };

  let body: React.ReactNode;
  if (step === 0) {
    body = (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${dimWrap}`}>
        <ReadOnlyField label="القرار (اعتماد استحقاق الخدمة)" value={rec?.data?.eligibility} />
        <ReadOnlyField label="ملاحظات مدير البحث" value={rec?.data?.managerNotes} />
        {approval && <ReadOnlyField label="بواسطة" value={`${approval.actorName || '—'} · ${new Date(approval.at).toLocaleDateString('ar-SA')}`} />}
      </div>
    );
  } else if (step === 1) {
    body = (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${dimWrap}`}>
        <ReadOnlyField label="قرار المدير التنفيذي" value={
          approval?.decision === 'approved' ? 'اعتماد' :
          approval?.decision === 'rejected' ? 'رفض' :
          approval?.decision === 'deferred' ? 'تأجيل' : ''} />
        <ReadOnlyField label="ملاحظات المدير التنفيذي" value={approval?.note} />
        {approval && <ReadOnlyField label="بواسطة" value={`${approval.actorName || '—'} · ${new Date(approval.at).toLocaleDateString('ar-SA')}`} />}
      </div>
    );
  } else {
    body = (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${dimWrap}`}>
        <ReadOnlyField label="ملاحظات التحويل" value={approval?.note} />
        <ReadOnlyField label="رقم المشروع المُحوَّل" value={rec?.projectId} />
        {approval && <ReadOnlyField label="بواسطة" value={`${approval.actorName || '—'} · ${new Date(approval.at).toLocaleDateString('ar-SA')}`} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {body}
      {mode === 'edit' && rec && step !== 2 && (
        <div className="border-t pt-3 space-y-2 dark:border-slate-700">
          <Select label="القرار" options={[{ value: 'approved', label: 'اعتماد' }, { value: 'rejected', label: 'رفض' }]}
            value={decision} onChange={e => setDecision(e.target.value as any)} />
          <TextArea label="ملاحظات (اختياري)" rows={2} value={note} onChange={e => setNote(e.target.value)} />
          <button onClick={act} disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-[#3F9B7A] text-white hover:bg-[#2f7a5e] transition disabled:opacity-50 flex items-center gap-1.5">
            <Send className="w-4 h-4" /> {busy ? 'جاري الإرسال...' : 'إرسال القرار'}
          </button>
        </div>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   Registries
   ────────────────────────────────────────────────────────────────── */

export const RENDERERS: Record<string, FormRenderer | undefined> = {
  'F-02': F02Renderer,
  'F-03': F03Renderer,
  'F-04': F04Renderer,
  'F-08': F08Renderer,
  'F-09': F09Renderer,
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

export const CREATORS: Record<string, FormCreator | undefined> = {
  'F-02': F02Creator,
  'F-03': F03Creator,
  'F-04': F04Creator,
  'F-08': F08Creator,
  'F-09': F09Creator,
  'F-18': F18Creator,
  'F-21': F21Creator,
  'F-20': F20Creator,
  'F-19': F19Creator,
  'F-85': F85Creator,
  'F-14': F14Creator,
  'F-23': F23Creator,
  'F-15': F15Creator,
  'F-07': F07Creator,
  'F-52': F52Creator,
  // F-22 ينشأ تلقائياً مع F-18 — لا يحتاج Creator يدوي
};
