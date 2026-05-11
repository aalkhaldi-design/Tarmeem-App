/* F-03 card 2 (step 2) — final transfer to projects by RESEARCH_MANAGER. */

import React, { useState } from 'react';
import { Lock, ArrowLeftRight, UserCheck } from 'lucide-react';
import { DarkCard, DarkTextArea } from '../DarkUI';
import type { SharedFormProps } from './_shared';
import { useFormDraft } from './useFormDraft';

const FormF032: React.FC<SharedFormProps> = ({ rec, user, api, project, isEditable, isCompleted }) => {
  const [draft, setDraft] = useFormDraft<{ managerFinalNotes: string }>({
    api, user, project, rec, draftKey: 'F-03', initial: { managerFinalNotes: '' },
  });
  const managerFinalNotes = draft.managerFinalNotes;
  const setManagerFinalNotes = (v: string) => setDraft(d => ({ ...d, managerFinalNotes: v }));
  const [busy, setBusy] = useState(false);
  const dis = !isEditable;

  const submit = async () => {
    if (!isEditable || !rec || busy) return;
    setBusy(true);
    try {
      await api.approveForm(rec.id, user, managerFinalNotes || 'تحويل إلى إدارة المشاريع', { managerFinalNotes });
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#05110e] border border-[#43bba1]/30 p-4 rounded-xl mb-4">
        <h3 className="text-[#43bba1] font-bold text-sm mb-1 flex items-center gap-2"><UserCheck className="w-4 h-4" /> قرار المدير التنفيذي: تمت الموافقة</h3>
        <p className="text-gray-300 text-xs">{rec?.data?.executiveNotes || 'أوافق على الترميم حسب التوصيات.'}</p>
      </div>
      <DarkCard title="الإجراء النهائي للإحالة" icon={ArrowLeftRight}>
        <p className="text-sm text-gray-400 mb-4 font-semibold">المشروع جاهز للتحويل إلى إدارة المشاريع للبدء بالتشخيص الهندسي وتوليد كراسة (F-08).</p>
        <DarkTextArea disabled={dis} label="ملاحظات الإحالة للمشاريع" rows={2} value={managerFinalNotes} onChange={(e: any) => setManagerFinalNotes(e.target.value)} />
        {isEditable && !isCompleted ? (
          <button onClick={submit} disabled={busy} className="w-full mt-6 bg-gradient-to-r from-[#502b79] to-[#3c1d5d] hover:from-[#603590] text-white py-4 rounded-xl font-bold text-base flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(80,43,121,0.4)] disabled:opacity-50">
            <ArrowLeftRight size={20} /> {busy ? 'جارٍ التحويل...' : 'تحويل لإدارة المشاريع'}
          </button>
        ) : isCompleted ? (
          <div className="mt-6 px-5 py-3 rounded-md text-sm font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex justify-center gap-2"><Lock className="w-4 h-4" /> تمت الإحالة وبدء المرحلة 2</div>
        ) : null}
      </DarkCard>
    </div>
  );
};

export default FormF032;
