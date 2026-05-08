import React, { useMemo, useState } from 'react';
import {
  Users, Stethoscope, Truck, Cpu, Wallet, Megaphone, Mic2, Shield,
  Plus, Search, Inbox, FileText, Activity, Building2, AlertTriangle,
} from 'lucide-react';
import {
  DEPARTMENTS, DEPT_BY_KEY, DepartmentKey, RoleKey,
  FormCode, formsByDepartment, departmentName, roleName,
} from '../lib/data';
import { Card, AccessDeniedCard } from './ui';
import {
  FormsApi, FormCard, FormDetailModal, NewFormModal, InboxPanel,
  formCanBeOriginatedBy, formAwaitsRole,
} from './Forms';
import type { UserProfile } from './Auth';

/* ──────────────────────────────────────────────────────────────────
   أيقونة لكل إدارة
   ────────────────────────────────────────────────────────────────── */

const DEPT_ICON: Record<DepartmentKey, React.ElementType> = {
  EXEC: Building2,
  RESEARCH: Users,
  PROJECTS: Stethoscope,
  SUPPORT: Truck,
  IT: Cpu,
  FINANCE: Wallet,
  MARKETING: Megaphone,
  COMMS: Mic2,
  GOVERNANCE: Shield,
};

/* ──────────────────────────────────────────────────────────────────
   Portal Layout — قالب موحّد لكل إدارة
   ────────────────────────────────────────────────────────────────── */

interface PortalLayoutProps {
  dept: DepartmentKey;
  user: UserProfile;
  users: UserProfile[];
  api: FormsApi;
  /** أقسام إضافية خاصة بالإدارة (لوحات، إحصائيات…) تظهر أعلى الصفحة */
  extras?: React.ReactNode;
}

const DepartmentPortalLayout: React.FC<PortalLayoutProps> = ({ dept, user, users, api, extras }) => {
  const def = DEPT_BY_KEY[dept];
  const Icon = DEPT_ICON[dept];
  const myRole = user.role as RoleKey;

  const ownedForms = useMemo(() => formsByDepartment(dept), [dept]);
  const myForms = useMemo(() => api.forms.filter(f => f.ownerDept === dept || (f.bridgesTo || []).includes(dept)), [api.forms, dept]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('all');
  const [openFormId, setOpenFormId] = useState<string | null>(null);
  const [showNewFormModal, setShowNewFormModal] = useState(false);
  const [preselectCode, setPreselectCode] = useState<FormCode | undefined>(undefined);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myForms.filter(f => {
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;
      if (!q) return true;
      return (
        f.title.toLowerCase().includes(q) ||
        f.code.toLowerCase().includes(q) ||
        (f.refKey || '').toLowerCase().includes(q)
      );
    });
  }, [myForms, search, statusFilter]);

  const counts = useMemo(() => ({
    all: myForms.length,
    pending: myForms.filter(f => f.status === 'pending').length,
    awaitingMe: myForms.filter(f => formAwaitsRole(f, myRole)).length,
    approved: myForms.filter(f => f.status === 'approved' || f.status === 'completed').length,
    rejected: myForms.filter(f => f.status === 'rejected').length,
  }), [myForms, myRole]);

  // النماذج التي يمكن للمستخدم الحالي إنشاؤها داخل هذه الإدارة
  const creatableForms = useMemo(
    () => ownedForms.filter(f => formCanBeOriginatedBy(f, myRole) || user.role === 'ADMIN'),
    [ownedForms, myRole, user.role],
  );

  const openForm = (id: string) => setOpenFormId(id);
  const openRec = openFormId ? api.forms.find(f => f.id === openFormId) || null : null;

  return (
    <div dir="rtl" className="space-y-6">
      {/* رأس الإدارة */}
      <div className="rounded-2xl p-6 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${def.color}, ${def.accent})` }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{def.name}</h1>
              <p className="text-white/80 text-sm mt-1">{def.nameEn} · {def.description}</p>
            </div>
          </div>
          {creatableForms.length > 0 && (
            <button onClick={() => { setPreselectCode(undefined); setShowNewFormModal(true); }}
              className="bg-white text-gray-800 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-white/90 transition shadow">
              <Plus className="w-4 h-4" /> نموذج جديد
            </button>
          )}
        </div>
      </div>

      {extras}

      {/* صندوق الوارد */}
      <InboxPanel user={user} api={api} onOpen={openForm} />

      {/* النماذج المسموح إنشاؤها بدوري */}
      {creatableForms.length > 0 && (
        <Card title="النماذج المتاحة لدورك" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {creatableForms.map(f => (
              <button key={f.code} onClick={() => { setPreselectCode(f.code); setShowNewFormModal(true); }}
                className="text-right p-3 rounded-lg border border-gray-200 hover:border-[#4A1F66]/30 hover:shadow transition bg-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#4A1F66]/10 text-[#4A1F66]">{f.code}</span>
                  <span className="text-sm font-bold text-gray-800">{f.title}</span>
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-2">{f.description}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* قائمة النماذج الخاصة بالإدارة */}
      <Card title={`نماذج ${def.name} (${counts.all})`} icon={FileText}>
        {/* فلاتر */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث برمز أو عنوان النموذج..."
              className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]" />
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ['all', 'الكل', counts.all],
              ['pending', 'بانتظار', counts.pending],
              ['approved', 'معتمدة', counts.approved],
              ['rejected', 'مرفوضة', counts.rejected],
            ] as const).map(([k, label, n]) => (
              <button key={k} onClick={() => setStatusFilter(k as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${statusFilter === k ? 'bg-[#4A1F66] text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {label} ({n})
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">لا توجد نماذج مطابقة</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(f => (
              <FormCard key={f.id} rec={f} onOpen={() => openForm(f.id)} highlight={formAwaitsRole(f, myRole)} />
            ))}
          </div>
        )}
      </Card>

      {/* النماذج المتاحة كمرجع (Catalog) */}
      <Card title="فهرس نماذج الإدارة (مرجعي)" icon={FileText}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {ownedForms.map(f => (
            <div key={f.code} className="flex items-start gap-2 p-2 rounded-lg border border-gray-100">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">{f.code}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800">{f.title}</p>
                <p className="text-[10px] text-gray-500">
                  {f.ownerDept !== dept ? <span className="text-pink-600">جسر من {departmentName(f.ownerDept)}</span> : 'مالك أصلي'}
                  {' · سلسلة: '}
                  {f.approvalChain.map(r => roleName(r)).join(' ← ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {openRec && (
        <FormDetailModal rec={openRec} user={user} api={api} users={users} onClose={() => setOpenFormId(null)} />
      )}
      {showNewFormModal && (
        <NewFormModal user={user} api={api} preselect={preselectCode} onClose={() => { setShowNewFormModal(false); setPreselectCode(undefined); }} />
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   Department-specific extras (لوحة موجزة لكل إدارة)
   ────────────────────────────────────────────────────────────────── */

const StatPill: React.FC<{ label: string; value: number | string; tone?: string }> = ({ label, value, tone = 'bg-gray-50 text-gray-700' }) => (
  <div className={`rounded-xl p-4 ${tone}`}>
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs font-semibold opacity-80 mt-0.5">{label}</p>
  </div>
);

const DeptOverview: React.FC<{ dept: DepartmentKey; api: FormsApi }> = ({ dept, api }) => {
  const list = api.forms.filter(f => f.ownerDept === dept || (f.bridgesTo || []).includes(dept));
  const stats = {
    total: list.length,
    pending: list.filter(f => f.status === 'pending').length,
    approved: list.filter(f => f.status === 'approved').length,
    rejected: list.filter(f => f.status === 'rejected').length,
  };
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatPill label="إجمالي النماذج" value={stats.total} tone="bg-purple-50 text-purple-700" />
      <StatPill label="معلّقة" value={stats.pending} tone="bg-amber-50 text-amber-700" />
      <StatPill label="معتمدة" value={stats.approved} tone="bg-green-50 text-green-700" />
      <StatPill label="مرفوضة" value={stats.rejected} tone="bg-red-50 text-red-700" />
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   9 Portal Components — مغلّفة على PortalLayout
   ────────────────────────────────────────────────────────────────── */

interface DeptPortalProps { user: UserProfile; users: UserProfile[]; api: FormsApi; }

const makePortal = (dept: DepartmentKey) => function Portal({ user, users, api }: DeptPortalProps) {
  return (
    <DepartmentPortalLayout
      dept={dept}
      user={user}
      users={users}
      api={api}
      extras={<DeptOverview dept={dept} api={api} />}
    />
  );
};

export const ExecutivePortal     = makePortal('EXEC');
export const ResearchPortal      = makePortal('RESEARCH');
export const ProjectsPortal      = makePortal('PROJECTS');
export const SupportPortal       = makePortal('SUPPORT');
export const ITPortal            = makePortal('IT');
export const FinancePortal       = makePortal('FINANCE');
export const MarketingPortal     = makePortal('MARKETING');
export const CommsPortal         = makePortal('COMMS');
export const GovernancePortal    = makePortal('GOVERNANCE');

export const DEPT_PORTALS: Record<DepartmentKey, React.FC<DeptPortalProps>> = {
  EXEC: ExecutivePortal,
  RESEARCH: ResearchPortal,
  PROJECTS: ProjectsPortal,
  SUPPORT: SupportPortal,
  IT: ITPortal,
  FINANCE: FinancePortal,
  MARKETING: MarketingPortal,
  COMMS: CommsPortal,
  GOVERNANCE: GovernancePortal,
};

/* ──────────────────────────────────────────────────────────────────
   ExecutiveHubPanel — F-73 صندوق التنفيذي
   ────────────────────────────────────────────────────────────────── */

export const ExecutiveHubPanel: React.FC<DeptPortalProps> = ({ user, users, api }) => {
  // النماذج المعلّقة عند المدير التنفيذي تحديداً
  const myRole = user.role as RoleKey;
  const allowed = myRole === 'EXEC_DIRECTOR' || myRole === 'BOARD_MEMBER' || user.role === 'ADMIN';
  const [openId, setOpenId] = useState<string | null>(null);

  if (!allowed) return <AccessDeniedCard />;

  const queue = api.forms.filter(f => f.status === 'pending' && f.approvalChain[f.approvalIndex] === 'EXEC_DIRECTOR');

  // تصنيف حسب الفئة الكبرى
  const categorize = (code: string) => {
    if (code === 'F-03') return 'قرارات الاستحقاق';
    if (code === 'F-84') return 'استثناءات المقاولين';
    if (code === 'F-15') return 'صرف الدفعات';
    if (code === 'F-53') return 'تعديل الإجراءات';
    return 'أخرى';
  };
  const groups = queue.reduce<Record<string, typeof queue>>((acc, f) => {
    const k = categorize(f.code);
    (acc[k] = acc[k] || []).push(f);
    return acc;
  }, {});

  const openRec = openId ? api.forms.find(f => f.id === openId) || null : null;

  return (
    <div dir="rtl" className="space-y-6">
      <div className="rounded-2xl p-6 text-white shadow-lg" style={{ background: `linear-gradient(135deg, #4A1F66, #6B3D87)` }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">صندوق القرار التنفيذي · F-73</h1>
            <p className="text-white/80 text-sm mt-1">يجمع تلقائياً الطلبات الكبرى من الاستحقاق والاستثناءات والصرف وتعديل الإجراءات.</p>
          </div>
        </div>
      </div>

      {queue.length === 0 ? (
        <Card title="لا توجد قرارات معلّقة" icon={Activity}>
          <p className="text-sm text-gray-500 text-center py-6">لا توجد طلبات بانتظار اعتماد المدير التنفيذي حالياً.</p>
        </Card>
      ) : (
        Object.entries(groups).map(([title, list]) => (
          <Card key={title} title={`${title} (${list.length})`} icon={Inbox}>
            <div className="space-y-2">
              {list.map(f => <FormCard key={f.id} rec={f} highlight onOpen={() => setOpenId(f.id)} />)}
            </div>
          </Card>
        ))
      )}

      {openRec && <FormDetailModal rec={openRec} user={user} api={api} users={users} onClose={() => setOpenId(null)} />}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   Sidebar — تنقل بين البوابات المسموح بها للمستخدم
   ────────────────────────────────────────────────────────────────── */

export type ActivePortal = DepartmentKey | 'EXEC_HUB' | 'HOME' | 'ADMIN';

export const PortalSidebar: React.FC<{
  active: ActivePortal;
  onChange: (p: ActivePortal) => void;
  user: UserProfile;
  api: FormsApi;
  isAdmin: boolean;
  allowedDepts: DepartmentKey[];
}> = ({ active, onChange, user, api, isAdmin, allowedDepts }) => {
  const myRole = user.role as RoleKey;
  const inboxCount = api.forms.filter(f => formAwaitsRole(f, myRole)).length;
  const isExec = myRole === 'EXEC_DIRECTOR' || myRole === 'BOARD_MEMBER' || isAdmin;

  const items: { key: ActivePortal; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: 'HOME', label: 'الرئيسية', icon: Activity },
    ...DEPARTMENTS
      .filter(d => allowedDepts.includes(d.key))
      .map(d => ({ key: d.key as ActivePortal, label: d.name, icon: DEPT_ICON[d.key] })),
  ];
  if (isExec) items.push({ key: 'EXEC_HUB', label: 'صندوق التنفيذي · F-73', icon: AlertTriangle });
  if (isAdmin) items.push({ key: 'ADMIN', label: 'لوحة الإدارة', icon: Shield });

  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-white border-l border-gray-200 sticky top-0 h-screen overflow-y-auto" dir="rtl">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-bold text-gray-500">{user.fullName}</p>
        <p className="text-[10px] text-gray-400">{roleName(user.role)}</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {items.map(it => {
          const Icon = it.icon;
          const isActive = active === it.key;
          const showInbox = it.key !== 'HOME' && it.key !== 'ADMIN';
          return (
            <button key={it.key} onClick={() => onChange(it.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold transition text-right
                ${isActive ? 'bg-[#4A1F66] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{it.label}</span>
              {showInbox && it.key === 'EXEC_HUB' && inboxCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold">{inboxCount}</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export const PortalMobileNav: React.FC<{
  active: ActivePortal;
  onChange: (p: ActivePortal) => void;
  user: UserProfile;
  isAdmin: boolean;
  allowedDepts: DepartmentKey[];
}> = ({ active, onChange, user, isAdmin, allowedDepts }) => {
  const myRole = user.role as RoleKey;
  const isExec = myRole === 'EXEC_DIRECTOR' || myRole === 'BOARD_MEMBER' || isAdmin;
  const items: { key: ActivePortal; label: string; icon: React.ElementType }[] = [
    { key: 'HOME', label: 'الرئيسية', icon: Activity },
    ...DEPARTMENTS.filter(d => allowedDepts.includes(d.key)).map(d => ({ key: d.key as ActivePortal, label: d.shortName, icon: DEPT_ICON[d.key] })),
  ];
  if (isExec) items.push({ key: 'EXEC_HUB', label: 'تنفيذي', icon: AlertTriangle });
  if (isAdmin) items.push({ key: 'ADMIN', label: 'الإدارة', icon: Shield });

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex overflow-x-auto z-40 hide-scrollbar" dir="rtl">
      {items.map(it => {
        const Icon = it.icon;
        const isActive = active === it.key;
        return (
          <button key={it.key} onClick={() => onChange(it.key)}
            className={`flex flex-col items-center justify-center min-w-[80px] py-2 px-2 ${isActive ? 'text-[#4A1F66] font-bold' : 'text-gray-400'}`}>
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
