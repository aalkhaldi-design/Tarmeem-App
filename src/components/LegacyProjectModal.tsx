import React, { useState } from 'react';
import { Archive, X } from 'lucide-react';
import { PROJECT_TYPES } from '../lib/data';
import type { FormsContext, ProjectRecord } from './forms/FormRenderers';
import type { UserProfile } from './Auth';

export const LegacyProjectModal: React.FC<{ user: UserProfile; context: FormsContext; onClose: () => void }> = ({ user, context, onClose }) => {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [projectType, setProjectType] = useState(PROJECT_TYPES[0]?.key || '');
  const [completedAt, setCompletedAt] = useState('');
  const [partnerEntity, setPartnerEntity] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]';
  const labelCls = 'block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1';

  const submit = async () => {
    if (!name.trim()) { alert('اسم المستفيد مطلوب.'); return; }
    setBusy(true);
    try {
      const gen = await context.generateProjectId();
      if (!gen?.projectId) throw new Error('no project id');
      const payload: Partial<ProjectRecord> = {
        projectId: gen.projectId,
        beneficiaryName: name.trim(),
        city: city.trim(),
        neighborhood: neighborhood.trim() || undefined,
        phase: 'CLOSED',
        progressPct: 100,
        legacy: true,
        projectType,
        completedAt: completedAt || undefined,
        partnerEntity: partnerEntity.trim() || undefined,
        awardedPrice: price ? Number(price) : undefined,
        legacyNote: note.trim() || undefined,
        createdBy: user.id,
      };
      const id = await context.createProject(payload);
      if (!id) throw new Error('create failed');
      onClose();
    } catch (e) {
      console.error('legacy registration failed:', e);
      alert('تعذّر تسجيل المشروع السابق. حاول مجدداً.');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3"><Archive className="w-5 h-5" /><h2 className="font-bold text-lg">تسجيل مشروع سابق</h2></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-3">
          <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-5">يُسجَّل كسجلّ تاريخي مكتمل دون تشغيل مسار النماذج. يظهر في قائمة المشاريع ضمن المكتملة.</p>
          <div><label className={labelCls}>اسم المستفيد *</label><input value={name} onChange={e => setName(e.target.value)} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>المدينة</label><input value={city} onChange={e => setCity(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>الحي</label><input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>نوع المشروع</label>
            <select value={projectType} onChange={e => setProjectType(e.target.value)} className={inputCls}>
              {PROJECT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>تاريخ الإنجاز</label><input type="date" value={completedAt} onChange={e => setCompletedAt(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>التكلفة (ر.س)</label><input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>الجهة الداعمة/الشريك (اختياري)</label><input value={partnerEntity} onChange={e => setPartnerEntity(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>ملاحظات</label><textarea rows={3} value={note} onChange={e => setNote(e.target.value)} className={inputCls} /></div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white">إلغاء</button>
          <button onClick={submit} disabled={busy || !name.trim()} className="px-5 py-2 text-sm font-bold rounded-lg bg-[#4A1F66] text-white hover:bg-[#3A1652] disabled:opacity-50">{busy ? 'جارٍ التسجيل…' : 'تسجيل المشروع'}</button>
        </div>
      </div>
    </div>
  );
};
