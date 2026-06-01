import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  Users, UserPlus, CheckCircle, XCircle, CreditCard as Edit, Shield, Clock,
  UserCheck, ChevronDown, RefreshCw, Bell,
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  ROLES_DEF, ROLE_BY_KEY, RoleKey, DEPARTMENTS, DEPT_BY_KEY,
  REGION_LABELS, formatRelativeTime, roleName,
} from '../lib/data';
import { Card, AccessDeniedCard, Pill, EmptyState, SearchBar } from './ui';
import type { UserProfile } from './Auth';

interface AdminProps {
  users: UserProfile[];
  approveUser: (userId: string, edits: any, approverId: string) => Promise<void>;
  updateUser: (userId: string, edits: any, actorId: string) => Promise<void>;
  deactivateUser: (userId: string, actorId: string, reassignedTo: string) => Promise<void>;
  reactivateUser: (userId: string, actorId: string) => Promise<void>;
  rejectUser: (userId: string, actorId: string, reason?: string) => Promise<void>;
  resetUserRole: (userId: string, actorId: string) => Promise<void>;
  currentUser: UserProfile;
  onOpenProfile: (userId: string) => void;
}

const STATUS_MAP: Record<string, { label: string; tone: any; icon: React.ElementType }> = {
  pending:     { label: 'بانتظار الموافقة', tone: 'amber', icon: Clock },
  active:      { label: 'فعّال',           tone: 'green', icon: CheckCircle },
  deactivated: { label: 'معطّل',           tone: 'red',   icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  const Icon = s.icon;
  return <Pill tone={s.tone}><Icon className="w-3 h-3" />{s.label}</Pill>;
}

function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className={`relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#4A1F66] to-[#6B3D87] px-4 py-3 flex items-center justify-between rounded-t-xl">
          <h3 className="text-white font-bold text-base">{title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-5 text-gray-800 dark:text-slate-100">{children}</div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   UserAdminForm — لاعتماد طلبات وتعديل المستخدمين
   ────────────────────────────────────────────────────────────────── */

function UserAdminForm({ user, mode, onSubmit, onSecondary, busy }: {
  user: UserProfile;
  mode: 'approve' | 'edit';
  onSubmit: (edits: { role: RoleKey; department: string; region: string; isManager: boolean }) => void;
  onSecondary?: (reason: string) => void;
  busy: boolean;
}) {
  const startRole = (user.role && user.role !== 'PENDING' ? user.role as RoleKey : '' as RoleKey | '');
  const startDept = user.department
    || (startRole ? ROLE_BY_KEY[startRole as RoleKey]?.department : '')
    || 'RESEARCH';
  const [department, setDepartment] = useState<string>(startDept);
  const [role, setRole] = useState<RoleKey | ''>(startRole);
  const [region, setRegion] = useState(user.region || 'DAM');
  const [isManager, setIsManager] = useState(
    user.isManager || (startRole ? ROLE_BY_KEY[startRole as RoleKey]?.isManager : false) || false,
  );
  const [showSecondary, setShowSecondary] = useState(false);
  const [reason, setReason] = useState('');

  const onDeptChange = (d: string) => {
    setDepartment(d);
    if (role && ROLE_BY_KEY[role as RoleKey]?.department !== d) {
      setRole('');
      setIsManager(false);
    }
  };

  const onRoleChange = (r: RoleKey | '') => {
    setRole(r);
    if (r) {
      const def = ROLE_BY_KEY[r as RoleKey];
      if (def) setIsManager(!!def.isManager);
    } else {
      setIsManager(false);
    }
  };

  const rolesInDept = ROLES_DEF.filter(r => r.department === department);

  if (showSecondary && mode === 'approve') {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">سبب الرفض</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-y" />
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setShowSecondary(false)} className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">رجوع</button>
          <button onClick={() => onSecondary?.(reason)} disabled={busy || !reason.trim()}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-40 flex items-center gap-1">
            <XCircle className="w-4 h-4" /> {busy ? 'جاري...' : 'رفض الطلب'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4A1F66] text-white flex items-center justify-center font-bold text-sm">
            {user.fullName?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-bold text-gray-800 dark:text-slate-100">{user.fullName}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400" dir="ltr">{user.email}</p>
          </div>
        </div>
        {user.registeredAt && <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-2">تاريخ التسجيل: {formatRelativeTime(user.registeredAt)}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">الإدارة</label>
        <div className="relative">
          <select value={department} onChange={e => onDeptChange(e.target.value)}
            className="w-full appearance-none px-3 py-2 pl-8 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]">
            {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.name}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">الدور الوظيفي (العضوية الكاملة)</label>
        <div className="relative">
          <select value={role} onChange={e => onRoleChange(e.target.value as RoleKey | '')}
            className="w-full appearance-none px-3 py-2 pl-8 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] disabled:opacity-50"
            disabled={!department}>
            <option value="">— اختر الدور —</option>
            {rolesInDept.map(r => <option key={r.key} value={r.key}>{r.membershipTitle}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {rolesInDept.length === 0 && department && (
          <p className="text-[11px] text-amber-600 mt-1">لا توجد أدوار معرّفة في هذه الإدارة.</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">المنطقة</label>
        <div className="relative">
          <select value={region} onChange={e => setRegion(e.target.value)}
            className="w-full appearance-none px-3 py-2 pl-8 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]">
            {Object.entries(REGION_LABELS).filter(([k]) => k !== 'ALL').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={isManager} onChange={e => setIsManager(e.target.checked)}
          className="rounded border-gray-300 text-[#4A1F66] focus:ring-[#4A1F66] w-4 h-4" />
        <span className="text-sm text-gray-700 dark:text-slate-300 font-semibold">يحقّ له اعتماد طلبات قسمه (مدير)</span>
      </label>

      <div className="flex gap-3 justify-end border-t dark:border-slate-700 pt-4">
        {mode === 'approve' && (
          <button onClick={() => setShowSecondary(true)}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-200 hover:bg-red-100 transition flex items-center gap-1">
            <XCircle className="w-4 h-4" /> رفض
          </button>
        )}
        <button onClick={() => role && onSubmit({ role: role as RoleKey, department, region, isManager })}
          disabled={busy || !role}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition disabled:opacity-40 flex items-center gap-1
            ${mode === 'approve' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-[#4A1F66] text-white hover:bg-[#3A1652]'}`}>
          <CheckCircle className="w-4 h-4" />
          {busy ? 'جاري...' : mode === 'approve' ? 'موافقة وتفعيل' : 'حفظ التعديلات'}
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   UserTable — shared row renderer used by every Admin section
   ────────────────────────────────────────────────────────────────── */

function UserTable({
  users, hideDept = false, currentUserId,
  onOpenProfile, onApprove, onEdit, onDeactivate, onReactivate,
}: {
  users: UserProfile[];
  hideDept?: boolean;
  currentUserId: string;
  onOpenProfile: (id: string) => void;
  onApprove: (u: UserProfile) => void;
  onEdit: (u: UserProfile) => void;
  onDeactivate: (u: UserProfile) => void;
  onReactivate: (u: UserProfile) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs">
            <th className="px-3 py-2 text-right font-bold">الاسم</th>
            <th className="px-3 py-2 text-right font-bold">البريد</th>
            <th className="px-3 py-2 text-right font-bold">العضوية</th>
            {!hideDept && <th className="px-3 py-2 text-right font-bold">الإدارة</th>}
            <th className="px-3 py-2 text-right font-bold">الحالة</th>
            <th className="px-3 py-2 text-right font-bold">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => {
            const def = ROLE_BY_KEY[u.role as RoleKey];
            const dept = DEPT_BY_KEY[u.department as any];
            return (
              <tr key={u.id} className="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => onOpenProfile(u.id)}>
                    <div className="w-7 h-7 rounded-full bg-[#4A1F66] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      {u.fullName?.charAt(0) || '?'}
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-slate-100 truncate max-w-[140px] hover:underline">{u.fullName}</span>
                    {u.isManager && <Pill tone="purple">مدير</Pill>}
                    {u.isAdmin && <Pill tone="red">أدمن</Pill>}
                    {u.needsRoleReset && <Pill tone="amber">إعادة ضبط</Pill>}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-gray-500 dark:text-slate-400 text-xs" dir="ltr">{u.email}</td>
                <td className="px-3 py-2.5 text-xs">{def?.membershipTitle || roleName(u.role) || '—'}</td>
                {!hideDept && <td className="px-3 py-2.5 text-xs">{dept?.name || '—'}</td>}
                <td className="px-3 py-2.5"><StatusBadge status={u.status} /></td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    {(u.status === 'pending' || u.needsRoleReset) && (
                      <button onClick={() => onApprove(u)}
                        className="p-1.5 rounded-lg bg-green-50 dark:bg-green-900/40 text-green-600 dark:text-green-200 hover:bg-green-100" title="مراجعة وإسناد">
                        <UserCheck className="w-4 h-4" />
                      </button>
                    )}
                    {u.status === 'active' && (
                      <>
                        <button onClick={() => onEdit(u)}
                          className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-200 hover:bg-blue-100" title="تعديل">
                          <Edit className="w-4 h-4" />
                        </button>
                        {u.id !== currentUserId && !u.isAdmin && (
                          <button onClick={() => onDeactivate(u)}
                            className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-200 hover:bg-red-100" title="تعطيل">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                    {u.status === 'deactivated' && (
                      <button onClick={() => onReactivate(u)}
                        className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-200 hover:bg-blue-100" title="إعادة تفعيل">
                        <UserPlus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   AdminUsersPortal
   ────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────
   AdminNotificationsConfig — admin-managed email notification settings.
   Stored in config/notifications. The provider API key lives in Netlify env
   (RESEND_API_KEY); this UI only controls enabled + sender identity.
   ───────────────────────────────────────────────────────────────────────── */
function AdminNotificationsConfig({ currentUser }: { currentUser: UserProfile }) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [senderName, setSenderName] = useState('جمعية ترميم');
  const [senderEmail, setSenderEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'notifications'), snap => {
      const d = snap.data() as { enabled?: boolean; senderName?: string; senderEmail?: string } | undefined;
      if (d) { setEnabled(!!d.enabled); setSenderName(d.senderName || 'جمعية ترميم'); setSenderEmail(d.senderEmail || ''); }
    }, e => console.error('notif config:', e));
    return () => unsub();
  }, []);

  const save = async () => {
    setBusy(true); setSaved(false);
    try {
      await setDoc(doc(db, 'config', 'notifications'),
        { enabled, senderName: senderName.trim(), senderEmail: senderEmail.trim(), updatedAt: new Date().toISOString(), updatedBy: currentUser.id },
        { merge: true });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error('save notif config:', e); alert('تعذّر حفظ الإعدادات.'); }
    finally { setBusy(false); }
  };

  return (
    <Card title="إعدادات الإشعارات بالبريد" icon={Bell}>
      <button onClick={() => setOpen(o => !o)} className="text-xs font-bold text-fg-muted mb-2">{open ? 'إخفاء الإعدادات' : 'عرض الإعدادات'}</button>
      {open && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-fg cursor-pointer select-none">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="w-4 h-4 accent-[#43bba1]" />
            تفعيل إرسال الإشعارات بالبريد الإلكتروني
          </label>
          <div>
            <label className="block text-xs font-semibold text-fg-muted mb-1">اسم المُرسِل</label>
            <input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="جمعية ترميم"
              className="w-full px-3 py-2 rounded-lg border border-border-default bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-fg-muted mb-1">بريد المُرسِل (لا للرد)</label>
            <input type="email" dir="ltr" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="noreply@tarmeem.org"
              className="w-full px-3 py-2 rounded-lg border border-border-default bg-input-bg text-fg text-sm text-left focus:outline-none focus:ring-2 focus:ring-[#4A1F66]" />
          </div>
          <p className="text-[11px] text-fg-faint leading-5">يتطلب الإرسال الفعلي إعداد مزوّد البريد (Resend) ومفتاح API في إعدادات Netlify، والتحقق من نطاق tarmeem.org لمرة واحدة. هذه الإعدادات منفصلة تماماً عن حساب Google Drive.</p>
          <div className="flex items-center gap-2">
            <button disabled={busy} onClick={save} className="px-4 py-2 rounded-lg bg-[#4A1F66] text-white text-sm font-bold disabled:opacity-50">{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button>
            {saved && <span className="text-xs text-[#43bba1] font-bold">تم الحفظ ✓</span>}
          </div>
        </div>
      )}
    </Card>
  );
}

export function AdminUsersPortal({ users, approveUser, updateUser, deactivateUser, reactivateUser, rejectUser, resetUserRole, currentUser, onOpenProfile }: AdminProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [mode, setMode] = useState<'approve' | 'edit' | null>(null);
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => setCollapsed(c => ({ ...c, [key]: !c[key] }));

  const isAdmin = currentUser.isAdmin === true;

  const matchesSearch = useCallback((u: UserProfile) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (u.fullName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  }, [search]);

  const pendingUsers = useMemo(
    () => users.filter(u => (u.status === 'pending' || u.needsRoleReset) && matchesSearch(u)),
    [users, matchesSearch],
  );
  const deactivatedUsers = useMemo(
    () => users.filter(u => u.status === 'deactivated' && matchesSearch(u)),
    [users, matchesSearch],
  );
  const usersByDept = useMemo(() => {
    const map: Record<string, UserProfile[]> = {};
    for (const u of users) {
      if (u.status !== 'active') continue;
      if (!matchesSearch(u)) continue;
      // Group by role's canonical department, falling back to u.department.
      // This keeps users in the right bucket even when u.department drifts
      // from ROLE_BY_KEY[u.role].department after a partial edit.
      const dept = ROLE_BY_KEY[u.role as RoleKey]?.department || u.department;
      if (!dept) continue;
      (map[dept] ||= []).push(u);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => {
        if (!!a.isManager !== !!b.isManager) return a.isManager ? -1 : 1;
        return (a.fullName || '').localeCompare(b.fullName || '', 'ar');
      });
    }
    return map;
  }, [users, matchesSearch]);

  const handleApprove = useCallback(async (edits: any) => {
    if (!selected) return;
    setBusy(true);
    try { await approveUser(selected.id, edits, currentUser.id); setSelected(null); setMode(null); }
    finally { setBusy(false); }
  }, [selected, approveUser, currentUser.id]);

  const handleReject = useCallback(async (reason: string) => {
    if (!selected) return;
    setBusy(true);
    try { await rejectUser(selected.id, currentUser.id, reason); setSelected(null); setMode(null); }
    finally { setBusy(false); }
  }, [selected, rejectUser, currentUser.id]);

  const handleEdit = useCallback(async (edits: any) => {
    if (!selected) return;
    setBusy(true);
    try { await updateUser(selected.id, edits, currentUser.id); setSelected(null); setMode(null); }
    finally { setBusy(false); }
  }, [selected, updateUser, currentUser.id]);

  const handleDeactivate = useCallback(async (u: UserProfile) => {
    if (!confirm(`سيتم تعطيل حساب ${u.fullName}. متابعة؟`)) return;
    await deactivateUser(u.id, currentUser.id, '');
  }, [deactivateUser, currentUser.id]);

  const handleReactivate = useCallback(async (u: UserProfile) => {
    await reactivateUser(u.id, currentUser.id);
  }, [reactivateUser, currentUser.id]);

  const handleResetRoles = useCallback(async () => {
    if (!confirm('سيتم إعادة تعيين الدور والإدارة لجميع المستخدمين القدامى عدا الأدمنز. متابعة؟')) return;
    setBusy(true);
    try {
      for (const u of users) {
        if (u.isAdmin) continue;
        await resetUserRole(u.id, currentUser.id);
      }
    } finally { setBusy(false); }
  }, [users, resetUserRole, currentUser.id]);

  if (!isAdmin) return <AccessDeniedCard />;

  return (
    <div dir="rtl" className="space-y-4">
      {isAdmin && <AdminNotificationsConfig currentUser={currentUser} />}
      <Card title="بوابة إدارة المستخدمين والصلاحيات" icon={Shield} accent="gradient">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-sm"><SearchBar value={search} onChange={setSearch} placeholder="بحث بالاسم أو البريد..." /></div>
          <div className="flex gap-2">
            <button onClick={handleResetRoles} disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200 hover:bg-amber-100 transition border border-amber-200 dark:border-amber-800">
              <RefreshCw className="w-4 h-4" /> إعادة ضبط الأدوار للقدامى
            </button>
          </div>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-3">
          صلاحية المسؤول العام تُمنح عبر تعيين <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">isAdmin: true</code> مباشرةً على سجل المستخدم في Firestore.
        </p>
      </Card>

      {/* Pending approvals (also includes role-reset cases) */}
      {pendingUsers.length > 0 && (
        <Card title={`بانتظار الموافقة (${pendingUsers.length})`} icon={Clock} accent="teal">
          <UserTable users={pendingUsers} hideDept
            onOpenProfile={onOpenProfile}
            onApprove={(u) => { setSelected(u); setMode('approve'); }}
            onEdit={(u) => { setSelected(u); setMode('edit'); }}
            onDeactivate={handleDeactivate}
            onReactivate={handleReactivate}
            currentUserId={currentUser.id} />
        </Card>
      )}

      {/* Active users — grouped by department, collapsible */}
      {DEPARTMENTS.map(d => {
        const list = usersByDept[d.key] || [];
        if (list.length === 0) return null;
        const isCollapsed = !!collapsed[d.key];
        const managerCount = list.filter(u => u.isManager).length;
        return (
          <div key={d.key} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <button onClick={() => toggleSection(d.key)}
              className="w-full bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-4 py-2.5 flex items-center justify-between text-white text-right">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#56B894]" />
                <span className="font-bold text-sm">{d.name}</span>
                <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded-full">{list.length} عضو</span>
                {managerCount > 0 && (
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">{managerCount} مدير</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 transition ${isCollapsed ? '' : 'rotate-180'}`} />
            </button>
            {!isCollapsed && (
              <div className="p-2">
                <UserTable users={list}
                  onOpenProfile={onOpenProfile}
                  onApprove={(u) => { setSelected(u); setMode('approve'); }}
                  onEdit={(u) => { setSelected(u); setMode('edit'); }}
                  onDeactivate={handleDeactivate}
                  onReactivate={handleReactivate}
                  currentUserId={currentUser.id} />
              </div>
            )}
          </div>
        );
      })}

      {/* Deactivated users — collapsed by default */}
      {deactivatedUsers.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <button onClick={() => toggleSection('_deactivated')}
            className="w-full bg-gradient-to-l from-red-900 to-red-700 px-4 py-2.5 flex items-center justify-between text-white text-right">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              <span className="font-bold text-sm">المعطّلون</span>
              <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded-full">{deactivatedUsers.length}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition ${collapsed['_deactivated'] === false ? 'rotate-180' : ''}`} />
          </button>
          {collapsed['_deactivated'] === false && (
            <div className="p-2">
              <UserTable users={deactivatedUsers}
                onOpenProfile={onOpenProfile}
                onApprove={(u) => { setSelected(u); setMode('approve'); }}
                onEdit={(u) => { setSelected(u); setMode('edit'); }}
                onDeactivate={handleDeactivate}
                onReactivate={handleReactivate}
                currentUserId={currentUser.id} />
            </div>
          )}
        </div>
      )}

      {pendingUsers.length === 0 && Object.keys(usersByDept).length === 0 && deactivatedUsers.length === 0 && (
        <Card icon={Users}><EmptyState icon={Users} title="لا يوجد مستخدمون مطابقون" /></Card>
      )}

      <Modal open={mode === 'approve'} onClose={() => { setSelected(null); setMode(null); }} title="مراجعة الطلب وإسناد العضوية">
        {selected && <UserAdminForm user={selected} mode="approve" onSubmit={handleApprove} onSecondary={handleReject} busy={busy} />}
      </Modal>
      <Modal open={mode === 'edit'} onClose={() => { setSelected(null); setMode(null); }} title="تعديل بيانات المستخدم">
        {selected && <UserAdminForm user={selected} mode="edit" onSubmit={handleEdit} busy={busy} />}
      </Modal>
    </div>
  );
}

