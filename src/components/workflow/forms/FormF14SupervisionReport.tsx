/* F-14 — تقرير المهندس المشرف (dynamic, seq-based) */

import React, { useState } from 'react';
import {
  Activity, CheckSquare, Percent, Camera, HardHat, ShieldAlert, Lock, DollarSign, ChevronUp, ChevronDown,
} from 'lucide-react';
import { DarkCard, DarkInput, DarkTextArea } from '../DarkUI';
import type { SharedFormProps } from './_shared';
import { useFormDraft } from './useFormDraft';

interface FormF14Props extends SharedFormProps {
  seq: number;
}

const FormF14SupervisionReport: React.FC<FormF14Props> = ({ rec, user, api, project, isEditable, isCompleted, seq }) => {
  const F14_DEFAULTS = {
    seq,
    date: new Date().toISOString().split('T')[0],
    engineerName: user.fullName,
    recommendation: '',
    pledge: false,
    progress: {} as Record<string, any>,
    requestScopeChange: false,
    triggersPayment: false,
  };
  const [draft, setDraft] = useFormDraft<typeof F14_DEFAULTS>({
    api, user, project, rec, draftKey: `F-14-seq-${seq}`, initial: F14_DEFAULTS,
  });
  const visitData = { date: draft.date, engineerName: draft.engineerName, recommendation: draft.recommendation, pledge: draft.pledge };
  const setVisitData = (next: typeof visitData) => setDraft(d => ({ ...d, ...next }));
  const progress = draft.progress;
  const setProgress = (next: any) => setDraft(d => ({ ...d, progress: next }));
  const [expandedSpaces, setExpandedSpaces] = useState<number[]>([1]);
  const requestScopeChange = draft.requestScopeChange;
  const setRequestScopeChange = (v: boolean) => setDraft(d => ({ ...d, requestScopeChange: v }));
  const triggersPayment = draft.triggersPayment;
  const setTriggersPayment = (v: boolean) => setDraft(d => ({ ...d, triggersPayment: v }));
  const [busy, setBusy] = useState(false);
  const dis = !isEditable;

  const f08 = api.forms.find(f => f.code === 'F-08' && f.projectRefId === project.id);
  const freezedDiagnosisWorks: any[] = (f08?.data?.works || []).length > 0
    ? f08!.data.works.map((w: any, i: number) => ({ id: w.id || i + 1, name: w.name || `المساحة ${i + 1}`, civil: '—', electrical: '—', plumbing: '—' }))
    : [
      { id: 1, name: 'المجلس الرئيسي', civil: 'تكسير بلاط، عزل سقف، دهانات', electrical: '2 سبوت لايت، 1 مفتاح', plumbing: 'لا يوجد' },
      { id: 2, name: 'دورة المياه', civil: 'عزل أرضيات، سيراميك جديد', electrical: '1 شفاط', plumbing: 'تأسيس مواسير، كرسي إفرنجي' },
    ];

  const toggleSpace = (id: number) => setExpandedSpaces(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const submit = async () => {
    if (!isEditable || busy) return;
    setBusy(true);
    try {
      const payload = {
        seq,
        ...visitData,
        progress,
        requestScopeChange,
        triggersPayment,
      };
      if (rec) {
        await api.approveForm(rec.id, user, 'اعتماد تقرير الإشراف', payload);
      } else {
        await api.createForm({
          code: 'F-14', user,
          projectId: project.projectId || '',
          projectRefId: project.id,
          beneficiaryName: project.beneficiaryName,
          data: payload,
        });
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1a0f2e] border border-[#502b79] p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
        <Activity className="w-6 h-6 text-[#a871f7]" />
        <div>
          <h3 className="text-[#a871f7] font-bold text-sm">تقرير الزيارة الميدانية رقم ({seq}) (F-14)</h3>
          <p className="text-gray-300 text-xs mt-1">متابعة الإنجاز وتقييمه بناءً على كراسة التشخيص المعتمدة (F-08).</p>
        </div>
      </div>

      <DarkCard title="بيانات الزيارة الحالية" icon={CheckSquare}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DarkInput disabled={dis} label="تاريخ الزيارة" type="date" required value={visitData.date} onChange={(e: any) => setVisitData({ ...visitData, date: e.target.value })} />
          <DarkInput disabled={dis} label="اسم المهندس المشرف" required value={visitData.engineerName} onChange={(e: any) => setVisitData({ ...visitData, engineerName: e.target.value })} />
        </div>
      </DarkCard>

      <div className="mb-6">
        <h3 className="text-sm font-extrabold text-[#43bba1] mb-3 flex items-center gap-2"><Percent className="w-4 h-4" /> تقييم إنجاز المساحات بناءً على كراسة التشخيص</h3>
        {freezedDiagnosisWorks.map((space, index) => {
          const isExpanded = expandedSpaces.includes(space.id);
          const spacePercentage = progress[space.id]?.percentage || 0;
          return (
            <div key={space.id} className={`bg-[#050505] rounded-xl border transition-all duration-300 overflow-hidden mb-3 ${isExpanded ? 'border-[#3c1d5d]' : 'border-gray-800'}`}>
              <div className="bg-[#111] border-b border-gray-800 p-3 flex items-center justify-between">
                <button type="button" onClick={() => toggleSpace(space.id)} className="flex items-center gap-3 font-bold text-gray-300 outline-none hover:text-white">
                  {isExpanded ? <ChevronUp size={18} className="text-[#a871f7]" /> : <ChevronDown size={18} className="text-gray-500" />}
                  <span className={`${isExpanded ? 'text-[#a871f7]' : ''}`}>{index + 1}. {space.name}</span>
                </button>
                <div className="flex items-center gap-3 bg-[#0a0a0a] px-3 py-1.5 rounded-lg border border-gray-800 w-1/2 md:w-1/3 shadow-inner">
                  <span className="text-xs font-bold text-[#43bba1] w-8">{spacePercentage}%</span>
                  <input disabled={dis} type="range" min="0" max="100" step="5" value={spacePercentage} onChange={(e) => setProgress({ ...progress, [space.id]: { ...progress[space.id], percentage: e.target.value } })} className="w-full accent-[#43bba1] h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer disabled:opacity-50" />
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 bg-[#0c0c0c] animate-fade-in">
                  <div className="bg-[#050505] border border-gray-800 rounded-lg p-3 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div><span className="text-[10px] text-gray-500 block mb-1 font-bold">المدنية والتشطيبات</span><p className="text-xs text-gray-300 font-medium leading-relaxed">{space.civil}</p></div>
                    <div><span className="text-[10px] text-gray-500 block mb-1 font-bold">الكهرباء</span><p className="text-xs text-gray-300 font-medium leading-relaxed">{space.electrical}</p></div>
                    <div><span className="text-[10px] text-gray-500 block mb-1 font-bold">السباكة</span><p className="text-xs text-gray-300 font-medium leading-relaxed">{space.plumbing}</p></div>
                  </div>

                  <div className="space-y-4">
                    <DarkTextArea disabled={dis} label={`ملاحظات الإنجاز لـ (${space.name})`} rows={1} value={progress[space.id]?.notes || ''} onChange={(e: any) => setProgress({ ...progress, [space.id]: { ...progress[space.id], notes: e.target.value } })} placeholder="اكتب ملاحظاتك على الأعمال المنجزة في هذه المساحة..." />
                    <div className="pt-2">
                      <label className={`cursor-pointer border border-dashed border-gray-700 text-gray-400 px-4 py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${dis ? 'bg-[#050505] opacity-50' : 'bg-[#111] hover:border-[#a871f7] hover:text-white'}`}>
                        <Camera size={16} /> إرفاق صور الإنجاز لهذه المساحة <input disabled={dis} type="file" multiple accept="image/*" className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={`mb-6 border-2 rounded-xl overflow-hidden shadow-sm transition-all ${requestScopeChange ? 'border-[#eab308]/50' : 'border-gray-800'}`}>
        <div className={`p-4 flex items-center gap-3 ${requestScopeChange ? 'bg-[#1a1a0f] border-b border-[#5c4a15]' : 'bg-[#0c0c0c]'}`}>
          <input disabled={dis} type="checkbox" id={`scopeChange_${seq}`} checked={requestScopeChange} onChange={(e) => setRequestScopeChange(e.target.checked)} className="w-5 h-5 accent-[#eab308] rounded cursor-pointer disabled:opacity-50" />
          <label htmlFor={`scopeChange_${seq}`} className="cursor-pointer font-bold text-[#eab308] flex items-center gap-2">
            <HardHat size={20} /> تفعيل طلب اعتماد بنود أعمال إضافية (يُولد نموذج F-23 آلياً في القائمة)
          </label>
        </div>
      </div>

      <DarkCard title="توصيات المهندس واستحقاق الدفعات" icon={Activity}>
        <DarkTextArea disabled={dis} label="التوصية العامة للمشروع / الملاحظات الميدانية *" required rows={3} value={visitData.recommendation} onChange={(e: any) => setVisitData({ ...visitData, recommendation: e.target.value })} />
      </DarkCard>

      <div className={`p-5 rounded-xl border-2 transition-all ${triggersPayment ? 'bg-[#05110e] border-[#43bba1]' : 'bg-[#0a0a0a] border-gray-800'}`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input disabled={dis} type="checkbox" checked={triggersPayment} onChange={(e) => setTriggersPayment(e.target.checked)} className="w-5 h-5 mt-0.5 rounded accent-[#43bba1] cursor-pointer disabled:opacity-50" />
          <div>
            <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2"><DollarSign className="w-4 h-4 text-[#43bba1]" /> استحقاق المقاول لدفعة مالية بناءً على نسبة الإنجاز</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              تحديد هذا الخيار سيقوم بتثبيت (طلب صرف دفعة) أسفل هذا التقرير مباشرة وتفعيله للإدارة المالية، كما سيولد تقريراً دورياً جديداً آلياً.
            </p>
          </div>
        </label>
      </div>

      {isEditable && !isCompleted ? (
        <div className="bg-[#0f0f0f] rounded-xl border border-[#43bba1]/50 p-6 shadow-[0_0_15px_rgba(67,187,161,0.1)]">
          <div className="flex items-start gap-3 mb-5 bg-[#0a0a0a] p-4 rounded-lg border border-gray-800">
            <input type="checkbox" id={`pl_${seq}`} checked={visitData.pledge} onChange={(e) => setVisitData({ ...visitData, pledge: e.target.checked })} className="w-5 h-5 mt-0.5 rounded accent-[#43bba1] cursor-pointer" />
            <label htmlFor={`pl_${seq}`} className="cursor-pointer select-none">
              <h4 className="text-sm font-bold text-white mb-1">توثيق التقرير الميداني</h4>
              <p className="text-xs text-gray-500 font-medium">أقر بصفتي المهندس المشرف بمطابقة النسب أعلاه للواقع الميداني الفعلي.</p>
            </label>
          </div>
          <button onClick={submit} disabled={!visitData.pledge || busy} className={`w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all shadow-md ${visitData.pledge ? 'bg-gradient-to-r from-[#43bba1] to-[#359d86] text-black hover:from-[#50d1b5]' : 'bg-[#111] text-gray-600 border border-gray-800 cursor-not-allowed'}`}>
            <ShieldAlert className="w-5 h-5" /> {busy ? 'جارٍ الحفظ...' : 'حفظ التقرير وإرساله'}
          </button>
        </div>
      ) : isCompleted ? (
        <div className="px-5 py-4 rounded-xl text-base font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex items-center justify-center gap-2"><Lock className="w-5 h-5" /> تم اعتماد ورفع التقرير بنجاح</div>
      ) : null}
    </div>
  );
};

export default FormF14SupervisionReport;
