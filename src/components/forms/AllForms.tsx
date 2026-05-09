/* ──────────────────────────────────────────────────────────────────
   ترميم — كل النماذج الأربعة عشر في ملف واحد.
   كل نموذج مكوّن واحد يُبدّل عرضه عبر `workflowStep` المستخرج من
   `rec.approvalIndex`. لا تُقسَّم النماذج إلى ملفات.
   ──────────────────────────────────────────────────────────────────
   F-02  Genesis (إنشاء مشروع + بيانات الباحث)        — Researcher → Manager
   F-03  استحقاق الخدمة (3 مراحل)                     — Manager → Exec → Manager (transfer)
   F-08  كراسة تشخيص المبنى (3 مراحل)                  — Engineer → Head Diag → Projects Mgr
   F-18  تعهد إخلاء المنزل                            — Researcher → Manager → Projects Mgr
   F-22  طلب سكن بديل (تلقائي مع F-18)                — Manager → Partnerships Mgr
   F-21  حصر الأثاث (5 مراحل + كاتالوج كميات)          — Eng → PM → Marketing → Support → Finance
   F-20  خطة توريد المواد (مرحلتان)                   — Engineer → Support Mgr
   F-19  تعميد المقاول (4 مراحل)                       — Procurement → SS Mgr → Finance → Exec
   F-85  الترسية (3 مراحل)                            — Projects Mgr → Finance → Exec
   F-14  تقرير الزيارة الميدانية (3 مراحل)             — Engineer → Head Sup → PM
   F-23  أعمال إضافية (4 مراحل)                       — PM → Samaya → Finance → Exec
   F-15  طلب صرف دفعة (smart, regular vs final)        — PM → Finance → Exec
   F-07  شهادة تسليم المنزل (3 مراحل)                  — Engineer → PM → Research Mgr
   F-52  طلب تصوير وتوثيق                             — PR Officer
   ────────────────────────────────────────────────────────────────── */

import React, { useMemo, useState } from 'react';
import {
  X, Send, Plus, Users as UsersIcon, Home as HomeIcon, Activity,
  ClipboardList, Calculator, Trophy, ShieldCheck, Camera, Truck,
  DollarSign, Briefcase, FileSignature, AlertTriangle, CheckCircle2, Calendar,
  HardHat, Mail, ArrowLeftRight, Hammer,
} from 'lucide-react';

import {
  Card, Input, Select, TextArea, ReadOnlyField, FileUploader, Pill, NumberCounter,
  ProgressBar, MoneyInput, ReadOnlyBlock, ProjectIdField,
} from '../ui';
import {
  DEFAULT_LISTS, FORM_BY_CODE, FORM_STATUS_LABELS,
  roleName, slaStatus, PROJECT_ID_PATTERN,
} from '../../lib/data';
import {
  FormRecord, FormsApi, formAwaitsUser, ApprovalChainView,
  FormCreator, FormRenderer,
} from '../Forms';
import type { ProjectRecord } from '../../lib/types';
import type { UserProfile } from '../Auth';

/* ──────────────────────────────────────────────────────────────────
   FormShell — قالب موحّد لكل النماذج: عنوان مقفل لرقم المشروع،
   حالة، SLA، ثم محتوى النموذج، ثم سلسلة الاعتماد + شريط الإجراءات.
   ────────────────────────────────────────────────────────────────── */

const FormShell: React.FC<{
  rec: FormRecord; user: UserProfile; api: FormsApi; project?: ProjectRecord; children: React.ReactNode;
  /** قسم اعتماد مخصّص (إن لم يُمَرّر يُستخدم ApprovalActionsBar) */
  approvalSection?: React.ReactNode;
}> = ({ rec, user, api, project, children, approvalSection }) => {
  const def = FORM_BY_CODE[rec.code];
  const sla = slaStatus(rec.stepStartedAt || rec.updatedAt, def?.slaDays);
  const stepLabel = rec.approvalChain[rec.approvalIndex]
    ? `بانتظار: ${roleName(rec.approvalChain[rec.approvalIndex])}`
    : '—';
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ProjectIdField value={project?.projectId || rec.projectId || ''} locked />
        <ReadOnlyField label="المستفيد" value={rec.beneficiaryName || project?.beneficiaryName} />
        <ReadOnlyField label="المرحلة" value={`${rec.approvalIndex + 1}/${rec.approvalChain.length} — ${stepLabel}`} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Pill tone={
          rec.status === 'approved' ? 'green' : rec.status === 'rejected' ? 'red' :
          rec.status === 'pending' ? 'amber' : rec.status === 'deferred' ? 'blue' : 'gray'
        }>{FORM_STATUS_LABELS[rec.status]}</Pill>
        {def?.slaDays && (
          <Pill tone={sla.tone === 'late' ? 'red' : sla.tone === 'warn' ? 'amber' : 'green'}>{sla.text}</Pill>
        )}
        <span className="text-gray-500 dark:text-slate-400">المنشئ: {rec.createdByName} ({roleName(rec.createdByRole)})</span>
      </div>
      {def?.description && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
          {def.description}
        </div>
      )}
      {children}
      <Card title="سلسلة الاعتماد" icon={ClipboardList}>
        <ApprovalChainView rec={rec} />
      </Card>
      {approvalSection ?? <ApprovalActionsBar rec={rec} user={user} api={api} />}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   ApprovalActionsBar — يظهر فقط للدور المنتظَر بمحتوى مخصّص اختيارياً
   ────────────────────────────────────────────────────────────────── */

export const ApprovalActionsBar: React.FC<{
  rec: FormRecord; user: UserProfile; api: FormsApi;
  beforeApprove?: () => Promise<Record<string, any> | undefined> | Record<string, any> | undefined;
  approveLabel?: string;
}> = ({ rec, user, api, beforeApprove, approveLabel = 'اعتماد' }) => {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!formAwaitsUser(rec, user)) return null;
  const act = async (kind: 'approve' | 'reject' | 'defer') => {
    setBusy(true);
    try {
      if (kind === 'approve') {
        const patch = (await beforeApprove?.()) || undefined;
        await api.approveForm(rec.id, user, note, patch);
      } else if (kind === 'reject') {
        await api.rejectForm(rec.id, user, note);
      } else {
        await api.deferForm(rec.id, user, note);
      }
    } finally { setBusy(false); }
  };
  return (
    <div className="border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
        <Activity className="w-4 h-4" />
        <span className="text-xs font-bold">هذا الطلب بانتظار اعتمادك ({roleName(user.role)})</span>
      </div>
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="ملاحظتك (اختياري)"
        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-[#56B894]" />
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => act('approve')} disabled={busy} className="flex-1 min-w-[120px] py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {approveLabel}</button>
        <button onClick={() => act('defer')} disabled={busy} className="px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 rounded-lg font-bold text-sm transition flex items-center gap-1.5"><Calendar className="w-4 h-4" /> تأجيل</button>
        <button onClick={() => act('reject')} disabled={busy} className="flex-1 min-w-[120px] py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition flex items-center justify-center gap-1.5"><X className="w-4 h-4" /> رفض</button>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   Helper: ReadOnly summary blocks for prior forms
   ────────────────────────────────────────────────────────────────── */

const ProjectGenesisBlock: React.FC<{ project?: ProjectRecord; f02?: FormRecord | null }> = ({ project, f02 }) => {
  const personal = f02?.data?.personal || {};
  return (
    <ReadOnlyBlock title="جذور المشروع — مأخوذ من F-02 (للاطلاع فقط)" icon={UsersIcon}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <ReadOnlyField label="رقم المشروع" value={project?.projectId} />
        <ReadOnlyField label="المستفيد" value={personal.fullName || project?.beneficiaryName} />
        <ReadOnlyField label="رقم الهوية" value={personal.idNumber} />
        <ReadOnlyField label="المدينة" value={personal.city || project?.city} />
        <ReadOnlyField label="الحي" value={personal.neighborhood || project?.neighborhood} />
        <ReadOnlyField label="رقم الجوال" value={personal.mobile1} />
        <ReadOnlyField label="نوع السكن" value={f02?.data?.housing?.type} />
        <ReadOnlyField label="عمر السكن" value={f02?.data?.housing?.age} />
        <ReadOnlyField label="الاحتياج" value={f02?.data?.housing?.need} />
      </div>
    </ReadOnlyBlock>
  );
};

const F08BaselineBlock: React.FC<{ f08?: FormRecord | null }> = ({ f08 }) => {
  if (!f08) return null;
  const d = f08.data || {};
  return (
    <ReadOnlyBlock title="الكميات الأساسية — مأخوذ من F-08 (للاطلاع فقط)" icon={HardHat}
      subtitle="هذه الكميات تمثّل الأساس الذي تُقاس عليه نسب الإنجاز.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <ReadOnlyField label="تاريخ الزيارة" value={d.visitDate} />
        <ReadOnlyField label="المساحة (م²)" value={d.area} />
        <ReadOnlyField label="عمر البناء" value={d.age} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
        <ReadOnlyField label="الأعمال المدنية" value={d.civilNotes} />
        <ReadOnlyField label="الأعمال الكهربائية" value={d.elecNotes} />
        <ReadOnlyField label="السباكة" value={d.plumbingNotes} />
      </div>
      {d.safetyHazard && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-[11px] text-red-700 dark:text-red-300 font-bold flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" /> المنزل غير صالح للسكن أثناء الترميم — تم فتح F-18 و F-22.
        </div>
      )}
    </ReadOnlyBlock>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   F-02 Genesis Creator — يدخل الباحث رقم المشروع يدوياً وينشئ المشروع.
   ════════════════════════════════════════════════════════════════════════ */

const initF02 = (researcherName: string) => ({
  projectId: '',
  caseRef: `CS-${Math.floor(1000 + Math.random() * 9000)}`,
  personal: {
    fullName: '', idNumber: '', nationality: 'سعودي', gender: 'ذكر', dob: '',
    mobile1: '', mobile2: '', city: '', neighborhood: '', gps: '', socialStatus: '', education: '',
  },
  work: { commercialReg: 'لا يوجد', currentJob: 'لا يعمل' },
  income: { socialSecurity: 0, salary: 0, pension: 0, rehab: 0, citizenAccount: 0, realEstate: 0 },
  debts: { car: 0, loans: 0, bills: 0, others: 0 },
  family: { wives: 0, sons: 0, daughters: 0, total: 0, under15: 0, over64: 0, specialNeeds: 0, healthStatus: 'سليم', socialSecurityStatus: 'غير مسجل' },
  housing: { ownership: '', type: '', age: '', furniture: '', need: '' },
  evictionCapability: 'يمكن إخلاؤه عند الحاجة',
  researcher: { name: researcherName, mobile: '', visitDate: '', opinion: '' },
  manager: { name: '', title: '', mobile: '' },
  pledge: false,
});

export const F02Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [data, setData] = useState<any>(() => initF02(user.fullName));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = (sec: string, key: string, value: any) =>
    setData((d: any) => ({ ...d, [sec]: { ...d[sec], [key]: value } }));

  const totalIncome: number = Object.values(data.income).reduce<number>((a, b) => a + Number(b || 0), 0);
  const totalDebts: number = Object.values(data.debts).reduce<number>((a, b) => a + Number(b || 0), 0);

  const projectIdValid = PROJECT_ID_PATTERN.test(data.projectId);
  const projectIdTaken = useMemo(
    () => context.projects.some(p => p.projectId === data.projectId),
    [context.projects, data.projectId],
  );

  const submit = async () => {
    setError('');
    if (!projectIdValid) { setError('رقم المشروع يجب أن يكون بصيغة TRM-2026-001'); setStep(0); return; }
    if (projectIdTaken)  { setError('رقم المشروع مستخدم من قبل، اختر رقماً مختلفاً'); setStep(0); return; }
    if (!data.personal.fullName) { setError('اسم المستفيد مطلوب'); setStep(0); return; }
    if (!data.pledge) { setError('يجب الإقرار بصحة البيانات'); return; }

    setBusy(true);
    try {
      // 1) إنشاء سجل المشروع
      const projectRefId = await context.createProject({
        projectId: data.projectId,
        beneficiaryName: data.personal.fullName,
        city: data.personal.city,
        neighborhood: data.personal.neighborhood,
        region: user.region,
        caseRef: data.caseRef,
        phase: 'RESEARCH',
        progressPct: 5,
        createdBy: user.id,
        data: { f02CaseRef: data.caseRef },
      });

      // 2) إنشاء F-02 وربطه بالمشروع
      await api.createForm({
        code: 'F-02', user,
        projectId: data.projectId,
        projectRefId: projectRefId || null,
        beneficiaryName: data.personal.fullName,
        notes: data.researcher.opinion,
        data,
      });
      onClose();
    } catch (e) {
      console.error(e); setError('حدث خطأ، يرجى المحاولة لاحقاً.');
    } finally { setBusy(false); }
  };

  const steps = ['رقم المشروع والبيانات الأساسية', 'العمل والدخل', 'الأسرة والسكن', 'الباحث والاعتماد'];

  return (
    <CreatorShell title="F-02 · Genesis — استمارة البحث الاجتماعي" onClose={onClose}
      footer={
        step < steps.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)} className="px-5 py-2 text-sm font-bold rounded-lg bg-[#4A1F66] text-white hover:bg-[#3A1652]">التالي</button>
        ) : (
          <button onClick={submit} disabled={busy || !data.pledge}
            className="px-5 py-2 text-sm font-bold rounded-lg bg-[#56B894] text-white hover:bg-[#3F9B7A] disabled:opacity-50 flex items-center gap-1.5">
            <Send className="w-4 h-4" /> إنشاء المشروع ورفع الاستمارة
          </button>
        )
      }>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <button key={i} onClick={() => setStep(i)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition
              ${i === step ? 'bg-[#4A1F66] text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
            {i + 1}. {s}
          </button>
        ))}
      </div>
      {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg p-2 text-xs font-bold">{error}</div>}

      {step === 0 && (
        <>
          <Card title="Genesis — رقم المشروع" icon={Activity} accent="gradient">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
              قم بإسناد رقم المشروع يدوياً (Genesis). سيُقفَل هذا الرقم تلقائياً في كل النماذج اللاحقة.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ProjectIdField value={data.projectId} onChange={v => setData((d: any) => ({ ...d, projectId: v }))} locked={false} required />
              <ReadOnlyField label="رقم الحالة" value={data.caseRef} />
            </div>
            {data.projectId && !projectIdValid && (
              <p className="text-[11px] text-red-600 mt-2">الصيغة المطلوبة: TRM-2026-001</p>
            )}
            {data.projectId && projectIdValid && projectIdTaken && (
              <p className="text-[11px] text-red-600 mt-2">هذا الرقم مستخدم لمشروع آخر — اختر رقماً مختلفاً.</p>
            )}
          </Card>
          <Card title="بيانات المستفيد" icon={UsersIcon}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="الاسم الكامل" required value={data.personal.fullName} onChange={e => update('personal', 'fullName', e.target.value)} />
              <Input label="رقم الهوية" required value={data.personal.idNumber} onChange={e => update('personal', 'idNumber', e.target.value)} />
              <Select label="الجنسية" options={['سعودي', 'مقيم']} value={data.personal.nationality} onChange={e => update('personal', 'nationality', e.target.value)} />
              <Select label="الجنس" options={['ذكر', 'أنثى']} value={data.personal.gender} onChange={e => update('personal', 'gender', e.target.value)} />
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
          <Card title="إمكانية الإخلاء" icon={HomeIcon}>
            <Select label="هل يمكن إخلاء الأسرة عند الحاجة؟" options={['يمكن إخلاؤه عند الحاجة', 'يصعب إخلاؤه', 'لا يمكن إخلاؤه']} value={data.evictionCapability} onChange={e => setData((d: any) => ({ ...d, evictionCapability: e.target.value }))} />
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
          <Card title="الدخل والديون الشهرية" icon={DollarSign} accent="teal">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-green-700 dark:text-green-300 mb-2">الدخل الشهري</p>
                <div className="space-y-2">
                  {[
                    ['socialSecurity', 'ضمان اجتماعي'], ['salary', 'راتب عمل'], ['pension', 'تقاعد'],
                    ['rehab', 'تأهيل شامل'], ['citizenAccount', 'حساب المواطن'], ['realEstate', 'عقارات'],
                  ].map(([k, l]) => (
                    <MoneyInput key={k} label={l} value={data.income[k]} onChange={v => update('income', k, v)} />
                  ))}
                </div>
                <p className="text-xs font-bold text-green-700 mt-2">الإجمالي: {totalIncome.toLocaleString('en-US')} ر.س</p>
              </div>
              <div>
                <p className="text-xs font-bold text-red-700 dark:text-red-300 mb-2">الديون الشهرية</p>
                <div className="space-y-2">
                  {[
                    ['car', 'أقساط سيارة'], ['loans', 'أقساط قروض'],
                    ['bills', 'كهرباء/ماء'], ['others', 'ديون أخرى'],
                  ].map(([k, l]) => (
                    <MoneyInput key={k} label={l} value={data.debts[k]} onChange={v => update('debts', k, v)} />
                  ))}
                </div>
                <p className="text-xs font-bold text-red-700 mt-2">الإجمالي: {totalDebts.toLocaleString('en-US')} ر.س</p>
              </div>
            </div>
          </Card>
        </>
      )}

      {step === 2 && (
        <>
          <Card title="حالة الأسرة" icon={UsersIcon}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {[
                ['wives', 'الزوجات'], ['sons', 'البنين'], ['daughters', 'البنات'],
                ['total', 'إجمالي'], ['under15', 'أقل من 15'], ['over64', 'فوق 64'], ['specialNeeds', 'ذوي احتياجات'],
              ].map(([k, l]) => (
                <NumberCounter key={k} label={l} value={data.family[k]} onChange={v => update('family', k, v)} />
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
          <Card title="إقرار الباحث" icon={ShieldCheck}>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={data.pledge} onChange={e => setData((d: any) => ({ ...d, pledge: e.target.checked }))} className="mt-1 rounded border-gray-300 text-[#4A1F66] focus:ring-[#4A1F66]" />
              <span className="text-sm">أُقرّ بصحة البيانات الميدانية والمستندات المرفقة، وأعلم أن أي معلومات غير صحيحة تُعرّضني للمساءلة.</span>
            </label>
          </Card>
        </>
      )}
    </CreatorShell>
  );
};

/* F-02 Renderer — للقراءة بعد الإنشاء */
export const F02Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const project = context.projects.find((p: ProjectRecord) => p.id === rec.projectRefId);
  const d = rec.data || {};
  return (
    <FormShell rec={rec} user={user} api={api} project={project}>
      <ProjectGenesisBlock project={project} f02={rec} />
      <Card title="الدخل والديون" icon={DollarSign}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {Object.entries(d.income || {}).map(([k, v]) => <Pill key={k} tone="green">{k}: {String(v)}</Pill>)}
          {Object.entries(d.debts || {}).map(([k, v]) => <Pill key={k} tone="red">{k}: {String(v)}</Pill>)}
        </div>
      </Card>
      <Card title="الأسرة" icon={UsersIcon}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {Object.entries(d.family || {}).map(([k, v]) => <Pill key={k} tone="purple">{k}: {String(v)}</Pill>)}
        </div>
      </Card>
      <Card title="رأي الباحث" icon={Activity}>
        <ReadOnlyField label="رأي الباحث" value={d.researcher?.opinion} />
        <ReadOnlyField className="mt-2" label="إمكانية الإخلاء" value={d.evictionCapability} />
      </Card>
    </FormShell>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   F-03 — استحقاق الخدمة (3 مراحل: Mgr → Exec → Mgr Transfer)
   ════════════════════════════════════════════════════════════════════════ */

export const F03Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const project = context.projects.find((p: ProjectRecord) => p.id === rec.projectRefId);
  const f02 = context.findProjectForm(rec.projectRefId, 'F-02');
  const d = rec.data || {};
  const [stage1, setStage1] = useState({
    eligibility: d.eligibility || '',
    managerNotes: d.managerNotes || '',
  });
  const [stage2, setStage2] = useState({ executiveNotes: d.executiveNotes || '' });
  const [stage3, setStage3] = useState({ transferNotes: d.transferNotes || '' });
  const step = rec.approvalIndex; // 0=Manager initial, 1=Exec, 2=Manager transfer
  const isReadOnly = !formAwaitsUser(rec, user);

  return (
    <FormShell rec={rec} user={user} api={api} project={project}
      approvalSection={step === 0 ? (
        <ApprovalActionsBar rec={rec} user={user} api={api}
          approveLabel="إعتماد ورفع للمدير التنفيذي"
          beforeApprove={() => ({ eligibility: stage1.eligibility, managerNotes: stage1.managerNotes })} />
      ) : step === 1 ? (
        <ApprovalActionsBar rec={rec} user={user} api={api}
          approveLabel="اعتماد المدير التنفيذي"
          beforeApprove={() => ({ executiveNotes: stage2.executiveNotes })} />
      ) : step === 2 ? (
        <ApprovalActionsBar rec={rec} user={user} api={api}
          approveLabel="تحويل إلى إدارة المشاريع"
          beforeApprove={async () => {
            // عند التحويل يتم تحديث المشروع للمرحلة DIAGNOSIS
            if (rec.projectRefId) {
              await context.updateProject(rec.projectRefId, { phase: 'DIAGNOSIS', progressPct: 15 });
            }
            return { transferNotes: stage3.transferNotes };
          }} />
      ) : undefined
    }>
      <ProjectGenesisBlock project={project} f02={f02} />

      {/* المرحلة 1 — مدير البحث الاجتماعي */}
      <Card title="المرحلة 1: قرار مدير البحث الاجتماعي" icon={ShieldCheck}>
        {step === 0 && !isReadOnly ? (
          <div className="space-y-3">
            <Select label="قرار الاستحقاق" required options={['مستحق', 'غير مستحق']}
              value={stage1.eligibility} onChange={e => setStage1(s => ({ ...s, eligibility: e.target.value }))} />
            <TextArea label="توصية مدير البحث" rows={3} value={stage1.managerNotes}
              onChange={e => setStage1(s => ({ ...s, managerNotes: e.target.value }))} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ReadOnlyField label="القرار" value={d.eligibility} />
            <ReadOnlyField label="توصية مدير البحث" value={d.managerNotes} />
          </div>
        )}
      </Card>

      {/* المرحلة 2 — المدير التنفيذي */}
      {step >= 1 && (
        <Card title="المرحلة 2: اعتماد المدير التنفيذي" icon={ShieldCheck} accent="teal">
          {step === 1 && !isReadOnly ? (
            <TextArea label="ملاحظات المدير التنفيذي" rows={3} value={stage2.executiveNotes}
              onChange={e => setStage2(s => ({ ...s, executiveNotes: e.target.value }))} />
          ) : (
            <ReadOnlyField label="ملاحظات المدير التنفيذي" value={d.executiveNotes} />
          )}
        </Card>
      )}

      {/* المرحلة 3 — مدير البحث (تحويل لإدارة المشاريع) */}
      {step >= 2 && (
        <Card title="المرحلة 3: التحويل إلى إدارة المشاريع" icon={ArrowLeftRight}>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
            عند الاعتماد سيتم تحويل المشروع <strong className="font-mono">{project?.projectId}</strong> إلى إدارة المشاريع وفتح مرحلة التشخيص.
          </p>
          {step === 2 && !isReadOnly ? (
            <TextArea label="ملاحظات التحويل" rows={2} value={stage3.transferNotes}
              onChange={e => setStage3(s => ({ ...s, transferNotes: e.target.value }))} />
          ) : (
            <ReadOnlyField label="ملاحظات التحويل" value={d.transferNotes} />
          )}
        </Card>
      )}
    </FormShell>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   F-08 — كراسة تشخيص المبنى (3 مراحل: Engineer → Head Diag → PM)
   ════════════════════════════════════════════════════════════════════════ */

const initF08 = () => ({
  visitDate: '', team: '', area: '', age: '',
  summary: '', civilNotes: '', elecNotes: '', plumbingNotes: '',
  safetyHazard: false, finalRecommendation: '',
  headDiagnosisNotes: '', pmNotes: '',
});

export const F08Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const project = context.projects.find((p: ProjectRecord) => p.id === rec.projectRefId);
  const f02 = context.findProjectForm(rec.projectRefId, 'F-02');
  const d = rec.data || {};
  const [eng, setEng] = useState({ ...initF08(), ...d });
  const [headNotes, setHeadNotes] = useState(d.headDiagnosisNotes || '');
  const [pmNotes, setPmNotes] = useState(d.pmNotes || '');
  const step = rec.approvalIndex; // 0=Eng, 1=Head, 2=PM
  const isReadOnly = !formAwaitsUser(rec, user);

  return (
    <FormShell rec={rec} user={user} api={api} project={project}
      approvalSection={
        step === 0 ? (
          <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="رفع لرئيس قسم التشخيص"
            beforeApprove={() => ({ ...eng })} />
        ) : step === 1 ? (
          <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد رئيس التشخيص ورفعه لمدير المشاريع"
            beforeApprove={() => ({ headDiagnosisNotes: headNotes })} />
        ) : step === 2 ? (
          <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد مدير المشاريع"
            beforeApprove={() => ({ pmNotes })} />
        ) : undefined
      }>
      <ProjectGenesisBlock project={project} f02={f02} />

      {/* المرحلة 1 — مهندس التشخيص */}
      <Card title="المرحلة 1: ملاحظات مهندس التشخيص" icon={HardHat}>
        {step === 0 && !isReadOnly ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input type="date" label="تاريخ الزيارة" value={eng.visitDate} onChange={e => setEng(s => ({ ...s, visitDate: e.target.value }))} />
              <Input label="فريق التشخيص" value={eng.team} onChange={e => setEng(s => ({ ...s, team: e.target.value }))} />
              <Input label="المساحة (م²)" value={eng.area} onChange={e => setEng(s => ({ ...s, area: e.target.value }))} />
              <Input label="العمر التقديري" value={eng.age} onChange={e => setEng(s => ({ ...s, age: e.target.value }))} />
            </div>
            <TextArea className="mt-3" label="ملخص تقييم المبنى" rows={3} value={eng.summary} onChange={e => setEng(s => ({ ...s, summary: e.target.value }))} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <TextArea label="الأعمال المدنية" rows={2} value={eng.civilNotes} onChange={e => setEng(s => ({ ...s, civilNotes: e.target.value }))} />
              <TextArea label="الأعمال الكهربائية" rows={2} value={eng.elecNotes} onChange={e => setEng(s => ({ ...s, elecNotes: e.target.value }))} />
              <TextArea label="السباكة" rows={2} value={eng.plumbingNotes} onChange={e => setEng(s => ({ ...s, plumbingNotes: e.target.value }))} />
            </div>
            <label className={`mt-3 flex items-start gap-2 cursor-pointer p-3 rounded-lg border-2 transition ${eng.safetyHazard ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-slate-700'}`}>
              <input type="checkbox" checked={eng.safetyHazard} onChange={e => setEng(s => ({ ...s, safetyHazard: e.target.checked }))} className="mt-1" />
              <span className="text-sm">
                <strong className="text-red-700 dark:text-red-300">المنزل غير صالح للسكن أثناء الترميم</strong>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">عند التفعيل سيتم فتح F-18 (إخلاء) و F-22 (سكن بديل) تلقائياً عند اعتماد F-08.</p>
              </span>
            </label>
            <TextArea className="mt-3" label="التوصية النهائية للمهندس" rows={2} value={eng.finalRecommendation} onChange={e => setEng(s => ({ ...s, finalRecommendation: e.target.value }))} />
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ReadOnlyField label="تاريخ الزيارة" value={d.visitDate} />
              <ReadOnlyField label="فريق التشخيص" value={d.team} />
              <ReadOnlyField label="المساحة" value={d.area} />
              <ReadOnlyField label="العمر التقديري" value={d.age} />
            </div>
            <ReadOnlyField className="mt-3" label="ملخص" value={d.summary} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <ReadOnlyField label="الأعمال المدنية" value={d.civilNotes} />
              <ReadOnlyField label="الأعمال الكهربائية" value={d.elecNotes} />
              <ReadOnlyField label="السباكة" value={d.plumbingNotes} />
            </div>
            <div className={`mt-3 p-2 rounded-lg ${d.safetyHazard ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200'} text-xs font-bold flex items-center gap-2`}>
              {d.safetyHazard ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {d.safetyHazard ? 'منزل غير صالح للسكن — سيُفتح F-18 و F-22.' : 'المنزل صالح لاستمرار السكن أثناء الترميم.'}
            </div>
            <ReadOnlyField className="mt-3" label="التوصية النهائية" value={d.finalRecommendation} />
          </>
        )}
      </Card>

      {/* المرحلة 2 — رئيس قسم التشخيص */}
      {step >= 1 && (
        <Card title="المرحلة 2: مراجعة رئيس قسم التشخيص/الإشراف" icon={ShieldCheck}>
          {step === 1 && !isReadOnly ? (
            <TextArea label="ملاحظات الرئيس" rows={3} value={headNotes} onChange={e => setHeadNotes(e.target.value)} />
          ) : (
            <ReadOnlyField label="ملاحظات الرئيس" value={d.headDiagnosisNotes} />
          )}
        </Card>
      )}

      {/* المرحلة 3 — مدير المشاريع */}
      {step >= 2 && (
        <Card title="المرحلة 3: اعتماد مدير المشاريع" icon={ShieldCheck} accent="teal">
          {step === 2 && !isReadOnly ? (
            <TextArea label="ملاحظات مدير المشاريع" rows={3} value={pmNotes} onChange={e => setPmNotes(e.target.value)} />
          ) : (
            <ReadOnlyField label="ملاحظات مدير المشاريع" value={d.pmNotes} />
          )}
        </Card>
      )}
    </FormShell>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   F-18 — تعهد إخلاء المنزل
   ════════════════════════════════════════════════════════════════════════ */

export const F18Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const project = context.projects.find((p: ProjectRecord) => p.id === rec.projectRefId);
  const f02 = context.findProjectForm(rec.projectRefId, 'F-02');
  const f08 = context.findProjectForm(rec.projectRefId, 'F-08');
  const d = rec.data || {};
  const [evac, setEvac] = useState(d.evacDate || '');
  const [ret, setRet] = useState(d.returnDate || '');
  const [files, setFiles] = useState(rec.files || []);
  const step = rec.approvalIndex;
  const isReadOnly = !formAwaitsUser(rec, user);

  return (
    <FormShell rec={rec} user={user} api={api} project={project}
      approvalSection={
        step === 0 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="رفع للمدير ➡️ تعهد"
          beforeApprove={async () => { await api.attachFiles(rec.id, files); return { evacDate: evac, returnDate: ret }; }} /> :
        <ApprovalActionsBar rec={rec} user={user} api={api} />
      }>
      <ProjectGenesisBlock project={project} f02={f02} />
      <F08BaselineBlock f08={f08} />
      <Card title="بيانات الإخلاء" icon={Calendar}>
        {step === 0 && !isReadOnly ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input type="date" label="تاريخ الإخلاء" required value={evac} onChange={e => setEvac(e.target.value)} />
            <Input type="date" label="تاريخ العودة المتوقع" value={ret} onChange={e => setRet(e.target.value)} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ReadOnlyField label="تاريخ الإخلاء" value={d.evacDate} />
            <ReadOnlyField label="تاريخ العودة" value={d.returnDate} />
          </div>
        )}
      </Card>
      <Card title="رفع التعهد الموقّع" icon={FileSignature}>
        {step === 0 && !isReadOnly ? (
          <FileUploader files={files}
            onAdd={f => setFiles([...files, ...Array.from(f).map(file => ({ name: file.name }))])}
            onRemove={i => setFiles(files.filter((_, idx) => idx !== i))}
            label="ارفع التعهد (PDF أو صورة موقعة)" accept=".pdf,.jpg,.jpeg,.png" />
        ) : (
          rec.files && rec.files.length > 0 ? (
            <FileUploader files={rec.files} onAdd={() => {}} onRemove={() => {}} label="" />
          ) : <p className="text-xs text-gray-400">لم يتم رفع تعهد بعد.</p>
        )}
      </Card>
    </FormShell>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   F-22 — طلب سكن بديل (تلقائي مع F-18 — يولّد خطاباً للجهة الشريكة)
   ════════════════════════════════════════════════════════════════════════ */

export const F22Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const project = context.projects.find((p: ProjectRecord) => p.id === rec.projectRefId);
  const f02 = context.findProjectForm(rec.projectRefId, 'F-02');
  const f18 = context.findProjectForm(rec.projectRefId, 'F-18');
  const d = rec.data || {};
  const evac = d.evacDate || f18?.data?.evacDate;
  const ret = d.returnDate || f18?.data?.returnDate;
  const familyName = rec.beneficiaryName || project?.beneficiaryName || f02?.data?.personal?.fullName;
  const city = project?.city || f02?.data?.personal?.city;

  return (
    <FormShell rec={rec} user={user} api={api} project={project}>
      <ProjectGenesisBlock project={project} f02={f02} />
      <Card title="نص الخطاب الآلي للجهة الشريكة" icon={Mail} accent="teal">
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-5 text-sm leading-7" dir="rtl">
          <p>إلى مدير الجهة الشريكة المحترم،</p>
          <p className="mt-3">السلام عليكم ورحمة الله وبركاته،</p>
          <p className="mt-3">
            نرجو منكم التكرم بتوفير سكن بديل وأثاث للأسرة المستفيدة <strong className="text-[#4A1F66]">{familyName}</strong>{' '}
            في مدينة <strong>{city}</strong> خلال فترة الترميم
            {evac && <> اعتباراً من تاريخ <strong>{evac}</strong></>}{' '}
            {ret && <>وحتى تاريخ <strong>{ret}</strong></>}.
          </p>
          <p className="mt-3">رقم المشروع: <strong className="font-mono">{project?.projectId}</strong></p>
          <p className="mt-6">مع جزيل الشكر،<br /><strong>إدارة البحث الاجتماعي — جمعية ترميم</strong></p>
        </div>
      </Card>
    </FormShell>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   F-21 — حصر الأثاث والأجهزة (5 مراحل + كاتالوج كميات)
   Engineer → PM → Marketing → Support → Finance
   ════════════════════════════════════════════════════════════════════════ */

const FURNITURE_CATALOG = [
  { key: 'bed1', label: 'سرير نفر', avgPrice: 650 },
  { key: 'mattress1', label: 'مرتبة نفر', avgPrice: 373 },
  { key: 'bed15', label: 'سرير نفر ونص', avgPrice: 700 },
  { key: 'mattress15', label: 'مرتبة نفر ونص', avgPrice: 373 },
  { key: 'bedDouble', label: 'سرير نفرين', avgPrice: 1100 },
  { key: 'mattressDouble', label: 'مرتبة نفرين', avgPrice: 650 },
  { key: 'nightstand', label: 'كمدينة درجين', avgPrice: 200 },
  { key: 'wardrobe2', label: 'دولاب 2 أبواب', avgPrice: 750 },
  { key: 'wardrobe3', label: 'دولاب 3 أبواب', avgPrice: 800 },
  { key: 'wardrobe4', label: 'دولاب 4 أبواب', avgPrice: 977 },
  { key: 'dresser', label: 'تسريحة', avgPrice: 402 },
  { key: 'carpet', label: 'سجاد', avgPrice: 632 },
  { key: 'sofaSet', label: 'طقم كنب 7 أشخاص', avgPrice: 3622 },
  { key: 'sofaMeters', label: 'متر كنب متصل', avgPrice: 500 },
  { key: 'floorSeating', label: 'جلسة أرضية', avgPrice: 300 },
  { key: 'rollerBlind', label: 'ستارة رول', avgPrice: 100 },
  { key: 'fabricBlind', label: 'ستارة قماشية', avgPrice: 402 },
  { key: 'diningTable', label: 'طاولة طعام 4-6 كراسي', avgPrice: 1325 },
  { key: 'tablesSet', label: 'طقم طاولات 1+4', avgPrice: 700 },
];
const APPLIANCE_CATALOG = [
  { key: 'acSplit15', label: 'مكيف سبلت طن ونص', avgPrice: 1955 },
  { key: 'acInstall', label: 'تركيب المكيف', avgPrice: 517 },
  { key: 'acWindow15', label: 'مكيف شباك طن ونص', avgPrice: 1207 },
  { key: 'waterCooler', label: 'براد ماء', avgPrice: 431 },
  { key: 'stove', label: 'فرن غاز', avgPrice: 1265 },
  { key: 'fridge', label: 'ثلاجة', avgPrice: 1604 },
  { key: 'washer', label: 'غسالة', avgPrice: 1012 },
  { key: 'vacuum', label: 'مكنسة كهربائية', avgPrice: 230 },
];

const QtyCatalog: React.FC<{
  catalog: typeof FURNITURE_CATALOG; qty: Record<string, number>;
  setQty: (q: Record<string, number>) => void; readOnly?: boolean;
}> = ({ catalog, qty, setQty, readOnly }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
    {catalog.map(item => (
      <div key={item.key} className={`border rounded-lg p-2 ${(qty[item.key] || 0) > 0 ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-800' : 'border-gray-200 dark:border-slate-700'}`}>
        <p className="text-xs font-bold text-gray-700 dark:text-slate-200">{item.label}</p>
        <p className="text-[10px] text-gray-400">{item.avgPrice} ر.س / وحدة</p>
        {readOnly ? (
          <p className="mt-1 text-sm font-bold text-purple-700 dark:text-purple-300">×{qty[item.key] || 0}</p>
        ) : (
          <NumberCounter value={qty[item.key] || 0} onChange={v => setQty({ ...qty, [item.key]: v })} />
        )}
      </div>
    ))}
  </div>
);

export const F21Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const project = context.projects.find((p: ProjectRecord) => p.id === rec.projectRefId);
  const f02 = context.findProjectForm(rec.projectRefId, 'F-02');
  const f08 = context.findProjectForm(rec.projectRefId, 'F-08');
  const d = rec.data || {};
  const [furniture, setFurniture] = useState<Record<string, number>>(d.furniture || {});
  const [appliances, setAppliances] = useState<Record<string, number>>(d.appliances || {});
  const [pmNotes, setPmNotes] = useState(d.pmNotes || '');
  const [marketingNotes, setMarketingNotes] = useState(d.marketingNotes || '');
  const [supportNotes, setSupportNotes] = useState(d.supportNotes || '');
  const [financeNotes, setFinanceNotes] = useState(d.financeNotes || '');
  const step = rec.approvalIndex;
  const isReadOnly = !formAwaitsUser(rec, user);

  const totalFurniture = FURNITURE_CATALOG.reduce((s, i) => s + (furniture[i.key] || 0) * i.avgPrice, 0);
  const totalAppliance = APPLIANCE_CATALOG.reduce((s, i) => s + (appliances[i.key] || 0) * i.avgPrice, 0);
  const grandTotal = totalFurniture + totalAppliance;

  return (
    <FormShell rec={rec} user={user} api={api} project={project}
      approvalSection={
        step === 0 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="رفع لمدير المشاريع"
          beforeApprove={() => ({ furniture, appliances, totalFurniture, totalAppliance, total: grandTotal })} /> :
        step === 1 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد مدير المشاريع"
          beforeApprove={() => ({ pmNotes })} /> :
        step === 2 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد التسويق"
          beforeApprove={() => ({ marketingNotes })} /> :
        step === 3 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد الخدمات المساندة"
          beforeApprove={() => ({ supportNotes })} /> :
        step === 4 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد المالية"
          beforeApprove={() => ({ financeNotes })} /> : undefined
      }>
      <ProjectGenesisBlock project={project} f02={f02} />
      <F08BaselineBlock f08={f08} />

      <Card title="حصر الأثاث" icon={HomeIcon}>
        <QtyCatalog catalog={FURNITURE_CATALOG} qty={furniture} setQty={setFurniture} readOnly={step !== 0 || isReadOnly} />
        <p className="mt-3 text-sm font-bold text-purple-700 dark:text-purple-300">إجمالي الأثاث: {totalFurniture.toLocaleString('en-US')} ر.س</p>
      </Card>
      <Card title="حصر الأجهزة" icon={Activity}>
        <QtyCatalog catalog={APPLIANCE_CATALOG} qty={appliances} setQty={setAppliances} readOnly={step !== 0 || isReadOnly} />
        <p className="mt-3 text-sm font-bold text-teal-700 dark:text-teal-300">إجمالي الأجهزة: {totalAppliance.toLocaleString('en-US')} ر.س</p>
      </Card>
      <div className="bg-gradient-to-l from-[#4A1F66]/10 to-[#56B894]/10 dark:from-purple-900/20 dark:to-teal-900/20 rounded-xl p-4 text-center">
        <p className="text-xs text-gray-500 dark:text-slate-400">الإجمالي العام</p>
        <p className="text-2xl font-bold text-[#4A1F66] dark:text-purple-300">{grandTotal.toLocaleString('en-US')} ر.س</p>
      </div>

      {step >= 1 && (
        <Card title="المرحلة 2: مدير المشاريع" icon={ShieldCheck}>
          {step === 1 && !isReadOnly ? <TextArea label="ملاحظات مدير المشاريع" rows={2} value={pmNotes} onChange={e => setPmNotes(e.target.value)} /> : <ReadOnlyField label="ملاحظات مدير المشاريع" value={d.pmNotes} />}
        </Card>
      )}
      {step >= 2 && (
        <Card title="المرحلة 3: التسويق" icon={ShieldCheck}>
          {step === 2 && !isReadOnly ? <TextArea label="ملاحظات التسويق" rows={2} value={marketingNotes} onChange={e => setMarketingNotes(e.target.value)} /> : <ReadOnlyField label="ملاحظات التسويق" value={d.marketingNotes} />}
        </Card>
      )}
      {step >= 3 && (
        <Card title="المرحلة 4: الخدمات المساندة" icon={ShieldCheck}>
          {step === 3 && !isReadOnly ? <TextArea label="ملاحظات الخدمات المساندة" rows={2} value={supportNotes} onChange={e => setSupportNotes(e.target.value)} /> : <ReadOnlyField label="ملاحظات الخدمات المساندة" value={d.supportNotes} />}
        </Card>
      )}
      {step >= 4 && (
        <Card title="المرحلة 5: المالية" icon={ShieldCheck} accent="teal">
          {step === 4 && !isReadOnly ? <TextArea label="ملاحظات المالية" rows={2} value={financeNotes} onChange={e => setFinanceNotes(e.target.value)} /> : <ReadOnlyField label="ملاحظات المالية" value={d.financeNotes} />}
        </Card>
      )}
    </FormShell>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   F-20 — خطة توريد المواد (مرحلتان)
   Engineer (lists items) → Support Mgr (assigns suppliers + dates)
   ════════════════════════════════════════════════════════════════════════ */

interface SupplyItem { id: string; name: string; unit: string; qty: number; supplier?: string; eta?: string; }

export const F20Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const project = context.projects.find((p: ProjectRecord) => p.id === rec.projectRefId);
  const f08 = context.findProjectForm(rec.projectRefId, 'F-08');
  const d = rec.data || {};
  const [items, setItems] = useState<SupplyItem[]>(d.items || [{ id: '1', name: '', unit: '', qty: 1 }]);
  const step = rec.approvalIndex;
  const isReadOnly = !formAwaitsUser(rec, user);

  const updateItem = (id: string, k: keyof SupplyItem, v: any) =>
    setItems(arr => arr.map(x => x.id === id ? { ...x, [k]: v } : x));
  const addItem = () => setItems(arr => [...arr, { id: Date.now() + '', name: '', unit: '', qty: 1 }]);
  const removeItem = (id: string) => setItems(arr => arr.filter(x => x.id !== id));

  return (
    <FormShell rec={rec} user={user} api={api} project={project}
      approvalSection={
        step === 0 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="رفع للخدمات المساندة"
          beforeApprove={() => ({ items })} /> :
        step === 1 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد الخطة وإسناد الموردين"
          beforeApprove={() => ({ items })} /> : undefined
      }>
      <F08BaselineBlock f08={f08} />
      <Card title={step === 0 ? 'المرحلة 1: حصر المواد (المهندس المشرف)' : 'المرحلة 2: تخصيص الموردين والتواريخ (الخدمات المساندة)'} icon={Truck}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-2 py-2 text-right">المادة</th>
                <th className="px-2 py-2 text-right">الوحدة</th>
                <th className="px-2 py-2 text-right">الكمية</th>
                <th className="px-2 py-2 text-right">المورد المقترح</th>
                <th className="px-2 py-2 text-right">تاريخ التسليم</th>
                {step === 0 && !isReadOnly && <th className="px-2 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} className="border-t dark:border-slate-700">
                  <td className="px-1 py-1">
                    {step === 0 && !isReadOnly ? <Input value={it.name} onChange={e => updateItem(it.id, 'name', e.target.value)} /> : it.name}
                  </td>
                  <td className="px-1 py-1">
                    {step === 0 && !isReadOnly ? <Input value={it.unit} onChange={e => updateItem(it.id, 'unit', e.target.value)} /> : it.unit}
                  </td>
                  <td className="px-1 py-1 w-24">
                    {step === 0 && !isReadOnly ? <Input type="number" value={it.qty} onChange={e => updateItem(it.id, 'qty', Number(e.target.value || 0))} /> : it.qty}
                  </td>
                  <td className="px-1 py-1">
                    {step === 1 && !isReadOnly ? (
                      <Input value={it.supplier || ''} onChange={e => updateItem(it.id, 'supplier', e.target.value)} />
                    ) : (it.supplier || '—')}
                  </td>
                  <td className="px-1 py-1">
                    {step === 1 && !isReadOnly ? (
                      <Input type="date" value={it.eta || ''} onChange={e => updateItem(it.id, 'eta', e.target.value)} />
                    ) : (it.eta || '—')}
                  </td>
                  {step === 0 && !isReadOnly && (
                    <td className="px-1 py-1 w-12">
                      <button onClick={() => removeItem(it.id)} className="px-2 py-1 rounded bg-red-50 dark:bg-red-900/30 text-red-600 text-xs">حذف</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {step === 0 && !isReadOnly && (
          <button onClick={addItem} className="mt-3 px-3 py-1.5 rounded-lg bg-[#56B894] text-white text-xs font-bold flex items-center gap-1.5"><Plus className="w-3 h-3" /> إضافة بند</button>
        )}
      </Card>
    </FormShell>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   F-19 — تعميد المقاول بالتوريد (4 مراحل ultimatum)
   Procurement → SS Mgr → Finance → Exec
   ════════════════════════════════════════════════════════════════════════ */

export const F19Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const project = context.projects.find((p: ProjectRecord) => p.id === rec.projectRefId);
  const f02 = context.findProjectForm(rec.projectRefId, 'F-02');
  const f20 = context.findProjectForm(rec.projectRefId, 'F-20');
  const d = rec.data || {};
  const [stage1, setStage1] = useState({
    contractor: d.contractor || '', amount: d.amount || 0, items: d.items || '',
    supplyMethod: d.supplyMethod || 'شراء مباشر', deadline: d.deadline || '',
    procurementNotes: d.procurementNotes || '',
  });
  const [ssNotes, setSsNotes] = useState(d.ssManagerNotes || '');
  const [finNotes, setFinNotes] = useState(d.financeNotes || '');
  const [execNotes, setExecNotes] = useState(d.executiveNotes || '');
  const step = rec.approvalIndex;
  const isReadOnly = !formAwaitsUser(rec, user);

  return (
    <FormShell rec={rec} user={user} api={api} project={project}
      approvalSection={
        step === 0 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="رفع لمدير الخدمات المساندة"
          beforeApprove={() => ({ ...stage1 })} /> :
        step === 1 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد مدير الخدمات المساندة"
          beforeApprove={() => ({ ssManagerNotes: ssNotes })} /> :
        step === 2 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد المالية"
          beforeApprove={() => ({ financeNotes: finNotes })} /> :
        step === 3 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد المدير التنفيذي"
          beforeApprove={() => ({ executiveNotes: execNotes })} /> : undefined
      }>
      <ProjectGenesisBlock project={project} f02={f02} />
      {f20 && (
        <ReadOnlyBlock title="خطة التوريد المعتمدة — مأخوذ من F-20" icon={Truck}>
          <p className="text-xs">{(f20.data?.items || []).length} بند توريد معتمد.</p>
        </ReadOnlyBlock>
      )}

      <Card title={`المرحلة ${step + 1}: ${
        step === 0 ? 'مسؤول المشتريات (تعميد المقاول)' :
        step === 1 ? 'مدير الخدمات المساندة' :
        step === 2 ? 'الإدارة المالية' :
        'المدير التنفيذي (الاعتماد النهائي)'}`} icon={Truck}>
        {step === 0 && !isReadOnly ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="اسم المقاول/المورد" required value={stage1.contractor} onChange={e => setStage1(s => ({ ...s, contractor: e.target.value }))} />
              <MoneyInput label="قيمة التعميد" value={stage1.amount} onChange={v => setStage1(s => ({ ...s, amount: v }))} />
              <Select label="آلية التوريد" options={['شراء مباشر', 'عقد مع مورد', 'مستودع الجمعية']} value={stage1.supplyMethod} onChange={e => setStage1(s => ({ ...s, supplyMethod: e.target.value }))} />
              <Input type="date" label="آخر موعد للتوريد (Deadline)" value={stage1.deadline} onChange={e => setStage1(s => ({ ...s, deadline: e.target.value }))} />
            </div>
            <TextArea className="mt-3" label="حصر المواد المطلوبة" rows={3} value={stage1.items} onChange={e => setStage1(s => ({ ...s, items: e.target.value }))} />
            <TextArea className="mt-3" label="مبررات التعميد" rows={2} value={stage1.procurementNotes} onChange={e => setStage1(s => ({ ...s, procurementNotes: e.target.value }))} />
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ReadOnlyField label="المقاول" value={d.contractor} />
            <ReadOnlyField label="القيمة" value={`${(d.amount || 0).toLocaleString('en-US')} ر.س`} />
            <ReadOnlyField label="آلية التوريد" value={d.supplyMethod} />
            <ReadOnlyField label="آخر موعد" value={d.deadline} />
            <ReadOnlyField className="md:col-span-2" label="المواد" value={d.items} />
            <ReadOnlyField className="md:col-span-2" label="مبررات المشتريات" value={d.procurementNotes} />
          </div>
        )}
      </Card>

      {step >= 1 && (
        <Card title="رأي الإدارات السابقة" icon={ClipboardList}>
          <div className="space-y-2">
            {step >= 1 && <ReadOnlyField label="مبررات المشتريات" value={d.procurementNotes} />}
            {step >= 2 && <ReadOnlyField label="رأي مدير الخدمات المساندة" value={d.ssManagerNotes} />}
            {step >= 3 && <ReadOnlyField label="رأي المالية" value={d.financeNotes} />}
          </div>
        </Card>
      )}

      {step === 1 && !isReadOnly && <Card title="ملاحظات مدير الخدمات المساندة" icon={ShieldCheck}><TextArea label="" rows={3} value={ssNotes} onChange={e => setSsNotes(e.target.value)} /></Card>}
      {step === 2 && !isReadOnly && <Card title="ملاحظات المالية (التدقيق المالي وميزانية)" icon={DollarSign}><TextArea label="" rows={3} value={finNotes} onChange={e => setFinNotes(e.target.value)} /></Card>}
      {step === 3 && !isReadOnly && <Card title="اعتماد المدير التنفيذي" icon={ShieldCheck} accent="gradient"><TextArea label="" rows={3} value={execNotes} onChange={e => setExecNotes(e.target.value)} /></Card>}
    </FormShell>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   F-85 — اعتماد التسعيرات والترسية (3 مراحل)
   PM (3 contractors + winner) → Finance → Exec
   ════════════════════════════════════════════════════════════════════════ */

interface BidRow { id: string; contractor: string; price: number; notes?: string; }

export const F85Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const project = context.projects.find((p: ProjectRecord) => p.id === rec.projectRefId);
  const f02 = context.findProjectForm(rec.projectRefId, 'F-02');
  const d = rec.data || {};
  const [bids, setBids] = useState<BidRow[]>(d.bids || [
    { id: '1', contractor: '', price: 0 },
    { id: '2', contractor: '', price: 0 },
    { id: '3', contractor: '', price: 0 },
  ]);
  const [winnerId, setWinnerId] = useState<string>(d.winnerId || '');
  const [finNotes, setFinNotes] = useState(d.financeNotes || '');
  const [execNotes, setExecNotes] = useState(d.executiveNotes || '');
  const step = rec.approvalIndex;
  const isReadOnly = !formAwaitsUser(rec, user);

  const updateBid = (id: string, k: keyof BidRow, v: any) =>
    setBids(arr => arr.map(x => x.id === id ? { ...x, [k]: v } : x));

  return (
    <FormShell rec={rec} user={user} api={api} project={project}
      approvalSection={
        step === 0 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="رفع للمالية"
          beforeApprove={() => {
            const winner = bids.find(b => b.id === winnerId);
            return { bids, winnerId, winnerContractor: winner?.contractor, winnerPrice: winner?.price };
          }} /> :
        step === 1 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد المالية"
          beforeApprove={() => ({ financeNotes: finNotes })} /> :
        step === 2 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد المدير التنفيذي"
          beforeApprove={() => ({ executiveNotes: execNotes })} /> : undefined
      }>
      <ProjectGenesisBlock project={project} f02={f02} />

      <Card title="عروض المقاولين" icon={Calculator}>
        <div className="space-y-2">
          {bids.map(b => (
            <div key={b.id} className={`grid grid-cols-12 gap-2 items-end p-2 rounded-lg border ${winnerId === b.id ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-slate-700'}`}>
              {step === 0 && !isReadOnly ? (
                <>
                  <Input className="col-span-5" label="اسم المقاول" value={b.contractor} onChange={e => updateBid(b.id, 'contractor', e.target.value)} />
                  <MoneyInput className="col-span-3" label="السعر" value={b.price} onChange={v => updateBid(b.id, 'price', v)} />
                  <Input className="col-span-3" label="ملاحظات" value={b.notes || ''} onChange={e => updateBid(b.id, 'notes', e.target.value)} />
                  <button onClick={() => setWinnerId(b.id)} className={`col-span-1 h-9 rounded-lg text-xs font-bold ${winnerId === b.id ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-slate-700'}`}>
                    <Trophy className="w-4 h-4 mx-auto" />
                  </button>
                </>
              ) : (
                <>
                  <ReadOnlyField className="col-span-5" label="المقاول" value={b.contractor} />
                  <ReadOnlyField className="col-span-3" label="السعر" value={`${(b.price || 0).toLocaleString('en-US')} ر.س`} />
                  <ReadOnlyField className="col-span-3" label="ملاحظات" value={b.notes} />
                  <div className="col-span-1 flex items-end justify-center pb-1">
                    {(d.winnerId || winnerId) === b.id && <Pill tone="amber">الفائز</Pill>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>
      {step >= 1 && (
        <Card title="قرار الترسية" icon={Trophy} accent="gradient">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ReadOnlyField label="المقاول الفائز" value={d.winnerContractor || bids.find(b => b.id === winnerId)?.contractor} />
            <ReadOnlyField label="قيمة الترسية" value={`${(d.winnerPrice || bids.find(b => b.id === winnerId)?.price || 0).toLocaleString('en-US')} ر.س`} />
          </div>
        </Card>
      )}
      {step === 1 && !isReadOnly && <Card title="اعتماد المالية" icon={DollarSign}><TextArea label="" rows={3} value={finNotes} onChange={e => setFinNotes(e.target.value)} /></Card>}
      {step === 2 && !isReadOnly && <Card title="الاعتماد التنفيذي النهائي" icon={ShieldCheck}><TextArea label="" rows={3} value={execNotes} onChange={e => setExecNotes(e.target.value)} /></Card>}
    </FormShell>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   F-14 — تقرير الزيارة الميدانية (3 مراحل)
   Engineer (logs % + scope change toggle) → Head Sup → PM
   ════════════════════════════════════════════════════════════════════════ */

export const F14Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const project = context.projects.find((p: ProjectRecord) => p.id === rec.projectRefId);
  const f02 = context.findProjectForm(rec.projectRefId, 'F-02');
  const f08 = context.findProjectForm(rec.projectRefId, 'F-08');
  const d = rec.data || {};
  const [visitDate, setVisitDate] = useState(d.visitDate || '');
  const [progressPct, setProgressPct] = useState<number>(d.progressPct || 0);
  const [milestone, setMilestone] = useState<'' | '30%' | '60%' | '90%' | '100%'>(d.milestone || '');
  const [scopeChange, setScopeChange] = useState<boolean>(!!d.scopeChange);
  const [scopeReason, setScopeReason] = useState(d.scopeReason || '');
  const [notes, setNotes] = useState(d.notes || '');
  const [files, setFiles] = useState(rec.files || []);
  const [headNotes, setHeadNotes] = useState(d.headSupervisionNotes || '');
  const [pmNotes, setPmNotes] = useState(d.pmNotes || '');
  const step = rec.approvalIndex;
  const isReadOnly = !formAwaitsUser(rec, user);

  return (
    <FormShell rec={rec} user={user} api={api} project={project}
      approvalSection={
        step === 0 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="رفع لرئيس قسم الإشراف"
          beforeApprove={async () => {
            await api.attachFiles(rec.id, files);
            return { visitDate, progressPct, milestone, scopeChange, scopeReason, notes };
          }} /> :
        step === 1 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد رئيس قسم الإشراف"
          beforeApprove={() => ({ headSupervisionNotes: headNotes })} /> :
        step === 2 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد مدير المشاريع"
          beforeApprove={() => ({ pmNotes })} /> : undefined
      }>
      <ProjectGenesisBlock project={project} f02={f02} />
      <F08BaselineBlock f08={f08} />

      <Card title={`المرحلة ${step + 1}: ${step === 0 ? 'تقرير المهندس المشرف' : step === 1 ? 'مراجعة رئيس قسم الإشراف' : 'اعتماد مدير المشاريع'}`} icon={Hammer}>
        {step === 0 && !isReadOnly ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input type="date" label="تاريخ الزيارة" required value={visitDate} onChange={e => setVisitDate(e.target.value)} />
              <Input type="number" label="نسبة الإنجاز %" value={progressPct} onChange={e => setProgressPct(Number(e.target.value || 0))} />
              <Select label="محطة دفعة" options={['', '30%', '60%', '90%', '100%']} placeholder="بدون"
                value={milestone} onChange={e => setMilestone(e.target.value as any)} />
            </div>
            <div className="mt-3"><ProgressBar value={progressPct} label="نسبة الإنجاز" /></div>
            {milestone && (
              <div className="mt-3 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-lg p-2 text-xs text-teal-800 dark:text-teal-200 font-bold flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" /> سيتم إصدار طلب صرف دفعة F-15 آلياً عند اعتماد هذا التقرير ({milestone}).
              </div>
            )}
            <details className="mt-3 group" open={scopeChange}>
              <summary className="cursor-pointer text-sm font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <input type="checkbox" checked={scopeChange} onChange={e => setScopeChange(e.target.checked)} className="rounded text-amber-500" />
                تغيير نطاق العمل (يفتح F-23 أعمال إضافية)
              </summary>
              {scopeChange && (
                <TextArea className="mt-2" label="مبررات تغيير النطاق" rows={2} value={scopeReason} onChange={e => setScopeReason(e.target.value)} />
              )}
            </details>
            <FileUploader files={files} className="mt-3"
              onAdd={f => setFiles([...files, ...Array.from(f).map(file => ({ name: file.name }))])}
              onRemove={i => setFiles(files.filter((_, idx) => idx !== i))}
              label="ارفع صور التقدم" accept="image/*" />
            <TextArea className="mt-3" label="ملاحظات" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ReadOnlyField label="تاريخ الزيارة" value={d.visitDate} />
              <ReadOnlyField label="نسبة الإنجاز" value={`${d.progressPct || 0}%`} />
              <ReadOnlyField label="محطة الدفعة" value={d.milestone || '—'} />
            </div>
            <div className="mt-3"><ProgressBar value={d.progressPct || 0} /></div>
            {d.scopeChange && <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-xs text-amber-700 dark:text-amber-300"><strong>تغيير نطاق:</strong> {d.scopeReason}</div>}
            <ReadOnlyField className="mt-3" label="ملاحظات" value={d.notes} />
          </>
        )}
      </Card>
      {step >= 1 && (
        <Card title="رأي رئيس قسم الإشراف" icon={ShieldCheck}>
          {step === 1 && !isReadOnly ? <TextArea label="" rows={2} value={headNotes} onChange={e => setHeadNotes(e.target.value)} /> : <ReadOnlyField label="" value={d.headSupervisionNotes} />}
        </Card>
      )}
      {step >= 2 && (
        <Card title="اعتماد مدير المشاريع" icon={ShieldCheck} accent="teal">
          {step === 2 && !isReadOnly ? <TextArea label="" rows={2} value={pmNotes} onChange={e => setPmNotes(e.target.value)} /> : <ReadOnlyField label="" value={d.pmNotes} />}
        </Card>
      )}
    </FormShell>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   F-23 — أعمال إضافية (4 مراحل)
   PM → Samaya (Volunteer Mgr) → Finance → Exec
   ════════════════════════════════════════════════════════════════════════ */

interface AddItem { id: string; description: string; dimensions: string; price: number; contractor: string; }

export const F23Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const project = context.projects.find((p: ProjectRecord) => p.id === rec.projectRefId);
  const f02 = context.findProjectForm(rec.projectRefId, 'F-02');
  const d = rec.data || {};
  const [items, setItems] = useState<AddItem[]>(d.items || [{ id: '1', description: '', dimensions: '', price: 0, contractor: '' }]);
  const [reason, setReason] = useState(d.reason || '');
  const [samayaNotes, setSamayaNotes] = useState(d.samayaNotes || '');
  const [finNotes, setFinNotes] = useState(d.financeNotes || '');
  const [execNotes, setExecNotes] = useState(d.executiveNotes || '');
  const step = rec.approvalIndex;
  const isReadOnly = !formAwaitsUser(rec, user);

  const total = items.reduce((s, i) => s + Number(i.price || 0), 0);

  return (
    <FormShell rec={rec} user={user} api={api} project={project}
      approvalSection={
        step === 0 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="رفع لمركز سمايا (التطوع)"
          beforeApprove={() => ({ items, reason, total })} /> :
        step === 1 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد التطوع"
          beforeApprove={() => ({ samayaNotes })} /> :
        step === 2 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد المالية"
          beforeApprove={() => ({ financeNotes: finNotes })} /> :
        step === 3 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد المدير التنفيذي"
          beforeApprove={() => ({ executiveNotes: execNotes })} /> : undefined
      }>
      <ProjectGenesisBlock project={project} f02={f02} />

      <Card title={`المرحلة ${step + 1}: ${
        step === 0 ? 'مدير المشاريع (طلب الأعمال الإضافية)' :
        step === 1 ? 'مركز سمايا (هل يمكن للمتطوعين تنفيذ هذه الأعمال؟)' :
        step === 2 ? 'الإدارة المالية' : 'المدير التنفيذي'}`} icon={HardHat}>
        {step === 0 && !isReadOnly ? (
          <>
            {items.map((it) => (
              <div key={it.id} className="grid grid-cols-12 gap-2 items-end mb-2">
                <Input className="col-span-5" label="وصف العمل" value={it.description} onChange={e => setItems(arr => arr.map(x => x.id === it.id ? { ...x, description: e.target.value } : x))} />
                <Input className="col-span-2" label="الأبعاد" value={it.dimensions} onChange={e => setItems(arr => arr.map(x => x.id === it.id ? { ...x, dimensions: e.target.value } : x))} />
                <Input className="col-span-3" label="المقاول" value={it.contractor} onChange={e => setItems(arr => arr.map(x => x.id === it.id ? { ...x, contractor: e.target.value } : x))} />
                <MoneyInput className="col-span-2" label="السعر" value={it.price} onChange={v => setItems(arr => arr.map(x => x.id === it.id ? { ...x, price: v } : x))} />
              </div>
            ))}
            <button onClick={() => setItems(arr => [...arr, { id: Date.now() + '', description: '', dimensions: '', price: 0, contractor: '' }])}
              className="px-3 py-1.5 rounded-lg bg-[#56B894] text-white text-xs font-bold flex items-center gap-1.5"><Plus className="w-3 h-3" /> إضافة بند</button>
            <TextArea className="mt-3" label="مبررات الأعمال الإضافية" rows={3} value={reason} onChange={e => setReason(e.target.value)} />
            <p className="mt-3 text-sm font-bold text-purple-700">الإجمالي: {total.toLocaleString('en-US')} ر.س</p>
          </>
        ) : (
          <>
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr><th className="px-2 py-2 text-right">العمل</th><th className="px-2 py-2 text-right">الأبعاد</th><th className="px-2 py-2 text-right">المقاول</th><th className="px-2 py-2 text-right">السعر</th></tr>
              </thead>
              <tbody>
                {(d.items || []).map((it: AddItem) => (
                  <tr key={it.id} className="border-t dark:border-slate-700">
                    <td className="px-2 py-1.5">{it.description}</td>
                    <td className="px-2 py-1.5">{it.dimensions}</td>
                    <td className="px-2 py-1.5">{it.contractor}</td>
                    <td className="px-2 py-1.5">{(it.price || 0).toLocaleString('en-US')} ر.س</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm font-bold text-purple-700">الإجمالي: {(d.total || 0).toLocaleString('en-US')} ر.س</p>
            <ReadOnlyField className="mt-3" label="المبررات" value={d.reason} />
          </>
        )}
      </Card>

      {step === 1 && !isReadOnly && <Card title="رأي مركز سمايا" icon={ShieldCheck}><TextArea label="" rows={3} value={samayaNotes} onChange={e => setSamayaNotes(e.target.value)} placeholder="هل يمكن تنفيذ هذه الأعمال عبر متطوعين لتخفيض التكلفة؟" /></Card>}
      {step >= 2 && step > 1 && <Card title="رأي مركز سمايا"><ReadOnlyField label="" value={d.samayaNotes} /></Card>}
      {step === 2 && !isReadOnly && <Card title="اعتماد المالية" icon={DollarSign}><TextArea label="" rows={3} value={finNotes} onChange={e => setFinNotes(e.target.value)} /></Card>}
      {step === 3 && !isReadOnly && <Card title="اعتماد المدير التنفيذي" icon={ShieldCheck} accent="gradient"><TextArea label="" rows={3} value={execNotes} onChange={e => setExecNotes(e.target.value)} /></Card>}
    </FormShell>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   F-15 — طلب صرف دفعة (smart: regular vs final)
   PM → Finance → Exec
   ════════════════════════════════════════════════════════════════════════ */

export const F15Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const project = context.projects.find((p: ProjectRecord) => p.id === rec.projectRefId);
  const f02 = context.findProjectForm(rec.projectRefId, 'F-02');
  const f07 = context.findProjectForm(rec.projectRefId, 'F-07');
  const d = rec.data || {};
  const [milestone, setMilestone] = useState<string>(d.milestone || '30%');
  const [amount, setAmount] = useState<number>(d.amount || 0);
  const [pmNotes, setPmNotes] = useState(d.pmNotes || '');
  const [finNotes, setFinNotes] = useState(d.financeNotes || '');
  const [execNotes, setExecNotes] = useState(d.executiveNotes || '');
  const step = rec.approvalIndex;
  const isReadOnly = !formAwaitsUser(rec, user);
  const isFinal = milestone === '100%' || d.milestone === '100%';

  return (
    <FormShell rec={rec} user={user} api={api} project={project}
      approvalSection={
        step === 0 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="رفع للمالية"
          beforeApprove={() => ({ milestone, amount, pmNotes, isFinal })} /> :
        step === 1 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد المالية"
          beforeApprove={() => ({ financeNotes: finNotes })} /> :
        step === 2 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد المدير التنفيذي"
          beforeApprove={() => ({ executiveNotes: execNotes })} /> : undefined
      }>
      <ProjectGenesisBlock project={project} f02={f02} />

      <Card title={`المرحلة ${step + 1}: ${step === 0 ? 'إعداد طلب الصرف' : step === 1 ? 'الاعتماد المالي' : 'الاعتماد التنفيذي'}`} icon={DollarSign}>
        {step === 0 && !isReadOnly ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select label="محطة الإنجاز" options={['30%', '60%', '90%', '100%']} value={milestone} onChange={e => setMilestone(e.target.value)} />
            <MoneyInput label="قيمة الدفعة" value={amount} onChange={setAmount} required />
            <TextArea className="md:col-span-2" label="توصية مدير المشاريع" rows={2} value={pmNotes} onChange={e => setPmNotes(e.target.value)} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ReadOnlyField label="محطة الإنجاز" value={d.milestone} />
            <ReadOnlyField label="القيمة" value={`${(d.amount || 0).toLocaleString('en-US')} ر.س`} />
            <ReadOnlyField className="md:col-span-2" label="توصية مدير المشاريع" value={d.pmNotes} />
          </div>
        )}
        {isFinal && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200">
            <strong>هذه الدفعة الأخيرة (100%):</strong> يجب أن تكون شهادة التسليم F-07 معتمدة قبل صرفها.
            {f07 ? (
              <Pill tone={f07.status === 'approved' ? 'green' : 'amber'} className="ms-2">F-07: {FORM_STATUS_LABELS[f07.status]}</Pill>
            ) : (
              <Pill tone="red" className="ms-2">F-07 غير موجود</Pill>
            )}
          </div>
        )}
      </Card>
      {step === 1 && !isReadOnly && <Card title="ملاحظات المحاسب" icon={DollarSign}><TextArea label="" rows={3} value={finNotes} onChange={e => setFinNotes(e.target.value)} /></Card>}
      {step >= 2 && <Card title="ملاحظات المالية"><ReadOnlyField label="" value={d.financeNotes} /></Card>}
      {step === 2 && !isReadOnly && <Card title="الاعتماد التنفيذي النهائي" icon={ShieldCheck}><TextArea label="" rows={3} value={execNotes} onChange={e => setExecNotes(e.target.value)} /></Card>}
    </FormShell>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   F-07 — شهادة تسليم المنزل (3 مراحل)
   Engineer → PM → Research Mgr (final closure)
   ════════════════════════════════════════════════════════════════════════ */

export const F07Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const project = context.projects.find((p: ProjectRecord) => p.id === rec.projectRefId);
  const f02 = context.findProjectForm(rec.projectRefId, 'F-02');
  const d = rec.data || {};
  const [eng, setEng] = useState({
    actualStartDate: d.actualStartDate || '',
    actualEndDate: d.actualEndDate || '',
    supervisingEngineer: d.supervisingEngineer || user.fullName,
    contractorName: d.contractorName || project?.contractorName || '',
    insulationGuarantee: d.insulationGuarantee || '',
    mediaRequested: !!d.mediaRequested,
  });
  const [files, setFiles] = useState(rec.files || []);
  const [pmNotes, setPmNotes] = useState(d.pmNotes || '');
  const [rmNotes, setRmNotes] = useState(d.researchManagerNotes || '');
  const step = rec.approvalIndex;
  const isReadOnly = !formAwaitsUser(rec, user);

  return (
    <FormShell rec={rec} user={user} api={api} project={project}
      approvalSection={
        step === 0 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="رفع لمدير المشاريع"
          beforeApprove={async () => { await api.attachFiles(rec.id, files); return { ...eng }; }} /> :
        step === 1 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="اعتماد مدير المشاريع"
          beforeApprove={() => ({ pmNotes })} /> :
        step === 2 ? <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="إغلاق المشروع — اعتماد البحث الاجتماعي"
          beforeApprove={() => ({ researchManagerNotes: rmNotes })} /> : undefined
      }>
      <ProjectGenesisBlock project={project} f02={f02} />

      <Card title={`المرحلة ${step + 1}: ${step === 0 ? 'شهادة المهندس المشرف' : step === 1 ? 'اعتماد مدير المشاريع' : 'الإغلاق النهائي - مدير البحث'}`} icon={CheckCircle2}>
        {step === 0 && !isReadOnly ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input type="date" label="تاريخ بدء التنفيذ" value={eng.actualStartDate} onChange={e => setEng(s => ({ ...s, actualStartDate: e.target.value }))} />
              <Input type="date" label="تاريخ التسليم الفعلي" value={eng.actualEndDate} onChange={e => setEng(s => ({ ...s, actualEndDate: e.target.value }))} />
              <Input label="المهندس المشرف" value={eng.supervisingEngineer} onChange={e => setEng(s => ({ ...s, supervisingEngineer: e.target.value }))} />
              <Input className="md:col-span-2" label="المقاول المنفذ" value={eng.contractorName} onChange={e => setEng(s => ({ ...s, contractorName: e.target.value }))} />
              <Input label="ضمان العزل (إن وجد)" value={eng.insulationGuarantee} onChange={e => setEng(s => ({ ...s, insulationGuarantee: e.target.value }))} placeholder="مثال: 10 سنوات" />
            </div>
            <FileUploader className="mt-3" files={files}
              onAdd={f => setFiles([...files, ...Array.from(f).map(file => ({ name: file.name }))])}
              onRemove={i => setFiles(files.filter((_, idx) => idx !== i))}
              label="ارفع شهادة التسليم الموقّعة" accept=".pdf,.jpg,.jpeg,.png" />
            <label className="mt-3 flex items-start gap-2 cursor-pointer p-3 rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-900/20">
              <input type="checkbox" checked={eng.mediaRequested} onChange={e => setEng(s => ({ ...s, mediaRequested: e.target.checked }))} className="mt-1" />
              <span className="text-sm">
                <strong className="text-[#4A1F66] dark:text-purple-300">طلب تغطية إعلامية وتوثيق</strong>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">عند التفعيل سيُولَّد F-52 آلياً للاتصال المؤسسي.</p>
              </span>
            </label>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ReadOnlyField label="تاريخ بدء التنفيذ" value={d.actualStartDate} />
              <ReadOnlyField label="تاريخ التسليم" value={d.actualEndDate} />
              <ReadOnlyField label="المهندس المشرف" value={d.supervisingEngineer} />
              <ReadOnlyField label="المقاول" value={d.contractorName} />
              <ReadOnlyField label="ضمان العزل" value={d.insulationGuarantee} />
            </div>
            {d.mediaRequested && <Pill tone="purple" className="mt-3">تم طلب تغطية إعلامية — F-52</Pill>}
          </>
        )}
      </Card>
      {step === 1 && !isReadOnly && <Card title="اعتماد مدير المشاريع" icon={ShieldCheck}><TextArea label="" rows={2} value={pmNotes} onChange={e => setPmNotes(e.target.value)} /></Card>}
      {step >= 2 && <Card title="ملاحظات مدير المشاريع"><ReadOnlyField label="" value={d.pmNotes} /></Card>}
      {step === 2 && !isReadOnly && <Card title="الإغلاق النهائي" icon={ShieldCheck} accent="gradient"><TextArea label="" rows={2} value={rmNotes} onChange={e => setRmNotes(e.target.value)} /></Card>}
    </FormShell>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   F-52 — طلب تصوير وتوثيق (PR Officer)
   ════════════════════════════════════════════════════════════════════════ */

export const F52Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const project = context.projects.find((p: ProjectRecord) => p.id === rec.projectRefId);
  const f02 = context.findProjectForm(rec.projectRefId, 'F-02');
  const d = rec.data || {};
  const [type, setType] = useState(d.type || 'قبل/بعد');
  const [details, setDetails] = useState(d.details || '');
  const [links, setLinks] = useState(d.links || '');
  const [files, setFiles] = useState(rec.files || []);
  const isPR = formAwaitsUser(rec, user) && user.role === 'PR_OFFICER';

  const persistOutputs = async () => {
    await api.updateFormData(rec.id, { type, details, links });
    await api.attachFiles(rec.id, files);
  };

  return (
    <FormShell rec={rec} user={user} api={api} project={project}
      approvalSection={isPR ? (
        <ApprovalActionsBar rec={rec} user={user} api={api} approveLabel="إغلاق المهمة"
          beforeApprove={async () => {
            await persistOutputs();
            return { type, details, links };
          }} />
      ) : undefined}>
      <ProjectGenesisBlock project={project} f02={f02} />

      <Card title="تفاصيل التغطية" icon={Camera}>
        {isPR ? (
          <>
            <Select label="نوع التغطية" options={['قبل/بعد', 'فيديو ميداني', 'مقابلة مع المستفيد', 'تصوير حدث']} value={type} onChange={e => setType(e.target.value)} />
            <TextArea className="mt-3" label="تفاصيل" rows={3} value={details} onChange={e => setDetails(e.target.value)} />
          </>
        ) : (
          <>
            <ReadOnlyField label="نوع التغطية" value={d.type} />
            <ReadOnlyField className="mt-3" label="تفاصيل" value={d.details} />
          </>
        )}
      </Card>
      <Card title="المخرجات الإعلامية" icon={CheckCircle2} accent="teal">
        {isPR ? (
          <>
            <TextArea label="روابط النشر" rows={3} value={links} onChange={e => setLinks(e.target.value)} placeholder="https://..." />
            <FileUploader className="mt-3" files={files}
              onAdd={f => setFiles([...files, ...Array.from(f).map(file => ({ name: file.name }))])}
              onRemove={i => setFiles(files.filter((_, idx) => idx !== i))}
              label="رفع المخرجات (صور/فيديوهات)" />
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

/* ════════════════════════════════════════════════════════════════════════
   Reusable Creator Shell (modal layout for the only Creator: F-02)
   ════════════════════════════════════════════════════════════════════════ */

const CreatorShell: React.FC<{
  title: string; onClose: () => void; footer: React.ReactNode; children: React.ReactNode;
}> = ({ title, onClose, footer, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" dir="rtl">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
      <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
        <h2 className="font-bold">{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15"><X className="w-5 h-5" /></button>
      </div>
      <div className="overflow-y-auto p-5 space-y-4 flex-1 bg-gray-50 dark:bg-slate-950">{children}</div>
      <div className="border-t dark:border-slate-700 p-3 flex justify-end gap-2 bg-white dark:bg-slate-900">
        <button onClick={onClose} className="px-4 py-2 text-sm font-bold bg-gray-100 dark:bg-slate-700 rounded-lg">إلغاء</button>
        {footer}
      </div>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════════════════
   Registries
   ════════════════════════════════════════════════════════════════════════ */

export const RENDERERS: Record<string, FormRenderer | undefined> = {
  'F-02': F02Renderer,
  'F-03': F03Renderer,
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

/* النموذج الوحيد القابل للإنشاء من خارج Project Hub: F-02 (Genesis).
   جميع النماذج الأخرى تُنشأ آلياً من workflow أو من داخل Project Hub. */
export const CREATORS: Record<string, FormCreator | undefined> = {
  'F-02': F02Creator,
};
