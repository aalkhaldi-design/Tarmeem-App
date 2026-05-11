/* F-03 card 0 (step 0) — eligibility decision by RESEARCH_MANAGER.
   Single F-03 record shared with FormF031 (step 1) and FormF032 (step 2). */

import React, { useState } from 'react';
import { FileText, CheckCircle2, RefreshCcw, Lock, UserCog } from 'lucide-react';
import { DarkCard, DarkReadOnlyField, DarkTextArea } from '../DarkUI';
import type { SharedFormProps } from './_shared';
import { useFormDraft } from './useFormDraft';

const FormF03: React.FC<SharedFormProps> = ({ rec, user, api, project, isEditable, isCompleted }) => {
  const [draft, setDraft] = useFormDraft<{ eligibility: string; managerNotes: string }>({
    api, user, project, rec, draftKey: 'F-03', initial: { eligibility: '', managerNotes: '' },
  });
  const eligibility = draft.eligibility;
  const managerNotes = draft.managerNotes;
  const setEligibility = (v: string) => setDraft(d => ({ ...d, eligibility: v }));
  const setManagerNotes = (v: string) => setDraft(d => ({ ...d, managerNotes: v }));
  const [busy, setBusy] = useState(false);
  const dis = !isEditable;

  const f02 = api.forms.find(f => f.code === 'F-02' && f.projectRefId === project.id);
  const f02Data = f02?.data || {};

  const submit = async () => {
    if (!isEditable || !eligibility || busy) return;
    setBusy(true);
    try {
      if (rec) {
        await api.approveForm(rec.id, user, managerNotes, { eligibility, managerNotes });
      } else {
        await api.createForm({
          code: 'F-03', user,
          projectId: project.projectId || '',
          projectRefId: project.id,
          beneficiaryName: project.beneficiaryName,
          data: { eligibility, managerNotes },
        });
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <DarkCard title="بيانات دراسة الحالة (للقراءة فقط)" icon={FileText}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DarkReadOnlyField label="رقم الحالة" value={f02Data.caseRef || project.projectId || '—'} />
          <DarkReadOnlyField label="اسم المستفيد" value={f02Data.personal?.fullName || project.beneficiaryName} />
          <DarkReadOnlyField label="المدينة" value={f02Data.personal?.city || project.city} />
          <div className="md:col-span-3">
            <DarkReadOnlyField label="رأي الباحث الميداني" value={f02Data.researcher?.opinion} />
          </div>
        </div>
      </DarkCard>

      <DarkCard title="قرار مدير البحث الاجتماعي" icon={UserCog}>
        <label className="block text-sm font-bold text-gray-400 mb-3">الاستحقاق المبدئي:</label>
        <div className="flex gap-4 mb-5">
          <label className="flex items-center gap-2 cursor-pointer text-gray-200">
            <input disabled={dis} type="radio" checked={eligibility === 'مستحق'} onChange={() => setEligibility('مستحق')} className="w-4 h-4 accent-[#43bba1]" /> مستحق
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-gray-200">
            <input disabled={dis} type="radio" checked={eligibility === 'غير مستحق'} onChange={() => setEligibility('غير مستحق')} className="w-4 h-4 accent-[#43bba1]" /> غير مستحق
          </label>
        </div>
        <DarkTextArea disabled={dis} label="توصية المدير" rows={3} value={managerNotes} onChange={(e: any) => setManagerNotes(e.target.value)} placeholder="اكتب توصيتك أو أسباب الإرجاع هنا..." />

        {isEditable && !isCompleted ? (
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-800">
            <button onClick={submit} disabled={!eligibility || busy} className="flex-1 bg-[#43bba1] hover:bg-[#359d86] text-black py-3 rounded-lg font-bold text-sm flex justify-center items-center gap-2 disabled:opacity-50">
              <CheckCircle2 size={18} /> {busy ? 'جارٍ الإرسال...' : 'إعتماد ورفع للمدير التنفيذي'}
            </button>
            <button onClick={async () => { if (rec) await api.rejectForm(rec.id, user, managerNotes || 'إرجاع للباحث'); }} className="flex-1 bg-[#1a1a1a] hover:bg-[#222] border border-gray-700 text-white py-3 rounded-lg font-bold text-sm flex justify-center items-center gap-2">
              <RefreshCcw size={18} /> إرجاع للباحث
            </button>
          </div>
        ) : isCompleted ? (
          <div className="mt-6 px-5 py-3 rounded-md text-sm font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex justify-center gap-2"><Lock className="w-4 h-4" /> تم الاعتماد</div>
        ) : null}
      </DarkCard>
    </div>
  );
};

export default FormF03;
