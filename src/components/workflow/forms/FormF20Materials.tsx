/* F-20 — خطة توريد المواد */

import React, { useState } from 'react';
import { ClipboardList, Truck, Plus, Trash2, Lock, ArrowLeftRight } from 'lucide-react';
import { DarkCard, DarkSelect, DarkInput, DarkTextArea } from '../DarkUI';
import type { SharedFormProps } from './_shared';

const categories = ['مواد الكهرباء', 'الأدوات الصحية', 'العزل', 'السيراميك'];
const supplyTypes = ['شراء مباشر', 'دعم عيني (مجاني)', 'مخفض (شراكات)'];

const FormF20Materials: React.FC<SharedFormProps> = ({ rec, user, api, project, isEditable, isCompleted }) => {
  const init = rec?.data || {};
  const [materials, setMaterials] = useState<any[]>(init.materials || [
    { id: 1, category: 'مواد الكهرباء', name: '', unit: 'حبة', quantity: '', supplier: '', supplyType: '', pricingDate: '', paymentDate: '', supplyDate: '' },
  ]);
  const [procurementMethod, setProcurementMethod] = useState<string>(init.procurementMethod || 'شراء مباشر');
  const [targetDate, setTargetDate] = useState<string>(init.targetDate || '');
  const [notes, setNotes] = useState<string>(init.notes || '');
  const [pledge, setPledge] = useState<boolean>(!!init.pledge);
  const [busy, setBusy] = useState(false);
  const dis = !isEditable;

  const addMaterial = () => setMaterials([...materials, { id: Date.now(), category: 'مواد الكهرباء', name: '', unit: 'حبة', quantity: '', supplier: '', supplyType: '', pricingDate: '', paymentDate: '', supplyDate: '' }]);
  const removeMaterial = (id: number) => setMaterials(materials.filter(m => m.id !== id));
  const updateMaterial = (id: number, field: string, value: string) => setMaterials(materials.map(m => m.id === id ? { ...m, [field]: value } : m));

  const submit = async () => {
    if (!isEditable || busy) return;
    setBusy(true);
    try {
      const payload = { materials, procurementMethod, targetDate, notes, pledge, items: materials };
      if (rec) {
        await api.approveForm(rec.id, user, 'اعتماد خطة التوريد', payload);
      } else {
        await api.createForm({
          code: 'F-20', user,
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
      <DarkCard title="الخطة اللوجستية وتوريد المواد (مدمجة)" icon={ClipboardList}>
        <div className="overflow-x-auto mb-5 pb-2 rounded-xl border border-gray-800 shadow-sm">
          <table className="w-full text-right border-collapse min-w-[1000px]">
            <thead>
              <tr>
                <th colSpan={4} className="bg-[#1a0f2e] text-[#a871f7] p-3 border-b border-l border-[#3c1d5d] text-center font-bold text-sm">القسم الهندسي (حصر الكميات)</th>
                <th colSpan={5} className="bg-[#05110e] text-[#43bba1] p-3 border-b border-[#144f41] text-center font-bold text-sm">قسم الخدمات المساندة والمشتريات (خطة التوريد)</th>
              </tr>
              <tr className="bg-[#111] text-gray-400 text-xs">
                <th className="p-3 border-b border-l border-gray-800 font-bold w-32">القسم (النوع)</th>
                <th className="p-3 border-b border-l border-gray-800 font-bold w-48">وصف المادة المطلوبة</th>
                <th className="p-3 border-b border-l border-gray-800 font-bold w-20 text-center">الوحدة</th>
                <th className="p-3 border-b border-l border-gray-800 font-bold w-20 text-center">الكمية</th>
                <th className="p-3 border-b border-l border-gray-800 font-bold bg-[#05110e]/40 w-32">جهة التوريد</th>
                <th className="p-3 border-b border-l border-gray-800 font-bold bg-[#05110e]/40 w-32">نوع التوريد</th>
                <th className="p-3 border-b border-l border-gray-800 font-bold bg-[#05110e]/40 w-28 text-center">تاريخ التسعير</th>
                <th className="p-3 border-b border-l border-gray-800 font-bold bg-[#05110e]/40 w-28 text-center">تاريخ السداد</th>
                <th className="p-3 border-b border-gray-800 font-bold bg-[#05110e]/40 w-28 text-center">تاريخ التوريد</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id} className="bg-[#050505] border-b border-gray-800 text-sm hover:bg-[#0a0a0a]">
                  <td className="p-1.5 border-l border-gray-800">
                    <select disabled={dis} value={m.category} onChange={e => updateMaterial(m.id, 'category', e.target.value)} className="w-full px-2 py-2 rounded border border-gray-800 bg-[#111] text-gray-300 outline-none focus:border-[#43bba1] text-xs font-bold">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  </td>
                  <td className="p-1.5 border-l border-gray-800">
                    <input disabled={dis} type="text" required value={m.name} onChange={e => updateMaterial(m.id, 'name', e.target.value)} className="w-full px-3 py-2 rounded border border-gray-800 bg-[#111] text-white outline-none focus:border-[#43bba1] text-xs" />
                  </td>
                  <td className="p-1.5 border-l border-gray-800">
                    <input disabled={dis} type="text" required value={m.unit} onChange={e => updateMaterial(m.id, 'unit', e.target.value)} className="w-full px-2 py-2 rounded border border-gray-800 bg-[#111] text-white outline-none focus:border-[#43bba1] text-center text-xs" />
                  </td>
                  <td className="p-1.5 border-l border-gray-800 text-center">
                    <div className="flex items-center gap-1">
                      <input disabled={dis} type="number" min="1" required value={m.quantity} onChange={e => updateMaterial(m.id, 'quantity', e.target.value)} className="w-full px-2 py-2 rounded border border-gray-800 bg-[#111] text-[#43bba1] outline-none focus:border-[#43bba1] text-center font-bold text-sm" />
                      {isEditable && materials.length > 1 && <button type="button" onClick={() => removeMaterial(m.id)} className="text-red-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                  <td className="p-1.5 border-l border-gray-800 bg-[#05110e]/20"><input disabled={dis} type="text" required value={m.supplier} onChange={e => updateMaterial(m.id, 'supplier', e.target.value)} className="w-full px-3 py-2 rounded border border-gray-800 bg-[#111] text-white outline-none focus:border-[#43bba1] text-xs" /></td>
                  <td className="p-1.5 border-l border-gray-800 bg-[#05110e]/20"><select disabled={dis} required value={m.supplyType} onChange={e => updateMaterial(m.id, 'supplyType', e.target.value)} className="w-full px-2 py-2 rounded border border-gray-800 bg-[#111] text-white outline-none focus:border-[#43bba1] text-xs"><option value="">-- اختر --</option>{supplyTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></td>
                  <td className="p-1.5 border-l border-gray-800 bg-[#05110e]/20"><input disabled={dis} type="date" required value={m.pricingDate} onChange={e => updateMaterial(m.id, 'pricingDate', e.target.value)} className="w-full p-1 rounded border border-gray-800 bg-[#111] text-gray-400 outline-none focus:border-[#43bba1] text-xs text-center" /></td>
                  <td className="p-1.5 border-l border-gray-800 bg-[#05110e]/20"><input disabled={dis} type="date" required value={m.paymentDate} onChange={e => updateMaterial(m.id, 'paymentDate', e.target.value)} className="w-full p-1 rounded border border-gray-800 bg-[#111] text-gray-400 outline-none focus:border-[#43bba1] text-xs text-center" /></td>
                  <td className="p-1.5 bg-[#05110e]/20"><input disabled={dis} type="date" required value={m.supplyDate} onChange={e => updateMaterial(m.id, 'supplyDate', e.target.value)} className="w-full px-2 py-2 rounded border border-gray-800 bg-[#111] text-[#43bba1] outline-none focus:border-[#43bba1] text-xs text-center font-bold" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isEditable && (
          <button type="button" onClick={addMaterial} className="bg-[#1a0f2e] text-[#a871f7] border border-dashed border-[#3c1d5d] px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#502b79] hover:text-white transition-colors w-full shadow-sm">
            <Plus size={18} /> إضافة مادة جديدة للجدول
          </button>
        )}
      </DarkCard>

      <DarkCard title="الآلية والاعتماد" icon={Truck}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <DarkSelect disabled={dis} label="طريقة التوريد الموصى بها *" options={['شراء مباشر', 'تعميد المقاول بالتوريد', 'توفير عبر داعم عيني / شراكات']} value={procurementMethod} onChange={(e: any) => setProcurementMethod(e.target.value)} />
          <DarkInput disabled={dis} type="date" label="تاريخ التوريد المستهدف للبدء *" value={targetDate} onChange={(e: any) => setTargetDate(e.target.value)} />
        </div>
        <DarkTextArea disabled={dis} label="ملاحظات وتوجيهات *" required rows={3} value={notes} onChange={(e: any) => setNotes(e.target.value)} />

        {isEditable && !isCompleted ? (
          <div className="mt-6 border-t border-gray-800 pt-5">
            <div className="flex items-start gap-4 p-4 bg-[#0a0a0a] rounded-xl border border-gray-800 mb-5">
              <input type="checkbox" id="pledge20" checked={pledge} onChange={(e) => setPledge(e.target.checked)} className="w-6 h-6 mt-1 rounded accent-[#43bba1] cursor-pointer" />
              <label htmlFor="pledge20" className="cursor-pointer select-none text-sm font-bold text-white">إقرار بصحة البيانات واعتماد التوريد والمرحلة</label>
            </div>
            <button type="button" onClick={submit} disabled={!pledge || !notes || busy} className={`w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all shadow-md ${pledge ? 'bg-gradient-to-r from-[#43bba1] to-[#359d86] text-black' : 'bg-[#111] text-gray-600 border border-gray-800 cursor-not-allowed'}`}>
              <ArrowLeftRight className="w-5 h-5" /> {busy ? 'جارٍ الاعتماد...' : 'اعتماد خطة التوريد النهائية للمشروع'}
            </button>
          </div>
        ) : isCompleted ? (
          <div className="mt-6 px-5 py-4 rounded-xl text-base font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex items-center justify-center gap-2"><Lock className="w-5 h-5" /> تم الاعتماد والإرسال في مسار النظام</div>
        ) : null}
      </DarkCard>
    </div>
  );
};

export default FormF20Materials;
