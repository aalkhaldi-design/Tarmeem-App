/* F-85 — اعتماد التسعيرات والترسية */

import React, { useState } from 'react';
import { Calculator, Trophy, ShieldAlert, Plus, Trash2, UserCheck, Lock } from 'lucide-react';
import { DarkCard, DarkInput, DarkReadOnlyField, DarkTextArea } from '../DarkUI';
import type { SharedFormProps } from './_shared';

const FormF31Pricing: React.FC<SharedFormProps> = ({ rec, user, api, project, isEditable, isCompleted }) => {
  const init = rec?.data || {};
  const [contractors, setContractors] = useState<any[]>(init.contractors || [
    { id: 1, name: '', amount: '' },
    { id: 2, name: '', amount: '' },
  ]);
  const [selectedContractorId, setSelectedContractorId] = useState<string>(init.winnerContractorId || '');
  const [notes, setNotes] = useState<string>(init.notes || '');
  const [employeePledge, setEmployeePledge] = useState<boolean>(!!init.employeePledge);
  const [busy, setBusy] = useState(false);
  const dis = !isEditable;

  const addContractor = () => setContractors([...contractors, { id: Date.now(), name: '', amount: '' }]);
  const removeContractor = (id: number) => {
    setContractors(contractors.filter(c => c.id !== id));
    if (selectedContractorId === String(id)) setSelectedContractorId('');
  };
  const updateContractor = (id: number, field: string, value: string) => {
    setContractors(contractors.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const validContractors = contractors.filter(c => c.name.trim() !== '' && String(c.amount).trim() !== '');
  const winner = validContractors.find(c => String(c.id) === selectedContractorId);

  const submit = async () => {
    if (!isEditable || busy) return;
    setBusy(true);
    try {
      const payload = {
        contractors, notes, employeePledge,
        winnerContractorId: selectedContractorId,
        winnerContractor: winner?.name,
        winnerPrice: winner?.amount,
      };
      if (rec) {
        await api.approveForm(rec.id, user, notes || 'اعتماد الترسية', payload);
      } else {
        await api.createForm({
          code: 'F-85', user,
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
        <DarkReadOnlyField label="رقم المشروع" value={project.projectId || '—'} highlight />
        <DarkReadOnlyField label="اسم الأسرة" value={project.beneficiaryName} />
      </div>

      <DarkCard title="عروض الأسعار للمقاولين المتقدمين" icon={Calculator}>
        <p className="text-sm text-gray-400 mb-4 leading-relaxed">أدخل أسماء المقاولين وإجمالي عروض الأسعار المقدمة للمقارنة واختيار الأنسب للترسية.</p>
        <div className="space-y-3 mb-5">
          {contractors.map((contractor, index) => (
            <div key={contractor.id} className={`flex flex-col md:flex-row gap-3 p-3 rounded-xl border items-center transition-all ${selectedContractorId === String(contractor.id) ? 'bg-[#1a0f2e] border-[#502b79]' : 'bg-[#050505] border-gray-800'}`}>
              <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                <span className="font-bold text-[#a871f7] text-sm bg-[#111] border border-gray-800 w-8 h-8 flex items-center justify-center rounded-full shrink-0 shadow-sm">{index + 1}</span>
                <DarkInput disabled={dis} label="اسم المقاول / المؤسسة" required className="w-full" value={contractor.name} onChange={(e: any) => updateContractor(contractor.id, 'name', e.target.value)} />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                <DarkInput disabled={dis} label="قيمة العرض (ر.س)" type="number" required className="w-full" value={contractor.amount} onChange={(e: any) => updateContractor(contractor.id, 'amount', e.target.value)} />
                {isEditable && contractors.length > 1 && (
                  <button type="button" onClick={() => removeContractor(contractor.id)} className="mt-5 text-red-500 hover:bg-[#3a1515] p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
        {isEditable && (
          <button type="button" onClick={addContractor} className="bg-[#111] text-[#a871f7] border border-dashed border-gray-700 px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:border-[#a871f7] hover:text-white transition-colors w-full shadow-sm">
            <Plus size={18} /> إضافة مقاول آخر للمقارنة
          </button>
        )}
      </DarkCard>

      <DarkCard title="قرار الترسية واختيار العرض الأنسب" icon={Trophy}>
        <div className="bg-[#05110e] border border-[#144f41] p-5 rounded-xl shadow-sm">
          <label className="block text-sm font-bold text-[#43bba1] mb-3">بصفتك مدير المشاريع، اختر المقاول الأنسب للترسية:</label>
          <select disabled={dis} required value={selectedContractorId} onChange={(e) => setSelectedContractorId(e.target.value)} className="w-full p-3 rounded-lg border border-[#144f41] focus:border-[#43bba1] outline-none text-[#43bba1] font-bold bg-[#050505] shadow-sm transition-colors cursor-pointer disabled:opacity-50">
            <option value="">-- يرجى اختيار المقاول الفائز --</option>
            {validContractors.map(c => (
              <option key={c.id} value={c.id}>{c.name} - ({c.amount} ر.س)</option>
            ))}
          </select>
        </div>
      </DarkCard>

      <DarkCard title="الاعتمادات والموافقات" icon={ShieldAlert}>
        <div className="bg-[#0a0a0a] border border-gray-800 p-4 rounded-xl mb-4">
          <DarkTextArea disabled={dis} label="ملاحظات / توصية إضافية (مدير المشاريع)" rows={3} value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder="اكتب ملاحظاتك للاعتماد الفني والمالي هنا..." />
          <div className="flex items-start gap-4 mt-5">
            <input type="checkbox" id="employeePledge85" disabled={dis} checked={employeePledge} onChange={(e) => setEmployeePledge(e.target.checked)} className="w-5 h-5 mt-1 rounded accent-[#43bba1] cursor-pointer" />
            <label htmlFor="employeePledge85" className="cursor-pointer select-none">
              <h4 className="text-sm font-bold text-white mb-1">إقرار وتوقيع رقمي</h4>
              <p className="text-xs text-gray-500 leading-loose">أقر بصحة الإجراءات والموافقة على الترسية للمقاول المرشح أعلاه، ليتم تحويل المحضر في سلسلة الاعتمادات (المالية ➔ الإدارة التنفيذية).</p>
            </label>
          </div>
        </div>

        {isEditable && !isCompleted ? (
          <button type="button" onClick={submit} disabled={!employeePledge || !selectedContractorId || busy} className={`w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all shadow-md ${(employeePledge && selectedContractorId) ? 'bg-gradient-to-r from-[#43bba1] to-[#359d86] text-black hover:from-[#50d1b5]' : 'bg-[#111] text-gray-600 border border-gray-800 cursor-not-allowed'}`}>
            <UserCheck className="w-5 h-5" /> {busy ? 'جارٍ الاعتماد...' : 'اعتماد مدير المشاريع وتوجيهه للإدارة المالية'}
          </button>
        ) : isCompleted ? (
          <div className="px-5 py-4 rounded-xl text-base font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex justify-center gap-2"><Lock className="w-5 h-5" /> تم الاعتماد والتوجيه في مسار النظام</div>
        ) : null}
      </DarkCard>
    </div>
  );
};

export default FormF31Pricing;
