/* F-52 — طلب تصوير وتوثيق */

import React, { useState } from 'react';
import { Camera, FileText, UserCheck, Lock } from 'lucide-react';
import { DarkCard, DarkReadOnlyField } from '../DarkUI';
import type { SharedFormProps } from './_shared';
import { useFormDraft } from './useFormDraft';

const phases = ['قبل (تشخيص)', 'أثناء التنفيذ', 'يوم التسليم', 'مبادرة تطوعية'];

const F52_DEFAULTS = { targetDate: '', docPhase: 'يوم التسليم', mediaPledge: false };

const FormF52Media: React.FC<SharedFormProps> = ({ rec, user, api, project, isEditable, isCompleted }) => {
  const [data, setData] = useFormDraft<typeof F52_DEFAULTS>({
    api, user, project, rec, draftKey: 'F-52', initial: F52_DEFAULTS,
  });
  const [busy, setBusy] = useState(false);
  const dis = !isEditable;

  const submit = async () => {
    if (!isEditable || busy) return;
    setBusy(true);
    try {
      const payload = { ...data, type: data.docPhase };
      if (rec) {
        await api.approveForm(rec.id, user, 'توجيه طلب التوثيق', payload);
      } else {
        await api.createForm({
          code: 'F-52', user,
          projectId: project.projectId || '',
          projectRefId: project.id,
          beneficiaryName: project.beneficiaryName,
          data: payload,
        });
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[#1a0f2e] border border-[#502b79] p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
        <Camera className="w-6 h-6 text-[#a871f7]" />
        <div>
          <h3 className="text-[#a871f7] font-bold text-sm">طلب تصوير وتوثيق إعلامي (F-52)</h3>
          <p className="text-gray-300 text-xs mt-1">يُوجه هذا الطلب لإدارة الاتصال المؤسسي لتنسيق الزيارة وتوثيق الأثر.</p>
        </div>
      </div>

      <DarkCard title="تفاصيل المهمة (مولدة آلياً)" icon={FileText}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <DarkReadOnlyField label="مُقدم الطلب (من)" value="إدارة المشاريع والهندسة" />
          <DarkReadOnlyField label="مُوجه إلى (إلى)" value="إدارة الاتصال المؤسسي (قسم الإعلام)" highlight />
          <DarkReadOnlyField label="اسم الأسرة (الموقع)" value={`${project.beneficiaryName} (${project.city || ''}${project.neighborhood ? ' - ' + project.neighborhood : ''})`} className="md:col-span-2" />
        </div>

        <div className="bg-[#111] border border-gray-800 p-5 rounded-xl mb-5">
          <label className="block text-sm font-bold text-gray-400 mb-4">مرحلة التوثيق المستهدفة:</label>
          <div className="flex flex-wrap gap-3">
            {phases.map(phase => (
              <label key={phase} className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-all ${data.docPhase === phase ? 'bg-[#1a0f2e] border-[#502b79] text-[#a871f7] shadow-sm' : 'bg-[#050505] border-gray-800 text-gray-500 hover:border-gray-700'}`}>
                <input disabled={dis} type="radio" checked={data.docPhase === phase} onChange={() => setData({ ...data, docPhase: phase })} className="hidden" />
                <span className="font-bold text-sm">{phase}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-[#050505] border border-gray-800 p-5 rounded-xl text-gray-300 leading-loose text-justify font-medium text-sm">
          بناءً على موافقة الأسرة المستفيدة، نأمل منكم التكرم بتنسيق زيارة ميدانية لتصوير وتوثيق الموقع وتسليمه، وذلك بتاريخ:
          <input disabled={dis} type="date" required value={data.targetDate} onChange={e => setData({ ...data, targetDate: e.target.value })} className="inline-block px-3 py-1.5 mx-2 text-sm border border-gray-700 bg-[#111] rounded outline-none focus:border-[#43bba1] text-[#43bba1] font-bold" />
        </div>
      </DarkCard>

      {isEditable && !isCompleted ? (
        <div className="bg-[#0f0f0f] rounded-xl border border-[#43bba1]/50 p-6 shadow-sm">
          <div className="flex items-start gap-4 mb-5 bg-[#0a0a0a] p-4 rounded-xl border border-gray-800">
            <input type="checkbox" id="pledge_f52" required checked={data.mediaPledge} onChange={(e) => setData({ ...data, mediaPledge: e.target.checked })} className="w-6 h-6 mt-1 rounded accent-[#43bba1] cursor-pointer" />
            <label htmlFor="pledge_f52" className="cursor-pointer select-none">
              <h4 className="text-base font-bold text-white mb-2">إقرار الموظف واعتماد الطلب</h4>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">أقر بصفتي مُصدر الطلب بصحة التوجيه والتواريخ المحددة، وأطلب من قسم الإعلام التنسيق لتنفيذ التوثيق بالموعد المحدد.</p>
            </label>
          </div>
          <button onClick={submit} disabled={!data.mediaPledge || !data.targetDate || busy} className={`w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all shadow-md ${(data.mediaPledge && data.targetDate) ? 'bg-gradient-to-r from-[#43bba1] to-[#359d86] text-black hover:from-[#50d1b5]' : 'bg-[#111] text-gray-600 border border-gray-800 cursor-not-allowed'}`}>
            <UserCheck className="w-5 h-5" /> {busy ? 'جارٍ التوجيه...' : 'توجيه واعتماد الطلب لقسم الإعلام'}
          </button>
        </div>
      ) : isCompleted ? (
        <div className="px-5 py-4 rounded-xl text-base font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex items-center justify-center gap-2 shadow-sm"><Lock className="w-5 h-5" /> تم التوجيه لإدارة الاتصال المؤسسي بانتظار تنفيذهم ورفع المخرجات</div>
      ) : null}
    </div>
  );
};

export default FormF52Media;
