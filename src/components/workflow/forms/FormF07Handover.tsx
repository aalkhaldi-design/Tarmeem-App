/* F-07 — شهادة تسليم المنزل */

import React, { useState } from 'react';
import { Home, Calendar, ShieldCheck, Camera, UploadCloud, CheckCircle2, X, Plus, Trash2, Lock, FileSignature } from 'lucide-react';
import { DarkCard, DarkInput, DarkReadOnlyField } from '../DarkUI';
import type { SharedFormProps } from './_shared';

const FormF07Handover: React.FC<SharedFormProps> = ({ rec, user, api, project, isEditable, isCompleted }) => {
  const init: any = rec?.data || {};
  const [data, setData] = useState<any>({
    streetName: init.streetName || '',
    supervisingEngineer: init.supervisingEngineer || user.fullName,
    contractorName: init.contractorName || project.contractorName || 'مؤسسة البناء الحديث',
    projectType: init.projectType || 'ترميم',
    actualStartDate: init.actualStartDate || '',
    actualEndDate: init.actualEndDate || '',
    insulationGuarantee: init.insulationGuarantee || '',
    mediaRequested: !!init.mediaRequested,
    employeePledge: !!init.employeePledge,
  });
  const [guarantees, setGuarantees] = useState<any[]>(init.guarantees || [
    { id: 1, item: 'مواد الكهرباء والسباكة', qty: 'متعدد', supplier: 'المورد التقني', invoiceNo: 'INV-0912', duration: 'سنة واحدة' },
  ]);
  const [certificateFile, setCertificateFile] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const dis = !isEditable;

  const handleFileChange = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      setCertificateFile({ name: e.target.files[0].name, previewUrl: URL.createObjectURL(e.target.files[0]) });
    }
  };
  const removeFile = () => {
    if (certificateFile?.previewUrl) URL.revokeObjectURL(certificateFile.previewUrl);
    setCertificateFile(null);
  };

  const submit = async () => {
    if (!isEditable || busy) return;
    setBusy(true);
    try {
      const payload = { ...data, guarantees };
      if (rec) {
        await api.approveForm(rec.id, user, 'اعتماد شهادة التسليم', payload);
      } else {
        await api.createForm({
          code: 'F-07', user,
          projectId: project.projectId || '',
          projectRefId: project.id,
          beneficiaryName: project.beneficiaryName,
          data: payload,
          files: certificateFile ? [certificateFile] : [],
        });
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <DarkCard title="بيانات المشروع" icon={Home}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <DarkReadOnlyField label="اسم المنشأة" value="جمعية ترميم" />
          <DarkReadOnlyField label="اسم المستفيد" value={project.beneficiaryName} highlight />
          <DarkReadOnlyField label="المدينة" value={project.city} />
          <DarkReadOnlyField label="الحي" value={project.neighborhood} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DarkInput disabled={dis} label="الشارع" required value={data.streetName} onChange={(e: any) => setData({ ...data, streetName: e.target.value })} />
          <DarkReadOnlyField label="الجهات الشريكة بالدعم والتوريد" value="جمعية البر بالشرقية" />
          <DarkReadOnlyField label="المهندس المشرف / التنفيذ" value={data.supervisingEngineer} />
        </div>
      </DarkCard>

      <DarkCard title="فترة التنفيذ ونوع المشروع" icon={Calendar}>
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-5 bg-[#111] p-4 rounded-xl border border-gray-800">
          <span className="text-sm font-bold text-gray-400">بناءً على التقييم، تم الانتهاء من:</span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white transition-colors">
              <input disabled={dis} type="radio" checked={data.projectType === 'ترميم'} onChange={() => setData({ ...data, projectType: 'ترميم' })} className="w-4 h-4 accent-[#43bba1]" />
              <span className="font-bold text-sm">أعمال الترميم</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white transition-colors">
              <input disabled={dis} type="radio" checked={data.projectType === 'صيانة'} onChange={() => setData({ ...data, projectType: 'صيانة' })} className="w-4 h-4 accent-[#43bba1]" />
              <span className="font-bold text-sm">أعمال الصيانة الدورية</span>
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DarkInput disabled={dis} label="تاريخ بدء المشروع (الفعلي)" type="date" required value={data.actualStartDate} onChange={(e: any) => setData({ ...data, actualStartDate: e.target.value })} />
          <DarkInput disabled={dis} label="تاريخ الانتهاء والتسليم للأسرة" type="date" required value={data.actualEndDate} onChange={(e: any) => setData({ ...data, actualEndDate: e.target.value })} />
        </div>
      </DarkCard>

      <DarkCard title="الضمانات المتوفرة والمُسلمة للأسرة" icon={ShieldCheck}>
        <p className="text-sm text-gray-400 mb-4">قم بإضافة جميع بنود الضمانات للأجهزة أو المواد التي تم توريدها للمشروع ليتم حفظها في الأرشيف.</p>
        <div className="overflow-x-auto mb-4 border border-gray-800 rounded-xl shadow-sm">
          <table className="w-full text-right text-sm text-gray-300 min-w-[800px]">
            <thead className="bg-[#111] text-gray-400 border-b border-gray-800">
              <tr>
                <th className="p-3 font-bold w-1/4">الصنف / الجهاز</th>
                <th className="p-3 font-bold w-16 text-center">العدد</th>
                <th className="p-3 font-bold w-1/5">التنفيذ والتوريد (الجهة)</th>
                <th className="p-3 font-bold w-1/5">رقم الفاتورة / العقد</th>
                <th className="p-3 font-bold w-1/5">مدة الضمان</th>
                <th className="p-3 font-bold w-12 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {guarantees.map((row) => (
                <tr key={row.id} className="bg-[#050505] border-b border-gray-800 hover:bg-[#0a0a0a] transition-colors">
                  <td className="p-1.5"><DarkInput disabled={dis} value={row.item} onChange={(e: any) => setGuarantees(guarantees.map(g => g.id === row.id ? { ...g, item: e.target.value } : g))} placeholder="مكيف سبلت..." /></td>
                  <td className="p-1.5"><DarkInput disabled={dis} type="text" className="text-center font-bold" value={row.qty} onChange={(e: any) => setGuarantees(guarantees.map(g => g.id === row.id ? { ...g, qty: e.target.value } : g))} /></td>
                  <td className="p-1.5"><DarkInput disabled={dis} value={row.supplier} onChange={(e: any) => setGuarantees(guarantees.map(g => g.id === row.id ? { ...g, supplier: e.target.value } : g))} /></td>
                  <td className="p-1.5"><DarkInput disabled={dis} value={row.invoiceNo} onChange={(e: any) => setGuarantees(guarantees.map(g => g.id === row.id ? { ...g, invoiceNo: e.target.value } : g))} /></td>
                  <td className="p-1.5"><DarkInput disabled={dis} value={row.duration} onChange={(e: any) => setGuarantees(guarantees.map(g => g.id === row.id ? { ...g, duration: e.target.value } : g))} placeholder="سنتين..." /></td>
                  <td className="p-1.5 text-center">
                    {guarantees.length > 1 && isEditable && (
                      <button type="button" onClick={() => setGuarantees(guarantees.filter(g => g.id !== row.id))} className="text-red-500 hover:bg-[#3a1515] p-2 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isEditable && (
          <button type="button" onClick={() => setGuarantees([...guarantees, { id: Date.now(), item: '', qty: '', supplier: '', invoiceNo: '', duration: '' }])} className="bg-[#1a0f2e] text-[#a871f7] border border-dashed border-[#3c1d5d] px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mb-6 hover:bg-[#502b79] hover:text-white transition-colors w-full md:w-auto shadow-sm">
            <Plus size={18} /> إضافة صنف ضمان جديد للجدول
          </button>
        )}
        <div className="w-full md:w-1/2 p-4 bg-[#111] rounded-xl border border-gray-800">
          <DarkInput disabled={dis} label="مدة ضمان العازل (إن وجد)" value={data.insulationGuarantee} onChange={(e: any) => setData({ ...data, insulationGuarantee: e.target.value })} placeholder="مثال: 10 سنوات على العزل المائي" />
        </div>
      </DarkCard>

      <div className={`mb-5 p-5 rounded-xl border-2 transition-all duration-300 shadow-sm ${data.mediaRequested ? 'bg-[#1a0f2e] border-[#502b79]' : 'bg-[#0a0a0a] border-gray-800'}`}>
        <div className="flex items-start gap-4">
          <input disabled={dis} type="checkbox" id="mediaRequested" checked={data.mediaRequested} onChange={(e) => setData({ ...data, mediaRequested: e.target.checked })} className="w-6 h-6 mt-1 rounded accent-[#a871f7] cursor-pointer" />
          <label htmlFor="mediaRequested" className="cursor-pointer select-none">
            <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2"><Camera className="w-5 h-5 text-[#a871f7]" /> طلب تغطية إعلامية وتوثيق مرئي ليوم التسليم (يولد F-52 آلياً)</h4>
            <p className="text-sm text-gray-400 font-medium leading-relaxed">تحديد هذا الخيار سيقوم النظام من خلاله تلقائياً بإنشاء نموذج طلب توثيق وإرساله إلى إدارة الاتصال المؤسسي لتغطية تسليم المنزل وتوثيق الأثر للجهة الداعمة.</p>
          </label>
        </div>
      </div>

      <DarkCard title="إرفاق الشهادة الموقعة ورقياً" icon={UploadCloud}>
        <div className="bg-[#050505] p-6 rounded-xl border-2 border-dashed border-gray-800 text-center hover:border-[#a871f7]/50 transition-colors">
          <UploadCloud className="w-12 h-12 text-[#502b79] mx-auto mb-3" />
          <p className="text-sm font-bold text-[#a871f7] mb-2">إرفاق نسخة شهادة التسليم الموقعة *</p>
          <p className="text-xs text-gray-500 mb-5">يرجى إرفاق المستند الموقّع من (ممثل الأسرة المستفيدة، المهندس المشرف، المقاول إن لزم).</p>
          {isEditable && !certificateFile && (
            <label className="cursor-pointer bg-[#111] text-gray-300 px-6 py-2.5 mt-2 inline-block rounded-lg text-sm font-bold border border-gray-700 hover:border-[#a871f7] hover:text-white transition-all shadow-sm">
              تصفح الملفات من الجهاز
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
            </label>
          )}
          {certificateFile && (
            <div className="mt-4 flex justify-between items-center bg-[#111] p-3 rounded-lg border border-[#43bba1]/40 text-sm shadow-sm max-w-md mx-auto">
              <div className="flex items-center gap-3 text-gray-200 font-bold"><CheckCircle2 size={20} className="text-[#43bba1]" /> <span className="truncate">{certificateFile.name}</span></div>
              {isEditable && <button type="button" onClick={removeFile} className="text-red-500 hover:bg-[#3a1515] p-2 rounded-lg transition-colors"><X size={18} /></button>}
            </div>
          )}
        </div>
      </DarkCard>

      {isEditable && !isCompleted ? (
        <div className="bg-[#0f0f0f] rounded-xl border border-[#43bba1]/50 p-6 shadow-[0_0_15px_rgba(67,187,161,0.1)] mt-2">
          <div className="flex items-start gap-4 mb-5 bg-[#0a0a0a] p-4 rounded-xl border border-gray-800">
            <input type="checkbox" id="employeePledge07" required checked={data.employeePledge} onChange={(e) => setData({ ...data, employeePledge: e.target.checked })} className="w-6 h-6 mt-1 rounded accent-[#43bba1] cursor-pointer" />
            <label htmlFor="employeePledge07" className="cursor-pointer select-none">
              <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2"><FileSignature className="w-5 h-5 text-[#43bba1]" /> اعتماد تسليم المنزل</h4>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">أقر أنا المهندس المشرف، باستكمال جميع بنود الأعمال المتفق عليها، وأن المستفيد قد استلم المنزل مع كافة الضمانات المرفقة أعلاه، وبذلك يُعتبر المشروع منتهياً فنياً.</p>
            </label>
          </div>
          <button onClick={submit} disabled={!data.employeePledge || !certificateFile || busy} className={`w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all shadow-md ${(data.employeePledge && certificateFile) ? 'bg-gradient-to-r from-[#43bba1] to-[#359d86] text-black hover:from-[#50d1b5]' : 'bg-[#111] text-gray-600 border border-gray-800 cursor-not-allowed'}`}>
            <ShieldCheck className="w-5 h-5" /> {busy ? 'جارٍ الاعتماد...' : 'اعتماد شهادة التسليم وإغلاق المشروع نهائياً'}
          </button>
        </div>
      ) : isCompleted ? (
        <div className="px-5 py-4 mt-4 rounded-xl text-base font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex items-center justify-center gap-2 shadow-sm"><Lock className="w-5 h-5" /> تم إغلاق المشروع فنياً، وأُرشفت شهادة التسليم</div>
      ) : null}
    </div>
  );
};

export default FormF07Handover;
