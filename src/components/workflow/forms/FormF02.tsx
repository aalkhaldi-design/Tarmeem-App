/* F-02 — استمارة البحث الاجتماعي (4 steps).
   UI extracted verbatim from the user's Phase-1 code; integration seams:
   - disabled bound to !isEditable
   - state hydrated from rec?.data
   - submit goes to api.createForm */

import React, { useState } from 'react';
import {
  Users, Home, DollarSign, Briefcase, Activity, FileText, UploadCloud, X,
  FileSignature, Lock, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { DarkCard, DarkInput, DarkSelect, DarkTextArea, DarkAmountToggle } from '../DarkUI';
import type { SharedFormProps } from './_shared';
import { useFormDraft } from './useFormDraft';

const F02_DEFAULTS = {
  caseRef: '',
  personal: { fullName: '', idNumber: '', nationality: 'سعودي', gender: 'ذكر', dob: '', mobile1: '', mobile2: '', city: '', otherCity: '', neighborhood: '', gps: '', socialStatus: '', education: '' },
  work: { commercialReg: 'لا يوجد', currentJob: 'لا يعمل' },
  income: { socialSecurity: { exists: false, amount: '' }, salary: { exists: false, amount: '' }, pension: { exists: false, amount: '' }, rehab: { exists: false, amount: '' }, citizenAccount: { exists: false, amount: '' }, realEstate: { exists: false, amount: '' } },
  debts: { car: { exists: false, amount: '' }, loans: { exists: false, amount: '' }, bills: { exists: false, amount: '' }, others: { exists: false, amount: '' } },
  family: { wives: '', sons: '', daughters: '', total: '', under15: '', over64: '', specialNeeds: '', healthStatus: 'سليم', socialSecurityStatus: 'غير مسجل' },
  housing: { ownership: '', type: '', age: '', furniture: '', need: '' },
  researcher: { name: '', mobile: '', visitDate: '', opinion: '' },
  manager: { name: '', title: '', mobile: '' },
  documents: [] as any[],
  pledge: false,
};

const FormF02: React.FC<SharedFormProps> = ({ rec, user, api, project, isEditable, isCompleted }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const cities = ['الدمام', 'الخبر', 'الأحساء', 'الجبيل', 'بقيق', 'حفر الباطن', 'الخفجي', 'أم الساهك', 'عنك', 'القطيف', 'النعيرية', 'الظهران', 'العديد', 'رأس تنورة', 'صفوى', 'أبو معن', 'عين دار القديمة', 'القرية العليا', 'جزيرة دارين', 'مليجة', 'سيهات', 'الرفيعة', 'أخرى'];
  const housings = ['ملك', 'ملكيته للأقارب من الدرجة الأولى / ورثة', 'إيجار', 'سكن خيري', 'ملك للمستفيد/ـة', 'ملك للزوج/ة', 'ملك للزوج/ة (المتوفى/ة)', 'ملك للأب /الام', 'ملك للأب/الام (متوفى/ة)', 'ملك للأبن/الابنة', 'ملك للأبن/الابنة(متوفى/ة)', 'ملك أقارب درجة ثانية/ثالثة'];

  const defaultsWithCaseRef = { ...F02_DEFAULTS, caseRef: F02_DEFAULTS.caseRef || `CS-${Math.floor(1000 + Math.random() * 9000)}` };
  const [data, setData] = useFormDraft<any>({
    api, user, project, rec, draftKey: 'F-02', initial: defaultsWithCaseRef,
  });
  const [busy, setBusy] = useState(false);

  const steps = [
    { id: 0, title: 'شخصية', icon: Users },
    { id: 1, title: 'دخل وديون', icon: DollarSign },
    { id: 2, title: 'الأسرة والسكن', icon: Home },
    { id: 3, title: 'الباحث والمرفقات', icon: FileText },
  ];

  const update = (section: string, field: string, value: any) =>
    setData((prev: any) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));

  const handleFileUpload = (e: any) => {
    const files = Array.from(e.target.files || []).map((f: any) => ({ name: f.name, previewUrl: URL.createObjectURL(f) }));
    setData((prev: any) => ({ ...prev, documents: [...prev.documents, ...files] }));
    e.target.value = null;
  };

  const removeFile = (index: number) => {
    setData((prev: any) => {
      const newDocs = [...prev.documents];
      if (newDocs[index]?.previewUrl) URL.revokeObjectURL(newDocs[index].previewUrl);
      newDocs.splice(index, 1);
      return { ...prev, documents: newDocs };
    });
  };

  const onComplete = async () => {
    if (!isEditable || busy) return;
    setBusy(true);
    try {
      if (rec) {
        await api.approveForm(rec.id, user, 'رفع الاستمارة', data);
      } else {
        await api.createForm({
          code: 'F-02', user,
          projectId: project.projectId || '',
          projectRefId: project.id,
          beneficiaryName: data.personal?.fullName || project.beneficiaryName,
          data,
          files: data.documents,
        });
      }
    } finally { setBusy(false); }
  };

  const dis = !isEditable;

  return (
    <div className="space-y-6">
      <div className="flex overflow-x-auto gap-2 mb-4 bg-[#0a0a0a] p-1.5 rounded-xl border border-gray-800 hide-scrollbar">
        {steps.map((step, idx) => (
          <button key={step.id} onClick={() => setCurrentStep(step.id)} className={`flex-1 flex min-w-[120px] items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-bold transition-all ${currentStep === step.id ? 'bg-[#1a0f2e] text-[#a871f7] border border-[#3c1d5d]' : 'text-gray-500 hover:bg-[#111]'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep === step.id ? 'bg-[#502b79] text-white' : 'bg-[#111] text-gray-500'}`}>{idx + 1}</div>
            <span className="whitespace-nowrap">{step.title}</span>
          </button>
        ))}
      </div>

      <div className={`${currentStep === 0 ? 'block animate-fade-in' : 'hidden'}`}>
        <DarkCard title="البيانات الشخصية للمستفيد" icon={Users}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DarkInput disabled={dis} label="الاسم الرباعي" required value={data.personal.fullName} onChange={(e: any) => update('personal', 'fullName', e.target.value)} />
            <DarkInput disabled={dis} label="رقم الهوية (10 أرقام)" type="number" maxLength={10} required value={data.personal.idNumber} onChange={(e: any) => update('personal', 'idNumber', e.target.value)} />
            <DarkSelect disabled={dis} label="الجنسية" required options={['سعودي', 'غير سعودي']} value={data.personal.nationality} onChange={(e: any) => update('personal', 'nationality', e.target.value)} />
            <DarkSelect disabled={dis} label="الجنس" required options={['ذكر', 'أنثى']} value={data.personal.gender} onChange={(e: any) => update('personal', 'gender', e.target.value)} />
            <DarkInput disabled={dis} label="تاريخ الميلاد" type="date" required value={data.personal.dob} onChange={(e: any) => update('personal', 'dob', e.target.value)} />
            <DarkSelect disabled={dis} label="الحالة الاجتماعية" required options={['متزوج/ة', 'مطلق/ة', 'أرمل/ة', 'أعزب/عزباء', 'مهجورة']} value={data.personal.socialStatus} onChange={(e: any) => update('personal', 'socialStatus', e.target.value)} />
            <DarkSelect disabled={dis} label="المدينة" required options={cities} value={data.personal.city} onChange={(e: any) => update('personal', 'city', e.target.value)} />
            {data.personal.city === 'أخرى' && <DarkInput disabled={dis} label="اكتب اسم المدينة" required value={data.personal.otherCity} onChange={(e: any) => update('personal', 'otherCity', e.target.value)} />}
            <DarkInput disabled={dis} label="الحي" required value={data.personal.neighborhood} onChange={(e: any) => update('personal', 'neighborhood', e.target.value)} />
            <DarkInput disabled={dis} label="جوال المستفيد" type="tel" required placeholder="***********055" value={data.personal.mobile1} onChange={(e: any) => update('personal', 'mobile1', e.target.value)} />
            <DarkInput disabled={dis} label="جوال آخر للتواصل" type="tel" required placeholder="***********055" value={data.personal.mobile2} onChange={(e: any) => update('personal', 'mobile2', e.target.value)} />
            <DarkInput disabled={dis} label="الموقع GPS (رابط)" required className="md:col-span-3" placeholder="https://maps.google.com/..." value={data.personal.gps} onChange={(e: any) => update('personal', 'gps', e.target.value)} />
          </div>
        </DarkCard>
      </div>

      <div className={`${currentStep === 1 ? 'block animate-fade-in' : 'hidden'}`}>
        <DarkCard title="بيانات العمل" icon={Briefcase}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DarkSelect disabled={dis} label="السجل التجاري" required options={['يوجد', 'لا يوجد']} value={data.work.commercialReg} onChange={(e: any) => update('work', 'commercialReg', e.target.value)} />
            <DarkSelect disabled={dis} label="العمل الحالي" required options={['يعمل', 'لا يعمل']} value={data.work.currentJob} onChange={(e: any) => update('work', 'currentJob', e.target.value)} />
          </div>
        </DarkCard>
        <DarkCard title="الدخل الشهري والديون" icon={DollarSign}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[#43bba1] mb-3 border-b border-gray-800 pb-1">الدخل الشهري</h4>
              <div className="space-y-3">
                <DarkAmountToggle disabled={dis} label="راتب ضمان اجتماعي" required state={data.income.socialSecurity} onChange={(v: any) => update('income', 'socialSecurity', v)} />
                <DarkAmountToggle disabled={dis} label="راتب عمل" required state={data.income.salary} onChange={(v: any) => update('income', 'salary', v)} />
                <DarkAmountToggle disabled={dis} label="راتب تقاعد" required state={data.income.pension} onChange={(v: any) => update('income', 'pension', v)} />
                <DarkAmountToggle disabled={dis} label="تأهيل شامل" required state={data.income.rehab} onChange={(v: any) => update('income', 'rehab', v)} />
                <DarkAmountToggle disabled={dis} label="حساب المواطن" required state={data.income.citizenAccount} onChange={(v: any) => update('income', 'citizenAccount', v)} />
                <DarkAmountToggle disabled={dis} label="عقارات" required state={data.income.realEstate} onChange={(v: any) => update('income', 'realEstate', v)} />
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-red-400 mb-3 border-b border-gray-800 pb-1">الديون الشهرية</h4>
              <div className="space-y-3">
                <DarkAmountToggle disabled={dis} label="أقساط سيارة" required state={data.debts.car} onChange={(v: any) => update('debts', 'car', v)} />
                <DarkAmountToggle disabled={dis} label="أقساط قروض" required state={data.debts.loans} onChange={(v: any) => update('debts', 'loans', v)} />
                <DarkAmountToggle disabled={dis} label="مصروفات شهرية (كهرباء - ماء)" required state={data.debts.bills} onChange={(v: any) => update('debts', 'bills', v)} />
                <DarkAmountToggle disabled={dis} label="ديون أخرى" required state={data.debts.others} onChange={(v: any) => update('debts', 'others', v)} />
              </div>
            </div>
          </div>
        </DarkCard>
      </div>

      <div className={`${currentStep === 2 ? 'block animate-fade-in' : 'hidden'}`}>
        <DarkCard title="حالة الأسرة" icon={Users}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <DarkInput disabled={dis} type="number" label="عدد الزوجات" required value={data.family.wives} onChange={(e: any) => update('family', 'wives', e.target.value)} />
            <DarkInput disabled={dis} type="number" label="عدد البنين" required value={data.family.sons} onChange={(e: any) => update('family', 'sons', e.target.value)} />
            <DarkInput disabled={dis} type="number" label="عدد البنات" required value={data.family.daughters} onChange={(e: any) => update('family', 'daughters', e.target.value)} />
            <DarkInput disabled={dis} type="number" label="عدد أفراد الأسرة" required value={data.family.total} onChange={(e: any) => update('family', 'total', e.target.value)} />
            <DarkInput disabled={dis} type="number" label="أقل من 15 سنة" required value={data.family.under15} onChange={(e: any) => update('family', 'under15', e.target.value)} />
            <DarkInput disabled={dis} type="number" label="أكبر من 64 سنة" required value={data.family.over64} onChange={(e: any) => update('family', 'over64', e.target.value)} />
            <DarkInput disabled={dis} type="number" label="ذوي الإحتياجات" required value={data.family.specialNeeds} onChange={(e: any) => update('family', 'specialNeeds', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-800">
            <DarkSelect disabled={dis} label="الحالة الصحية" required options={['سليم', 'غير سليم']} value={data.family.healthStatus} onChange={(e: any) => update('family', 'healthStatus', e.target.value)} />
            <DarkSelect disabled={dis} label="الضمان الاجتماعي" required options={['مسجل', 'غير مسجل']} value={data.family.socialSecurityStatus} onChange={(e: any) => update('family', 'socialSecurityStatus', e.target.value)} />
          </div>
        </DarkCard>
        <DarkCard title="بيانات السكن" icon={Home}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DarkSelect disabled={dis} label="ملكية السكن" required options={housings} value={data.housing.ownership} onChange={(e: any) => update('housing', 'ownership', e.target.value)} />
            <DarkSelect disabled={dis} label="نوع السكن" required options={['شعبي قديم', 'فله', 'دور', 'شقة']} value={data.housing.type} onChange={(e: any) => update('housing', 'type', e.target.value)} />
            <DarkInput disabled={dis} label="عمر السكن (بالسنوات)" required type="number" value={data.housing.age} onChange={(e: any) => update('housing', 'age', e.target.value)} />
            <DarkSelect disabled={dis} label="حالة الأثاث" required options={['جيد', 'سيئ', 'يحتاج صيانة', 'يحتاج إضافة']} value={data.housing.furniture} onChange={(e: any) => update('housing', 'furniture', e.target.value)} />
            <DarkSelect disabled={dis} label="الاحتياج" required options={['رش', 'تنظيف', 'ترميم كلي', 'ترميم جزئي']} value={data.housing.need} onChange={(e: any) => update('housing', 'need', e.target.value)} />
          </div>
        </DarkCard>
      </div>

      <div className={`${currentStep === 3 ? 'block animate-fade-in' : 'hidden'}`}>
        <DarkCard title="الباحث الاجتماعي للحالة" icon={Activity}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <DarkInput disabled={dis} label="اسم الباحث الاجتماعي" required value={data.researcher.name} onChange={(e: any) => update('researcher', 'name', e.target.value)} />
            <DarkInput disabled={dis} label="جوال الباحث" required type="tel" placeholder="***********055" value={data.researcher.mobile} onChange={(e: any) => update('researcher', 'mobile', e.target.value)} />
            <DarkInput disabled={dis} label="تاريخ بحث الحالة" required type="date" value={data.researcher.visitDate} onChange={(e: any) => update('researcher', 'visitDate', e.target.value)} />
          </div>
          <DarkTextArea disabled={dis} label="رأي الباحث في الحالة *" required rows={3} value={data.researcher.opinion} onChange={(e: any) => update('researcher', 'opinion', e.target.value)} />

          <hr className="my-4 border-gray-800" />
          <h4 className="text-sm font-bold text-gray-400 mb-3">مدير الجهة (إن وجدت)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DarkInput disabled={dis} label="اسم مدير الجهة" value={data.manager.name} onChange={(e: any) => update('manager', 'name', e.target.value)} />
            <DarkInput disabled={dis} label="المسمى الوظيفي" value={data.manager.title} onChange={(e: any) => update('manager', 'title', e.target.value)} />
            <DarkInput disabled={dis} label="جوال مدير الجهة" type="tel" placeholder="***********055" value={data.manager.mobile} onChange={(e: any) => update('manager', 'mobile', e.target.value)} />
          </div>
        </DarkCard>

        <DarkCard title="رفع المستندات (لامحدود)" icon={UploadCloud}>
          <div className="bg-[#050505] p-6 rounded-xl border-2 border-dashed border-gray-800 text-center mb-6">
            <UploadCloud className="w-10 h-10 text-[#502b79] mx-auto mb-2" />
            <p className="text-sm font-bold text-[#a871f7] mb-1">إرفاق المستندات الثبوتية وصور المسكن *</p>
            <p className="text-xs text-gray-500 mb-4">يمكنك رفع أي عدد من الملفات والصور (PDF, JPG, PNG)</p>
            {isEditable && (
              <label className="cursor-pointer bg-[#111] text-white px-6 py-2.5 rounded-lg text-sm font-bold border border-gray-700 hover:border-[#a871f7] transition-all">
                تصفح الملفات <input type="file" multiple className="hidden" onChange={handleFileUpload} />
              </label>
            )}
            {data.documents.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.documents.map((doc: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-[#111] p-2 rounded-lg border border-gray-800 text-xs text-gray-300">
                    <span className="truncate max-w-[80%] font-medium">{doc.name}</span>
                    {isEditable && <button onClick={() => removeFile(i)} className="text-red-500 hover:text-red-400 p-1"><X size={16} /></button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DarkCard>

        {isEditable && !isCompleted ? (
          <div className="bg-[#0f0f0f] rounded-xl border border-[#43bba1]/50 p-5 shadow-[0_0_15px_rgba(67,187,161,0.1)]">
            <div className="flex items-start gap-3 mb-4 bg-[#0a0a0a] p-4 rounded-lg">
              <input type="checkbox" id="pledge_02" checked={data.pledge} onChange={(e) => setData({ ...data, pledge: e.target.checked })} className="w-5 h-5 mt-0.5 rounded accent-[#43bba1] cursor-pointer" />
              <label htmlFor="pledge_02" className="cursor-pointer">
                <h4 className="text-sm font-bold text-white mb-1">أقر بصحة البيانات الميدانية والمستندات المرفقة</h4>
              </label>
            </div>
            <button onClick={onComplete} disabled={!data.pledge || busy} className={`w-full py-3.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${data.pledge ? 'bg-gradient-to-r from-[#43bba1] to-[#359d86] text-black shadow-md' : 'bg-[#111] text-gray-600 border border-gray-800 cursor-not-allowed'}`}>
              <FileSignature className="w-5 h-5" /> {busy ? 'جارٍ الإرسال...' : 'رفع الاستمارة لمدير البحث الاجتماعي'}
            </button>
          </div>
        ) : isCompleted ? (
          <div className="px-5 py-3 rounded-md text-sm font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex justify-center gap-2"><Lock className="w-4 h-4" /> تم رفع الاستمارة بنجاح</div>
        ) : null}
      </div>

      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-800">
        <button onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))} disabled={currentStep === 0} className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-bold ${currentStep === 0 ? 'text-gray-700 cursor-not-allowed' : 'text-[#a871f7] hover:text-white'}`}><ChevronRight className="w-4 h-4" /> السابق</button>
        {currentStep < steps.length - 1 && <button onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))} className="flex items-center gap-1 px-6 py-2 bg-[#1a0f2e] text-[#a871f7] border border-[#3c1d5d] hover:text-white rounded-lg text-sm font-bold transition-colors">التالي <ChevronLeft className="w-4 h-4" /></button>}
      </div>
    </div>
  );
};

export default FormF02;
