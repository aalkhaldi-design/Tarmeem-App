/* F-21 / F-04 backend — تعيين مهندس التشخيص */

import React, { useState } from 'react';
import { Lock, UserCog } from 'lucide-react';
import { DarkCard, DarkSelect } from '../DarkUI';
import type { SharedFormProps } from './_shared';

const FormF21AssignEngineer: React.FC<SharedFormProps> = ({ rec, user, users, api, project, isEditable, isCompleted }) => {
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
        await api.approveForm(rec.id, user, 'تعيين مهندس التشخيص', payload);
      } else {
        await api.createForm({
          code: 'F-04', user,
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
      <DarkCard title="توجيه الزيارة الميدانية" icon={UserCog}>
        <p className="text-sm text-gray-400 mb-4">تم إحالة المشروع من قسم البحث الاجتماعي. يرجى الآن اختيار المهندس المسؤول لزيارة التشخيص لفتح كراسة التقييم.</p>
        <DarkSelect disabled={dis} label="اختر المهندس المعاين" required options={engineerOptions} value={engineerId} onChange={(e: any) => setEngineerId(e.target.value)} />
      </DarkCard>
      <div className="flex justify-end pt-2">
        {isEditable && !isCompleted ? (
          <button disabled={!engineerId || busy} onClick={submit} className="w-full py-3.5 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-[#43bba1] to-[#359d86] hover:from-[#50d1b5] transition-all disabled:opacity-50 shadow-md">{busy ? 'جارٍ التكليف...' : 'تكليف المهندس وإشعار النظام'}</button>
        ) : isCompleted ? (
          <div className="px-5 py-3 rounded-md text-sm font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex items-center gap-2 w-full justify-center"><Lock className="w-4 h-4" /> تم التكليف</div>
        ) : null}
      </div>
    </div>
  );
};

export default FormF21AssignEngineer;
