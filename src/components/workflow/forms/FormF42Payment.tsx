/* F-15 — طلب صرف دفعة (dynamic + floating placeholder) */

import React, { useState } from 'react';
import { DollarSign, FileText, FileSignature, AlertTriangle, UploadCloud, UserCheck, Lock } from 'lucide-react';
import { DarkCard, DarkInput, DarkTextArea } from '../DarkUI';
import type { SharedFormProps } from './_shared';

interface FormF42Props extends SharedFormProps {
  seq: number;
  isFloating?: boolean;
}

const FormF42Payment: React.FC<FormF42Props> = ({ rec, user, api, project, isEditable, isCompleted, seq, isFloating }) => {
  const initData: any = rec?.data || {};
  const [type, setType] = useState<string>(initData.type || 'الثانية');
  const [val, setVal] = useState<string>(initData.amount || '');
  const [invoiceNo, setInvoiceNo] = useState<string>(initData.invoiceNo || '');
  const [pledge, setPledge] = useState<boolean>(!!initData.pledge);
  const [busy, setBusy] = useState(false);
  const isFinal = type === 'الأخيرة';
  const dis = !isEditable;

  if (isFloating) {
    return (
      <div className="p-5 bg-[#0a0a0a] border-2 border-dashed border-gray-800 rounded-xl text-center shadow-inner">
        <DollarSign className="w-10 h-10 text-gray-700 mx-auto mb-3 opacity-50" />
        <h3 className="text-gray-400 font-bold text-sm mb-2">طلب صرف دفعة {seq} (قيد الانتظار)</h3>
        <p className="text-xs text-gray-600 font-medium">يظل هذا النموذج عائماً ومغلقاً حتى يتم اعتماد نسبة إنجاز تستوجب الصرف في تقارير الإشراف الميدانية أعلاه.</p>
      </div>
    );
  }

  const submit = async () => {
    if (!isEditable || busy) return;
    setBusy(true);
    try {
      const payload = { seq, type, amount: val, invoiceNo, pledge, milestone: seq };
      if (rec) {
        await api.approveForm(rec.id, user, 'اعتماد طلب الصرف', payload);
      } else {
        await api.createForm({
          code: 'F-15', user,
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
      <div className="bg-[#1a0f2e] border border-[#502b79] p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-[#a871f7] bg-[#130a1c] p-1.5 rounded-lg border border-[#3c1d5d]" />
          <div>
            <h3 className="text-[#a871f7] font-bold text-sm">طلب صرف دفعة رقم ({seq}) (F-15)</h3>
            <p className="text-gray-300 text-xs mt-1">تم تفعيل الطلب بناءً على تأكيد المهندس المشرف في التقرير السابق.</p>
          </div>
        </div>
        <div className="bg-[#050505] px-4 py-2 rounded-lg border border-[#502b79] text-[#43bba1] text-xs font-bold w-full md:w-auto text-center shadow-inner">قيمة العقد: {project.awardedPrice || '—'} ر.س</div>
      </div>

      <DarkCard title="البيانات المالية للدفعة" icon={FileText}>
        <div className="bg-[#111] border border-gray-800 p-4 rounded-xl mb-5">
          <label className="block text-sm font-bold text-gray-400 mb-3">نوع الدفعة المطلوبة:</label>
          <div className="flex flex-wrap gap-4">
            {['الأولى', 'الثانية', 'الثالثة', 'الأخيرة'].map(t => (
              <label key={t} className={`flex items-center gap-2 px-5 py-2.5 border rounded-lg cursor-pointer transition-all ${type === t ? 'bg-[#1a0f2e] border-[#502b79] text-[#a871f7] shadow-md' : 'bg-[#050505] border-gray-800 text-gray-400 hover:border-[#a871f7]/50'}`}>
                <input type="radio" checked={type === t} onChange={() => !dis && setType(t)} disabled={dis} className="hidden" />
                <span className="font-bold text-sm">{t}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <DarkInput disabled={dis} label="قيمة الدفعة المطلوبة (ر.س) *" type="number" required value={val} onChange={(e: any) => setVal(e.target.value)} />
          <DarkInput disabled={dis} label="رقم الفاتورة / المستخلص" placeholder="الرقم المرجعي..." value={invoiceNo} onChange={(e: any) => setInvoiceNo(e.target.value)} />
        </div>
        <div className="bg-[#050505] p-6 rounded-xl border-2 border-dashed border-gray-800 text-center hover:border-[#a871f7]/50 transition-colors">
          <UploadCloud className="w-10 h-10 text-[#502b79] mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-300">إرفاق المستخلص والفواتير البنكية للمقاول</p>
          {isEditable && <button className="mt-4 bg-[#111] border border-gray-700 text-gray-300 px-6 py-2.5 rounded-lg text-sm font-bold hover:text-white hover:border-[#a871f7] transition-all">تصفح الملفات</button>}
        </div>
      </DarkCard>

      {isFinal && (
        <DarkCard title="متطلبات الدفعة الأخيرة (متطلب إغلاق)" icon={FileSignature}>
          <div className="bg-[#1a0f2e]/30 border border-[#3c1d5d] p-4 rounded-xl mb-5 text-sm text-[#a871f7] font-medium leading-relaxed">
            <AlertTriangle className="inline w-4 h-4 mr-2 mb-1" /> نظراً لكونها الدفعة الأخيرة لإغلاق المشروع، يرجى استيفاء الآراء التالية بناءً على تقرير تسليم المنزل المبدئي.
          </div>
          <div className="space-y-4">
            <DarkTextArea disabled={dis} label="ملاحظات الأسرة المستفيدة *" rows={2} />
            <DarkTextArea disabled={dis} label="رأي البحث الاجتماعي *" rows={2} />
            <DarkTextArea disabled={dis} label="رأي المهندس المشرف *" rows={2} value="تم استلام كافة بنود الأعمال مطابقة للمواصفات الفنية." onChange={() => {}} />
          </div>
        </DarkCard>
      )}

      {isEditable && !isCompleted ? (
        <div className="bg-[#0f0f0f] rounded-xl border border-[#43bba1]/50 p-6 shadow-[0_0_15px_rgba(67,187,161,0.1)]">
          <div className="flex items-start gap-4 mb-5 bg-[#0a0a0a] p-4 rounded-xl border border-gray-800">
            <input type="checkbox" id={`pl_pay_${seq}`} checked={pledge} onChange={(e) => setPledge(e.target.checked)} className="w-6 h-6 mt-1 rounded accent-[#43bba1] cursor-pointer" />
            <label htmlFor={`pl_pay_${seq}`} className="cursor-pointer select-none">
              <h4 className="text-base font-bold text-white mb-2">توصية مدير المشاريع بصرف الدفعة</h4>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">أقر بصحة الإجراءات واستحقاق المقاول للدفعة ليتم الرفع للإدارة المالية للاعتماد النهائي للصرف.</p>
            </label>
          </div>
          <button onClick={submit} disabled={!pledge || !val || busy} className={`w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all shadow-md ${(pledge && val) ? 'bg-gradient-to-r from-[#43bba1] to-[#359d86] text-black hover:from-[#50d1b5]' : 'bg-[#111] text-gray-600 border border-gray-800 cursor-not-allowed'}`}>
            <UserCheck className="w-5 h-5" /> {busy ? 'جارٍ الرفع...' : 'اعتماد ورفع الطلب للقسم المالي'}
          </button>
        </div>
      ) : isCompleted ? (
        <div className="px-5 py-4 rounded-xl text-base font-bold text-[#43bba1] border border-[#43bba1] bg-[#05110e] flex items-center justify-center gap-2"><Lock className="w-5 h-5" /> تم تحويل الطلب للإدارة المالية للاعتماد والصرف</div>
      ) : null}
    </div>
  );
};

export default FormF42Payment;
