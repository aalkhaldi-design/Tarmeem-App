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

      {/* Departments */}
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
      </div>

      {/* Departments */}
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

      {/* isDepartmentHead */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={isDepartmentHead} onChange={e => setIsDepartmentHead(e.target.checked)}
          className="rounded border-gray-300 text-[#4A1F66] focus:ring-[#4A1F66] w-4 h-4" />
        <span className="text-sm text-gray-700 font-semibold">رئيس قسم</span>
      </label>

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
  const { store, approveUser, updateUser, deactivateUser, reactivateUser, rejectUser, addUser, currentRole, user } = props;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [modalMode, setModalMode] = useState<'approve' | 'deactivate' | 'edit' | 'add' | null>(null);

  /* ---- Access control ---- */
  if (currentRole !== 'Admin') return <AccessDeniedCard />;

  /* ---- Derived data ---- */
  const activeUsers = useMemo(() => store.users.filter(u => u.status === 'active'), [store.users]);

  const filteredUsers = useMemo(() => {
    let list = store.users;
    if (statusFilter !== 'all') list = list.filter(u => u.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(u => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return list;
  }, [store.users, statusFilter, search]);

  /* ---- Modal callbacks ---- */
  const handleApprove = useCallback(async (edits: any) => {
    if (!selectedUser) return;
    await approveUser(selectedUser.id, edits, user.id);
    setSelectedUser(null);
    setModalMode(null);
  }, [selectedUser, approveUser, user.id]);

  const handleReject = useCallback(async (reason: string) => {
    if (!selectedUser) return;
    await rejectUser(selectedUser.id, user.id, reason);
    setSelectedUser(null);
    setModalMode(null);
  }, [selectedUser, rejectUser, user.id]);

  const handleDeactivate = useCallback(async (reassignedTo: string) => {
    if (!selectedUser) return;
    await deactivateUser(selectedUser.id, user.id, reassignedTo);
    setSelectedUser(null);
    setModalMode(null);
  }, [selectedUser, deactivateUser, user.id]);

  const handleEdit = useCallback(async (edits: any) => {
    if (!selectedUser) return;
    await updateUser(selectedUser.id, edits, user.id);
    setSelectedUser(null);
    setModalMode(null);
  }, [selectedUser, updateUser, user.id]);

  const handleAdd = useCallback(async (userData: any) => {
    await addUser(userData);
    setModalMode(null);
  }, [addUser]);

  const handleReactivate = useCallback(async (u: UserProfile) => {
    await reactivateUser(u.id, user.id);
  }, [reactivateUser, user.id]);

  const closeModal = () => { setSelectedUser(null); setModalMode(null); };

  /* ---- Status counts ---- */
  const counts = useMemo(() => ({
    all: store.users.length,
    pending: store.users.filter(u => u.status === 'pending').length,
    active: store.users.filter(u => u.status === 'active').length,
    deactivated: store.users.filter(u => u.status === 'deactivated').length,
  }), [store.users]);

  const existingEmails = useMemo(() => new Set(store.users.map(u => u.email.toLowerCase())), [store.users]);

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
          const count = counts[s];
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
                  <th className="px-3 py-2 text-right font-bold">المنطقة</th>
                  <th className="px-3 py-2 text-right font-bold">الأقسام</th>
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
                    <td className="px-3 py-2.5 text-xs">{REGION_LABELS[u.region] || u.region}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {(u.departments || []).slice(0, 2).map(d => (
                          <span key={d} className="px-1.5 py-0.5 rounded bg-[#4A1F66]/10 text-[#4A1F66] text-[10px] font-bold">{d}</span>
                        ))}
                        {(u.departments || []).length > 2 && (
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-bold">+{u.departments.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={u.status} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {u.status === 'pending' && (
                          <>
                            <button
                              onClick={() => { setSelectedUser(u); setModalMode('approve'); }}
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                              title="موافقة"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelectedUser(u); setModalMode('approve'); }}
                              className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                              title="رفض"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {u.status === 'active' && (
                          <>
                            <button
                              onClick={() => { setSelectedUser(u); setModalMode('edit'); }}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                              title="تعديل"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelectedUser(u); setModalMode('deactivate'); }}
                              className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                              title="تعطيل"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {u.status === 'deactivated' && (
                          <button
                            onClick={() => handleReactivate(u)}
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                            title="إعادة تفعيل"
                          >
                            <UserCheck className="w-4 h-4" />
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

      {/* Approve / Reject modal */}
      <Modal open={modalMode === 'approve'} onClose={closeModal} title="مراجعة طلب التسجيل">
        {selectedUser && (
          <AdminUserModal
            user={selectedUser}
            onApprove={handleApprove}
            onReject={handleReject}
            onClose={closeModal}
          />
        )}
      </Modal>

      {/* Deactivate modal */}
      <Modal open={modalMode === 'deactivate'} onClose={closeModal} title="تعطيل مستخدم">
        {selectedUser && (
          <AdminDeactivateModal
            user={selectedUser}
            activeUsers={activeUsers}
            onDeactivate={handleDeactivate}
            onClose={closeModal}
          />
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={modalMode === 'edit'} onClose={closeModal} title="تعديل بيانات المستخدم">
        {selectedUser && (
          <EditUserModal
            user={selectedUser}
            onSave={handleEdit}
            onClose={closeModal}
          />
        )}
      </Modal>

      {/* Add user modal */}
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

export function PortalSettings({ store, updateList, currentRole }: {
  store: AdminProps['store'];
  updateList: AdminProps['updateList'];
  currentRole: string;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<string[]>([]);
  const [newValue, setNewValue] = useState('');
  const [busy, setBusy] = useState(false);

  if (currentRole !== 'Admin') return <AccessDeniedCard />;

  const getCurrentValues = (key: string): string[] => {
    return store.lists?.[key] || (DEFAULT_LISTS as any)[key] || [];
  };

  const startEdit = (key: string) => {
    setEditingKey(key);
    setDraftValues([...getCurrentValues(key)]);
    setNewValue('');
  };

  const addValue = () => {
    const trimmed = newValue.trim();
    if (!trimmed || draftValues.includes(trimmed)) return;
    setDraftValues(prev => [...prev, trimmed]);
    setNewValue('');
  };

  const removeValue = (v: string) => {
    setDraftValues(prev => prev.filter(x => x !== v));
  };

  const save = async () => {
    if (!editingKey) return;
    setBusy(true);
    await updateList(editingKey, draftValues);
    setBusy(false);
    setEditingKey(null);
  };

  const cancel = () => {
    setEditingKey(null);
    setDraftValues([]);
    setNewValue('');
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
                      onClick={() => startEdit(key)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition"
                    >
                      <Edit className="w-3 h-3" />
                      تعديل
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={cancel} className="px-3 py-1 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-200 transition">إلغاء</button>
                      <button onClick={save} disabled={busy}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#4A1F66] text-white hover:bg-[#3A1652] transition disabled:opacity-40">
                        <CheckCircle className="w-3 h-3" />
                        {busy ? 'جاري...' : 'حفظ'}
                      </button>
                    </div>
                  )}
                </div>
                <div className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {values.map(v => (
                      <span
                        key={v}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isEditing ? 'bg-[#4A1F66]/10 text-[#4A1F66] pr-1.5' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {v}
                        {isEditing && (
                          <button onClick={() => removeValue(v)} className="hover:text-red-500 transition p-0.5">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {isEditing && (
                    <div className="flex items-center gap-2 mt-3">
                      <input
                        type="text"
                        value={newValue}
                        onChange={e => setNewValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addValue(); } }}
                        placeholder="أضف قيمة جديدة..."
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]"
                      />
                      <button
                        onClick={addValue}
                        disabled={!newValue.trim()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#56B894] text-white hover:bg-[#3F9B7A] transition disabled:opacity-40"
                      >
                        <Plus className="w-3 h-3" />
                        إضافة
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
