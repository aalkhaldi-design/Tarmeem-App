/* F-22 — توفير سكن بديل */

import React, { useState } from 'react';
import { Mail, FileText, UploadCloud, CheckCircle2, X, Lock } from 'lucide-react';
import { DarkCard, DarkInput, DarkReadOnlyField } from '../DarkUI';
import type { SharedFormProps } from './_shared';

const FormF22Housing: React.FC<SharedFormProps> = ({ rec, user, api, project, isEditable, isCompleted }) => {
  const init = rec?.data || {};
  const [data, setData] = useState<any>({
    partnerEntity: init.partnerEntity || 'جمعية البر بالشرقية',
    periodFrom: init.periodFrom || '',
    periodTo: init.periodTo || '',
    employeePledge: !!init.employeePledge,
  });
  const [attachedFile, setAttachedFile] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const dis = !isEditable;

  const handleFileChange = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile({ name: e.target.files[0].name, previewUrl: URL.createObjectURL(e.target.files[0]) });
    }
  };
  const removeFile = () => {
    if (attachedFile?.previewUrl) URL.revokeObjectURL(attachedFile.previewUrl);
    setAttachedFile(null);
  };

  const submit = async () => {
    if (!isEditable || busy) return;
    setBusy(true);
    try {
      if (rec) {
        await api.approveForm(rec.id, user, 'إصدار خطاب السكن البديل', data);
      } else {
        await api.createForm({
          code: 'F-22', user,
          projectId: project.projectId || '',
          projectRefId: project.id,
          beneficiaryName: project.beneficiaryName,
          data,
          files: attachedFile ? [attachedFile] : [],
        });
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <DarkCard title="بيانات التوجيه" icon={Mail}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DarkInput disabled={dis} label="إلى (الجهة الشريكة)" required value={data.partnerEntity} onChange={(e: any) => setData({ ...data, partnerEntity: e.target.value })} />
          <DarkReadOnlyField label="من" value="جمعية ترميم" />
        </div>
      </DarkCard>

      <DarkCard title="نص الخطاب الآلي (يُولد من بيانات F-18 و F-02)" icon={FileText}>
        <div className="bg-[#111] border border-gray-800 p-6 rounded-xl text-gray-300 leading-loose text-justify font-medium text-sm">
          <p>إشارةً إلى الاتفاقية المبرمة بين جمعية ترميم وجمعية <span className="text-[#a871f7] font-bold">{data.partnerEntity || '...'}</span></p>
          <p className="mt-4">نفيدكم بأن المقاول سوف يبدأ أعمال الترميم، ولذلك يلزم إخلاء المنزل بتاريخ <span className="font-bold text-red-500">{data.periodFrom || '—'}</span>.</p>
          <div className="mt-5 bg-[#0a0a0a] p-4 rounded-lg border border-gray-800 flex flex-wrap items-center gap-2">
            <span>آملين منكم توفير سكن بديل للأسرة خلال الفترة من</span>
            <input disabled={dis} type="date" required value={data.periodFrom} onChange={(e: any) => setData({ ...data, periodFrom: e.target.value })} className="px-3 py-1.5 text-sm border border-gray-700 rounded-md outline-none focus:border-[#43bba1] bg-[#050505] text-[#43bba1] font-bold" />
            <span>إلى</span>
            <input disabled={dis} type="date" required value={data.periodTo} onChange={(e: any) => setData({ ...data, periodTo: e.target.value })} className="px-3 py-1.5 text-sm border border-gray-700 rounded-md outline-none focus:border-[#43bba1] bg-[#050505] text-[#43bba1] font-bold" />.
          </div>
        </div>
      </DarkCard>

      <DarkCard title="مرفقات الخطاب (البيان المرفق للأثاث)" icon={UploadCloud}>
        <div className="bg-[#050505] p-6 rounded-xl border-2 border-dashed border-gray-800 text-center">
          <UploadCloud className="w-10 h-10 text-[#502b79] mx-auto mb-3" />
          <p className="text-sm font-bold text-[#a871f7] mb-2">إرفاق بيان الأثاث أو التسعيرات</p>
          {isEditable && !attachedFile && (
            <label className="cursor-pointer bg-[#111] text-gray-300 px-6 py-2.5 rounded-lg text-sm font-bold border border-gray-700 hover:border-[#a871f7]">
              تصفح الملفات <input type="file" accept="image/*,.pdf,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
            </label>
          )}
          {attachedFile && (
            <div className="mt-2 flex justify-between items-center bg-[#111] p-3 rounded-lg border border-[#43bba1]/30 text-sm">
              <div className="flex items-center gap-2 text-gray-300 font-bold"><CheckCircle2 size={18} className="text-[#43bba1]" /><span className="truncate">{attachedFile.name}</span></div>
              {isEditable && <button type="button" onClick={removeFile} className="text-red-500 hover:bg-[#3a1515] p-1.5 rounded-md"><X size={16} /></button>}
            </div>
          )}
        </div>
      </DarkCard>

      {isEditable && !isCompleted ? (
        <div className="bg-[#0f0f0f] rounded-xl border border-[#43bba1]/50 p-6">
          <div className="flex items-start gap-4 mb-5 bg-[#0a0a0a] p-4 rounded-xl border border-gray-800">
            <input type="checkbox" required checked={data.employeePledge} onChange={(e) => setData({ ...data, employeePledge: e.target.checked })} className="w-6 h-6 mt-1 rounded accent-[#43bba1]" />
            <label className="text-white font-bold text-sm">اعتماد إصدار الخطاب وتوجيهه للجهة الشريكة</label>
          </div>
          <button onClick={submit} disabled={!data.employeePledge || busy} className={`w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 ${data.employeePledge ? 'bg-[#43bba1] text-black shadow-md' : 'bg-[#111] text-gray-600 border border-gray-800'}`}>{busy ? 'جارٍ الإصدار...' : 'اعتماد وإصدار الخطاب الرسمي'}</button>
        </div>
      ) : isCompleted ? (
        <div className="px-5 py-4 rounded-xl text-base font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex items-center justify-center"><Lock className="w-5 h-5 inline mr-2" /> تم توجيه الخطاب للجهة الشريكة بنجاح</div>
      ) : null}
    </div>
  );
};

export default FormF22Housing;
