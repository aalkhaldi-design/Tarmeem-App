import React, { useMemo, useState } from 'react';
import {
  Building2, Users as UsersIcon, Stethoscope, Wallet, Truck, HeartHandshake,
  Megaphone, Handshake, Mic2, FileText, Activity, Bell,
  Shield, Settings, X, ArrowLeft, GitBranch, Clock, Plus,
} from 'lucide-react';
import {
  DEPARTMENTS, DEPT_BY_KEY, DepartmentKey, FormCode, FormDef, FORM_BY_CODE,
  formsByDepartment, departmentName, roleName, slaStatus,
  FORM_STATUS_LABELS,
} from '../lib/data';
import { Card, Pill, EmptyState } from './ui';
import { FormsApi, formAwaitsUser } from './Forms';
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

/* ──────────────────────────────────────────────────────────────────
   EducationalFormModal — read-only metadata view of a form definition.
   Renders no live data, no Firestore writes, no approval bar — purely
   explanatory ("how it's triggered / who fills it / what happens next").
   ────────────────────────────────────────────────────────────────── */

const EducationalFormModal: React.FC<{ form: FormDef; dept: DepartmentKey; onClose: () => void }> =
  ({ form, dept, onClose }) => {
    const isBridged = form.ownerDept !== dept && (form.bridgesTo || []).includes(dept);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" dir="rtl">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center font-bold text-xs">{form.code}</div>
              <div>
                <h2 className="font-bold text-lg">{form.title}</h2>
                <p className="text-[11px] text-white/70">{form.titleEn} · معاينة مرجعية</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition"><X className="w-5 h-5" /></button>
          </div>
          <div className="overflow-y-auto p-5 space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
              {form.description}
            </div>

            {isBridged && (
              <div className="flex items-center gap-2 text-xs text-pink-700 dark:text-pink-300">
                <GitBranch className="w-4 h-4" />
                <span>نموذج جسري — مالكه الأصلي إدارة {departmentName(form.ownerDept)}</span>
              </div>
            )}

            <section>
              <h3 className="text-sm font-bold text-[#4A1F66] dark:text-purple-300 mb-2">كيف يُفعَّل</h3>
              <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed">
                {form.originRoles.length > 0
                  ? <>يُنشَأ يدوياً من قِبل: {form.originRoles.map(r => roleName(r)).join('، ')}.</>
                  : <>يُولَّد آلياً عبر النظام بعد اعتماد نموذج سابق.</>}
                {(form.triggers || []).length > 0 && (
                  <> بعد اعتماده يفتح: <strong>{(form.triggers || []).join('، ')}</strong>.</>
                )}
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-[#4A1F66] dark:text-purple-300 mb-2">من يعبئه</h3>
              <div className="flex flex-wrap gap-1.5">
                {form.originRoles.length === 0
                  ? <span className="text-xs text-gray-500 dark:text-slate-400">النظام آلياً</span>
                  : form.originRoles.map(r => <Pill key={r} tone="purple">{roleName(r)}</Pill>)}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-[#4A1F66] dark:text-purple-300 mb-2">سلسلة الاعتماد</h3>
              <ol className="space-y-1.5">
                {form.approvalChain.map((r, i) => (
                  <li key={r + i} className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 dark:border-slate-700">
                    <div className="w-7 h-7 rounded-full bg-[#4A1F66]/10 dark:bg-purple-900/40 text-[#4A1F66] dark:text-purple-300 flex items-center justify-center text-[11px] font-bold">{i + 1}</div>
                    <span className="text-sm font-bold text-gray-700 dark:text-slate-200">{roleName(r)}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="text-sm font-bold text-[#4A1F66] dark:text-purple-300 mb-2">ماذا يحدث بعد رفعه</h3>
              <div className="space-y-1.5 text-xs text-gray-700 dark:text-slate-300">
                {(form.bridgesTo || []).length > 0 && (
                  <p>يُرسَل كنسخة جسرية إلى: <span className="inline-flex flex-wrap gap-1.5 ml-1">
                    {(form.bridgesTo || []).map(b => <Pill key={b} tone="teal">{departmentName(b)}</Pill>)}
                  </span></p>
                )}
                {form.slaDays != null && (
                  <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> SLA: {form.slaDays} يوم عمل لكل خطوة</p>
                )}
                {(form.triggers || []).length > 0 && (
                  <p>عند اكتمال جميع الاعتمادات يُطلَق: <strong>{(form.triggers || []).join('، ')}</strong></p>
                )}
              </div>
            </section>

            <p className="text-[11px] text-gray-500 dark:text-slate-400 italic border-t border-gray-100 dark:border-slate-700 pt-3">
              هذه نسخة تعليمية للتوضيح فقط — لا تُحفظ أي بيانات ولا تُؤثر على المسار الحقيقي.
            </p>
          </div>
        </div>
      </div>
    );
  };

const DepartmentPortalLayout: React.FC<PortalProps & { dept: DepartmentKey; extras?: React.ReactNode }> =
  ({ dept, user, api, onOpenForm, onCreateForm, extras }) => {
    const def = DEPT_BY_KEY[dept];
    const Icon = DEPT_ICON[dept];

    const deptForms = useMemo(() => formsByDepartment(dept), [dept]);
    const alerts = useMemo(
      () => api.forms.filter(f => formAwaitsUser(f, user) || (f.bridgesTo || []).includes(dept)),
      [api.forms, user, dept],
    );

    const [educationalForm, setEducationalForm] = useState<FormDef | null>(null);

    return (
      <div dir="rtl" className="space-y-5">
        {/* Hero */}
        <div className="rounded-2xl p-6 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${def.color}, ${def.accent})` }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{def.name}</h1>
              <p className="text-white/80 text-sm mt-1">{def.description}</p>
            </div>
          </div>
        </div>

        {extras}

        {dept === 'RESEARCH' && user.role === 'SOCIAL_RESEARCHER' && (
          <button onClick={() => onCreateForm('F-02')}
            className="w-full mb-4 py-3 rounded-xl bg-[#4A1F66] text-white font-bold text-sm hover:bg-[#3A1652] transition flex items-center justify-center gap-2 shadow-lg">
            <Plus className="w-5 h-5" /> استمارة بحث جديدة +
          </button>
        )}

        {/* Section A — Department Forms (read-only educational mocks) */}
        <Card title={`نماذج القسم (${deptForms.length})`} icon={FileText} accent="purple">
          <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-3 leading-relaxed">
            نماذج تشرح المسار التشغيلي للقسم — انقر على أي نموذج لمعرفة كيف يُفعَّل ومن يعبئه وما الذي يحدث بعد رفعه.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {deptForms.map(f => {
              const isBridged = f.ownerDept !== dept && (f.bridgesTo || []).includes(dept);
              return (
                <button key={f.code} onClick={() => setEducationalForm(f)}
                  className="text-right p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-[#4A1F66]/40 hover:shadow transition bg-white dark:bg-slate-800 flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Pill tone="purple">{f.code}</Pill>
                    <span className="text-sm font-bold text-gray-800 dark:text-slate-100">{f.title}</span>
                    {isBridged && <Pill tone="teal">جسري</Pill>}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{f.description}</p>
                  <div className="text-[10px] text-gray-500 dark:text-slate-400 flex flex-wrap gap-1 items-center">
                    <span>يعبئه:</span>
                    <span className="font-bold">{f.originRoles.length > 0 ? f.originRoles.map(r => roleName(r)).join('، ') : 'النظام'}</span>
                    <span className="text-gray-300 dark:text-slate-600">·</span>
                    <span>SLA: {f.slaDays ?? '—'}{f.slaDays ? ' أيام' : ''}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Section B — Department Alerts (quick-jump) */}
        <Card title={`تنبيهات القسم (${alerts.length})`} icon={Bell} accent="teal">
          {alerts.length === 0 ? (
            <EmptyState icon={Activity} title="لا توجد تنبيهات على دورك حالياً" hint="ستظهر هنا النماذج بانتظار اعتمادك أو المُحوَّلة كجسر إلى قسمك." />
          ) : (
            <div className="space-y-2">
              {alerts.map(f => {
                const awaitsMe = formAwaitsUser(f, user);
                const sla = slaStatus(f.stepStartedAt || f.updatedAt, FORM_BY_CODE[f.code]?.slaDays);
                return (
                  <button key={f.id} onClick={() => onOpenForm(f.id)}
                    className={`w-full text-right p-3 rounded-lg border flex items-start gap-3 transition hover:shadow
                      ${awaitsMe
                        ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700'
                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#43bba1]/40'}`}>
                    <div className="w-10 h-10 rounded-lg bg-[#4A1F66]/10 dark:bg-purple-900/40 text-[#4A1F66] dark:text-purple-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                      {f.code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{f.title}</span>
                        {awaitsMe ? <Pill tone="amber">بانتظار اعتمادك</Pill> : <Pill tone="teal">جسر</Pill>}
                        <Pill tone={f.status === 'approved' ? 'green' : f.status === 'rejected' ? 'red' : f.status === 'pending' ? 'amber' : 'gray'}>
                          {FORM_STATUS_LABELS[f.status]}
                        </Pill>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 truncate">
                        {f.beneficiaryName && <>المستفيد: {f.beneficiaryName} · </>}
                        {f.projectId && <>{f.projectId} · </>}
                        {sla.text}
                      </p>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {educationalForm && <EducationalFormModal form={educationalForm} dept={dept} onClose={() => setEducationalForm(null)} />}
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

export type ActivePortal = DepartmentKey | 'HOME' | 'ADMIN' | 'PROJECTS_LIST' | 'PROFILE' | 'SETTINGS';

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
        <NavItem active={active === 'SETTINGS'} onClick={() => onChange('SETTINGS')} icon={Settings} label="الإعدادات" />
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
    { key: 'SETTINGS', label: 'الإعدادات', icon: Settings },
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

