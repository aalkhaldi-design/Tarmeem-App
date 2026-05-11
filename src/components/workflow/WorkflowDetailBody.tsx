/* WorkflowDetailBody — the sticky 5-phase tracker + form-nav pills +
   accordion list. Replaces the round-2 brick wall.
   Dark theme is contained in its outer wrapper. */

import React, { useMemo, useState } from 'react';
import { FileText, CheckCircle2, Circle, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import type { FormCode } from '../../lib/data';
import type { FormsApi, FormRecord } from '../Forms';
import type { UserProfile } from '../Auth';
import type { ProjectRecord } from '../forms/FormRenderers';
import {
  FORM_ID_TO_META,
  deriveDynamicP4Forms,
  isFormEditable,
  isFormCompleted,
  projectPhaseToTracker,
  ROLE_ALIASES,
  type DynamicP4Form,
} from './workflowState';
import { isAdminUser } from '../Auth';

import FormF02 from './forms/FormF02';
import FormF03 from './forms/FormF03';
import FormF031 from './forms/FormF031';
import FormF032 from './forms/FormF032';
import FormF21AssignEngineer from './forms/FormF21AssignEngineer';
import FormF08Diagnosis from './forms/FormF08Diagnosis';
import FormF22Housing from './forms/FormF22Housing';
import FormF18Evacuation from './forms/FormF18Evacuation';
import FormF20Materials from './forms/FormF20Materials';
import FormF31Pricing from './forms/FormF31Pricing';
import FormF32AssignSupervisor from './forms/FormF32AssignSupervisor';
import FormF33StartDoc from './forms/FormF33StartDoc';
import FormF14SupervisionReport from './forms/FormF14SupervisionReport';
import FormF42Payment from './forms/FormF42Payment';
import FormF43AdditionalWorks from './forms/FormF43AdditionalWorks';
import FormF19Supply from './forms/FormF19Supply';
import FormF07Handover from './forms/FormF07Handover';
import FormF52Media from './forms/FormF52Media';

type FormItem = {
  id: number;
  title: string;
  isDynamicReport?: boolean;
  isDynamicPayment?: boolean;
  isFloating?: boolean;
  seq?: number;
  recId?: string;
};

interface Props {
  project: ProjectRecord;
  user: UserProfile;
  users: UserProfile[];
  api: FormsApi;
}

export const WorkflowDetailBody: React.FC<Props> = ({ project, user, users, api }) => {
  const initialPhasesData = useMemo(() => ([
    { id: 1, title: 'الدراسة والاعتماد', forms: [
      { id: 11, title: 'استمارة البحث الاجتماعي (F-02)' },
      { id: 12, title: 'اعتماد مدير البحث (F-03)' },
      { id: 13, title: 'اعتماد المدير التنفيذي (F-03.1)' },
      { id: 14, title: 'الاعتماد النهائي للإحالة (F-03.2)' },
    ] as FormItem[] },
    { id: 2, title: 'التشخيص والتجهيز', forms: [
      { id: 21, title: 'تعيين مهندس التشخيص' },
      { id: 22, title: 'كراسة تشخيص المبنى (F-08)' },
      { id: 25, title: 'خطة توريد المواد (F-20)' },
    ] as FormItem[] },
    { id: 3, title: 'الترسية والبدء', forms: [
      { id: 31, title: 'اعتماد التسعيرات والترسية (F-85)' },
      { id: 32, title: 'تعيين المهندس المشرف' },
      { id: 33, title: 'توثيق البدء' },
    ] as FormItem[] },
    { id: 4, title: 'التنفيذ والصرف', forms: [] as FormItem[] },
    { id: 5, title: 'الإغلاق', forms: [
      { id: 51, title: 'شهادة تسليم منزل (F-07)' },
    ] as FormItem[] },
  ]), []);

  const projectForms = useMemo(
    () => api.forms.filter(f => f.projectRefId === project.id),
    [api.forms, project.id],
  );

  const findRec = (code: FormCode, step?: 0 | 1 | 2): FormRecord | undefined => {
    void step; // F-03 step is encoded by approvalIndex on the same rec
    return projectForms.find(f => f.code === code);
  };

  // Trigger A: F-08 safetyHazard injects F-18 + F-22 cards into Phase 2.
  const f08 = findRec('F-08');
  const safetyTriggered = !!f08?.data?.safetyHazard
    || projectForms.some(f => f.code === 'F-18')
    || projectForms.some(f => f.code === 'F-22');

  // Trigger B: F-14 requestScopeChange injects F-23 into Phase 4.
  const anyF14ScopeChange = projectForms.some(
    f => f.code === 'F-14' && f.data?.requestScopeChange,
  ) || projectForms.some(f => f.code === 'F-23');

  // Trigger C: F-07 mediaRequested spawns F-52 in Phase 5.
  const mediaTriggered = !!projectForms.find(f => f.code === 'F-07')?.data?.mediaRequested
    || projectForms.some(f => f.code === 'F-52');

  // Build dynamic Phase-4 forms + injected triggers
  const dynamicP4: DynamicP4Form[] = useMemo(() => deriveDynamicP4Forms(projectForms), [projectForms]);

  const phasesData = useMemo(() => initialPhasesData.map(phase => {
    if (phase.id === 2) {
      let forms: FormItem[] = [...phase.forms];
      if (safetyTriggered) {
        // Insert F-22 (id 23) and F-18 (id 24) right after F-08 (id 22)
        const insertAt = forms.findIndex(f => f.id === 22) + 1;
        const inject: FormItem[] = [
          { id: 23, title: 'توفير سكن بديل (F-22)' },
          { id: 24, title: 'تعهد إخلاء المنزل (F-18)' },
        ];
        forms = [...forms.slice(0, insertAt), ...inject, ...forms.slice(insertAt)];
      }
      return { ...phase, forms };
    }
    if (phase.id === 4) {
      const forms: FormItem[] = [
        ...dynamicP4.map((d) => ({
          id: d.id, title: d.title,
          isDynamicReport: d.isDynamicReport,
          isDynamicPayment: d.isDynamicPayment,
          isFloating: d.isFloating,
          seq: d.seq,
          recId: d.recId,
        } as FormItem)),
        ...(anyF14ScopeChange ? [{ id: 43, title: 'طلب بنود أعمال إضافية (F-23)' } as FormItem] : []),
        { id: 44, title: 'طلب توريد داخلي (F-19)' } as FormItem,
      ];
      return { ...phase, forms };
    }
    if (phase.id === 5) {
      const forms: FormItem[] = [...phase.forms];
      if (mediaTriggered) forms.push({ id: 52, title: 'طلب تصوير وتوثيق (F-52)' });
      return { ...phase, forms };
    }
    return phase;
  }), [initialPhasesData, safetyTriggered, dynamicP4, anyF14ScopeChange, mediaTriggered]);

  const trackerActive = projectPhaseToTracker(project.phase);
  const [activePhase, setActivePhase] = useState<number>(trackerActive);
  const [unfoldedForms, setUnfoldedForms] = useState<number[]>(() => {
    const ph = phasesData.find(p => p.id === trackerActive);
    return ph && ph.forms.length > 0 ? [ph.forms[0].id] : [];
  });

  const handlePhaseChange = (phaseId: number) => {
    if (activePhase !== phaseId) {
      setActivePhase(phaseId);
      const targetPhase = phasesData.find(p => p.id === phaseId);
      if (targetPhase && targetPhase.forms.length > 0) {
        setUnfoldedForms([targetPhase.forms[0].id]);
      }
    }
  };

  const toggleFormFold = (formId: number) =>
    setUnfoldedForms(prev => prev.includes(formId) ? prev.filter(id => id !== formId) : [...prev, formId]);

  const scrollToForm = (formId: number) => {
    if (!unfoldedForms.includes(formId)) setUnfoldedForms(prev => [...prev, formId]);
    setTimeout(() => {
      const el = document.getElementById(`workflow-form-${formId}`);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 160, behavior: 'smooth' });
    }, 150);
  };

  const addReport = async () => {
    if (!ROLE_ALIASES.SUPERVISING_ENGINEER.includes(user.role as any) && !isAdminUser(user)) return;
    const existingReports = projectForms.filter(f => f.code === 'F-14');
    const nextSeq = existingReports.length + 1;
    await api.createForm({
      code: 'F-14', user,
      projectId: project.projectId || '',
      projectRefId: project.id,
      beneficiaryName: project.beneficiaryName,
      data: { seq: nextSeq, triggersPayment: false, requestScopeChange: false },
    });
  };

  const activeMain = phasesData.find(p => p.id === activePhase);

  const completedFormsById = useMemo(() => {
    const set = new Set<number>();
    for (const phase of phasesData) {
      for (const form of phase.forms) {
        if (form.isDynamicReport || form.isDynamicPayment) {
          if (form.recId) {
            const r = api.forms.find(f => f.id === form.recId);
            if (r?.status === 'approved') set.add(form.id);
          }
          continue;
        }
        const meta = FORM_ID_TO_META[form.id];
        if (!meta) continue;
        const rec = findRec(meta.code, meta.step);
        if (form.id === 12 && rec && rec.approvalIndex > 0) set.add(form.id);
        else if (form.id === 13 && rec && rec.approvalIndex > 1) set.add(form.id);
        else if (form.id === 14 && rec?.status === 'approved') set.add(form.id);
        else if (rec?.status === 'approved') set.add(form.id);
      }
    }
    return set;
  }, [phasesData, api.forms, projectForms]);

  const renderFormContent = (form: FormItem) => {
    // Dynamic Phase-4 forms
    if (form.isDynamicReport) {
      const rec = form.recId ? api.forms.find(f => f.id === form.recId) : undefined;
      const editable = isFormEditable('F-14', rec, user);
      const completed = isFormCompleted(rec);
      return (
        <FormF14SupervisionReport
          rec={rec} user={user} users={users} api={api} project={project}
          isEditable={editable} isCompleted={completed} seq={form.seq || 1}
        />
      );
    }
    if (form.isDynamicPayment) {
      const rec = form.recId ? api.forms.find(f => f.id === form.recId) : undefined;
      const editable = !form.isFloating && isFormEditable('F-15', rec, user);
      const completed = isFormCompleted(rec);
      return (
        <FormF42Payment
          rec={rec} user={user} users={users} api={api} project={project}
          isEditable={editable} isCompleted={completed} seq={form.seq || 1}
          isFloating={form.isFloating}
        />
      );
    }

    const meta = FORM_ID_TO_META[form.id];
    if (!meta) return null;
    const rec = findRec(meta.code, meta.step);

    // F-03 stepped cards
    let editable: boolean;
    let completed: boolean;
    if (meta.code === 'F-03' && meta.step !== undefined) {
      const step = meta.step;
      completed = !!(rec && (rec.approvalIndex > step || (rec.status === 'approved' && step === 2)));
      editable = !!(rec && rec.status === 'pending' && rec.approvalIndex === step && rec.approvalChain[step] === user.role)
        || (isAdminUser(user) && !!rec)
        || (!rec && step === 0 && isFormEditable('F-03', undefined, user));
    } else {
      editable = isFormEditable(meta.code, rec, user);
      completed = isFormCompleted(rec);
    }

    const shared = { rec, user, users, api, project, isEditable: editable, isCompleted: completed };
    switch (form.id) {
      case 11: return <FormF02 {...shared} />;
      case 12: return <FormF03 {...shared} />;
      case 13: return <FormF031 {...shared} />;
      case 14: return <FormF032 {...shared} />;
      case 21: return <FormF21AssignEngineer {...shared} />;
      case 22: return <FormF08Diagnosis {...shared} />;
      case 23: return <FormF22Housing {...shared} />;
      case 24: return <FormF18Evacuation {...shared} />;
      case 25: return <FormF20Materials {...shared} />;
      case 31: return <FormF31Pricing {...shared} />;
      case 32: return <FormF32AssignSupervisor {...shared} />;
      case 33: return <FormF33StartDoc {...shared} />;
      case 43: return <FormF43AdditionalWorks {...shared} />;
      case 44: return <FormF19Supply {...shared} />;
      case 51: return <FormF07Handover {...shared} />;
      case 52: return <FormF52Media {...shared} />;
      default: return null;
    }
  };

  const canAddReport = ROLE_ALIASES.SUPERVISING_ENGINEER.includes(user.role as any) || isAdminUser(user);

  return (
    <div dir="rtl" className="bg-[#050505] text-gray-200 font-sans rounded-2xl border border-gray-800 selection:bg-[#43bba1] selection:text-black mt-4 overflow-hidden">
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .animate-fade-in { animation: fadeIn 0.3s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <main className="p-3 md:p-6">
        <div className="mb-4 md:mb-6 flex items-center justify-between">
          <h2 className="text-lg md:text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 md:w-5 md:h-5 text-[#43bba1]" /> سير العمل: <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#502b79] to-[#43bba1]">{project.beneficiaryName}</span>
          </h2>
        </div>

        {/* STICKY ZONE: phase tracker + form pills */}
        <div className="w-full sticky top-2 z-30 mb-8 space-y-2">
          <div className="flex w-full h-12 md:h-14 gap-1 md:gap-1.5 bg-[#0a0a0a] p-1 rounded-lg border border-gray-800 shadow-xl">
            {phasesData.map((phase) => (
              <div key={phase.id} onClick={() => handlePhaseChange(phase.id)} className={`relative h-full rounded-md cursor-pointer overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${activePhase === phase.id ? 'flex-[4] lg:flex-[5] bg-gradient-to-l from-[#502b79] to-[#2c1545] border border-[#6d3bb0] shadow-[0_0_15px_rgba(80,43,121,0.2)]' : 'flex-[1] bg-[#121212] border border-gray-800 hover:bg-[#1a1a1a]'}`}>
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${activePhase === phase.id ? 'opacity-0 scale-50 pointer-events-none' : 'opacity-100 scale-100'}`}><span className="text-sm md:text-base font-black text-gray-500">{phase.id}</span></div>
                <div className={`absolute inset-0 flex items-center justify-center w-full px-2 md:px-4 transition-all duration-500 ${activePhase === phase.id ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}>
                  <div className="hidden sm:block w-1 h-4 md:h-5 bg-[#43bba1] rounded-full ml-2 shadow-[0_0_5px_#43bba1] shrink-0"></div>
                  <span className="text-[11px] sm:text-xs md:text-sm lg:text-base font-bold text-white text-center whitespace-nowrap">{phase.title}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Form-nav pills */}
          {activeMain?.forms && activeMain.forms.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 md:gap-3 bg-[#0d0d0d]/95 backdrop-blur-md p-2 md:p-3 rounded-lg border border-gray-800 shadow-xl">
              {activeMain.forms.map((form) => {
                const isCompleted = completedFormsById.has(form.id);
                const isFloating = form.isFloating;
                return (
                  <button key={form.id} onClick={() => scrollToForm(form.id)} className={`relative px-4 py-2 rounded-md text-[11px] md:text-sm font-bold flex items-center gap-2 shrink-0 border-2 transition-all ${isFloating ? 'text-gray-500 border-gray-800 bg-[#0a0a0a]' : 'text-[#a871f7]'} ${isCompleted ? 'border-[#43bba1] shadow-[0_0_12px_rgba(67,187,161,0.4)] bg-[#0c0712]' : (!isFloating ? 'border-[#502b79] shadow-[0_0_12px_rgba(80,43,121,0.4)] bg-[#0c0712] hover:bg-[#130a1c]' : '')}`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4 text-[#43bba1]" /> : <Circle className={`w-4 h-4 ${isFloating ? 'text-gray-600' : 'text-[#a871f7]'}`} />}
                    {form.title} {isFloating && '(مُعلق)'}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Accordions */}
        <div className="flex flex-col gap-4 md:gap-6">
          {activeMain?.forms.map((form) => {
            const isUnfolded = unfoldedForms.includes(form.id);
            const isCompleted = completedFormsById.has(form.id);
            const isFloating = form.isFloating;
            return (
              <div key={form.id} id={`workflow-form-${form.id}`} className={`bg-[#0c0c0c] rounded-xl flex flex-col relative transition-all duration-500 overflow-hidden border-2 ${isCompleted ? 'border-[#43bba1] shadow-[0_0_20px_rgba(67,187,161,0.15)]' : (isFloating ? 'border-gray-800' : 'border-[#502b79] shadow-[0_0_20px_rgba(80,43,121,0.15)]')}`}>
                <div className={`w-full p-4 md:px-6 md:py-4 flex items-center justify-between gap-3 text-right bg-[#0c0712] ${isUnfolded ? 'border-b border-[#502b79]/40' : ''}`}>
                  <button onClick={() => toggleFormFold(form.id)} className="flex-1 flex items-center gap-3 outline-none">
                    {isCompleted ? <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-[#43bba1]" /> : <Circle className={`w-5 h-5 md:w-6 md:h-6 ${isFloating ? 'text-gray-600' : 'text-[#a871f7]'}`} />}
                    <h4 className={`text-base md:text-lg font-bold ${isFloating ? 'text-gray-500' : 'text-[#a871f7]'}`}>{form.title}</h4>
                  </button>
                  <div className="flex items-center gap-2">
                    {form.isDynamicReport && canAddReport && (
                      <button onClick={(e) => { e.stopPropagation(); addReport(); }} className="px-3 py-1.5 bg-[#1a0f2e] text-[#a871f7] hover:bg-[#502b79] hover:text-white rounded-md transition-colors flex items-center gap-1 border border-[#3c1d5d]" title="إضافة تقرير دوري جديد">
                        <Plus size={16} /> <span className="hidden sm:inline text-xs font-bold">تقرير جديد</span>
                      </button>
                    )}
                    <button onClick={() => toggleFormFold(form.id)} className={`p-1 rounded-full outline-none ${isFloating ? 'text-gray-600' : 'text-[#a871f7]'}`}>
                      {isUnfolded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className={`transition-all duration-500 ease-in-out bg-[#070707] ${isUnfolded ? 'max-h-[5000px] opacity-100 p-4 md:p-6' : 'max-h-0 opacity-0 pointer-events-none p-0 overflow-hidden'}`}>
                  {renderFormContent(form)}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default WorkflowDetailBody;
