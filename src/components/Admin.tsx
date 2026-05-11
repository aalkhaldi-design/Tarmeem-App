import React, { useMemo, useState, useCallback } from 'react';
import {
  Users, UserPlus, CheckCircle, XCircle, CreditCard as Edit, Shield, Clock,
  UserCheck, ChevronDown, RefreshCw,
} from 'lucide-react';
import {
  ROLES_DEF, ROLE_BY_KEY, RoleKey, DEPARTMENTS, DEPT_BY_KEY,
  REGION_LABELS, formatRelativeTime, isAdminEmail, roleName,
} from '../lib/data';
import { Card, AccessDeniedCard, Pill, EmptyState, SearchBar } from './ui';
import { isAdminUser, type UserProfile } from './Auth';

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

type StatusFilter = 'all' | 'pending' | 'active' | 'deactivated' | 'reset';

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

function UserAdminForm({ user, mode, onSubmit, onSecondary, busy, currentUser }: {
  user: UserProfile;
  mode: 'approve' | 'edit';
  onSubmit: (edits: { role: RoleKey; department: string; region: string; isManager: boolean; isAdmin: boolean }) => void;
  onSecondary?: (reason: string) => void;
  busy: boolean;
  currentUser: UserProfile;
}) {
  const startRole = (user.role && user.role !== 'PENDING' && user.role !== 'ADMIN' ? user.role as RoleKey : 'SOCIAL_RESEARCHER');
  const [role, setRole] = useState<RoleKey>(startRole);
  const [department, setDepartment] = useState(user.department || ROLE_BY_KEY[startRole]?.department || 'RESEARCH');
  const [region, setRegion] = useState(user.region || 'DAM');
  const [isManager, setIsManager] = useState(user.isManager || ROLE_BY_KEY[startRole]?.isManager || false);
  const [isAdminFlag, setIsAdminFlag] = useState<boolean>(user.isAdmin === true || user.role === 'ADMIN');
  const [showSecondary, setShowSecondary] = useState(false);
  const [reason, setReason] = useState('');
  // Only an existing super admin can promote another user.
  const canEditAdminFlag = isAdminUser(currentUser);

  const onRoleChange = (r: RoleKey) => {
    setRole(r);
    const def = ROLE_BY_KEY[r];
    if (def) { setDepartment(def.department); setIsManager(!!def.isManager); }
  };

  const rolesByDept = DEPARTMENTS.map(d => ({ dept: d, roles: ROLES_DEF.filter(r => r.department === d.key) }));

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
        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">الدور الوظيفي (مع العضوية)</label>
        <div className="relative">
          <select value={role} onChange={e => onRoleChange(e.target.value as RoleKey)}
            className="w-full appearance-none px-3 py-2 pl-8 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]">
            {rolesByDept.map(g => (
              <optgroup key={g.dept.key} label={g.dept.name}>
                {g.roles.map(r => <option key={r.key} value={r.key}>{r.membershipTitle}</option>)}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">الإدارة</label>
        <div className="relative">
          <select value={department} onChange={e => setDepartment(e.target.value)}
            className="w-full appearance-none px-3 py-2 pl-8 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]">
            {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.name}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
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

      {canEditAdminFlag && (
        <label className={`flex items-start gap-2 cursor-pointer p-3 rounded-lg border-2 transition ${isAdminFlag ? 'border-red-400 bg-red-50/60 dark:border-red-700 dark:bg-red-900/20' : 'border-gray-200 dark:border-slate-700 bg-gray-50/40 dark:bg-slate-900/30'}`}>
          <input type="checkbox" checked={isAdminFlag} onChange={e => setIsAdminFlag(e.target.checked)}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4 mt-0.5" />
          <span className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed">
            <strong className="text-red-600 dark:text-red-300 flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> ترقية إلى مسؤول النظام (Super Admin)</strong>
            <span className="block text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">يتجاوز جميع قيود الأدوار ويستطيع تعديل أي نموذج وإدارة المستخدمين.</span>
          </span>
        </label>
      )}

      <div className="flex gap-3 justify-end border-t dark:border-slate-700 pt-4">
        {mode === 'approve' && (
          <button onClick={() => setShowSecondary(true)}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-200 hover:bg-red-100 transition flex items-center gap-1">
            <XCircle className="w-4 h-4" /> رفض
          </button>
        )}
        <button onClick={() => onSubmit({ role, department, region, isManager, isAdmin: isAdminFlag })} disabled={busy}
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
   AdminUsersPortal
   ────────────────────────────────────────────────────────────────── */

export function AdminUsersPortal({ users, approveUser, updateUser, deactivateUser, reactivateUser, rejectUser, resetUserRole, currentUser, onOpenProfile }: AdminProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [mode, setMode] = useState<'approve' | 'edit' | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = isAdminUser(currentUser) || isAdminEmail(currentUser.email);

  const filtered = useMemo(() => {
    let list = users;
    if (statusFilter === 'reset') {
      list = list.filter(u => u.needsRoleReset);
    } else if (statusFilter !== 'all') {
      list = list.filter(u => u.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(u => (u.fullName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
    }
    return list;
  }, [users, statusFilter, search]);

  const counts = useMemo(() => ({
    all: users.length,
    pending: users.filter(u => u.status === 'pending').length,
    active: users.filter(u => u.status === 'active').length,
    deactivated: users.filter(u => u.status === 'deactivated').length,
    reset: users.filter(u => u.needsRoleReset).length,
  }), [users]);

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
        if (isAdminEmail(u.email)) continue;
        if (u.role === 'ADMIN') continue;
        await resetUserRole(u.id, currentUser.id);
      }
    } finally { setBusy(false); }
  }, [users, resetUserRole, currentUser.id]);

  if (!isAdmin) return <AccessDeniedCard />;

  return (
    <div dir="rtl" className="space-y-4">
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
          الأدمنز الافتراضيون يُمنحون الصلاحيات تلقائياً عند تسجيل الدخول: <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">a.alkhaldi@tarmeem.org</code>،{' '}
          <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">s.aldossari@tarmeem.org</code>.
        </p>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'active', 'deactivated', 'reset'] as StatusFilter[]).map(s => {
          const isActive = statusFilter === s;
          const label = s === 'all' ? 'الكل' : s === 'pending' ? 'بانتظار الموافقة' : s === 'active' ? 'فعّال' : s === 'deactivated' ? 'معطّل' : 'يحتاج إعادة ضبط';
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                isActive ? 'bg-[#4A1F66] text-white shadow' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700'
              }`}>
              {label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-slate-700'}`}>{(counts as any)[s]}</span>
            </button>
          );
        })}
      </div>

      <Card title={`المستخدمون (${filtered.length})`} icon={Users}>
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="لا يوجد مستخدمون مطابقون" />
        ) : (
          <div className="overflow-x-auto -mx-4 md:-mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs">
                  <th className="px-3 py-2 text-right font-bold">الاسم</th>
                  <th className="px-3 py-2 text-right font-bold">البريد</th>
                  <th className="px-3 py-2 text-right font-bold">العضوية</th>
                  <th className="px-3 py-2 text-right font-bold">الإدارة</th>
                  <th className="px-3 py-2 text-right font-bold">الحالة</th>
                  <th className="px-3 py-2 text-right font-bold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
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
                          {u.role === 'ADMIN' && <Pill tone="red">أدمن</Pill>}
                          {u.needsRoleReset && <Pill tone="amber">إعادة ضبط</Pill>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 dark:text-slate-400 text-xs" dir="ltr">{u.email}</td>
                      <td className="px-3 py-2.5 text-xs">{def?.membershipTitle || roleName(u.role) || '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{dept?.name || '—'}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={u.status} /></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          {(u.status === 'pending' || u.needsRoleReset) && (
                            <button onClick={() => { setSelected(u); setMode('approve'); }}
                              className="p-1.5 rounded-lg bg-green-50 dark:bg-green-900/40 text-green-600 dark:text-green-200 hover:bg-green-100" title="مراجعة وإسناد">
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          {u.status === 'active' && (
                            <>
                              <button onClick={() => { setSelected(u); setMode('edit'); }}
                                className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-200 hover:bg-blue-100" title="تعديل">
                                <Edit className="w-4 h-4" />
                              </button>
                              {u.id !== currentUser.id && u.role !== 'ADMIN' && (
                                <button onClick={() => handleDeactivate(u)}
                                  className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-200 hover:bg-red-100" title="تعطيل">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                          {u.status === 'deactivated' && (
                            <button onClick={() => handleReactivate(u)}
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
        )}
      </Card>

      <Modal open={mode === 'approve'} onClose={() => { setSelected(null); setMode(null); }} title="مراجعة الطلب وإسناد العضوية">
        {selected && <UserAdminForm user={selected} mode="approve" onSubmit={handleApprove} onSecondary={handleReject} busy={busy} currentUser={currentUser} />}
      </Modal>
      <Modal open={mode === 'edit'} onClose={() => { setSelected(null); setMode(null); }} title="تعديل بيانات المستخدم">
        {selected && <UserAdminForm user={selected} mode="edit" onSubmit={handleEdit} busy={busy} currentUser={currentUser} />}
      </Modal>
    </div>
  );
}

