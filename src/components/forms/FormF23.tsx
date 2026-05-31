/**
 * FormF23.tsx — تحديث بنود الأعمال (Works Items Update)
 * System-generated from the F-14 scope-change picker (carries f23_add / f23_remove / f23_note).
 * Two independent tracks:
 *   • حذف track:  رئيس المشاريع → مدير الخدمات المساندة  → (next phase) delete from F-34 / F-15.1
 *   • اضافة track: الإشراف يحدّد «توريد المقاول» → الخدمات المساندة تحدّد داخلي/داعم-شريك → (next phase) inject into F-34
 * Collaborative finalize (App.tsx isCollabSubmit). Chain: ['PROJECTS_MANAGER'] (single element).
 */

import React, { useState } from 'react';
import { Plus, Trash2, ClipboardList, AlertCircle } from 'lucide-react';
import { Card, TextArea } from '../ui';
import { FormRenderer, FormCreator } from '../Forms';
import { FormShell } from './FormShell';

type Cat = 'furniture' | 'appliances' | 'materials';
const CATS: Cat[] = ['furniture', 'appliances', 'materials'];
const CAT_TITLE: Record<Cat, string> = { furniture: 'الأثاث', appliances: 'الأجهزة', materials: 'المواد' };

interface F23AddItem {
  id: string; label: string; cat: Cat; addQty: string; custom?: boolean;
  byContractor?: boolean; providerType?: 'داخلي' | 'داعم/شريك';
}
interface F23RemoveItem { id: string; label: string; cat: Cat; currentQty: string; cancelQty: string }

/* ── Minimal manual creator (F-23 is normally auto-generated from the F-14 picker) ── */
export const F23Creator: FormCreator = ({ user, api, context, onClose }) => {
  const projects: Array<{ id: string; projectId: string; beneficiaryName: string }> = context?.projects ?? [];
  const [projectRefId, setProjectRefId] = useState<string>(projects[0]?.id || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const p = projects.find(x => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-23', user,
        projectId: p.projectId, projectRefId: p.id, beneficiaryName: p.beneficiaryName,
        data: { f23_add: [], f23_remove: [], f23_note: note },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-lg bg-surface rounded-2xl shadow-lg border border-subtle flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle">
          <h2 className="text-base font-bold text-fg">F-23 · تحديث بنود الأعمال</h2>
          <button onClick={onClose} className="text-fg-faint hover:text-fg text-xl leading-none">×</button>
        </div>
        <div className="p-4 space-y-4">
          <Card title="المشروع" icon={ClipboardList}>
            <select value={projectRefId} onChange={e => setProjectRefId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-default bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]">
              {projects.length === 0 && <option value="">— لا توجد مشاريع —</option>}
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectId} — {p.beneficiaryName}</option>)}
            </select>
          </Card>
          <Card title="ملاحظة" icon={ClipboardList}>
            <TextArea label="ملاحظة (اختياري)" rows={2} value={note} onChange={e => setNote(e.target.value)} />
          </Card>
          <p className="text-xs text-fg-muted">يُنشأ هذا النموذج عادةً آلياً من «طلب تحديث بنود الأعمال» داخل تقرير الإشراف (F-14).</p>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-subtle">
          <button onClick={onClose} className="px-4 py-2 text-sm text-fg-muted hover:text-fg transition">إلغاء</button>
          <button onClick={submit} disabled={busy || !projectRefId}
            className="px-5 py-2 text-sm font-bold rounded-lg bg-[#4A1F66] text-white hover:bg-[#3A1652] disabled:opacity-50 transition">
            {busy ? 'جارٍ الإنشاء…' : 'إنشاء'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══ F23Renderer — two-track processor ═══ */
export const F23Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  const f32 = api.forms.find(f => f.code === 'F-32' && f.projectRefId === rec.projectRefId);
  const engineerId = (f32?.data?.engineerId as string) || '';
  const helperIds = ((f32?.data?.helpers as string[]) || []);

  const isPM = !!user.isAdmin || user.role === 'PROJECTS_MANAGER';
  const isSM = !!user.isAdmin || user.role === 'SUPPORT_MANAGER';
  const isSupervision = !!user.isAdmin || user.role === 'HEAD_SUPERVISION' || user.id === engineerId || helperIds.includes(user.id);
  const isSupport = !!user.isAdmin || user.department === 'SUPPORT';

  const [addItems, setAddItems] = useState<F23AddItem[]>((d.f23_add as F23AddItem[]) || []);
  const [removeItems] = useState<F23RemoveItem[]>((d.f23_remove as F23RemoveItem[]) || []);
  const note = (d.f23_note as string) || '';
  const [removeStage, setRemoveStage] = useState<number>(Number(d.f23_removeStage || 0));
  const [addStage, setAddStage] = useState<number>(Number(d.f23_addStage || 0));
  const [busy, setBusy] = useState(false);

  const hasRemove = removeItems.length > 0;
  const hasAdd = addItems.length > 0;
  const active = rec.status === 'pending';

  const persist = (patch: Record<string, unknown>) => api.updateFormData(rec.id, patch);
  const setByContractor = (id: string, v: boolean) => setAddItems(prev => prev.map(a => a.id === id ? { ...a, byContractor: v } : a));
  const setProvider = (id: string, v: 'داخلي' | 'داعم/شريك') => setAddItems(prev => prev.map(a => a.id === id ? { ...a, providerType: v } : a));
  const saveAdd = async () => { setBusy(true); try { await persist({ f23_add: JSON.parse(JSON.stringify(addItems)) }); } finally { setBusy(false); } };

  // ── حذف track ──
  const approveRemovePM = async () => { setBusy(true); try { await persist({ f23_removeStage: 1 }); setRemoveStage(1); } finally { setBusy(false); } };
  const approveRemoveSM = async () => { setBusy(true); try { /* NEXT PHASE: delete these items from F-34 + F-15.1 */ await persist({ f23_removeStage: 2 }); setRemoveStage(2); } finally { setBusy(false); } };

  // ── اضافة track ──
  const submitAddSupervision = async () => { setBusy(true); try { await persist({ f23_add: JSON.parse(JSON.stringify(addItems)), f23_addStage: 1 }); setAddStage(1); } finally { setBusy(false); } };
  const submitAddSupport = async () => {
    if (addItems.some(a => !a.byContractor && !a.providerType)) { alert('حدد طريقة توريد كل بند غير مُسند للمقاول (داخلي أو داعم/شريك).'); return; }
    setBusy(true);
    try { /* NEXT PHASE: inject non-contractor adds into F-34 داخلي/شريك sections */ await persist({ f23_add: JSON.parse(JSON.stringify(addItems)), f23_addStage: 2 }); setAddStage(2); }
    finally { setBusy(false); }
  };

  const removeDone = !hasRemove || removeStage >= 2;
  const addDone = !hasAdd || addStage >= 2;
  const canFinalize = active && removeDone && addDone && (isPM || isSupport);
  const finalize = async () => { if (!canFinalize || busy) return; setBusy(true); try { await api.approveForm(rec.id, user, ''); } finally { setBusy(false); } };

  return (
    <FormShell rec={rec} user={user} api={api}
      approvalSection={active ? (
        <div className="space-y-2">
          {canFinalize
            ? <button disabled={busy} onClick={finalize} className="w-full py-2.5 rounded-lg bg-[#43bba1] text-white font-bold text-sm disabled:opacity-40">إنهاء تحديث البنود</button>
            : <p className="text-xs text-fg-muted text-center">يكتمل النموذج بعد إنجاز مسارَي الإضافة والحذف المطلوبَين.</p>}
        </div>
      ) : <div />}
    >
      {d.triggeredByF14 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-3 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>مولّد آلياً من تقرير إشراف #{String(d.triggeredByF14).slice(-6).toUpperCase()}</span>
        </div>
      )}

      {hasAdd && (
        <Card title="إضافة بنود" icon={Plus} accent="purple">
          {CATS.map(cat => {
            const items = addItems.filter(a => a.cat === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="mb-3">
                <p className="text-xs font-bold text-fg-muted mb-1">{CAT_TITLE[cat]}</p>
                <div className="space-y-1">
                  {items.map(a => (
                    <div key={a.id} className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="flex-1 text-fg">{a.label || 'بند'} <span className="text-fg-faint">(الكمية: {a.addQty})</span></span>
                      {addStage === 0 && (
                        <label className="flex items-center gap-1 text-fg-muted">
                          <input type="checkbox" disabled={!isSupervision} checked={!!a.byContractor} onChange={e => setByContractor(a.id, e.target.checked)} /> توريد المقاول
                        </label>
                      )}
                      {addStage >= 1 && a.byContractor && <span className="text-[#56B894] font-bold">توريد المقاول</span>}
                      {addStage === 1 && !a.byContractor && (
                        <select disabled={!isSupport} value={a.providerType || ''} onChange={e => setProvider(a.id, e.target.value as 'داخلي' | 'داعم/شريك')}
                          className="px-2 py-1 rounded border border-subtle bg-surface text-xs">
                          <option value="">— طريقة التوريد —</option>
                          <option value="داخلي">داخلي</option>
                          <option value="داعم/شريك">داعم/شريك</option>
                        </select>
                      )}
                      {addStage >= 2 && !a.byContractor && <span className="text-fg-muted">{a.providerType || '—'}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {active && addStage === 0 && isSupervision && (
            <div className="flex gap-2 mt-2">
              <button disabled={busy} onClick={saveAdd} className="px-3 py-1.5 rounded-lg bg-surface-up border border-subtle text-fg text-xs font-bold">حفظ</button>
              <button disabled={busy} onClick={submitAddSupervision} className="px-3 py-1.5 rounded-lg bg-[#4A1F66] text-white text-xs font-bold">اعتماد الإسناد (الإشراف)</button>
            </div>
          )}
          {active && addStage === 1 && isSupport && (
            <div className="flex gap-2 mt-2">
              <button disabled={busy} onClick={saveAdd} className="px-3 py-1.5 rounded-lg bg-surface-up border border-subtle text-fg text-xs font-bold">حفظ</button>
              <button disabled={busy} onClick={submitAddSupport} className="px-3 py-1.5 rounded-lg bg-[#56B894] text-white text-xs font-bold">اعتماد التوريد (الخدمات المساندة)</button>
            </div>
          )}
          {addStage >= 2 && <p className="text-xs font-bold text-[#43bba1] mt-2">تم اعتماد بنود الإضافة ✓</p>}
          {active && addStage === 0 && !isSupervision && <p className="text-[11px] text-fg-faint mt-2">بانتظار إسناد الإشراف.</p>}
          {active && addStage === 1 && !isSupport && <p className="text-[11px] text-fg-faint mt-2">بانتظار تحديد الخدمات المساندة لطريقة التوريد.</p>}
        </Card>
      )}

      {hasRemove && (
        <Card title="حذف بنود" icon={Trash2} accent="purple">
          {CATS.map(cat => {
            const items = removeItems.filter(r => r.cat === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="mb-3">
                <p className="text-xs font-bold text-fg-muted mb-1">{CAT_TITLE[cat]}</p>
                <ul className="space-y-1">
                  {items.map(r => (
                    <li key={r.id} className="text-xs text-fg flex items-center gap-2">
                      <span className="flex-1">{r.label}</span>
                      <span className="text-fg-faint">إلغاء {r.cancelQty} من {r.currentQty}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {active && removeStage === 0 && (isPM
            ? <button disabled={busy} onClick={approveRemovePM} className="mt-2 px-3 py-1.5 rounded-lg bg-[#4A1F66] text-white text-xs font-bold">اعتماد الحذف (رئيس المشاريع)</button>
            : <p className="text-[11px] text-fg-faint mt-2">بانتظار اعتماد رئيس المشاريع.</p>)}
          {active && removeStage === 1 && (isSM
            ? <button disabled={busy} onClick={approveRemoveSM} className="mt-2 px-3 py-1.5 rounded-lg bg-[#56B894] text-white text-xs font-bold">تأكيد الحذف (مدير الخدمات المساندة)</button>
            : <p className="text-[11px] text-fg-faint mt-2">بانتظار تأكيد مدير الخدمات المساندة.</p>)}
          {removeStage >= 2 && <p className="text-xs font-bold text-[#43bba1] mt-2">تم اعتماد الحذف ✓</p>}
        </Card>
      )}

      {note && (
        <Card title="ملاحظات" icon={ClipboardList}>
          <div className="bg-surface-up rounded-lg p-3 text-sm text-fg border border-subtle">{note}</div>
        </Card>
      )}

      {!hasAdd && !hasRemove && (
        <Card title="لا توجد بنود" icon={AlertCircle}><p className="text-xs text-fg-faint">لم تحدَّد بنود للإضافة أو الحذف.</p></Card>
      )}
    </FormShell>
  );
};
