import React, { useMemo, useState } from 'react';
import {
  Building2, Users as UsersIcon, Stethoscope, Wallet, Truck, HeartHandshake,
  Megaphone, Handshake, Mic2, FileText, Plus, Activity, Inbox,
  Shield,
} from 'lucide-react';
import {
  DEPARTMENTS, DEPT_BY_KEY, DepartmentKey, RoleKey, formsByDepartment,
  departmentName, roleName, FormCode,
} from '../lib/data';
import { Card, Pill, EmptyState, SearchBar } from './ui';
import {
  FormsApi, FormCard, formCanBeOriginatedBy, formAwaitsUser,
} from './Forms';
import type { UserProfile } from './Auth';

const DEPT_ICON: Record<DepartmentKey, React.ElementType> = {
  EXEC: Building2,
  RESEARCH: UsersIcon,
  PROJECTS: Stethoscope,
  FINANCE: Wallet,
  SUPPORT: Truck,
  VOLUNTEER: HeartHandshake,
  MARKETING: Megaphone,
  PARTNERSHIP: Handshake,
  COMMS: Mic2,
};

interface PortalProps {
  user: UserProfile;
  users: UserProfile[];
  api: FormsApi;
  onOpenForm: (id: string) => void;
  onCreateForm: (preselect?: FormCode) => void;
}

const DepartmentPortalLayout: React.FC<PortalProps & { dept: DepartmentKey; extras?: React.ReactNode }> =
  ({ dept, user, api, onOpenForm, onCreateForm, extras }) => {
    const def = DEPT_BY_KEY[dept];
    const Icon = DEPT_ICON[dept];
    const myRole = user.role as RoleKey;

    const ownedForms = useMemo(() => formsByDepartment(dept), [dept]);
    const records = useMemo(() => api.forms.filter(f => f.ownerDept === dept || (f.bridgesTo || []).includes(dept)), [api.forms, dept]);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    const filtered = useMemo(() => {
      const q = search.trim().toLowerCase();
      return records.filter(f => {
        if (statusFilter !== 'all' && f.status !== statusFilter) return false;
        if (!q) return true;
        return (f.title.toLowerCase().includes(q) || f.code.toLowerCase().includes(q) || (f.beneficiaryName || '').toLowerCase().includes(q) || (f.projectId || '').toLowerCase().includes(q));
      });
    }, [records, search, statusFilter]);

    const inbox = useMemo(() => api.forms.filter(f => formAwaitsUser(f, user)), [api.forms, user]);
    const stats = {
      total: records.length,
      pending: records.filter(f => f.status === 'pending').length,
      approved: records.filter(f => f.status === 'approved').length,
      rejected: records.filter(f => f.status === 'rejected').length,
    };

    const creatable = ownedForms.filter(f => formCanBeOriginatedBy(f, myRole) || user.role === 'ADMIN');

    return (
      <div dir="rtl" className="space-y-5">
        <div className="rounded-2xl p-6 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${def.color}, ${def.accent})` }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                <Icon className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{def.name}</h1>
                <p className="text-white/80 text-sm mt-1">{def.description}</p>
              </div>
            </div>
            {creatable.length > 0 && (
              <button onClick={() => onCreateForm()} className="bg-white text-gray-800 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-white/90 shadow">
                <Plus className="w-4 h-4" /> نموذج جديد
              </button>
            )}
          </div>
        </div>

        {extras}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-purple-50 dark:bg-purple-900/30 p-4">
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.total}</p>
            <p className="text-xs font-semibold text-purple-700/80 dark:text-purple-300/80 mt-1">إجمالي النماذج</p>
          </div>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/30 p-4">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.pending}</p>
            <p className="text-xs font-semibold text-amber-700/80 dark:text-amber-300/80 mt-1">معلّقة</p>
          </div>
          <div className="rounded-xl bg-green-50 dark:bg-green-900/30 p-4">
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.approved}</p>
            <p className="text-xs font-semibold text-green-700/80 dark:text-green-300/80 mt-1">معتمدة</p>
          </div>
          <div className="rounded-xl bg-red-50 dark:bg-red-900/30 p-4">
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.rejected}</p>
            <p className="text-xs font-semibold text-red-700/80 dark:text-red-300/80 mt-1">مرفوضة</p>
          </div>
        </div>

        <Card title={`صندوق وارد العضو (${inbox.length})`} icon={Inbox} accent="teal">
          {inbox.length === 0 ? (
            <EmptyState icon={Activity} title="لا توجد طلبات معلّقة على دورك" />
          ) : (
            <div className="space-y-2">{inbox.map(f => <FormCard key={f.id} rec={f} highlight onOpen={() => onOpenForm(f.id)} />)}</div>
          )}
        </Card>

        {creatable.length > 0 && (
          <Card title="النماذج المتاحة لدورك" icon={FileText}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {creatable.map(f => (
                <button key={f.code} onClick={() => onCreateForm(f.code)}
                  className="text-right p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-[#4A1F66]/30 hover:shadow transition bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill tone="purple">{f.code}</Pill>
                    <span className="text-sm font-bold text-gray-800 dark:text-slate-100">{f.title}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2">{f.description}</p>
                </button>
              ))}
            </div>
          </Card>
        )}

        <Card title={`نماذج ${def.name} (${records.length})`} icon={FileText} accent="purple">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="بحث برمز أو عنوان أو مستفيد..." /></div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${statusFilter === s ? 'bg-[#4A1F66] text-white shadow' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
                  {s === 'all' ? 'الكل' : s === 'pending' ? 'بانتظار' : s === 'approved' ? 'معتمدة' : 'مرفوضة'}
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={FileText} title="لا توجد نماذج مطابقة" />
          ) : (
            <div className="space-y-2">
              {filtered.map(f => <FormCard key={f.id} rec={f} highlight={formAwaitsUser(f, user)} onOpen={() => onOpenForm(f.id)} />)}
            </div>
          )}
        </Card>

        <Card title="فهرس نماذج الإدارة (مرجعي)" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ownedForms.map(f => (
              <div key={f.code} className="flex items-start gap-2 p-2 rounded-lg border border-gray-100 dark:border-slate-700">
                <Pill tone="gray">{f.code}</Pill>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 dark:text-slate-100">{f.title}</p>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400">
                    {f.ownerDept !== dept ? <span className="text-pink-600">جسر من {departmentName(f.ownerDept)}</span> : 'مالك أصلي'}
                    {' · '}
                    {f.approvalChain.map(r => roleName(r)).join(' ← ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

const makePortal = (dept: DepartmentKey) => function P(props: PortalProps) {
  return <DepartmentPortalLayout dept={dept} {...props} />;
};

export const ExecutivePortal     = makePortal('EXEC');
export const ResearchPortal      = makePortal('RESEARCH');
export const ProjectsPortal      = makePortal('PROJECTS');
export const FinancePortal       = makePortal('FINANCE');
export const SupportPortal       = makePortal('SUPPORT');
export const VolunteerPortal     = makePortal('VOLUNTEER');
export const MarketingPortal     = makePortal('MARKETING');
export const PartnershipPortal   = makePortal('PARTNERSHIP');
export const CommsPortal         = makePortal('COMMS');

export const DEPT_PORTALS: Record<DepartmentKey, React.FC<PortalProps>> = {
  EXEC: ExecutivePortal,
  RESEARCH: ResearchPortal,
  PROJECTS: ProjectsPortal,
  FINANCE: FinancePortal,
  SUPPORT: SupportPortal,
  VOLUNTEER: VolunteerPortal,
  MARKETING: MarketingPortal,
  PARTNERSHIP: PartnershipPortal,
  COMMS: CommsPortal,
};

/* ──────────────────────────────────────────────────────────────────
   Sidebar / Mobile nav
   ────────────────────────────────────────────────────────────────── */

export type ActivePortal = DepartmentKey | 'HOME' | 'ADMIN' | 'PROJECTS_LIST' | 'PROFILE';

export const PortalSidebar: React.FC<{
  active: ActivePortal;
  onChange: (p: ActivePortal) => void;
  user: UserProfile;
  api: FormsApi;
  isAdmin: boolean;
  allowedDepts: DepartmentKey[];
}> = ({ active, onChange, user, api, isAdmin, allowedDepts }) => {
  const inboxCount = api.forms.filter(f => formAwaitsUser(f, user)).length;

  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 sticky top-0 h-screen overflow-y-auto" dir="rtl">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800">
        <p className="text-xs font-bold text-gray-700 dark:text-slate-200">{user.fullName}</p>
        <p className="text-[10px] text-gray-400 dark:text-slate-500">{roleName(user.role)}</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        <NavItem active={active === 'HOME'} onClick={() => onChange('HOME')} icon={Activity} label="الرئيسية" />
        <NavItem active={active === 'PROJECTS_LIST'} onClick={() => onChange('PROJECTS_LIST')} icon={Building2} label="المشاريع" />
        <div className="my-2 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">الإدارات</div>
        {DEPARTMENTS.filter(d => allowedDepts.includes(d.key)).map(d => (
          <NavItem key={d.key} active={active === d.key} onClick={() => onChange(d.key)} icon={DEPT_ICON[d.key]} label={d.name} />
        ))}
        <div className="my-2 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">حسابي</div>
        <NavItem active={active === 'PROFILE'} onClick={() => onChange('PROFILE')} icon={UsersIcon} label="ملفي الشخصي" badge={inboxCount} />
        {isAdmin && <NavItem active={active === 'ADMIN'} onClick={() => onChange('ADMIN')} icon={Shield} label="لوحة الإدارة" />}
      </nav>
    </aside>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ElementType; label: string; badge?: number }> =
  ({ active, onClick, icon: Icon, label, badge }) => (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold transition text-right
        ${active ? 'bg-[#4A1F66] text-white shadow' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold">{badge}</span> : null}
    </button>
  );

export const PortalMobileNav: React.FC<{
  active: ActivePortal;
  onChange: (p: ActivePortal) => void;
  isAdmin: boolean;
  allowedDepts: DepartmentKey[];
}> = ({ active, onChange, isAdmin, allowedDepts }) => {
  const items: { key: ActivePortal; label: string; icon: React.ElementType }[] = [
    { key: 'HOME', label: 'الرئيسية', icon: Activity },
    { key: 'PROJECTS_LIST', label: 'المشاريع', icon: Building2 },
    ...DEPARTMENTS.filter(d => allowedDepts.includes(d.key)).map(d => ({ key: d.key as ActivePortal, label: d.shortName, icon: DEPT_ICON[d.key] })),
    { key: 'PROFILE', label: 'ملفي', icon: UsersIcon },
  ];
  if (isAdmin) items.push({ key: 'ADMIN', label: 'الإدارة', icon: Shield });

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex overflow-x-auto z-40 hide-scrollbar" dir="rtl">
      {items.map(it => {
        const Icon = it.icon;
        const isActive = active === it.key;
        return (
          <button key={it.key} onClick={() => onChange(it.key)}
            className={`flex flex-col items-center justify-center min-w-[80px] py-2 px-2 ${isActive ? 'text-[#4A1F66] dark:text-purple-300 font-bold' : 'text-gray-400 dark:text-slate-500'}`}>
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

