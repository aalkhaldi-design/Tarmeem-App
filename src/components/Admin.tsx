import React, { useState, useMemo, useCallback } from 'react';
import { Users, UserPlus, CheckCircle, XCircle, CreditCard as Edit, Shield, Search, Clock, Settings, Plus, Trash2, UserCheck, UserX, ChevronDown } from 'lucide-react';
import { ROLES, REGION_LABELS, ALL_DEPTS, DEFAULT_LISTS, formatRelativeTime } from '../lib/data';
import { Card, Input, AccessDeniedCard } from './ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  region: string;
  departments: string[];
  isDepartmentHead: boolean;
  status: 'active' | 'pending' | 'deactivated';
  registeredAt: string;
  lastSeenAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  deactivatedAt: string | null;
  deactivatedBy: string | null;
  notificationPrefs: { inApp: boolean; email: boolean };
  auditLog: any[];
}

interface AdminProps {
  store: {
    projects: any[];
    users: UserProfile[];
    assessments: any[];
    documents: any[];
    lists: any;
    notifications: any[];
  };
  approveUser: (userId: string, edits: any, approverId: string) => Promise<void>;
  updateUser: (userId: string, edits: any, actorId: string) => Promise<void>;
  deactivateUser: (userId: string, actorId: string, reassignedTo: string) => Promise<void>;
  reactivateUser: (userId: string, actorId: string) => Promise<void>;
  rejectUser: (userId: string, actorId: string, reason?: string) => Promise<void>;
  addUser: (userData: any) => Promise<void>;
  updateList: (key: string, values: string[]) => Promise<void>;
  currentRole: string;
  user: UserProfile;
  // FIX: Added to support data from App.tsx without crashing
  currentUser?: UserProfile;
  users?: UserProfile[];
}

type StatusFilter = 'all' | 'pending' | 'active' | 'deactivated';

/* ------------------------------------------------------------------ */
/*  Status badge helper                                                */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Reusable modal shell                                               */
/* ------------------------------------------------------------------ */

function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      {/* panel */}
      <div
        className={`relative bg-white rounded-xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto animate-in`}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#4A1F66] to-[#6B3D87] px-4 py-3 flex items-center justify-between rounded-t-xl">
          <h3 className="text-white font-bold text-base">{title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white transition"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AdminUserModal – Approve / Reject pending user                     */
/* ------------------------------------------------------------------ */

function AdminUserModal({ user, onApprove, onReject, onClose }: {
  user: UserProfile;
  onApprove: (edits: any) => void;
  onReject: (reason: string) => void;
  onClose: () => void;
}) {
  const [role, setRole] = useState(user.role || ROLES[0]);
  const [region, setRegion] = useState(user.region || 'DAM');
  const [departments, setDepartments] = useState<string[]>(user.departments || []);
  const [isDepartmentHead, setIsDepartmentHead] = useState(user.isDepartmentHead || false);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);

  const toggleDept = (d: string) => {
    setDepartments(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleApprove = async () => {
    setBusy(true);
    await onApprove({ role, region, departments, isDepartmentHead });
    setBusy(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setBusy(true);
    await onReject(rejectReason);
    setBusy(false);
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* User summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4A1F66] text-white flex items-center justify-center font-bold text-sm">
            {user.fullName?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-bold text-gray-800">{user.fullName}</p>
            <p className="text-xs text-gray-500" dir="ltr">{user.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <span>تاريخ التسجيل: {formatRelativeTime(user.registeredAt)}</span>
          <span>آخر ظهور: {formatRelativeTime(user.lastSeenAt)}</span>
        </div>
      </div>

      {showReject ? (
        <>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">سبب الرفض</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-y"
              placeholder="اذكر سبب رفض الطلب..."
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowReject(false)} className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition">رجوع</button>
            <button onClick={handleReject} disabled={busy || !rejectReason.trim()}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-40 flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              {busy ? 'جاري...' : 'رفض المستخدم'}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">الدور الوظيفي</label>
            <div className="relative">
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] bg-white pl-8">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Region */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">المنطقة</label>
            <div className="relative">
              <select value={region} onChange={e => setRegion(e.target.value)}
                className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] bg-white pl-8">
                {Object.entries(REGION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Departments multi-select */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">الأقسام</label>
            <div className="grid grid-cols-2 gap-2 border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-40 overflow-y-auto">
              {ALL_DEPTS.map(d => (
                <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={departments.includes(d)} onChange={() => toggleDept(d)}
                    className="rounded border-gray-300 text-[#4A1F66] focus:ring-[#4A1F66]" />
                  <span className="text-gray-700">{d}</span>
                </label>
              ))}
            </div>
            {departments.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {departments.map(d => (
                  <span key={d} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4A1F66]/10 text-[#4A1F66] text-[11px] font-bold">
                    {d}
                    <button onClick={() => toggleDept(d)} className="hover:text-red-500 transition"><XCircle className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* isDepartmentHead */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isDepartmentHead} onChange={e => setIsDepartmentHead(e.target.checked)}
              className="rounded border-gray-300 text-[#4A1F66] focus:ring-[#4A1F66] w-4 h-4" />
            <span className="text-sm text-gray-700 font-semibold">رئيس قسم</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 justify-end border-t pt-4">
            <button onClick={() => setShowReject(true)}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 transition flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              رفض
            </button>
            <button onClick={handleApprove} disabled={busy}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-40 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              {busy ? 'جاري...' : 'موافقة وتفعيل'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AdminDeactivateModal – Deactivate with reassignment                */
/* ------------------------------------------------------------------ */

function AdminDeactivateModal({ user, activeUsers, onDeactivate, onClose }: {
  user: UserProfile;
  activeUsers: UserProfile[];
  onDeactivate: (reassignedTo: string) => void;
  onClose: () => void;
}) {
  const [reassignedTo, setReassignedTo] = useState('');
  const [busy, setBusy] = useState(false);

  const otherUsers = activeUsers.filter(u => u.id !== user.id);

  const handleDeactivate = async () => {
    setBusy(true);
    await onDeactivate(reassignedTo);
    setBusy(false);
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm font-bold text-red-800 mb-1">تأكيد تعطيل المستخدم</p>
        <p className="text-sm text-red-700">
          سيتم تعطيل حساب <strong>{user.fullName}</strong> ({user.email}). لن يتمكن من الدخول للنظام بعد الآن.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">إعادة تعيين مشاريعه إلى</label>
        <div className="relative">
          <select value={reassignedTo} onChange={e => setReassignedTo(e.target.value)}
            className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] bg-white pl-8">
            <option value="">-- اختر مستخدم --</option>
            {otherUsers.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="flex gap-3 justify-end border-t pt-4">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition">إلغاء</button>
        <button onClick={handleDeactivate} disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-40 flex items-center gap-1">
          <UserX className="w-4 h-4" />
          {busy ? 'جاري...' : 'تعطيل المستخدم'}
        </button>
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/*  EditUserModal – Edit role, region, depts, head flag                */
/* ------------------------------------------------------------------ */

function EditUserModal({ user, onSave, onClose }: {
  user: UserProfile;
  onSave: (edits: any) => void;
  onClose: () => void;
}) {
  const [role, setRole] = useState(user.role);
  const [region, setRegion] = useState(user.region);
  const [departments, setDepartments] = useState<string[]>(user.departments || []);
  const [isDepartmentHead, setIsDepartmentHead] = useState(user.isDepartmentHead || false);
  const [busy, setBusy] = useState(false);

  const toggleDept = (d: string) => {
    setDepartments(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleSave = async () => {
    setBusy(true);
    await onSave({ role, region, departments, isDepartmentHead });
    setBusy(false);
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#4A1F66] text-white flex items-center justify-center font-bold text-sm">
          {user.fullName?.charAt(0) || '?'}
        </div>
        <div>
          <p className="font-bold text-gray-800 text-sm">{user.fullName}</p>
          <p className="text-xs text-gray-500" dir="ltr">{user.email}</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">الدور الوظيفي</label>
        <div className="relative">
          <select value={role} onChange={e => setRole(e.target.value)}
            className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] bg-white pl-8">
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">المنطقة</label>
        <div className="relative">
          <select value={region} onChange={e => setRegion(e.target.value)}
            className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] bg-white pl-8">
            {Object.entries(REGION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">الأقسام</label>
        <div className="grid grid-cols-2 gap-2 border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-40 overflow-y-auto">
          {ALL_DEPTS.map(d => (
            <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={departments.includes(d)} onChange={() => toggleDept(d)}
                className="rounded border-gray-300 text-[#4A1F66] focus:ring-[#4A1F66]" />
              <span className="text-gray-700">{d}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={isDepartmentHead} onChange={e => setIsDepartmentHead(e.target.checked)}
          className="rounded border-gray-300 text-[#4A1F66] focus:ring-[#4A1F66] w-4 h-4" />
        <span className="text-sm text-gray-700 font-semibold">رئيس قسم</span>
      </label>

      <div className="flex gap-3 justify-end border-t pt-4">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition">إلغاء</button>
        <button onClick={handleSave} disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-bold bg-[#4A1F66] text-white hover:bg-[#3A1652] transition disabled:opacity-40 flex items-center gap-1">
          <Edit className="w-4 h-4" />
          {busy ? 'جاري...' : 'حفظ التعديلات'}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AddUserModal – Create a user directly                               */
/* ------------------------------------------------------------------ */

function AddUserModal({ onAdd, onClose, existingEmails }: {
  onAdd: (data: any) => void;
  onClose: () => void;
  existingEmails: Set<string>;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [region, setRegion] = useState('DAM');
  const [departments, setDepartments] = useState<string[]>([]);
  const [isDepartmentHead, setIsDepartmentHead] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggleDept = (d: string) => {
    setDepartments(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleAdd = async () => {
    setError('');
    if (!fullName.trim()) { setError('الاسم الكامل مطلوب'); return; }
    if (!email.trim()) { setError('البريد الإلكتروني مطلوب'); return; }
    if (existingEmails.has(email.trim().toLowerCase())) { setError('البريد الإلكتروني مسجل مسبقاً'); return; }
    if (!password || password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }

    setBusy(true);
    await onAdd({ fullName: fullName.trim(), email: email.trim(), password, role, region, departments, isDepartmentHead });
    setBusy(false);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input label="الاسم الكامل" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="محمد أحمد" />
        <Input label="البريد الإلكتروني" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
      </div>

      <Input label="كلمة المرور" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">الدور الوظيفي</label>
          <div className="relative">
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] bg-white pl-8">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">المنطقة</label>
          <div className="relative">
            <select value={region} onChange={e => setRegion(e.target.value)}
              className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] bg-white pl-8">
              {Object.entries(REGION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-40 overflow-y-auto">
        {ALL_DEPTS.map(d => (
          <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={departments.includes(d)} onChange={() => toggleDept(d)}
              className="rounded border-gray-300 text-[#4A1F66] focus:ring-[#4A1F66]" />
            <span className="text-gray-700">{d}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-3 justify-end border-t pt-4">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition">إلغاء</button>
        <button onClick={handleAdd} disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-bold bg-[#56B894] text-white hover:bg-[#3F9B7A] transition disabled:opacity-40 flex items-center gap-1">
          <UserPlus className="w-4 h-4" />
          {busy ? 'جاري...' : 'إضافة المستخدم'}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AdminUsersPortal                                                   */
/* ------------------------------------------------------------------ */

export function AdminUsersPortal(props: AdminProps) {
  // FIX: Destructure explicitly provided props from App.tsx
  const { 
    store, approveUser, updateUser, deactivateUser, 
    reactivateUser, rejectUser, addUser, 
    currentRole, user, currentUser, users: propUsers 
  } = props;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [modalMode, setModalMode] = useState<'approve' | 'deactivate' | 'edit' | 'add' | null>(null);

  /* ---- Access control ---- */
  // FIX: Universal check for 'admin' that handles casing and accidental spaces
  const activeRole = currentRole || user?.role || currentUser?.role || "";
  const isAuthorized = activeRole.toLowerCase().trim() === 'admin';

  if (!isAuthorized) return <AccessDeniedCard />;

  /* ---- Derived data ---- */
  // FIX: Use prop-based users list if available, otherwise fallback to store
  const displayUsers = propUsers || store.users || [];
  const activeUsers = useMemo(() => displayUsers.filter(u => u.status === 'active'), [displayUsers]);

  const filteredUsers = useMemo(() => {
    let list = displayUsers;
    if (statusFilter !== 'all') list = list.filter(u => u.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(u => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return list;
  }, [displayUsers, statusFilter, search]);

  /* ---- Modal callbacks ---- */
  const handleApprove = useCallback(async (edits: any) => {
    if (!selectedUser) return;
    const actorId = user?.id || currentUser?.id || "";
    await approveUser(selectedUser.id, edits, actorId);
    setSelectedUser(null);
    setModalMode(null);
  }, [selectedUser, approveUser, user, currentUser]);

  const handleReject = useCallback(async (reason: string) => {
    if (!selectedUser) return;
    const actorId = user?.id || currentUser?.id || "";
    await rejectUser(selectedUser.id, actorId, reason);
    setSelectedUser(null);
    setModalMode(null);
  }, [selectedUser, rejectUser, user, currentUser]);

  const handleDeactivate = useCallback(async (reassignedTo: string) => {
    if (!selectedUser) return;
    const actorId = user?.id || currentUser?.id || "";
    await deactivateUser(selectedUser.id, actorId, reassignedTo);
    setSelectedUser(null);
    setModalMode(null);
  }, [selectedUser, deactivateUser, user, currentUser]);

  const handleEdit = useCallback(async (edits: any) => {
    if (!selectedUser) return;
    const actorId = user?.id || currentUser?.id || "";
    await updateUser(selectedUser.id, edits, actorId);
    setSelectedUser(null);
    setModalMode(null);
  }, [selectedUser, updateUser, user, currentUser]);

  const handleAdd = useCallback(async (userData: any) => {
    await addUser(userData);
    setModalMode(null);
  }, [addUser]);

  const handleReactivate = useCallback(async (u: UserProfile) => {
    const actorId = user?.id || currentUser?.id || "";
    await reactivateUser(u.id, actorId);
  }, [reactivateUser, user, currentUser]);

  const closeModal = () => { setSelectedUser(null); setModalMode(null); };

  /* ---- Status counts ---- */
  const counts = useMemo(() => ({
    all: displayUsers.length,
    pending: displayUsers.filter(u => u.status === 'pending').length,
    active: displayUsers.filter(u => u.status === 'active').length,
    deactivated: displayUsers.filter(u => u.status === 'deactivated').length,
  }), [displayUsers]);

  const existingEmails = useMemo(() => new Set(displayUsers.map(u => u.email.toLowerCase())), [displayUsers]);

  /* ---- Render ---- */
  return (
    <div dir="rtl" className="space-y-4">
      {/* Header bar */}
      <Card title="بوابة إدارة المستخدمين" icon={Shield}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو البريد..."
              className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]"
            />
            </div>
          <button
            onClick={() => setModalMode('add')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-[#56B894] text-white hover:bg-[#3F9B7A] transition shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            إضافة مستخدم
          </button>
        </div>
      </Card>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'active', 'deactivated'] as StatusFilter[]).map(s => {
          const isActive = statusFilter === s;
          const label = s === 'all' ? 'الكل' : s === 'pending' ? 'بانتظار الموافقة' : s === 'active' ? 'فعّال' : 'معطّل';
          const count = (counts as any)[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                isActive ? 'bg-[#4A1F66] text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s === 'pending' && <Clock className="w-3 h-3" />}
              {s === 'active' && <CheckCircle className="w-3 h-3" />}
              {s === 'deactivated' && <XCircle className="w-3 h-3" />}
              {s === 'all' && <Users className="w-3 h-3" />}
              {label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Users table */}
      <Card title={`المستخدمون (${filteredUsers.length})`} icon={Users}>
        {filteredUsers.length === 0 ? (
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
                  <th className="px-3 py-2 text-right font-bold">الحالة</th>
                  <th className="px-3 py-2 text-right font-bold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#4A1F66] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                          {u.fullName?.charAt(0) || '?'}
                        </div>
                        <span className="font-semibold text-gray-800 truncate max-w-[120px]">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs" dir="ltr">{u.email}</td>
                    <td className="px-3 py-2.5 text-xs">{u.role}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={u.status} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {u.status === 'pending' && (
                          <button
                            onClick={() => { setSelectedUser(u); setModalMode('approve'); }}
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        {u.status === 'active' && (
                          <button
                            onClick={() => { setSelectedUser(u); setModalMode('edit'); }}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalMode === 'approve'} onClose={closeModal} title="مراجعة طلب التسجيل">
        {selectedUser && <AdminUserModal user={selectedUser} onApprove={handleApprove} onReject={handleReject} onClose={closeModal} />}
      </Modal>
      <Modal open={modalMode === 'deactivate'} onClose={closeModal} title="تعطيل مستخدم">
        {selectedUser && <AdminDeactivateModal user={selectedUser} activeUsers={activeUsers} onDeactivate={handleDeactivate} onClose={closeModal} />}
      </Modal>
      <Modal open={modalMode === 'edit'} onClose={closeModal} title="تعديل بيانات المستخدم">
        {selectedUser && <EditUserModal user={selectedUser} onSave={handleEdit} onClose={closeModal} />}
      </Modal>
      <Modal open={modalMode === 'add'} onClose={closeModal} title="إضافة مستخدم جديد">
        <AddUserModal onAdd={handleAdd} onClose={closeModal} existingEmails={existingEmails} />
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PortalSettings                                                     */
/* ------------------------------------------------------------------ */

const LIST_KEYS = ['projectType', 'referralChannel', 'evacuation', 'supplyMethod'] as const;
const LIST_LABELS: Record<string, string> = {
  projectType: 'نوع المشروع',
  referralChannel: 'قناة الإحالة',
  evacuation: 'الإخلاء',
  supplyMethod: 'طريقة التوريد',
};

export function PortalSettings(props: AdminProps) {
  const { store, updateList, currentRole, user, currentUser } = props;
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<string[]>([]);
  const [newValue, setNewValue] = useState('');
  const [busy, setBusy] = useState(false);

  // FIX: Applied the same case-insensitive role gate
  const activeRole = currentRole || user?.role || currentUser?.role || "";
  if (activeRole.toLowerCase().trim() !== 'admin') return <AccessDeniedCard />;

  const getCurrentValues = (key: string): string[] => {
    return store?.lists?.[key] || (DEFAULT_LISTS as any)[key] || [];
  };

  const save = async () => {
    if (!editingKey) return;
    setBusy(true);
    await updateList(editingKey, draftValues);
    setBusy(false);
    setEditingKey(null);
  };

  return (
    <div dir="rtl">
      <Card title="إعدادات القوائم المنسدلة" icon={Settings}>
        <div className="space-y-4">
          {LIST_KEYS.map(key => {
            const isEditing = editingKey === key;
            const values = isEditing ? draftValues : getCurrentValues(key);
            return (
              <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-700">{LIST_LABELS[key]}</span>
                  {!isEditing ? (
                    <button
                      onClick={() => { setEditingKey(key); setDraftValues([...getCurrentValues(key)]); }}
                      className="px-3 py-1 bg-white border text-xs font-bold rounded-lg"
                    >
                      تعديل
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setEditingKey(null)} className="text-xs">إلغاء</button>
                      <button onClick={save} className="px-3 py-1 bg-[#4A1F66] text-white rounded-lg text-xs">
                        {busy ? 'جاري...' : 'حفظ'}
                      </button>
                    </div>
                  )}
                </div>
                <div className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {values.map(v => <span key={v} className="px-2.5 py-1 bg-gray-100 rounded-full text-xs font-bold">{v}</span>)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
