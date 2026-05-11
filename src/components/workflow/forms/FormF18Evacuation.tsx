/* F-18 — تعهد إخلاء المنزل */

import React, { useState } from 'react';
import { Calendar, UploadCloud, CheckCircle2, X, Lock } from 'lucide-react';
import { DarkCard, DarkInput } from '../DarkUI';
import type { SharedFormProps } from './_shared';
import { useFormDraft } from './useFormDraft';

const FormF18Evacuation: React.FC<SharedFormProps> = ({ rec, user, api, project, isEditable, isCompleted }) => {
  const F18_DEFAULTS = {
    renovationStartDate: '',
    renovationEndDate: '',
    evacuationDate: '',
    researcherName: '',
    familyRepName: project.beneficiaryName,
    employeePledge: false,
  };
  const [data, setData] = useFormDraft<typeof F18_DEFAULTS>({
    api, user, project, rec, draftKey: 'F-18', initial: F18_DEFAULTS,
  });
  const [pledgeFile, setPledgeFile] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const dis = !isEditable;

  const handleFileChange = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      setPledgeFile({ name: e.target.files[0].name, previewUrl: URL.createObjectURL(e.target.files[0]) });
    }
  };
  const removeFile = () => {
    if (pledgeFile?.previewUrl) URL.revokeObjectURL(pledgeFile.previewUrl);
    setPledgeFile(null);
  };

  const submit = async () => {
    if (!isEditable || busy) return;
    setBusy(true);
    try {
      const payload = { ...data, evacDate: data.evacuationDate, returnDate: data.renovationEndDate };
      if (rec) {
        await api.approveForm(rec.id, user, 'رقمنة تعهد الإخلاء', payload);
      } else {
        await api.createForm({
          code: 'F-18', user,
          projectId: project.projectId || '',
          projectRefId: project.id,
          beneficiaryName: project.beneficiaryName,
          data: payload,
          files: pledgeFile ? [pledgeFile] : [],
        });
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <DarkCard title="تواريخ التنفيذ والإخلاء المُتفق عليها" icon={Calendar}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <DarkInput disabled={dis} label="تاريخ بدء أعمال الترميم المتوقع" type="date" required value={data.renovationStartDate} onChange={(e: any) => setData({ ...data, renovationStartDate: e.target.value })} />
          <DarkInput disabled={dis} label="تاريخ الانتهاء المتوقع" type="date" required value={data.renovationEndDate} onChange={(e: any) => setData({ ...data, renovationEndDate: e.target.value })} />
          <div className="md:col-span-2">
            <DarkInput disabled={dis} label="تاريخ إخلاء المنزل الفعلي (المُلزم للأسرة)" type="date" required value={data.evacuationDate} onChange={(e: any) => setData({ ...data, evacuationDate: e.target.value })} />
          </div>
        </div>
      </DarkCard>

      <DarkCard title="إرفاق التعهد الورقي الموقع" icon={UploadCloud}>
        <div className="bg-[#050505] p-6 rounded-xl border-2 border-dashed border-gray-800 text-center">
          <UploadCloud className="w-12 h-12 text-[#502b79] mx-auto mb-3" />
          <p className="text-sm font-bold text-[#a871f7] mb-2">إرفاق نسخة التعهد الموقعة *</p>
          {isEditable && !pledgeFile && (
            <label className="cursor-pointer bg-[#111] border border-gray-700 text-gray-300 px-6 py-2.5 rounded-lg text-sm font-bold inline-flex items-center gap-2 hover:border-[#a871f7]">
              تصفح الملفات من الجهاز <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
            </label>
          )}
          {pledgeFile && (
            <div className="mt-4 flex justify-between items-center bg-[#111] p-3 rounded-lg border border-[#43bba1]/40 text-sm shadow-sm max-w-md mx-auto">
              <div className="flex items-center gap-3 text-gray-200 font-bold"><CheckCircle2 size={20} className="text-[#43bba1]" /> <span className="truncate">{pledgeFile.name}</span></div>
              {isEditable && <button type="button" onClick={removeFile} className="text-red-500 hover:bg-[#3a1515] p-2 rounded-lg"><X size={18} /></button>}
            </div>
          )}
        </div>
      </DarkCard>

      {isEditable && !isCompleted ? (
        <div className="bg-[#0f0f0f] rounded-xl border border-[#43bba1]/50 p-6 shadow-sm mt-2">
          <div className="flex items-start gap-4 mb-5 bg-[#0a0a0a] p-4 rounded-xl border border-gray-800">
            <input type="checkbox" required checked={data.employeePledge} onChange={(e) => setData({ ...data, employeePledge: e.target.checked })} className="w-6 h-6 mt-1 rounded accent-[#43bba1] cursor-pointer" />
            <label className="text-base font-bold text-white flex items-center gap-2">إقرار الموظف المسؤول (رقمنة التعهد)</label>
          </div>
          <button onClick={submit} disabled={!data.employeePledge || !pledgeFile || busy} className={`w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-md ${(data.employeePledge && pledgeFile) ? 'bg-[#43bba1] text-black' : 'bg-[#111] text-gray-600 border border-gray-800 cursor-not-allowed'}`}>{busy ? 'جارٍ الرفع...' : 'رقمنة المستند واعتماد التعهد رقمياً'}</button>
        </div>
      ) : isCompleted ? (
        <div className="px-5 py-4 rounded-xl text-base font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex items-center justify-center gap-2 mt-2"><Lock className="w-5 h-5" /> تم رفع المستند الورقي وتوثيق بيانات الإخلاء في النظام</div>
      ) : null}
    </div>
  );
};

export default FormF18Evacuation;
