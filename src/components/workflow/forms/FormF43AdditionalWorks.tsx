/* F-23 — طلب بنود أعمال إضافية */

import React, { useState } from 'react';
import { HardHat, ClipboardList, Plus, Trash2, ShieldAlert, UserCheck, Lock } from 'lucide-react';
import { DarkCard, DarkInput, DarkTextArea } from '../DarkUI';
import type { SharedFormProps } from './_shared';
import { useFormDraft } from './useFormDraft';

const FormF43AdditionalWorks: React.FC<SharedFormProps> = ({ rec, user, api, project, isEditable, isCompleted }) => {
  const F23_DEFAULTS = {
    works: [{ id: 1, desc: '', dim: '', price: '', contractorName: project.contractorName || 'مؤسسة البناء الحديث' }] as any[],
    notes: '',
    pledge: false,
  };
  const [draft, setDraft] = useFormDraft<typeof F23_DEFAULTS>({
    api, user, project, rec, draftKey: 'F-23', initial: F23_DEFAULTS,
  });
  const works = draft.works;
  const setWorks = (next: any[]) => setDraft(d => ({ ...d, works: next }));
  const notes = draft.notes;
  const setNotes = (v: string) => setDraft(d => ({ ...d, notes: v }));
  const pledge = draft.pledge;
  const setPledge = (v: boolean) => setDraft(d => ({ ...d, pledge: v }));
  const [busy, setBusy] = useState(false);
  const dis = !isEditable;

  const getTotal = () => works.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const submit = async () => {
    if (!isEditable || busy) return;
    setBusy(true);
    try {
      const payload = { works, items: works, notes, pledge, total: getTotal(), reason: notes };
      if (rec) {
        await api.approveForm(rec.id, user, 'اعتماد الأعمال الإضافية', payload);
      } else {
        await api.createForm({
          code: 'F-23', user,
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
      <div className="bg-[#1a1a0f] border border-[#5c4a15] p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
        <HardHat className="w-6 h-6 text-[#eab308]" />
        <div>
          <h3 className="text-[#eab308] font-bold text-sm">طلب بنود أعمال إضافية (F-23)</h3>
          <p className="text-gray-300 text-xs mt-1">تم توليد هذا النموذج آلياً بناءً على طلب المهندس المشرف في التقرير الميداني.</p>
        </div>
      </div>

      <DarkCard title="بيان الأعمال والمواد الإضافية المطلوبة" icon={ClipboardList}>
        <div className="space-y-4 mb-5">
          {works.map((work, index) => (
            <div key={work.id} className="p-5 bg-[#050505] border border-gray-800 rounded-xl relative shadow-sm">
              {works.length > 1 && isEditable && <button type="button" onClick={() => setWorks(works.filter(w => w.id !== work.id))} className="absolute top-4 left-4 text-red-500 hover:bg-[#3a1515] p-1.5 rounded-lg transition-colors"><Trash2 size={18} /></button>}
              <h4 className="text-xs font-bold text-[#a871f7] mb-4 bg-[#111] inline-block px-3 py-1.5 rounded-md border border-[#3c1d5d]">البند الإضافي ({index + 1})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <DarkInput disabled={dis} label="وصف العمل المطلوب" placeholder="مثال: معالجة سقف وتسربات..." required value={work.desc} onChange={(e: any) => setWorks(works.map(w => w.id === work.id ? { ...w, desc: e.target.value } : w))} className="md:col-span-2" />
                <DarkInput disabled={dis} label="المساحة / الأبعاد" placeholder="3x4 متر..." required value={work.dim} onChange={(e: any) => setWorks(works.map(w => w.id === work.id ? { ...w, dim: e.target.value } : w))} />
                <DarkInput disabled={dis} label="المُنفذ المقترح" required value={work.contractorName} onChange={(e: any) => setWorks(works.map(w => w.id === work.id ? { ...w, contractorName: e.target.value } : w))} />
              </div>
              <div className="w-full md:w-1/2">
                <DarkInput disabled={dis} label="السعر التقديري (ر.س)" type="number" required value={work.price} onChange={(e: any) => setWorks(works.map(w => w.id === work.id ? { ...w, price: e.target.value } : w))} />
              </div>
            </div>
          ))}
        </div>
        {isEditable && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-gray-800 pt-5">
            <button type="button" onClick={() => setWorks([...works, { id: Date.now(), desc: '', dim: '', price: '', contractorName: project.contractorName || 'مؤسسة البناء الحديث' }])} className="bg-[#1a0f2e] text-[#a871f7] border border-dashed border-[#3c1d5d] px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#502b79] hover:text-white transition-colors w-full md:w-auto shadow-sm">
              <Plus size={18} /> إضافة بند عمل آخر
            </button>
            <div className="text-sm font-bold text-gray-300 bg-[#111] px-5 py-3 rounded-xl border border-gray-800 shadow-inner w-full md:w-auto text-center">
              التكلفة الإضافية الإجمالية: <span className="text-[#43bba1] text-xl font-black mr-2">{getTotal().toLocaleString()} ر.س</span>
            </div>
          </div>
        )}
      </DarkCard>

      <DarkCard title="المبررات الفنية" icon={ShieldAlert}>
        <DarkTextArea disabled={dis} label="المبررات الفنية لطلب هذه الأعمال الإضافية (من المهندس المشرف) *" required rows={3} value={notes} onChange={(e: any) => setNotes(e.target.value)} />
      </DarkCard>

      {isEditable && !isCompleted ? (
        <div className="bg-[#0f0f0f] rounded-xl border border-[#43bba1]/50 p-6 shadow-[0_0_15px_rgba(67,187,161,0.1)]">
          <div className="flex items-start gap-4 mb-5 bg-[#0a0a0a] p-4 rounded-xl border border-gray-800">
            <input type="checkbox" id="pl_23" checked={pledge} onChange={(e) => setPledge(e.target.checked)} className="w-6 h-6 mt-1 rounded accent-[#43bba1] cursor-pointer" />
            <label htmlFor="pl_23" className="cursor-pointer select-none">
              <h4 className="text-base font-bold text-white mb-2">إقرار الموظف وتوقيع رقمي</h4>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">أقر بصحة المبررات الفنية وأطلب الاعتماد الإضافي ليُرفع في سلسلة الاعتمادات (مشاريع ➔ سمايا ➔ مالية ➔ تنفيذي).</p>
            </label>
          </div>
          <button onClick={submit} disabled={!pledge || !notes || busy} className={`w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all shadow-md ${(pledge && notes) ? 'bg-gradient-to-r from-[#43bba1] to-[#359d86] text-black hover:from-[#50d1b5]' : 'bg-[#111] text-gray-600 border border-gray-800 cursor-not-allowed'}`}>
            <UserCheck className="w-5 h-5" /> {busy ? 'جارٍ الإرسال...' : 'إرسال لمدير المشاريع للاعتماد المبدئي'}
          </button>
        </div>
      ) : isCompleted ? (
        <div className="px-5 py-4 rounded-xl text-base font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex items-center justify-center gap-2"><Lock className="w-5 h-5" /> تم رفع طلب الأعمال الإضافية، بانتظار الاعتمادات الإدارية</div>
      ) : null}
    </div>
  );
};

export default FormF43AdditionalWorks;
