/* F-19 — طلب توريد داخلي */

import React, { useState } from 'react';
import { ShoppingCart, FileText, Plus, Trash2, Lock } from 'lucide-react';
import { DarkCard, DarkInput, DarkTextArea } from '../DarkUI';
import type { SharedFormProps } from './_shared';

const FormF19Supply: React.FC<SharedFormProps> = ({ rec, user, api, project, isEditable, isCompleted }) => {
  const init: any = rec?.data || {};
  const [items, setItems] = useState<any[]>(init.items || [{ id: 1, desc: '', qty: '', notes: '' }]);
  const [justification, setJustification] = useState<string>(init.justification || '');
  const [pledge, setPledge] = useState<boolean>(!!init.pledge);
  const [busy, setBusy] = useState(false);
  const dis = !isEditable;

  const submit = async () => {
    if (!isEditable || busy) return;
    setBusy(true);
    try {
      const payload = { items, justification, pledge };
      if (rec) {
        await api.approveForm(rec.id, user, 'اعتماد طلب التوريد', payload);
      } else {
        await api.createForm({
          code: 'F-19', user,
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
      <DarkCard title="طلب توريد داخلي للمواد (F-19)" icon={ShoppingCart}>
        <p className="text-sm text-gray-400 mb-5">يُستخدم هذا النموذج لطلب توفير مواد استهلاكية أو عينية للمشروع من خلال إدارة الخدمات المساندة بدلاً من المقاول المباشر.</p>

        <div className="space-y-3 mb-5">
          {items.map((item, index) => (
            <div key={item.id} className="flex flex-col md:flex-row gap-3 p-4 rounded-xl border border-gray-800 bg-[#050505] items-start md:items-center relative">
              <span className="hidden md:flex font-bold text-[#a871f7] text-sm bg-[#111] w-8 h-8 items-center justify-center rounded-full shrink-0">{index + 1}</span>
              <DarkInput disabled={dis} label="وصف المادة" className="w-full md:flex-[2]" value={item.desc} onChange={(e: any) => setItems(items.map(i => i.id === item.id ? { ...i, desc: e.target.value } : i))} />
              <DarkInput disabled={dis} label="الكمية" type="number" className="w-full md:flex-1" value={item.qty} onChange={(e: any) => setItems(items.map(i => i.id === item.id ? { ...i, qty: e.target.value } : i))} />
              <DarkInput disabled={dis} label="ملاحظات الصنف" className="w-full md:flex-[2]" value={item.notes} onChange={(e: any) => setItems(items.map(i => i.id === item.id ? { ...i, notes: e.target.value } : i))} />
              {isEditable && items.length > 1 && <button type="button" onClick={() => setItems(items.filter(i => i.id !== item.id))} className="mt-5 text-red-500 hover:bg-[#3a1515] p-2 rounded-lg"><Trash2 size={18} /></button>}
            </div>
          ))}
        </div>
        {isEditable && (
          <button type="button" onClick={() => setItems([...items, { id: Date.now(), desc: '', qty: '', notes: '' }])} className="bg-[#111] text-[#a871f7] border border-dashed border-gray-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:border-[#a871f7] hover:text-white transition-colors w-full md:w-auto">
            <Plus size={18} /> إضافة صنف للمسودة
          </button>
        )}
      </DarkCard>

      <DarkCard title="الاعتماد والمبررات" icon={FileText}>
        <DarkTextArea disabled={dis} label="مبررات الطلب العيني / الداخلي *" rows={3} value={justification} onChange={(e: any) => setJustification(e.target.value)} />
      </DarkCard>

      {isEditable && !isCompleted ? (
        <div className="bg-[#0f0f0f] rounded-xl border border-[#43bba1]/50 p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-5">
            <input type="checkbox" checked={pledge} onChange={(e) => setPledge(e.target.checked)} className="w-5 h-5 mt-0.5 rounded accent-[#43bba1] cursor-pointer" />
            <label className="text-sm font-bold text-white">اعتماد الطلب ورفعه لمدير الخدمات المساندة</label>
          </div>
          <button onClick={submit} disabled={!pledge || !justification || busy} className={`w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all ${(pledge && justification) ? 'bg-[#43bba1] text-black shadow-md' : 'bg-[#111] text-gray-600 border border-gray-800'}`}>
            <ShoppingCart className="w-5 h-5" /> {busy ? 'جارٍ الإرسال...' : 'إرسال الطلب للاعتماد'}
          </button>
        </div>
      ) : isCompleted ? (
        <div className="px-5 py-4 rounded-xl text-base font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex justify-center gap-2"><Lock className="w-5 h-5" /> تم رفع طلب التوريد بنجاح</div>
      ) : null}
    </div>
  );
};

export default FormF19Supply;
