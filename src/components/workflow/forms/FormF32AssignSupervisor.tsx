/* F-09 backend — تعيين المهندس المشرف */

import React, { useState } from 'react';
import { UserCog, Lock } from 'lucide-react';
import { DarkCard, DarkSelect } from '../DarkUI';
import type { SharedFormProps } from './_shared';

const FormF32AssignSupervisor: React.FC<SharedFormProps> = ({ rec, user, users, api, project, isEditable, isCompleted }) => {
  const [engineerId, setEngineerId] = useState<string>(rec?.data?.engineerId || '');
  const [busy, setBusy] = useState(false);
  const dis = !isEditable;

  const engineerOptions = users
    .filter(u => u.role === 'DIAGNOSIS_ENGINEER')
    .map(u => ({ id: u.id, name: u.fullName }));

  const submit = async () => {
    if (!isEditable || !engineerId || busy) return;
    setBusy(true);
    try {
      const eng = users.find(u => u.id === engineerId);
      const payload = { engineerId, engineerName: eng?.fullName || '' };
      if (rec) {
        await api.approveForm(rec.id, user, 'تعيين المهندس المشرف', payload);
      } else {
        await api.createForm({
          code: 'F-09', user,
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
      <DarkCard title="توجيه الإشراف الهندسي الميداني" icon={UserCog}>
        <div className="bg-[#1a0f2e]/30 border border-[#3c1d5d] p-4 rounded-xl text-sm text-[#a871f7] leading-relaxed mb-5">
          تمت ترسية المشروع بنجاح واعتماد المقاول. يرجى الآن اختيار المهندس الذي سيشرف على التنفيذ الميداني لمتابعة تقارير الإنجاز وطلبات الدفعات.
        </div>
        <DarkSelect disabled={dis} label="اختر المهندس المشرف" required options={engineerOptions} value={engineerId} onChange={(e: any) => setEngineerId(e.target.value)} />
      </DarkCard>
      <div className="flex justify-end pt-2">
        {isEditable && !isCompleted ? (
          <button disabled={!engineerId || busy} onClick={submit} className="w-full md:w-auto px-8 py-3.5 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-[#43bba1] to-[#359d86] hover:from-[#50d1b5] transition-all disabled:opacity-50 shadow-md">{busy ? 'جارٍ التكليف...' : 'تكليف المهندس المشرف'}</button>
        ) : isCompleted ? (
          <div className="px-5 py-3 rounded-md text-sm font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex items-center gap-2 w-full md:w-auto justify-center"><Lock className="w-4 h-4" /> تم التكليف للمشرف الميداني</div>
        ) : null}
      </div>
    </div>
  );
};

export default FormF32AssignSupervisor;
