/* F-03 card 1 (step 1) — executive director's approval. */

import React, { useState } from 'react';
import { CheckCircle2, XCircle, Lock, UserCheck } from 'lucide-react';
import { DarkCard, DarkReadOnlyField, DarkTextArea } from '../DarkUI';
import type { SharedFormProps } from './_shared';

const FormF031: React.FC<SharedFormProps> = ({ rec, user, api, project, isEditable, isCompleted }) => {
  const [executiveNotes, setExecutiveNotes] = useState<string>(rec?.data?.executiveNotes || '');
  const [busy, setBusy] = useState(false);
  const dis = !isEditable;

  const f02 = api.forms.find(f => f.code === 'F-02' && f.projectRefId === project.id);
  const eligibilityText = `${rec?.data?.eligibility || '—'} ${rec?.data?.managerNotes ? '- ' + rec.data.managerNotes : ''}`;

  const submit = async (decision: 'approved' | 'rejected') => {
    if (!isEditable || !rec || busy) return;
    setBusy(true);
    try {
      if (decision === 'approved') {
        await api.approveForm(rec.id, user, executiveNotes, { executiveNotes });
      } else {
        await api.rejectForm(rec.id, user, executiveNotes || 'رفض المدير التنفيذي');
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DarkReadOnlyField label="رقم الحالة" value={f02?.data?.caseRef || project.projectId || '—'} />
        <DarkReadOnlyField label="الاستحقاق ورأي الإدارة" value={eligibilityText} />
      </div>
      <DarkCard title="قرار المدير التنفيذي" icon={UserCheck}>
        <DarkTextArea disabled={dis} label="توصية المدير التنفيذي" rows={3} value={executiveNotes} onChange={(e: any) => setExecutiveNotes(e.target.value)} placeholder="اكتب ملاحظاتك وقرارك هنا..." />
        {isEditable && !isCompleted ? (
          <div className="flex gap-3 mt-6">
            <button onClick={() => submit('approved')} disabled={busy} className="flex-1 bg-gradient-to-r from-[#43bba1] to-[#359d86] text-black py-3 rounded-lg font-bold text-sm flex justify-center items-center gap-2 disabled:opacity-50">
              <CheckCircle2 size={18} /> موافقة (Approve)
            </button>
            <button onClick={() => submit('rejected')} disabled={busy} className="flex-1 bg-[#3a1515] border border-[#5c2121] text-red-400 hover:bg-[#5c2121]/50 py-3 rounded-lg font-bold text-sm flex justify-center items-center gap-2">
              <XCircle size={18} /> رفض (Disapprove)
            </button>
          </div>
        ) : isCompleted ? (
          <div className="mt-6 px-5 py-3 rounded-md text-sm font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex justify-center gap-2"><Lock className="w-4 h-4" /> تم تسجيل القرار</div>
        ) : null}
      </DarkCard>
    </div>
  );
};

export default FormF031;
