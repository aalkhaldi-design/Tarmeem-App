import React, { useMemo, useState, useCallback } from 'react';
import {
  Users, UserPlus, CheckCircle, XCircle, CreditCard as Edit, Shield, Search, Clock,
  UserCheck, ChevronDown,
} from 'lucide-react';
import {
  ROLES_DEF, ROLE_BY_KEY, RoleKey, DEPARTMENTS, DEPT_BY_KEY,
  REGION_LABELS, formatRelativeTime,
} from '../lib/data';
import { Card, AccessDeniedCard } from './ui';
import type { UserProfile } from './Auth';

interface AdminProps {
  users: UserProfile[];
  approveUser: (userId: string, edits: any, approverId: string) => Promise<void>;
  updateUser: (userId: string, edits: any, actorId: string) => Promise<void>;
  deactivateUser: (userId: string, actorId: string, reassignedTo: string) => Promise<void>;
  reactivateUser: (userId: string, actorId: string) => Promise<void>;
  rejectUser: (userId: string, actorId: string, reason?: string) => Promise<void>;
  currentUser: UserProfile;
}

type StatusFilter = 'all' | 'pending' | 'active' | 'deactivated';

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  pending:     { label: 'بانتظار الموافقة', bg: 'bg-amber-50',  text: 'text-amber-700', icon: Clock },
  active:      { label: 'فعّال',           bg: 'bg-green-50',  text: 'text-green-700', icon: CheckCircle },
  deactivated: { label: 'معطّل',           bg: 'bg-red-50',     text: 'text-red-700',   icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${s.bg} ${s.text}`}>
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#4A1F66] to-[#6B3D87] px-4 py-3 flex items-center justify-between rounded-t-xl">
          <h3 className="text-white font-bold text-base">{title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white transition"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Approve / Edit Form
   ────────────────────────────────────────────────────────────────── */

function UserAdminForm({ user, mode, onSubmit, onSecondary, busy }: {
  user: UserProfile;
  mode: 'approve' | 'edit';
  onSubmit: (edits: { role: RoleKey; department: string; region: string; isManager: boolean }) => void;
  onSecondary?: (reason: string) => void;
  busy: boolean;
}) {
  const [role, setRole] = useState<RoleKey>(user.role as RoleKey);
  const [department, setDepartment] = useState(user.department || ROLE_BY_KEY[role]?.department || 'IT');
  const [region, setRegion] = useState(user.region || 'DAM');
  const [isManager, setIsManager] = useState(user.isManager || ROLE_BY_KEY[role]?.isManager || false);
  const [showSecondary, setShowSecondary] = useState(false);
  const [reason, setReason] = useState('');

  const onRoleChange = (r: RoleKey) => {
    setRole(r);
    const def = ROLE_BY_KEY[r];
    if (def) {
      setDepartment(def.department);
      setIsManager(!!def.isManager);
    }
  };

  const rolesByDept = DEPARTMENTS.map(d => ({ dept: d, roles: ROLES_DEF.filter(r => r.department === d.key) }));

  if (showSecondary && mode === 'approve') {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">سبب الرفض</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-y" />
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setShowSecondary(false)} className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition">رجوع</button>
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
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4A1F66] text-white flex items-center justify-center font-bold text-sm">
            {user.fullName?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-bold text-gray-800">{user.fullName}</p>
            <p className="text-xs text-gray-500" dir="ltr">{user.email}</p>
          </div>
        </div>
        {user.registeredAt && <p className="text-[11px] text-gray-500 mt-2">تاريخ التسجيل: {formatRelativeTime(user.registeredAt)}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">الدور الوظيفي</label>
        <div className="relative">
          <select value={role} onChange={e => onRoleChange(e.target.value as RoleKey)}
            className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] bg-white pl-8">
            {rolesByDept.map(g => (
              <optgroup key={g.dept.key} label={g.dept.name}>
                {g.roles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">الإدارة</label>
        <div className="relative">
          <select value={department} onChange={e => setDepartment(e.target.value)}
            className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] bg-white pl-8">
            {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.name}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">المنطقة</label>
        <div className="relative">
          <select value={region} onChange={e => setRegion(e.target.value)}
            className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] bg-white pl-8">
            {Object.entries(REGION_LABELS).filter(([k]) => k !== 'ALL').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={isManager} onChange={e => setIsManager(e.target.checked)}
          className="rounded border-gray-300 text-[#4A1F66] focus:ring-[#4A1F66] w-4 h-4" />
        <span className="text-sm text-gray-700 font-semibold">يحقّ له اعتماد طلبات قسمه</span>
      </label>

      <div className="flex gap-3 justify-end border-t pt-4">
        {mode === 'approve' && (
          <button onClick={() => setShowSecondary(true)}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 transition flex items-center gap-1">
            <XCircle className="w-4 h-4" /> رفض
          </button>
        )}
        <button onClick={() => onSubmit({ role, department, region, isManager })} disabled={busy}
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

export function AdminUsersPortal({ users, approveUser, updateUser, deactivateUser, reactivateUser, rejectUser, currentUser }: AdminProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [mode, setMode] = useState<'approve' | 'edit' | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = currentUser.role === 'ADMIN' || (currentUser.role as string).toLowerCase() === 'admin';

  const filtered = useMemo(() => {
    let list = users;
    if (statusFilter !== 'all') list = list.filter(u => u.status === statusFilter);
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

  if (!isAdmin) return <AccessDeniedCard />;

  return (
    <div dir="rtl" className="space-y-4">
      <Card title="بوابة إدارة المستخدمين والصلاحيات" icon={Shield}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو البريد..."
              className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]" />
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'active', 'deactivated'] as StatusFilter[]).map(s => {
          const isActive = statusFilter === s;
          const label = s === 'all' ? 'الكل' : s === 'pending' ? 'بانتظار الموافقة' : s === 'active' ? 'فعّال' : 'معطّل';
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                isActive ? 'bg-[#4A1F66] text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}>
              {label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>{(counts as any)[s]}</span>
            </button>
          );
        })}
      </div>

      <Card title={`المستخدمون (${filtered.length})`} icon={Users}>
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">لا يوجد مستخدمون مطابقون</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:-mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs">
                  <th className="px-3 py-2 text-right font-bold">الاسم</th>
                  <th className="px-3 py-2 text-right font-bold">البريد</th>
                  <th className="px-3 py-2 text-right font-bold">الدور</th>
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
                    <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#4A1F66] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {u.fullName?.charAt(0) || '?'}
                          </div>
                          <span className="font-semibold text-gray-800 truncate max-w-[140px]">{u.fullName}</span>
                          {u.isManager && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">مدير</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs" dir="ltr">{u.email}</td>
                      <td className="px-3 py-2.5 text-xs">{def?.name || u.role}</td>
                      <td className="px-3 py-2.5 text-xs">{dept?.name || u.department}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={u.status} /></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          {u.status === 'pending' && (
                            <button onClick={() => { setSelected(u); setMode('approve'); }}
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition" title="مراجعة">
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          {u.status === 'active' && (
                            <>
                              <button onClick={() => { setSelected(u); setMode('edit'); }}
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition" title="تعديل">
                                <Edit className="w-4 h-4" />
                              </button>
                              {u.id !== currentUser.id && (
                                <button onClick={() => handleDeactivate(u)}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition" title="تعطيل">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                          {u.status === 'deactivated' && (
                            <button onClick={() => handleReactivate(u)}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition" title="إعادة تفعيل">
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

      <Modal open={mode === 'approve'} onClose={() => { setSelected(null); setMode(null); }} title="مراجعة طلب التسجيل">
        {selected && <UserAdminForm user={selected} mode="approve" onSubmit={handleApprove} onSecondary={handleReject} busy={busy} />}
      </Modal>
      <Modal open={mode === 'edit'} onClose={() => { setSelected(null); setMode(null); }} title="تعديل بيانات المستخدم">
        {selected && <UserAdminForm user={selected} mode="edit" onSubmit={handleEdit} busy={busy} />}
      </Modal>
    </div>
  );
}
