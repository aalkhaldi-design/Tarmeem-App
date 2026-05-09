import React, { useMemo } from 'react';
import {
  Home as HomeIcon, Activity, Inbox, FileText, ArrowLeft, CheckCircle, Building2,
  Target, TrendingUp, AlertTriangle, MapPin,
} from 'lucide-react';
import {
  DEPARTMENTS, DEPT_BY_KEY, DepartmentKey, regionLabel, FORM_STATUS_LABELS,
  FORM_STATUS_COLORS, roleName,
} from '../lib/data';
import { Card, TarmeemLogo, ProgressBar, Pill, DonutChart, BarChart, Sparkline, EmptyState } from './ui';
import { FormsApi, formAwaitsUser } from './Forms';
import type { ProjectRecord } from '../lib/types';
import type { UserProfile } from './Auth';

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const formatArabicDate = () => {
  const now = new Date();
  return `${ARABIC_DAYS[now.getDay()]} ${now.getDate()} ${ARABIC_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
};

interface HomeProps {
  user: UserProfile;
  api: FormsApi;
  projects: ProjectRecord[];
  goToPortal: (dept: DepartmentKey) => void;
  goToProjects: () => void;
  goToProject: (projectRefId: string) => void;
  allowedDepts: DepartmentKey[];
}

export const DashboardHome: React.FC<HomeProps> = ({ user, api, projects, goToPortal, goToProjects, goToProject, allowedDepts }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور';
  const inbox = useMemo(() => api.forms.filter(f => formAwaitsUser(f, user)), [api.forms, user]);
  const myCreated = useMemo(() => api.forms.filter(f => f.createdBy === user.id), [api.forms, user.id]);

  const dept = DEPT_BY_KEY[user.department as DepartmentKey];

  const stats = useMemo(() => {
    const completed = projects.filter(p => p.phase === 'CLOSED').length;
    const active = projects.filter(p => p.phase !== 'CLOSED').length;
    return { total: projects.length, completed, active };
  }, [projects]);

  const target500Pct = Math.min(Math.round((stats.completed / 500) * 100) || 0, 100);

  const phaseSegments = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach(p => { counts[p.phase] = (counts[p.phase] || 0) + 1; });
    const colors: Record<string, string> = {
      RESEARCH: '#0EA5E9', DIAGNOSIS: '#7C3AED', EVACUATION: '#F59E0B',
      TENDERING: '#EAB308', EXECUTION: '#56B894', HANDOVER: '#16A34A', CLOSED: '#6B7280',
    };
    const labels: Record<string, string> = {
      RESEARCH: 'البحث', DIAGNOSIS: 'التشخيص', EVACUATION: 'الإخلاء',
      TENDERING: 'الترسية', EXECUTION: 'التنفيذ', HANDOVER: 'التسليم', CLOSED: 'مغلق',
    };
    return Object.entries(counts).map(([k, v]) => ({ label: labels[k] || k, value: v, color: colors[k] || '#888' }));
  }, [projects]);

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach(p => { const r = regionLabel(p.region || 'DAM'); counts[r] = (counts[r] || 0) + 1; });
    return counts;
  }, [projects]);

  // 6-month sparkline of new projects
  const monthlyTrend = useMemo(() => {
    const arr: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const m = d.getMonth(), y = d.getFullYear();
      arr.push(projects.filter(p => {
        const c = new Date(p.createdAt);
        return c.getMonth() === m && c.getFullYear() === y;
      }).length);
    }
    return arr;
  }, [projects]);

  return (
    <div dir="rtl" className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-[#4A1F66] via-[#6B3D87] to-[#56B894] p-6 md:p-8 text-white shadow-lg">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-1/4 translate-y-1/4" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <HomeIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{greeting}، {user.fullName}</h1>
              <p className="text-white/80 text-sm mt-1">
                {roleName(user.role)} {dept && <>· {dept.name}</>} · {regionLabel(user.region)}
              </p>
            </div>
          </div>
          <div className="text-sm text-white/70 whitespace-nowrap">{formatArabicDate()}</div>
        </div>
      </div>

      {/* Tarmeem 500 hero card */}
      <Card title="هدف ترميم 500 منزل" icon={Target} accent="gradient">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
            <svg width={144} height={144} viewBox="0 0 144 144">
              <circle cx={72} cy={72} r={60} fill="none" stroke="#F3F4F6" strokeWidth="12" />
              <circle cx={72} cy={72} r={60} fill="none" stroke="#4A1F66" strokeWidth="12"
                strokeDasharray={`${(target500Pct / 100) * 2 * Math.PI * 60} ${2 * Math.PI * 60 * 2}`}
                transform="rotate(-90 72 72)" strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-[#4A1F66] dark:text-purple-300">{stats.completed}</span>
              <span className="text-xs text-gray-500 dark:text-slate-400">من 500</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-800 dark:text-slate-100">اكتمل {target500Pct}% من الهدف</p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              متبقّي <span className="font-bold text-[#4A1F66] dark:text-purple-300">{Math.max(500 - stats.completed, 0)}</span> منزل لتحقيق الهدف.
            </p>
            <div className="mt-3"><ProgressBar value={target500Pct} /></div>
          </div>
          <div className="text-center">
            <Sparkline values={monthlyTrend} color="#4A1F66" />
            <p className="text-[10px] text-gray-400 mt-1">آخر 6 أشهر</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatPill icon={Building2} label="إجمالي المشاريع" value={stats.total} tone="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200" />
        <StatPill icon={Activity} label="مشاريع نشطة" value={stats.active} tone="bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-200" />
        <StatPill icon={CheckCircle} label="منازل مسلّمة" value={stats.completed} tone="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200" />
        <StatPill icon={Inbox} label="بانتظار اعتمادي" value={inbox.length} tone="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="توزيع المشاريع حسب المرحلة" icon={TrendingUp} className="lg:col-span-2">
          {phaseSegments.length === 0 ? <EmptyState icon={Building2} title="لا توجد مشاريع بعد" /> : (
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <DonutChart segments={phaseSegments} size={200} />
              <div className="flex-1 w-full">
                <BarChart data={regionCounts} label="حسب المنطقة" />
              </div>
            </div>
          )}
        </Card>
        <Card title={`صندوق الوارد (${inbox.length})`} icon={Inbox} accent="teal">
          {inbox.length === 0 ? (
            <EmptyState icon={CheckCircle} title="لا توجد طلبات معلّقة" />
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {inbox.slice(0, 6).map(f => (
                <button key={f.id} onClick={() => f.projectRefId ? goToProject(f.projectRefId) : goToPortal(f.ownerDept)}
                  className="w-full text-right p-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 transition flex items-start gap-2">
                  <Pill tone="purple">{f.code}</Pill>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 dark:text-slate-100 truncate">{f.title}</p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">{f.beneficiaryName || f.projectId || '—'}</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="بوابات المؤسسة" icon={Building2}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {DEPARTMENTS.filter(d => allowedDepts.includes(d.key)).map(d => {
            const count = api.forms.filter(f => f.ownerDept === d.key || (f.bridgesTo || []).includes(d.key)).length;
            return (
              <button key={d.key} onClick={() => goToPortal(d.key)}
                className="text-right p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white dark:bg-slate-800 group">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-2" style={{ background: d.color + '25' }}>
                  <Building2 className="w-5 h-5" style={{ color: d.color }} />
                </div>
                <p className="text-sm font-bold text-gray-800 dark:text-slate-100 leading-tight">{d.name}</p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">{count} نموذج</p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title={`أحدث المشاريع (${projects.length})`} icon={Building2} accent="purple">
        {projects.length === 0 ? (
          <EmptyState icon={Building2} title="لا توجد مشاريع بعد" hint="ينشأ المشروع تلقائياً عند اعتماد F-03 وتحويله للمشاريع." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.slice(0, 6).map(p => (
              <button key={p.id} onClick={() => goToProject(p.id)}
                className="text-right p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow transition">
                <div className="flex items-center justify-between mb-1">
                  <Pill tone="purple">{p.projectId}</Pill>
                  <Pill tone="teal">{p.phase}</Pill>
                </div>
                <p className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{p.beneficiaryName}</p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{p.city}</p>
                <ProgressBar value={p.progressPct} />
              </button>
            ))}
          </div>
        )}
        <button onClick={goToProjects} className="mt-3 text-xs font-bold text-[#4A1F66] dark:text-purple-300 hover:underline">عرض كل المشاريع ←</button>
      </Card>

      <Card title={`نماذجي الأخيرة (${myCreated.length})`} icon={FileText}>
        {myCreated.length === 0 ? (
          <EmptyState icon={FileText} title="لم تُنشِئ أي نموذج بعد" />
        ) : (
          <div className="space-y-2">
            {myCreated.slice(0, 6).map(f => (
              <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 dark:border-slate-700">
                <Pill tone="purple">{f.code}</Pill>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{f.title}</p>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400">{new Date(f.createdAt).toLocaleString('ar-SA')}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${FORM_STATUS_COLORS[f.status]}`}>{FORM_STATUS_LABELS[f.status]}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between px-4 py-3 mt-4 border-t border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <TarmeemLogo variant="icon" size={18} />
          <span className="text-xs text-gray-400 dark:text-slate-500 font-semibold">جمعية ترميم</span>
        </div>
        <span className="text-xs text-gray-400 dark:text-slate-500">v3.0</span>
      </div>
    </div>
  );
};

const StatPill: React.FC<{ icon: React.ElementType; label: string; value: any; tone: string }> = ({ icon: Icon, label, value, tone }) => (
  <div className={`rounded-xl p-4 flex items-center gap-3 ${tone}`}>
    <div className="w-10 h-10 rounded-lg bg-white/40 dark:bg-white/5 flex items-center justify-center">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="text-xs font-semibold opacity-80 mt-0.5">{label}</p>
    </div>
  </div>
);

export const PendingAccountScreen: React.FC<{ email: string; onSignOut: () => void }> = ({ email, onSignOut }) => (
  <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4" dir="rtl">
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md text-center">
      <TarmeemLogo variant="stacked" size={50} color="auto" animated={false} />
      <h2 className="text-xl font-bold text-[#4A1F66] dark:text-purple-300 mt-6 mb-2">حسابك بانتظار الموافقة</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">سيراجع مدير النظام طلبك ويعيّن الإدارة والدور المناسبين قبل التفعيل.</p>
      <p className="text-xs text-gray-400 dark:text-slate-500 mb-4" dir="ltr">{email}</p>
      <button onClick={onSignOut} className="bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 px-6 py-2 rounded-lg font-bold hover:bg-gray-300">تسجيل الخروج</button>
    </div>
  </div>
);

export const DeactivatedAccountScreen: React.FC<{ onSignOut: () => void }> = ({ onSignOut }) => (
  <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4" dir="rtl">
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md text-center">
      <AlertTriangle className="w-16 h-16 text-red-300 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-gray-700 dark:text-slate-200 mb-2">الحساب معطّل</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">تم تعطيل حسابك من قبل مدير النظام. تواصل مع الإدارة للمزيد من المعلومات.</p>
      <button onClick={onSignOut} className="bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 px-6 py-2 rounded-lg font-bold hover:bg-gray-300">تسجيل الخروج</button>
    </div>
  </div>
);

