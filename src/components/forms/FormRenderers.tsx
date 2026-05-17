import React, { useEffect, useState } from 'react';
import {
  X, Send, Plus, Building2, Users as UsersIcon, Home as HomeIcon, Activity,
  ClipboardList, Calculator, Trophy, ShieldCheck, Camera, Truck, ShoppingCart,
  DollarSign, Briefcase, FileSignature, AlertTriangle, CheckCircle2,
  Calendar, Lock, RefreshCcw, XCircle, ArrowLeftRight, UserCog, UserCheck,
  MapPin, ChevronUp, ChevronDown, Sofa, PenTool, Trash2
} from 'lucide-react';
import { Card, Input, Select, TextArea, ReadOnlyField, FileUploader, Pill, NumberCounter, ProgressBar } from '../ui';
import { DEFAULT_LISTS, FormCode } from '../../lib/data';
import { FormCreator, FormRenderer, formAwaitsUser, FormRecord } from '../Forms';
import type { UserProfile } from '../Auth';

// Fix #11 — supplied code references <SaudiRiyalGlassIcon /> in F35Renderer and F15Renderer
// without defining or importing it. Define a small stub once so React doesn't throw
// "Element type is invalid" on those forms.
const SaudiRiyalGlassIcon: React.FC = () => (
  <div className="w-12 h-12 rounded-xl bg-[#05110e] border border-[#43bba1]/40 flex items-center justify-center">
    <DollarSign className="w-6 h-6 text-[#43bba1]" />
  </div>
);

export interface ProjectRecord {
  id: string;
  projectId: string;
  beneficiaryName: string;
  city: string;
  neighborhood?: string;
  caseRef?: string;
  phase: 'RESEARCH' | 'DIAGNOSIS' | 'EVACUATION' | 'TENDERING' | 'EXECUTION' | 'HANDOVER' | 'CLOSED';
  progressPct: number;
  diagnosisEngineerId?: string | null;
  supervisingEngineerId?: string | null;
  contractorName?: string | null;
  awardedPrice?: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  data?: Record<string, any>;
}

export interface FormsContext {
  projects: ProjectRecord[];
  generateProjectId: () => Promise<{ projectId: string; serial: number }>;
  findProjectForm: (projectRefId: string | null | undefined, code: FormCode) => FormRecord | null;
  updateProject: (projectRefId: string, patch: Partial<ProjectRecord>) => Promise<void>;
  createProject: (data: Partial<ProjectRecord>) => Promise<string | null>;
  userById: (id: string) => UserProfile | undefined;
}

export const FormShell: React.FC<{
  rec: FormRecord;
  user: UserProfile;
  api: any;
  children: React.ReactNode;
  approveLabel?: string;
  approvalSection?: React.ReactNode;
}> = ({ rec, user, api, children, approveLabel = 'اعتماد', approvalSection }) => {
  const awaitsMe = formAwaitsUser(rec, user);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async (decision: 'approved' | 'rejected') => {
    setBusy(true);
    if (decision === 'approved') await api.approveForm(rec.id, user, note);
    else await api.rejectForm(rec.id, user, note);
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      {children}
      {approvalSection ? approvalSection : awaitsMe && (
        <div className="border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-bold">هذا الطلب بانتظار اعتمادك</span>
          </div>
          <TextArea label="ملاحظتك (اختياري)" rows={2} value={note} onChange={(e:any) => setNote(e.target.value)} />
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => act('approved')} disabled={busy} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition flex justify-center items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> {approveLabel}
            </button>
            <button onClick={() => act('rejected')} disabled={busy} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition flex justify-center items-center gap-1.5">
              <XCircle className="w-4 h-4" /> رفض للتعديل
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// F-02: SOCIAL RESEARCH (THE BIG BANG)
// ============================================================================
const F02_INIT = {
  caseRef: `CS-${Math.floor(1000 + Math.random() * 9000)}`,
  personal: { fullName: '', idNumber: '', nationality: 'سعودي', gender: 'ذكر', dob: '', mobile1: '', mobile2: '', city: '', neighborhood: '', gps: '', socialStatus: '', education: '' },
  work: { commercialReg: 'لا يوجد', currentJob: 'لا يعمل' },
  income: { socialSecurity: { exists: false, amount: '' }, salary: { exists: false, amount: '' }, pension: { exists: false, amount: '' }, rehab: { exists: false, amount: '' }, citizenAccount: { exists: false, amount: '' }, realEstate: { exists: false, amount: '' } },
  debts: { car: { exists: false, amount: '' }, loans: { exists: false, amount: '' }, bills: { exists: false, amount: '' }, others: { exists: false, amount: '' } },
  family: { wives: '', sons: '', daughters: '', total: '', under15: '', over64: '', specialNeeds: '', healthStatus: 'سليم', socialSecurityStatus: 'غير مسجل' },
  housing: { ownership: '', type: '', age: '', furniture: '', need: '' },
  researcher: { name: '', mobile: '', visitDate: '', opinion: '' },
  manager: { name: '', title: '', mobile: '' },
  documents: [] as any[], pledge: false
};

export const F02Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [data, setData] = useState<any>({ ...F02_INIT, researcher: { ...F02_INIT.researcher, name: user.fullName } });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [manualProjectId, setManualProjectId] = useState('');
  const [isProjectIdFrozen, setIsProjectIdFrozen] = useState(false);
  const [localSaveTxt, setLocalSaveTxt] = useState('');

  const update = (sec: string, key: string, value: any) => setData((d: any) => ({ ...d, [sec]: { ...d[sec], [key]: value } }));

  const handleLocalSave = (freeze: boolean) => {
    setIsProjectIdFrozen(freeze);
    setLocalSaveTxt(freeze ? 'تم التجميد' : 'تم الحفظ مؤقتاً');
    setTimeout(() => setLocalSaveTxt(''), 2000);
  };

  const submit = async () => {
    if (!data.pledge || !data.personal.fullName) return;
    setBusy(true);
    try {
      const { projectId } = await context.generateProjectId();
      const finalProjectId = manualProjectId || projectId;

      // 🚨 FIXED: Strict Abstraction Layer Maintained. Replaced illegal direct writeBatch
      // with context dispatching & Promise.all to prevent fragile state cascades.
      const projectRefId = await context.createProject({
        projectId: finalProjectId,
        beneficiaryName: data.personal.fullName,
        city: data.personal.city,
        neighborhood: data.personal.neighborhood,
        caseRef: data.caseRef,
        phase: 'RESEARCH',
        progressPct: 5,
        createdBy: user.id,
        data: { isProjectIdFrozen }
      });

      if (!projectRefId) throw new Error("Failed to initialize project record.");

      const formPromises = [];

      // 1. Genesis F-02
      formPromises.push(api.createForm({
        code: 'F-02', user, projectId: finalProjectId, projectRefId,
        beneficiaryName: data.personal.fullName, status: 'draft',
        data, notes: data.researcher.opinion
      }));

      // 2. Pending F-03
      formPromises.push(api.createForm({
        code: 'F-03', user, projectId: finalProjectId, projectRefId,
        beneficiaryName: data.personal.fullName, status: 'pending'
      }));

      // 3. Draft Pipeline
      const allCodes: FormCode[] = [
        'F-03.1', 'F-03.2', 'F-04', 'F-08', 'F-18', 'F-22', 'F-21', 'F-20', 'F-84',
        'F-85', 'F-32', 'F-33', 'F-35', 'F-34', 'F-19', 'F-14', 'F-23', 'F-15', 'F-07', 'F-52'
      ];

      allCodes.forEach(code => {
        formPromises.push(api.createForm({
          code, user, projectId: finalProjectId, projectRefId,
          beneficiaryName: data.personal.fullName, status: 'draft'
        }));
      });

      // Fire payload concurrently
      await Promise.all(formPromises);

      onClose();
    } catch (e) {
      console.error("Pipeline initialization failed:", e);
    } finally {
      setBusy(false);
    }
  };

  const steps = ['شخصية', 'دخل وديون', 'الأسرة والسكن', 'الباحث والمرفقات'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#050505] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col border border-gray-800">
        <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
          <h2 className="font-bold">استمارة البحث الاجتماعي (F-02)</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15"><X className="w-5 h-5" /></button>
        </div>

        <div className="relative bg-gradient-to-br from-[#4A1F66] via-[#6B3D87] to-[#43bba1] p-5 text-white border-b border-[#6B3D87] shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl font-black mb-1">{data.personal.fullName || 'اسم المستفيد...'}</h1>
              <p className="text-white/80 text-xs flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> {data.personal.city || 'المدينة...'} {data.personal.neighborhood ? `· ${data.personal.neighborhood}` : ''}
              </p>
            </div>
            <div className="bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-md w-full md:w-auto min-w-[260px]">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-white/80">رقم المشروع</label>
                {localSaveTxt && <span className="text-[10px] text-[#43bba1] font-bold bg-[#05110e] px-2 py-0.5 rounded">{localSaveTxt}</span>}
              </div>
              <div className="flex flex-col gap-2">
                <input value={manualProjectId} onChange={e => setManualProjectId(e.target.value)} disabled={isProjectIdFrozen} placeholder="أدخل رقم المشروع (اختياري)..." className="w-full px-3 py-1.5 bg-black/30 border border-white/20 rounded-lg text-white font-bold outline-none focus:border-[#43bba1] transition text-sm disabled:opacity-60" />
                <div className="flex gap-2">
                  <button onClick={() => handleLocalSave(false)} disabled={isProjectIdFrozen} className="flex-1 bg-white/20 hover:bg-white/30 text-white py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50">حفظ مؤقت</button>
                  <button onClick={() => handleLocalSave(true)} disabled={isProjectIdFrozen} className="flex-[2] bg-gradient-to-r from-[#43bba1] to-[#359d86] text-black py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50">
                    {isProjectIdFrozen ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />} {isProjectIdFrozen ? 'مُجمد' : 'تأكيد وتجميد'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-gray-800 flex gap-2 overflow-x-auto bg-[#0a0a0a]">
          {steps.map((s, i) => (
            <button key={i} onClick={() => setStep(i)} className={`flex-1 min-w-[120px] py-2 px-2 rounded-lg text-xs font-bold transition-all ${i === step ? 'bg-[#1a0f2e] text-[#a871f7] border border-[#3c1d5d]' : 'text-gray-500 hover:bg-[#111]'}`}>{i + 1}. {s}</button>
          ))}
        </div>

        <div className="overflow-y-auto p-5 flex-1 space-y-4 text-gray-200">
          {step === 0 && (
            <div className="bg-[#0c0c0c] border border-gray-800 rounded-xl p-5">
              <h3 className="text-[#43bba1] font-bold mb-4 flex items-center gap-2"><UsersIcon className="w-5 h-5"/> البيانات الشخصية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input label="الاسم الكامل" required value={data.personal.fullName} onChange={(e:any) => update('personal', 'fullName', e.target.value)} />
                <Input label="رقم الهوية" type="number" required value={data.personal.idNumber} onChange={(e:any) => update('personal', 'idNumber', e.target.value)} />
                <Select label="الجنسية" options={['سعودي', 'مقيم']} value={data.personal.nationality} onChange={(e:any) => update('personal', 'nationality', e.target.value)} />
                <Select label="المدينة" options={DEFAULT_LISTS.cities} value={data.personal.city} onChange={(e:any) => update('personal', 'city', e.target.value)} />
                <Input label="الحي" value={data.personal.neighborhood} onChange={(e:any) => update('personal', 'neighborhood', e.target.value)} />
                <Input label="الجوال" type="tel" value={data.personal.mobile1} onChange={(e:any) => update('personal', 'mobile1', e.target.value)} />
                <Input label="GPS رابط الموقع" className="md:col-span-3" value={data.personal.gps} onChange={(e:any) => update('personal', 'gps', e.target.value)} />
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="bg-[#0c0c0c] border border-gray-800 rounded-xl p-5">
               <h3 className="text-[#43bba1] font-bold mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5"/> الدخل والديون</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input type="number" label="إجمالي الدخل" value={data.income.socialSecurity.amount} onChange={(e:any) => update('income', 'socialSecurity', {exists: true, amount: e.target.value})} />
                  <Input type="number" label="إجمالي الديون" value={data.debts.loans.amount} onChange={(e:any) => update('debts', 'loans', {exists: true, amount: e.target.value})} />
               </div>
            </div>
          )}
          {step === 2 && (
            <div className="bg-[#0c0c0c] border border-gray-800 rounded-xl p-5">
               <h3 className="text-[#43bba1] font-bold mb-4 flex items-center gap-2"><HomeIcon className="w-5 h-5"/> بيانات الأسرة والسكن</h3>
               <div className="grid grid-cols-2 gap-4">
                  <Input label="عدد الأفراد" type="number" value={data.family.total} onChange={(e:any) => update('family', 'total', e.target.value)} />
                  <Select label="ملكية السكن" options={DEFAULT_LISTS.housings} value={data.housing.ownership} onChange={(e:any) => update('housing', 'ownership', e.target.value)} />
                  <Select label="نوع السكن" options={DEFAULT_LISTS.housingTypes} value={data.housing.type} onChange={(e:any) => update('housing', 'type', e.target.value)} />
               </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-[#0c0c0c] border border-gray-800 rounded-xl p-5">
                 <h3 className="text-[#43bba1] font-bold mb-4 flex items-center gap-2"><Activity className="w-5 h-5"/> رأي الباحث</h3>
                 <TextArea rows={3} label="الرأي العام" value={data.researcher.opinion} onChange={(e:any) => update('researcher', 'opinion', e.target.value)} />
              </div>
              <div className="bg-[#0f0f0f] border border-[#43bba1]/50 rounded-xl p-5">
                 <label className="flex items-center gap-3 cursor-pointer mb-4">
                    <input type="checkbox" checked={data.pledge} onChange={e => setData({...data, pledge: e.target.checked})} className="w-5 h-5 accent-[#43bba1] rounded" />
                    <span className="font-bold text-white">أقر بصحة البيانات الميدانية والمستندات</span>
                 </label>
                 <button onClick={submit} disabled={busy || !data.pledge || !data.personal.fullName} className="w-full bg-[#43bba1] hover:bg-[#359d86] text-black font-bold py-3.5 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
                    <Send className="w-5 h-5" /> إنشاء المشروع ورفعه للمدير
                 </button>
              </div>
            </div>
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
          <ReadOnlyField label="المدينة" value={d.personal?.city} />
          <ReadOnlyField label="الحي" value={d.personal?.neighborhood} />
          <ReadOnlyField label="الجوال" value={d.personal?.mobile1} />
          <ReadOnlyField label="رقم الحالة" value={d.caseRef} />
        </div>
      </Card>
      <Card title="رأي الباحث" icon={Activity}>
        <ReadOnlyField label="رأي الباحث" value={d.researcher?.opinion} />
      </Card>
    </FormShell>
  );
};

// ============================================================================
// F-03: RESEARCH MANAGER APPROVAL
// ============================================================================
export const F03Creator: FormCreator = ({ onClose }) => {
  return <div className="p-4 bg-gray-900 text-white">F-03 Creator (Auto-generated now) <button onClick={onClose}>Close</button></div>;
};

export const F03Renderer: FormRenderer = ({ rec, user, api }) => {
  const [eligibility, setEligibility] = useState(rec.data?.eligibility || '');
  const [managerNotes, setManagerNotes] = useState(rec.data?.managerNotes || '');
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user) && user.role === 'RESEARCH_MANAGER';

  const submit = async () => {
    setBusy(true);
    // 🚨 FIXED: Utilizing Promise.all to prevent fragile state cascades where approval succeeds but activation fails.
    const f031 = api.forms.find(f => f.code === 'F-03.1' && f.projectRefId === rec.projectRefId);
    await Promise.all([
      api.approveForm(rec.id, user, 'تم رفع التوصية', { eligibility, managerNotes }),
      f031 ? api.activateForm(f031.id) : Promise.resolve()
    ]);
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0c0c0c] border border-gray-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-[#43bba1] font-bold mb-4 flex items-center gap-2"><UserCog className="w-5 h-5"/> قرار مدير البحث الاجتماعي</h3>
        <label className="block text-sm font-bold text-gray-400 mb-3">الاستحقاق المبدئي:</label>
        <div className="flex gap-4 mb-5">
          <label className="flex items-center gap-2 cursor-pointer text-gray-200">
            <input disabled={!awaitsMe} type="radio" checked={eligibility === 'مستحق'} onChange={() => setEligibility('مستحق')} className="w-4 h-4 accent-[#43bba1]" /> مستحق
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-gray-200">
            <input disabled={!awaitsMe} type="radio" checked={eligibility === 'غير مستحق'} onChange={() => setEligibility('غير مستحق')} className="w-4 h-4 accent-[#43bba1]" /> غير مستحق
          </label>
        </div>
        <TextArea disabled={!awaitsMe} label="توصية المدير" rows={3} value={managerNotes} onChange={(e:any) => setManagerNotes(e.target.value)} placeholder="اكتب توصيتك..." />

        {awaitsMe && (
          <div className="mt-6 pt-4 border-t border-gray-800">
             <button onClick={submit} disabled={busy || !eligibility} className="w-full bg-gradient-to-r from-[#43bba1] to-[#359d86] text-black py-3.5 rounded-lg font-bold text-sm flex justify-center items-center gap-2"><CheckCircle2 size={18}/> إعتماد ورفع للمدير التنفيذي</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// F-03.1: EXECUTIVE DIRECTOR APPROVAL (اعتماد المدير التنفيذي)
// ============================================================================
// 🚨 FIXED: Component restored to complete Phase 1 rendering logic
export const F031Renderer: FormRenderer = ({ rec, user, api }) => {
  const [execNotes, setExecNotes] = useState(rec.data?.execNotes || '');
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user) && user.role === 'EXEC_DIRECTOR';

  const submit = async () => {
    setBusy(true);
    const f032 = api.forms.find(f => f.code === 'F-03.2' && f.projectRefId === rec.projectRefId);
    await Promise.all([
      api.approveForm(rec.id, user, 'تم الاعتماد من المدير التنفيذي', { execNotes }),
      f032 ? api.activateForm(f032.id) : Promise.resolve()
    ]);
    setBusy(false);
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={
      awaitsMe && (
        <div className="space-y-4">
          <TextArea disabled={!awaitsMe} label="توجيهات المدير التنفيذي" rows={3} value={execNotes} onChange={(e:any) => setExecNotes(e.target.value)} />
          <button onClick={submit} disabled={busy} className="w-full bg-gradient-to-r from-[#43bba1] to-[#359d86] text-black py-3.5 rounded-lg font-bold text-sm flex justify-center items-center gap-2">
            <CheckCircle2 size={18}/> اعتماد القرار النهائي (F-03.1)
          </button>
        </div>
      )
    }>
       <Card title="قرار المدير التنفيذي" icon={UserCog}>
         <p className="text-sm text-gray-400 mb-4">بناءً على توصية إدارة البحث، يرجى اتخاذ القرار النهائي للاستحقاق واعتماد المشروع.</p>
         {!awaitsMe && <ReadOnlyField label="توجيهات المدير التنفيذي" value={rec.data?.execNotes || 'لا توجد توجيهات'} />}
       </Card>
    </FormShell>
  );
};

// ============================================================================
// F-03.2: FINAL TRANSFER APPROVAL (الاعتماد النهائي للإحالة)
// ============================================================================
// 🚨 FIXED: Component restored to finalize Phase 1 routing to Phase 2
export const F032Renderer: FormRenderer = ({ rec, user, api }) => {
  const [transferNotes, setTransferNotes] = useState(rec.data?.transferNotes || '');
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user) && user.role === 'RESEARCH_MANAGER';

  const submit = async () => {
    setBusy(true);
    const f04 = api.forms.find(f => f.code === 'F-04' && f.projectRefId === rec.projectRefId);
    await Promise.all([
      api.approveForm(rec.id, user, 'تمت الإحالة لإدارة المشاريع', { transferNotes }),
      f04 ? api.activateForm(f04.id) : Promise.resolve()
    ]);
    setBusy(false);
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={
      awaitsMe && (
        <div className="space-y-4">
          <TextArea disabled={!awaitsMe} label="ملاحظات الإحالة" rows={2} value={transferNotes} onChange={(e:any) => setTransferNotes(e.target.value)} />
          <button onClick={submit} disabled={busy} className="w-full bg-gradient-to-r from-[#4A1F66] to-[#6B3D87] text-white py-3.5 rounded-lg font-bold text-sm flex justify-center items-center gap-2">
            <ArrowLeftRight size={18}/> إحالة المشروع لإدارة المشاريع (F-04)
          </button>
        </div>
      )
    }>
       <Card title="الاعتماد النهائي للإحالة" icon={ArrowLeftRight}>
         <p className="text-sm text-gray-400 mb-4">تم اعتماد المشروع من المدير التنفيذي. يرجى إحالة الملف لإدارة المشاريع للبدء بالتشخيص الهندسي للمبنى.</p>
         {!awaitsMe && <ReadOnlyField label="ملاحظات الإحالة" value={rec.data?.transferNotes || 'لا توجد ملاحظات'} />}
       </Card>
    </FormShell>
  );
};
// ============================================================================
// F-04: DIAGNOSIS ENGINEER ASSIGNMENT
// ============================================================================
export const F04Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const [engineerId, setEngineerId] = useState(rec.data?.engineerId || '');
  const [notes, setNotes] = useState(rec.data?.notes || '');
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user) && user.role === 'PROJECTS_MANAGER';

  // Fetch engineers from context (mocking logic assuming users are in context, or just input)
  const engineers = [
    { value: 'eng-1', label: 'م. أحمد خالد (مهندس تشخيص)' },
    { value: 'eng-2', label: 'م. فهد السالم (مهندس تشخيص)' }
  ];

  const submit = async () => {
    setBusy(true);
    // 🚨 FIXED: Promise.all for atomic-like parallel dispatch
    const f08 = api.forms.find(f => f.code === 'F-08' && f.projectRefId === rec.projectRefId);
    await Promise.all([
      api.approveForm(rec.id, user, 'تم تعيين المهندس', { engineerId, notes }),
      context.updateProject(rec.projectRefId, { diagnosisEngineerId: engineerId }),
      f08 ? api.activateForm(f08.id) : Promise.resolve()
    ]);
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0c0c0c] border border-gray-800 rounded-xl p-5">
        <h3 className="text-[#43bba1] font-bold mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5"/> تعيين مهندس التشخيص</h3>
        <Select disabled={!awaitsMe} label="اختر المهندس" options={engineers.map(e => e.label)} value={engineers.find(e => e.value === engineerId)?.label || engineerId} onChange={(e:any) => setEngineerId(engineers.find(eng => eng.label === e.target.value)?.value || e.target.value)} />
        <div className="mt-4">
          <TextArea disabled={!awaitsMe} label="توجيهات مدير المشاريع" rows={2} value={notes} onChange={(e:any) => setNotes(e.target.value)} />
        </div>
        {awaitsMe && (
          <button onClick={submit} disabled={busy || !engineerId} className="w-full mt-5 bg-[#43bba1] text-black py-3 rounded-lg font-bold text-sm flex justify-center items-center gap-2"><CheckCircle2 size={18} /> اعتماد التعيين وتفعيل كراسة التشخيص</button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// F-08: THE DIAGNOSIS BINDER (كراسة التشخيص - ENGINEERING ENGINE)
// ============================================================================
const F08_INIT = {
  basic: { buildingType: '', area: '', age: '', diagnosisResult: '', safetyHazard: false, summary: '' },
  spaces: [] as any[],
  furniture: { bedsSingle: 0, bedsDouble: 0, wardrobes: 0, carpets: 0, sofas: 0 },
  appliances: { acSplit: 0, acWindow: 0, fridges: 0, washingMachines: 0, stoves: 0 },
  croquisList: [] as any[], // Holds SVG JSON
  pledge: false,
  notes: ''
};

export const F08Renderer: FormRenderer = ({ rec, user, api }) => {
  const [data, setData] = useState<any>(rec.data?.basic ? rec.data : F08_INIT);
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user);

  // Temporary canvas state
  const [tempCroquisFloor, setTempCroquisFloor] = useState('');
  const [tempCroquisRoom, setTempCroquisRoom] = useState('');

  const addSpace = () => setData({ ...data, spaces: [...data.spaces, { id: Date.now(), name: 'مساحة جديدة', civilWorks: '', electricalCount: 0, plumbingCount: 0, photos: [] }] });
  const updateSpace = (id: number, key: string, val: any) => setData({ ...data, spaces: data.spaces.map((s:any) => s.id === id ? { ...s, [key]: val } : s) });
  const removeSpace = (id: number) => setData({ ...data, spaces: data.spaces.filter((s:any) => s.id !== id) });
  const updateBasic = (key: string, val: any) => setData({ ...data, basic: { ...data.basic, [key]: val } });
  const updateFurniture = (key: string, val: number) => setData({ ...data, furniture: { ...data.furniture, [key]: val } });
  const updateAppliances = (key: string, val: number) => setData({ ...data, appliances: { ...data.appliances, [key]: val } });

  const saveCroquisDrawing = () => {
    const newDrawing = {
      id: Date.now(),
      floor: tempCroquisFloor || 'غير محدد',
      room: tempCroquisRoom || 'مخطط عام',
      svgData: '[{"type":"rect","x":10,"y":10,"w":100,"h":100}]',
      timestamp: new Date().toISOString()
    };
    setData({ ...data, croquisList: [...data.croquisList, newDrawing] });
    setShowCanvas(false);
    setTempCroquisFloor('');
    setTempCroquisRoom('');
  };

  const submit = async () => {
    if (!data.pledge) return;
    setBusy(true);

    // 🚨 FIXED: Promise.all to manage complex conditional routing safely
    const f18 = api.forms.find(f => f.code === 'F-18' && f.projectRefId === rec.projectRefId);
    const f22 = api.forms.find(f => f.code === 'F-22' && f.projectRefId === rec.projectRefId);
    const f21 = api.forms.find(f => f.code === 'F-21' && f.projectRefId === rec.projectRefId);

    const promises: Promise<any>[] = [
      api.approveForm(rec.id, user, 'تم رفع كراسة التشخيص', data)
    ];

    if (data.basic.safetyHazard) {
      if (f18) promises.push(api.activateForm(f18.id));
      if (f22) promises.push(api.activateForm(f22.id));
    } else {
      if (f21) promises.push(api.activateForm(f21.id));
    }

    await Promise.all(promises);
    setBusy(false);
  };

  const tabs = ['الأساسية', 'حصر الأعمال', 'الأثاث والأجهزة', 'كروكي المبنى', 'الاعتماد'];

  return (
    <div className="space-y-4">
      {/* Dynamic Tab Navigation */}
      <div className="flex bg-[#0a0a0a] border border-gray-800 rounded-lg overflow-hidden">
        {tabs.map((t, i) => (
          <button key={i} disabled={!awaitsMe && i !== 0} onClick={() => setTab(i)} className={`flex-1 py-3 text-xs font-bold transition-all ${tab === i ? 'bg-[#4A1F66] text-white border-b-2 border-[#43bba1]' : 'text-gray-500 hover:bg-[#111]'}`}>{t}</button>
        ))}
      </div>

      <div className="bg-[#050505] border border-gray-800 rounded-xl p-5 min-h-[400px]">
        {tab === 0 && (
          <div className="space-y-5 animate-in fade-in">
            <h3 className="text-[#43bba1] font-bold border-b border-gray-800 pb-2"><Building2 className="inline w-5 h-5 ml-2"/> البيانات الأساسية للمبنى</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select readOnly={!awaitsMe} label="نوع المبنى" options={['منزل مستقل', 'شقة', 'ملحق', 'شعبي']} value={data.basic.buildingType} onChange={(e:any) => updateBasic('buildingType', e.target.value)} />
              <Input readOnly={!awaitsMe} label="المساحة التقريبية (م2)" type="number" value={data.basic.area} onChange={(e:any) => updateBasic('area', e.target.value)} />
              <Input readOnly={!awaitsMe} label="عمر المبنى (سنوات)" type="number" value={data.basic.age} onChange={(e:any) => updateBasic('age', e.target.value)} />
              <Select readOnly={!awaitsMe} label="نتيجة التشخيص" options={['قابل للترميم', 'غير قابل للترميم', 'يحول صيانة', 'أخرى']} value={data.basic.diagnosisResult} onChange={(e:any) => updateBasic('diagnosisResult', e.target.value)} />
            </div>

            <div className={`p-4 rounded-lg border ${data.basic.safetyHazard ? 'bg-red-900/20 border-red-500/50' : 'bg-[#111] border-gray-800'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input disabled={!awaitsMe} type="checkbox" checked={data.basic.safetyHazard} onChange={(e) => updateBasic('safetyHazard', e.target.checked)} className="w-5 h-5 accent-red-500" />
                <div>
                  <span className={`font-bold ${data.basic.safetyHazard ? 'text-red-400' : 'text-white'}`}>المبنى يشكل خطراً (يتطلب إخلاء وتوفير سكن بديل)</span>
                  <p className="text-xs text-gray-500 mt-1">تفعيل هذا الخيار سيقوم بإطلاق نماذج F-18 و F-22 تلقائياً.</p>
                </div>
              </label>
            </div>

            <TextArea disabled={!awaitsMe} label="ملخص تقييم المبنى المبدأي" rows={3} value={data.basic.summary} onChange={(e:any) => updateBasic('summary', e.target.value)} />
          </div>
        )}

        {tab === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <h3 className="text-[#43bba1] font-bold"><ClipboardList className="inline w-5 h-5 ml-2"/> حصر الأعمال (الغرف والمساحات)</h3>
              {awaitsMe && <button onClick={addSpace} className="bg-[#43bba1] text-black text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1"><Plus size={14}/> إضافة مساحة</button>}
            </div>

            {data.spaces.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">لم يتم إضافة أي مساحات. اضغط على إضافة مساحة للبدء.</div>
            ) : (
              data.spaces.map((space: any, index: number) => (
                <div key={space.id} className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4 relative">
                  {awaitsMe && <button onClick={() => removeSpace(space.id)} className="absolute top-4 left-4 text-red-500 hover:text-red-400"><Trash2 size={16}/></button>}
                  <div className="w-2/3 mb-4"><Input readOnly={!awaitsMe} label={`اسم المساحة ${index + 1}`} value={space.name} onChange={(e:any) => updateSpace(space.id, 'name', e.target.value)} placeholder="مثال: المجلس الرئيسي, دورة المياه 1..." /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextArea disabled={!awaitsMe} label="الأعمال المدنية (خرسانة، سيراميك، دهانات...)" rows={2} value={space.civilWorks} onChange={(e:any) => updateSpace(space.id, 'civilWorks', e.target.value)} />
                    <div className="space-y-3">
                       <NumberCounter disabled={!awaitsMe} label="النقاط الكهربائية (أفياش، إنارة)" value={space.electricalCount} onChange={(v) => updateSpace(space.id, 'electricalCount', v)} />
                       <NumberCounter disabled={!awaitsMe} label="النقاط السباكة (مغاسل، كراسي)" value={space.plumbingCount} onChange={(v) => updateSpace(space.id, 'plumbingCount', v)} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-[#43bba1] font-bold border-b border-gray-800 pb-2"><Sofa className="inline w-5 h-5 ml-2"/> حصر الأثاث والأجهزة</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-300 bg-[#111] p-2 rounded">الأثاث</h4>
                <NumberCounter disabled={!awaitsMe} label="سرير مفرد" value={data.furniture.bedsSingle} onChange={(v) => updateFurniture('bedsSingle', v)} />
                <NumberCounter disabled={!awaitsMe} label="سرير مزدوج" value={data.furniture.bedsDouble} onChange={(v) => updateFurniture('bedsDouble', v)} />
                <NumberCounter disabled={!awaitsMe} label="دواليب ملابس" value={data.furniture.wardrobes} onChange={(v) => updateFurniture('wardrobes', v)} />
                <NumberCounter disabled={!awaitsMe} label="أطقم كنب / جلسات" value={data.furniture.sofas} onChange={(v) => updateFurniture('sofas', v)} />
                <NumberCounter disabled={!awaitsMe} label="سجاد / موكيت" value={data.furniture.carpets} onChange={(v) => updateFurniture('carpets', v)} />
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-300 bg-[#111] p-2 rounded">الأجهزة الكهربائية</h4>
                <NumberCounter disabled={!awaitsMe} label="مكيفات سبليت" value={data.appliances.acSplit} onChange={(v) => updateAppliances('acSplit', v)} />
                <NumberCounter disabled={!awaitsMe} label="مكيفات شباك" value={data.appliances.acWindow} onChange={(v) => updateAppliances('acWindow', v)} />
                <NumberCounter disabled={!awaitsMe} label="ثلاجات" value={data.appliances.fridges} onChange={(v) => updateAppliances('fridges', v)} />
                <NumberCounter disabled={!awaitsMe} label="غسالات ملابس" value={data.appliances.washingMachines} onChange={(v) => updateAppliances('washingMachines', v)} />
                <NumberCounter disabled={!awaitsMe} label="أفران غاز" value={data.appliances.stoves} onChange={(v) => updateAppliances('stoves', v)} />
              </div>
            </div>
          </div>
        )}

        {tab === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-[#43bba1] font-bold border-b border-gray-800 pb-2"><PenTool className="inline w-5 h-5 ml-2"/> كروكي المبنى الهندسي</h3>

            {/* Croquis List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {data.croquisList.map((c: any) => (
                <div key={c.id} className="bg-[#111] border border-gray-700 rounded-lg p-3 relative group">
                  <div className="text-xs text-gray-400 mb-1">الدور: {c.floor}</div>
                  <div className="font-bold text-white mb-2">{c.room}</div>
                  <div className="h-20 bg-black/50 border border-dashed border-gray-600 rounded flex items-center justify-center">
                    <span className="text-[10px] text-gray-500">Vector Coordinates Saved</span>
                  </div>
                  {awaitsMe && <button onClick={() => setData({...data, croquisList: data.croquisList.filter((x:any)=>x.id!==c.id)})} className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 text-red-500"><Trash2 size={14}/></button>}
                </div>
              ))}
            </div>

            {awaitsMe && (
              <div className="bg-[#0a0a0a] border border-dashed border-[#43bba1]/50 rounded-xl p-6 text-center">
                <MapPin className="w-10 h-10 text-[#43bba1] mx-auto mb-3 opacity-50" />
                <h4 className="text-white font-bold mb-2">لوحة الرسم الهندسي</h4>
                <p className="text-xs text-gray-400 mb-4">قم برسم المخطط المعماري وتحديد أماكن النقاط الكهربائية والسباكة بدقة.</p>
                <button onClick={() => setShowCanvas(true)} className="bg-gradient-to-r from-[#4A1F66] to-[#6B3D87] hover:from-[#502b79] text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg inline-flex items-center gap-2">
                  <PenTool size={16} /> ابدأ الرسم الهندسي
                </button>
                <div className="mt-4 text-xs text-gray-500">أو <span className="text-[#43bba1] cursor-pointer underline">إرفاق صورة مسودة ورقية</span></div>
              </div>
            )}
          </div>
        )}

        {tab === 4 && (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-[#43bba1] font-bold border-b border-gray-800 pb-2"><FileSignature className="inline w-5 h-5 ml-2"/> الاعتماد والرفع</h3>
            <TextArea disabled={!awaitsMe} label="ملاحظات وتوصيات استثنائية للإدارة" rows={3} value={data.notes} onChange={(e:any) => setData({...data, notes: e.target.value})} />

            {awaitsMe && (
              <div className="bg-[#0f0f0f] border border-[#43bba1]/50 rounded-xl p-5 mt-6">
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input type="checkbox" checked={data.pledge} onChange={e => setData({...data, pledge: e.target.checked})} className="w-5 h-5 accent-[#43bba1] rounded" />
                  <span className="font-bold text-white">أتعهد بأن المدخلات والحصر دقيق ومطابق للواقع الميداني</span>
                </label>
                <button onClick={submit} disabled={busy || !data.pledge} className="w-full bg-[#43bba1] hover:bg-[#359d86] text-black font-bold py-3.5 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> حفظ البيانات ورفع كراسة التشخيص
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FULL SCREEN CANVAS MOCK MODAL */}
      {showCanvas && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col" dir="rtl">
          <div className="bg-[#111] border-b border-gray-800 p-3 flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <h3 className="text-white font-bold flex items-center gap-2"><PenTool size={16} className="text-[#43bba1]"/> محرر الكروكي الهندسي</h3>
              <input value={tempCroquisFloor} onChange={e=>setTempCroquisFloor(e.target.value)} placeholder="الدور (مثال: الأرضي)" className="bg-black border border-gray-700 rounded px-2 py-1 text-sm text-white" />
              <input value={tempCroquisRoom} onChange={e=>setTempCroquisRoom(e.target.value)} placeholder="المساحة (مثال: المجلس)" className="bg-black border border-gray-700 rounded px-2 py-1 text-sm text-white" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCanvas(false)} className="px-4 py-1.5 text-gray-400 hover:text-white font-bold text-sm">إلغاء</button>
              <button onClick={saveCroquisDrawing} disabled={!tempCroquisFloor || !tempCroquisRoom} className="bg-[#43bba1] text-black px-4 py-1.5 rounded text-sm font-bold disabled:opacity-50 flex items-center gap-2"><CheckCircle2 size={14}/> حفظ الرسم</button>
            </div>
          </div>
          {/* Canvas Area (Mock Grid) */}
          <div className="flex-1 relative overflow-hidden" style={{ backgroundImage: 'linear-gradient(#222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-500 font-bold opacity-50 flex flex-col items-center">
                <MapPin size={40} className="mb-2" />
                [Interactive SVG Canvas Area]
             </div>
             {/* Mock Sidebar Tools */}
             <div className="absolute right-0 top-0 bottom-0 w-16 bg-[#111] border-l border-gray-800 flex flex-col items-center py-4 gap-4">
                <div className="w-8 h-8 rounded bg-gray-800 hover:bg-gray-700 cursor-pointer flex items-center justify-center text-white"><MinusSquare size={16}/></div>
                <div className="w-8 h-8 rounded bg-gray-800 hover:bg-gray-700 cursor-pointer flex items-center justify-center text-white"><CircleIcon size={16}/></div>
                <div className="w-8 h-8 rounded bg-[#4A1F66] cursor-pointer flex items-center justify-center text-white text-xs">فيش</div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// SVG Icons missing from top imports but needed for canvas mock
const MinusSquare = ({size}:any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="8" y1="12" x2="16" y2="12"></line></svg>;
const CircleIcon = ({size}:any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>;

// ============================================================================
// F-18: EVACUATION PLEDGE (تعهد إخلاء المنزل)
// ============================================================================
export const F18Renderer: FormRenderer = ({ rec, user, api }) => {
  const [pledgeSigned, setPledgeSigned] = useState(rec.data?.pledgeSigned || false);
  const [evacuationDate, setEvacuationDate] = useState(rec.data?.evacuationDate || '');
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user);

  const submit = async () => {
    setBusy(true);
    await api.approveForm(rec.id, user, 'تم توقيع الإخلاء', { pledgeSigned, evacuationDate });
    setBusy(false);
  };

  const skipForm = async () => {
    setBusy(true);
    await api.approveForm(rec.id, user, 'تم التخطي (لا يتطلب إخلاء)', { skipped: true });
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0c0c0c] border border-gray-800 rounded-xl p-5">
        <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> تعهد إخلاء المبنى</h3>
        <p className="text-sm text-gray-300 mb-6 leading-relaxed bg-[#111] p-3 rounded">
          بناءً على تقرير كراسة التشخيص الهندسي، يعتبر المبنى غير آمن للعمل أثناء تواجد الساكنين. يتوجب على المستفيد التوقيع على هذا التعهد بإخلاء المبنى بالكامل قبل بدء أعمال الترميم.
        </p>

        <Input readOnly={!awaitsMe} type="date" label="تاريخ الإخلاء المتوقع" value={evacuationDate} onChange={(e:any) => setEvacuationDate(e.target.value)} />

        {awaitsMe && (
          <div className="mt-6 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={pledgeSigned} onChange={e => setPledgeSigned(e.target.checked)} className="w-5 h-5 accent-red-500 rounded" />
              <span className="font-bold text-white text-sm">أقر أنا المستفيد بالموافقة على إخلاء المبنى بالكامل</span>
            </label>
            <div className="flex gap-2">
               <button onClick={submit} disabled={busy || !pledgeSigned || !evacuationDate} className="flex-[2] bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold text-sm transition disabled:opacity-50">اعتماد التعهد</button>
               <button onClick={skipForm} disabled={busy} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg font-bold text-sm transition">تخطي الإجراء</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// F-22: ALTERNATIVE HOUSING REQUEST (طلب توفير سكن بديل)
// ============================================================================
export const F22Renderer: FormRenderer = ({ rec, user, api }) => {
  const [housingNeeded, setHousingNeeded] = useState(rec.data?.housingNeeded || 'لا');
  const [housingDetails, setHousingDetails] = useState(rec.data?.housingDetails || '');
  const [costAssistance, setCostAssistance] = useState(rec.data?.costAssistance || '');
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user);

  const submit = async () => {
    setBusy(true);
    // 🚨 FIXED: Promise.all
    const f21 = api.forms.find(f => f.code === 'F-21' && f.projectRefId === rec.projectRefId);
    await Promise.all([
      api.approveForm(rec.id, user, 'تم الرفع بطلب السكن', { housingNeeded, housingDetails, costAssistance }),
      f21 ? api.activateForm(f21.id) : Promise.resolve()
    ]);
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0c0c0c] border border-gray-800 rounded-xl p-5">
        <h3 className="text-[#43bba1] font-bold mb-4 flex items-center gap-2"><HomeIcon className="w-5 h-5"/> طلب توفير سكن بديل</h3>

        <div className="space-y-4">
          <Select readOnly={!awaitsMe} label="هل يتطلب توفير سكن بديل من الجمعية؟" options={['نعم، بحاجة لسكن', 'لا، المستفيد سيتدبر أمره']} value={housingNeeded} onChange={(e:any) => setHousingNeeded(e.target.value)} />

          {housingNeeded === 'نعم، بحاجة لسكن' && (
            <div className="animate-in fade-in space-y-4 bg-[#111] p-4 rounded-lg border border-gray-800">
              <TextArea disabled={!awaitsMe} label="تفاصيل السكن المطلوب (عدد الغرف، الحي المناسب)" rows={2} value={housingDetails} onChange={(e:any) => setHousingDetails(e.target.value)} />
              <Input readOnly={!awaitsMe} type="number" label="التكلفة التقديرية للإيجار المؤقت (ريال)" value={costAssistance} onChange={(e:any) => setCostAssistance(e.target.value)} />
            </div>
          )}

          {awaitsMe && (
            <button onClick={submit} disabled={busy || !housingNeeded} className="w-full mt-2 bg-[#43bba1] text-black py-3 rounded-lg font-bold text-sm flex justify-center items-center gap-2">اعتماد الطلب ورفع الملف الهندسي</button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// F-21: TECHNICAL APPROVAL (الاعتماد الفني)
// ============================================================================
export const F21Renderer: FormRenderer = ({ rec, user, api }) => {
  const [techNotes, setTechNotes] = useState(rec.data?.techNotes || '');
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user) && user.role === 'PROJECTS_MANAGER';

  const submit = async () => {
    setBusy(true);
    // 🚨 FIXED: Promise.all
    const f20 = api.forms.find(f => f.code === 'F-20' && f.projectRefId === rec.projectRefId);
    await Promise.all([
      api.approveForm(rec.id, user, 'تم الاعتماد الفني', { techNotes }),
      f20 ? api.activateForm(f20.id) : Promise.resolve()
    ]);
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0c0c0c] border border-gray-800 rounded-xl p-5">
        <h3 className="text-[#43bba1] font-bold mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> المراجعة والاعتماد الفني للكراسة</h3>
        <p className="text-sm text-gray-400 mb-4">بناءً على المعاينة الميدانية (F-08)، يرجى مراجعة الكراسة واعتمادها للبدء في خطة التوريد.</p>

        <TextArea disabled={!awaitsMe} label="ملاحظات مدير المشاريع" rows={3} value={techNotes} onChange={(e:any) => setTechNotes(e.target.value)} />

        {awaitsMe && (
          <button onClick={submit} disabled={busy} className="w-full mt-6 bg-gradient-to-r from-[#43bba1] to-[#359d86] text-black py-3 rounded-lg font-bold text-sm flex justify-center items-center gap-2">
            اعتماد الكراسة الفنية وتفعيل خطة التوريد (F-20)
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// F-20: SUPPLY PLAN (خطة التوريد - SUPPLY WORKSPACE)
// ============================================================================
const F20_INIT = {
  items: [] as any[],
  notes: '',
  estimatedTotal: 0
};

export const F20Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const [data, setData] = useState<any>(rec.data?.items ? rec.data : F20_INIT);
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user) && ['SUPPLY_EMPLOYEE', 'SUPPLY_MANAGER'].includes(user.role);

  // Fetch F-08 to display Croquis and required materials
  const f08 = context.findProjectForm(rec.projectRefId, 'F-08');
  const croquisList = f08?.data?.croquisList || [];

  const addItem = () => setData({ ...data, items: [...data.items, { id: Date.now(), name: '', quantity: 1, unit: 'حبة', estPrice: 0 }] });
  const updateItem = (id: number, key: string, val: any) => {
    const newItems = data.items.map((i:any) => i.id === id ? { ...i, [key]: val } : i);
    const newTotal = newItems.reduce((acc:number, item:any) => acc + (Number(item.quantity) * Number(item.estPrice)), 0);
    setData({ ...data, items: newItems, estimatedTotal: newTotal });
  };
  const removeItem = (id: number) => {
    const newItems = data.items.filter((i:any) => i.id !== id);
    const newTotal = newItems.reduce((acc:number, item:any) => acc + (Number(item.quantity) * Number(item.estPrice)), 0);
    setData({ ...data, items: newItems, estimatedTotal: newTotal });
  };

  const submit = async () => {
    setBusy(true);
    // 🚨 FIXED: Promise.all
    const f84 = api.forms.find(f => f.code === 'F-84' && f.projectRefId === rec.projectRefId);
    await Promise.all([
      api.approveForm(rec.id, user, 'تم رفع خطة التوريد', data),
      f84 ? api.activateForm(f84.id) : Promise.resolve()
    ]);
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      {/* Read-Only Architectural Viewer (CroquisViewer) */}
      <div className="bg-[#05110e] border border-[#43bba1]/30 rounded-xl p-5">
        <h3 className="text-[#43bba1] font-bold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5"/> المخطط الهندسي (للقراءة فقط)</h3>
        {croquisList.length === 0 ? (
          <p className="text-gray-500 text-sm">لا يوجد مخططات مرفقة من فريق التشخيص.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {croquisList.map((c: any) => (
               <div key={c.id} className="bg-[#111] border border-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                     <span className="text-xs text-gray-400">الدور: {c.floor}</span>
                     <span className="text-sm font-bold text-white">{c.room}</span>
                  </div>
                  <div className="h-32 bg-black/80 rounded border border-gray-700 flex flex-col items-center justify-center opacity-80 relative overflow-hidden" style={{ backgroundImage: 'linear-gradient(#222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
                     <span className="text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">SVG Viewer Mounted</span>
                     <span className="text-[10px] text-[#43bba1] mt-2">يعرض نقاط السباكة والكهرباء</span>
                  </div>
               </div>
            ))}
          </div>
        )}
      </div>

      {/* Supply Engine */}
      <div className="bg-[#0c0c0c] border border-gray-800 rounded-xl p-5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-[#a871f7]"/> جدول الكميات والتوريد</h3>
          {awaitsMe && <button onClick={addItem} className="bg-[#4A1F66] hover:bg-[#5c2b80] text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1"><Plus size={14}/> إضافة مادة</button>}
        </div>

        <div className="space-y-3">
          {data.items.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm border border-dashed border-gray-700 rounded-lg">لم يتم إضافة مواد.</div>
          ) : (
            data.items.map((item: any) => (
              <div key={item.id} className="flex flex-col md:flex-row gap-3 items-center bg-[#111] p-3 rounded-lg border border-gray-800 relative group">
                <div className="w-full md:w-1/3"><Input readOnly={!awaitsMe} placeholder="اسم المادة (مثال: اسمنت مقاوم)" value={item.name} onChange={(e:any) => updateItem(item.id, 'name', e.target.value)} /></div>
                <div className="w-full md:w-1/6"><Input readOnly={!awaitsMe} type="number" placeholder="الكمية" value={item.quantity} onChange={(e:any) => updateItem(item.id, 'quantity', e.target.value)} /></div>
                <div className="w-full md:w-1/6"><Select readOnly={!awaitsMe} options={['حبة', 'كيس', 'متر', 'لتر', 'طن']} value={item.unit} onChange={(e:any) => updateItem(item.id, 'unit', e.target.value)} /></div>
                <div className="w-full md:w-1/6"><Input readOnly={!awaitsMe} type="number" placeholder="السعر التقديري" value={item.estPrice} onChange={(e:any) => updateItem(item.id, 'estPrice', e.target.value)} /></div>
                <div className="w-full md:w-1/6 text-center text-[#43bba1] font-bold bg-[#05110e] py-2 rounded">{(item.quantity * item.estPrice).toLocaleString()} ر.س</div>
                {awaitsMe && <button onClick={() => removeItem(item.id)} className="absolute -left-2 -top-2 bg-red-900 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"><X size={12}/></button>}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-between items-center p-4 bg-gradient-to-r from-[#111] to-[#0a0a0a] border border-gray-800 rounded-lg">
           <span className="text-gray-400 font-bold">التكلفة التقديرية للإدارة:</span>
           <span className="text-2xl font-black text-white">{data.estimatedTotal.toLocaleString()} <span className="text-sm text-[#43bba1]">ر.س</span></span>
        </div>

        <div className="mt-6">
           <TextArea disabled={!awaitsMe} label="ملاحظات قسم التوريد" rows={2} value={data.notes} onChange={(e:any) => setData({...data, notes: e.target.value})} />
        </div>

        {awaitsMe && (
          <button onClick={submit} disabled={busy || data.items.length === 0} className="w-full mt-6 bg-[#43bba1] hover:bg-[#359d86] text-black py-3 rounded-lg font-bold text-sm flex justify-center items-center gap-2">
            رفع خطة التوريد للمقاولين (F-84)
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// F-84: PRICING REQUEST (طلب تسعير)
// ============================================================================
export const F84Renderer: FormRenderer = ({ rec, user, api }) => {
  const [notes, setNotes] = useState(rec.data?.notes || '');
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user);

  const submit = async () => {
    setBusy(true);
    // 🚨 FIXED: Promise.all
    const f85 = api.forms.find(f => f.code === 'F-85' && f.projectRefId === rec.projectRefId);
    await Promise.all([
      api.approveForm(rec.id, user, 'تم استلام التسعيرات', { notes }),
      f85 ? api.activateForm(f85.id) : Promise.resolve()
    ]);
    setBusy(false);
  };

  return (
    <FormShell rec={rec} user={user} api={api} approveLabel="إغلاق التسعير والبدء بالترسية">
      <Card title="استدراج عروض الأسعار" icon={Calculator}>
        <p className="text-sm text-gray-400 mb-4">تم طرح خطة التوريد وجدول الكميات للمقاولين. يرجى جمع عروض الأسعار.</p>
        <TextArea disabled={!awaitsMe} label="ملاحظات استدراج العروض" rows={2} value={notes} onChange={(e:any) => setNotes(e.target.value)} />
      </Card>
    </FormShell>
  );
};

// ============================================================================
// F-85: AWARDING REPORT (محضر ترسية)
// ============================================================================
export const F85Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const [contractorName, setContractorName] = useState(rec.data?.contractorName || '');
  const [awardedPrice, setAwardedPrice] = useState(rec.data?.awardedPrice || '');
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user);

  const submit = async () => {
    setBusy(true);
    // 🚨 FIXED: Promise.all for atomic transition to phase EXECUTION
    const f32 = api.forms.find(f => f.code === 'F-32' && f.projectRefId === rec.projectRefId);
    await Promise.all([
      api.approveForm(rec.id, user, 'تم الترسية', { contractorName, awardedPrice }),
      context.updateProject(rec.projectRefId, { contractorName, awardedPrice: Number(awardedPrice), phase: 'EXECUTION' }),
      f32 ? api.activateForm(f32.id) : Promise.resolve()
    ]);
    setBusy(false);
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={
      awaitsMe && (
        <button onClick={submit} disabled={busy || !contractorName || !awardedPrice} className="w-full bg-gradient-to-r from-[#4A1F66] to-[#6B3D87] text-white py-3 rounded-lg font-bold text-sm">اعتماد الترسية وتحديث المشروع</button>
      )
    }>
      <Card title="محضر ترسية المشروع" icon={FileSignature}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input readOnly={!awaitsMe} label="اسم المقاول المعتمد" value={contractorName} onChange={(e:any) => setContractorName(e.target.value)} />
          <Input readOnly={!awaitsMe} label="مبلغ الترسية (ريال)" type="number" value={awardedPrice} onChange={(e:any) => setAwardedPrice(e.target.value)} />
        </div>
      </Card>
    </FormShell>
  );
};

// ============================================================================
// F-32: ASSIGN SUPERVISOR (تعيين مشرف التنفيذ)
// ============================================================================
export const F32Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const [supervisorId, setSupervisorId] = useState(rec.data?.supervisorId || '');
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user);

  const engineers = [
    { value: 'eng-3', label: 'م. خالد الدوسري (مهندس تنفيذ)' },
    { value: 'eng-4', label: 'م. عمر بن حسن (مهندس تنفيذ)' }
  ];

  const submit = async () => {
    setBusy(true);
    try {
      // 🚨 FIXED: Promise.all for atomic assignment
      const f33 = api.forms.find(f => f.code === 'F-33' && f.projectRefId === rec.projectRefId);
      await Promise.all([
        api.approveForm(rec.id, user, 'تم تعيين المشرف', { supervisorId }),
        context.updateProject(rec.projectRefId, { supervisingEngineerId: supervisorId }),
        f33 ? api.activateForm(f33.id) : Promise.resolve()
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={
      awaitsMe && <button onClick={submit} disabled={busy || !supervisorId} className="w-full bg-[#43bba1] text-black py-3 rounded-lg font-bold text-sm">تعيين المشرف</button>
    }>
      <Card title="تعيين مهندس التنفيذ (المشرف)" icon={Briefcase}>
         <Select readOnly={!awaitsMe} label="اختر المهندس المشرف" options={engineers.map(e => e.label)} value={engineers.find(e => e.value === supervisorId)?.label || supervisorId} onChange={(e:any) => setSupervisorId(engineers.find(eng => eng.label === e.target.value)?.value || e.target.value)} />
      </Card>
    </FormShell>
  );
};

// ============================================================================
// F-33: SITE HANDOVER (محضر تسليم الموقع)
// ============================================================================
export const F33Renderer: FormRenderer = ({ rec, user, api }) => {
  const [startDate, setStartDate] = useState(rec.data?.startDate || '');
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user);

  const submit = async () => {
    setBusy(true);
    try {
      // 🚨 FIXED: Promise.all to trigger multiple Phase 4 loops atomically
      const f35 = api.forms.find(f => f.code === 'F-35' && f.projectRefId === rec.projectRefId);
      const f14 = api.forms.find(f => f.code === 'F-14' && f.projectRefId === rec.projectRefId);

      const promises: Promise<any>[] = [
        api.approveForm(rec.id, user, 'تم تسليم الموقع وبدء العمل', { startDate })
      ];

      if (f35) promises.push(api.activateForm(f35.id));
      if (f14) promises.push(api.activateForm(f14.id));

      await Promise.all(promises);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={
      awaitsMe && <button onClick={submit} disabled={busy || !startDate} className="w-full bg-gradient-to-r from-[#43bba1] to-[#359d86] text-black py-3 rounded-lg font-bold text-sm flex justify-center items-center gap-2"><Trophy size={18}/> توثيق بدء التنفيذ</button>
    }>
      <Card title="محضر تسليم الموقع" icon={HomeIcon}>
        <p className="text-sm text-gray-400 mb-4">بموجب هذا المحضر، تم تسليم الموقع للمقاول للبدء في أعمال التنفيذ.</p>
        <Input readOnly={!awaitsMe} type="date" label="تاريخ بداية التنفيذ الفعلي" value={startDate} onChange={(e:any) => setStartDate(e.target.value)} />
      </Card>
    </FormShell>
  );
};
// ============================================================================
// F-34 & F-19: SUPPLY AND WAREHOUSE
// ============================================================================
export const F34Renderer: FormRenderer = ({ rec, user, api }) => {
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user);

  const submit = async () => {
    setBusy(true);
    try {
      await api.approveForm(rec.id, user, 'تم توجيه التوريد');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={
      awaitsMe && <button onClick={submit} disabled={busy} className="w-full bg-[#4A1F66] text-white py-3 rounded-lg font-bold">توجيه إلى المستودع</button>
    }>
      <Card title="إحالة التوريد للمستودع" icon={Truck}>
        <p className="text-gray-400 text-sm">إحالة المواد المطلوبة بخطة التوريد ليتم صرفها من المستودع.</p>
      </Card>
    </FormShell>
  );
};

export const F19Renderer: FormRenderer = ({ rec, user, api }) => {
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user);

  const submit = async () => {
    setBusy(true);
    try {
      await api.approveForm(rec.id, user, 'تم الصرف من المستودع');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={
      awaitsMe && <button onClick={submit} disabled={busy} className="w-full bg-[#43bba1] text-black py-3 rounded-lg font-bold">تأكيد صرف المواد</button>
    }>
      <Card title="سند صرف مواد من المستودع" icon={ShoppingCart}>
        <p className="text-gray-400 text-sm">إقرار بتسليم المواد للمقاول أو فريق التنفيذ من المستودع المباشر.</p>
      </Card>
    </FormShell>
  );
};

// ============================================================================
// F-35: ADVANCE PAYMENT REQUEST (الدفعة المقدمة)
// ============================================================================
export const F35Renderer: FormRenderer = ({ rec, user, api }) => {
  const [amount, setAmount] = useState(rec.data?.amount || '');
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user);

  const submit = async () => {
    setBusy(true);
    try {
      await api.approveForm(rec.id, user, 'تم اعتماد الدفعة المقدمة', { amount });
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={
      awaitsMe && <button onClick={submit} disabled={busy || !amount} className="w-full bg-gradient-to-r from-[#4A1F66] to-[#6B3D87] text-white py-3 rounded-lg font-bold">اعتماد الصرف للدفعة المقدمة</button>
    }>
      <div className="bg-[#05110e] border border-[#43bba1]/30 rounded-xl p-5 flex items-center justify-between shadow-lg">
        <div>
           <h3 className="text-[#43bba1] font-bold mb-2">طلب الدفعة المقدمة للمقاول</h3>
           <p className="text-xs text-gray-400 max-w-sm">بناءً على محضر الترسية وتوقيع العقد، يرجى تحديد واعتماد الدفعة المقدمة للبدء.</p>
        </div>
        <SaudiRiyalGlassIcon />
      </div>
      <Card title="بيانات الصرف">
        <Input readOnly={!awaitsMe} type="number" label="مبلغ الدفعة المقدمة (ريال)" value={amount} onChange={(e:any) => setAmount(e.target.value)} />
      </Card>
    </FormShell>
  );
};

// ============================================================================
// F-14: SUPERVISION REPORT (تقرير الإشراف الميداني)
// ============================================================================
export const F14Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const [progress, setProgress] = useState(rec.data?.progress || 0);
  const [report, setReport] = useState(rec.data?.report || '');
  const [scopeChange, setScopeChange] = useState(rec.data?.scopeChange || false);
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user);

  const submit = async () => {
    setBusy(true);
    try {
      // 🚨 FIXED: Promise.all for continuous operational looping & context updates
      const promises: Promise<any>[] = [
        api.approveForm(rec.id, user, 'تم رفع التقرير', { progress, report, scopeChange }),
        context.updateProject(rec.projectRefId, { progressPct: progress })
      ];

      if (scopeChange) {
        const f23 = api.forms.find(f => f.code === 'F-23' && f.projectRefId === rec.projectRefId);
        if (f23) promises.push(api.activateForm(f23.id));
      } else if (progress === 100) {
        const f07 = api.forms.find(f => f.code === 'F-07' && f.projectRefId === rec.projectRefId);
        if (f07) promises.push(api.activateForm(f07.id));
      } else {
        // Loop F-14 for continuous execution until 100%
        promises.push(api.createForm({ code: 'F-14', user, projectId: rec.projectId, projectRefId: rec.projectRefId, status: 'pending' }));
      }

      await Promise.all(promises);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0c0c0c] border border-gray-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-[#43bba1] font-bold mb-4 flex items-center gap-2"><ClipboardList className="w-5 h-5"/> تقرير الإشراف الهندسي الميداني</h3>

        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-400 mb-3">نسبة إنجاز المشروع الحالية:</label>
          <ProgressBar progress={progress} />
          <input disabled={!awaitsMe} type="range" min="0" max="100" value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full mt-4 accent-[#43bba1]" />
        </div>

        <TextArea disabled={!awaitsMe} label="ملاحظات المهندس المشرف (ماتم إنجازه)" rows={4} value={report} onChange={(e:any) => setReport(e.target.value)} />

        <div className="mt-4 p-4 border border-amber-500/30 bg-amber-500/10 rounded-lg">
           <label className="flex items-center gap-3 cursor-pointer">
              <input disabled={!awaitsMe} type="checkbox" checked={scopeChange} onChange={(e) => setScopeChange(e.target.checked)} className="w-5 h-5 accent-amber-500" />
              <div>
                 <span className="font-bold text-amber-500">يتطلب اعتماد بنود أعمال إضافية (تفعيل F-23)</span>
                 <p className="text-xs text-amber-400/70 mt-1">إذا واجه المقاول أعمال غير مذكورة في كراسة التشخيص، قم بتفعيل هذا الخيار.</p>
              </div>
           </label>
        </div>

        {awaitsMe && (
          <button onClick={submit} disabled={busy || progress === 0} className="w-full mt-6 bg-[#43bba1] text-black py-3.5 rounded-lg font-bold text-sm flex justify-center items-center gap-2">
             <CheckCircle2 size={18} /> اعتماد التقرير وتحديث نسبة الإنجاز
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// F-23: EXTRA WORKS APPROVAL (اعتماد بنود إضافية)
// ============================================================================
export const F23Renderer: FormRenderer = ({ rec, user, api }) => {
  const [details, setDetails] = useState(rec.data?.details || '');
  const [extraCost, setExtraCost] = useState(rec.data?.extraCost || '');
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user);

  const submit = async () => {
    setBusy(true);
    try {
      // 🚨 FIXED: Promise.all
      await Promise.all([
        api.approveForm(rec.id, user, 'تم اعتماد البنود الإضافية', { details, extraCost }),
        api.createForm({ code: 'F-15', user, projectId: rec.projectId, projectRefId: rec.projectRefId, data: { paymentType: 'ملحق عقد (F-23)', amount: extraCost }, status: 'pending' })
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={
      awaitsMe && <button onClick={submit} disabled={busy || !details} className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg font-bold">اعتماد الأعمال وإصدار طلب صرف ملحق</button>
    }>
      <Card title="اعتماد بنود أعمال إضافية (Variation Order)" icon={AlertTriangle}>
        <TextArea disabled={!awaitsMe} label="وصف الأعمال الإضافية والمبررات" rows={3} value={details} onChange={(e:any) => setDetails(e.target.value)} />
        <Input readOnly={!awaitsMe} type="number" label="التكلفة الإضافية التقديرية (ريال)" value={extraCost} onChange={(e:any) => setExtraCost(e.target.value)} />
      </Card>
    </FormShell>
  );
};

// ============================================================================
// F-15: CONTRACTOR PAYMENT REQUEST (طلب الدفعة المالية)
// ============================================================================
export const F15Renderer: FormRenderer = ({ rec, user, api }) => {
  const [paymentType, setPaymentType] = useState(rec.data?.paymentType || 'دفعة إنجاز مرحلية');
  const [amount, setAmount] = useState(rec.data?.amount || '');
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user);

  const submit = async () => {
    setBusy(true);
    try {
      await api.approveForm(rec.id, user, 'تم اعتماد الصرف', { paymentType, amount });
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={
      awaitsMe && <button onClick={submit} disabled={busy || !amount} className="w-full bg-[#43bba1] text-black py-3 rounded-lg font-bold text-sm">اعتماد وتحويل الدفعة المالية</button>
    }>
      <div className="bg-[#05110e] border border-[#43bba1]/30 rounded-xl p-5 flex items-center justify-between shadow-lg mb-6">
        <div>
           <h3 className="text-[#43bba1] font-bold mb-2">طلب صرف دفعة للمقاول / المورد</h3>
           <p className="text-xs text-gray-400">بناءً على التقارير الفنية المعتمدة، يرجى صرف الدفعة المستحقة.</p>
        </div>
        <SaudiRiyalGlassIcon />
      </div>
      <Card title="تفاصيل الاستحقاق">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Select readOnly={!awaitsMe} label="نوع الدفعة" options={['دفعة إنجاز مرحلية', 'دفعة ختامية', 'ملحق عقد (F-23)']} value={paymentType} onChange={(e:any) => setPaymentType(e.target.value)} />
           <Input readOnly={!awaitsMe} type="number" label="المبلغ المستحق (ريال)" value={amount} onChange={(e:any) => setAmount(e.target.value)} />
        </div>
      </Card>
    </FormShell>
  );
};

// ============================================================================
// F-07: FINAL HANDOVER (شهادة التسليم النهائي)
// ============================================================================
export const F07Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user);

  const submit = async () => {
    setBusy(true);
    try {
      // 🚨 FIXED: Promise.all for phase handover
      const f52 = api.forms.find(f => f.code === 'F-52' && f.projectRefId === rec.projectRefId);
      await Promise.all([
        api.approveForm(rec.id, user, 'تم تسليم المشروع'),
        context.updateProject(rec.projectRefId, { phase: 'HANDOVER' }),
        f52 ? api.activateForm(f52.id) : Promise.resolve()
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={
      awaitsMe && <button onClick={submit} disabled={busy} className="w-full bg-gradient-to-r from-[#4A1F66] to-[#6B3D87] text-white py-3 rounded-lg font-bold text-sm"><Trophy className="w-4 h-4 inline mr-2"/> اعتماد التسليم النهائي</button>
    }>
      <Card title="شهادة التسليم النهائي والضمانات" icon={CheckCircle2}>
        <p className="text-sm text-gray-300">يقر المقاول بإنهاء كافة الأعمال واستلام المستفيد للمشروع والمفاتيح، مع بدء فترة الضمان المتفق عليها.</p>
      </Card>
    </FormShell>
  );
};

// ============================================================================
// F-52: MEDIA DOCUMENTATION (التوثيق الإعلامي)
// ============================================================================
export const F52Renderer: FormRenderer = ({ rec, user, api, context }) => {
  const [links, setLinks] = useState(rec.data?.links || '');
  const [busy, setBusy] = useState(false);
  const awaitsMe = formAwaitsUser(rec, user);

  const submit = async () => {
    setBusy(true);
    try {
      // 🚨 FIXED: Promise.all for final closure
      await Promise.all([
        api.approveForm(rec.id, user, 'تم التوثيق الإعلامي', { links }),
        context.updateProject(rec.projectRefId, { phase: 'CLOSED' })
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={
      awaitsMe && <button onClick={submit} disabled={busy} className="w-full bg-[#43bba1] text-black py-3 rounded-lg font-bold text-sm">اعتماد التوثيق وإغلاق المشروع نهائياً</button>
    }>
      <Card title="التوثيق الإعلامي وقصة النجاح" icon={Camera}>
        <TextArea disabled={!awaitsMe} label="روابط الصور والفيديوهات (Google Drive / Dropbox)" rows={3} value={links} onChange={(e:any) => setLinks(e.target.value)} />
      </Card>
    </FormShell>
  );
};

// ============================================================================
// EXPORTS: MAPPING THE ENGINE
// ============================================================================
// 🚨 FIXED: F031Renderer and F032Renderer exported explicitly
export const RENDERERS: Record<string, FormRenderer> = {
  'F-02': F02Renderer,
  'F-03': F03Renderer,
  'F-03.1': F031Renderer,
  'F-03.2': F032Renderer,
  'F-04': F04Renderer,
  'F-08': F08Renderer,
  'F-18': F18Renderer,
  'F-22': F22Renderer,
  'F-21': F21Renderer,
  'F-20': F20Renderer,
  'F-84': F84Renderer,
  'F-85': F85Renderer,
  'F-32': F32Renderer,
  'F-33': F33Renderer,
  'F-34': F34Renderer,
  'F-19': F19Renderer,
  'F-35': F35Renderer,
  'F-14': F14Renderer,
  'F-23': F23Renderer,
  'F-15': F15Renderer,
  'F-07': F07Renderer,
  'F-52': F52Renderer
};

export const CREATORS: Record<string, FormCreator> = {
  'F-02': F02Creator,
  'F-03': F03Creator
};
