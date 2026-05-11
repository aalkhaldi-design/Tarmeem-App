/* F-33 — توثيق بدء العمل */

import React, { useState } from 'react';
import { Activity, CheckCircle2, Lock } from 'lucide-react';
import { DarkCard, DarkInput } from '../DarkUI';
import type { SharedFormProps } from './_shared';
import { useFormDraft } from './useFormDraft';

const FormF33StartDoc: React.FC<SharedFormProps> = ({ rec, user, api, project, isEditable, isCompleted }) => {
  const [draft, setDraft] = useFormDraft<{ startDate: string; pledge: boolean }>({
    api, user, project, rec, draftKey: 'F-33', initial: { startDate: '', pledge: false },
  });
  const date = draft.startDate;
  const setDate = (v: string) => setDraft(d => ({ ...d, startDate: v }));
  const pledge = draft.pledge;
  const setPledge = (v: boolean) => setDraft(d => ({ ...d, pledge: v }));
  const [busy, setBusy] = useState(false);
  const dis = !isEditable;

  const submit = async () => {
    if (!isEditable || busy) return;
    setBusy(true);
    try {
      const payload = { startDate: date, pledge };
      if (rec) {
        await api.approveForm(rec.id, user, 'توثيق بدء الأعمال', payload);
      } else {
        await api.createForm({
          code: 'F-33', user,
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
      <DarkCard title="التوثيق الميداني لبدء العمل" icon={Activity}>
        <div className="bg-[#111] p-5 rounded-xl border border-gray-800 mb-5">
          <p className="text-sm text-gray-300 leading-relaxed font-medium">
            بصفتك المهندس المشرف، هل تؤكد أن المقاول قد استلم الموقع فعلياً وبدأ في أعمال الترميم، وتم التأكد من جاهزية الموقع وخلوه من العوائق؟
          </p>
        </div>
        <div className="w-full md:w-1/2">
          <DarkInput disabled={dis} label="تاريخ بدء الأعمال الفعلي في الموقع *" type="date" required value={date} onChange={(e: any) => setDate(e.target.value)} />
        </div>
      </DarkCard>

      {isEditable && !isCompleted ? (
        <div className="bg-[#0f0f0f] rounded-xl border border-[#43bba1]/50 p-6 shadow-sm">
          <div className="flex items-start gap-4 mb-5 bg-[#0a0a0a] p-4 rounded-xl border border-gray-800">
            <input type="checkbox" id="pf33" checked={pledge} onChange={(e) => setPledge(e.target.checked)} className="w-6 h-6 mt-1 rounded accent-[#43bba1] cursor-pointer" />
            <label htmlFor="pf33" className="cursor-pointer select-none">
              <h4 className="text-base font-bold text-white mb-2">توثيق بدء العمل رسمياً</h4>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">أقر بأن العمل قد بدأ فعلياً في الموقع في التاريخ المحدد أعلاه.</p>
            </label>
          </div>
          <button onClick={submit} disabled={!pledge || !date || busy} className={`w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all shadow-md ${(pledge && date) ? 'bg-gradient-to-r from-[#43bba1] to-[#359d86] text-black hover:from-[#50d1b5]' : 'bg-[#111] text-gray-600 border border-gray-800 cursor-not-allowed'}`}>
            <CheckCircle2 className="w-5 h-5" /> {busy ? 'جارٍ التوثيق...' : 'توثيق البدء وانتقال المشروع لمسار التنفيذ'}
          </button>
        </div>
      ) : isCompleted ? (
        <div className="px-5 py-4 rounded-xl text-base font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex justify-center gap-2 shadow-sm"><Lock className="w-5 h-5" /> تم التوثيق بنجاح، المشروع الآن قيد التنفيذ</div>
      ) : null}
    </div>
  );
};

export default FormF33StartDoc;
