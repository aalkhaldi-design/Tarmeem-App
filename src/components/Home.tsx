import React, { useState, useMemo } from 'react';
import {
  Home, Plus, AlertTriangle, Briefcase, MapPin, DollarSign, Activity,
  ClipboardList, CheckCircle2, Clock, ArrowLeft, Target, TrendingUp, Building2,
  Wrench, X
} from 'lucide-react';
import {
  STAGES_CONFIG, REGION_LABELS, regionLabel, computeSlaStatus, formatCurrency,
  DEFAULT_LISTS
} from '../lib/data';
import { Card, DonutChart, BarChart, Sparkline, MandatoryGauge, TarmeemLogo } from './ui';

/* ─── Types ─── */

interface UserProfile {
  id: string;
  fullName: string;
  role: string;
  region: string;
  departments: string[];
  isDepartmentHead: boolean;
  status: 'active' | 'pending' | 'deactivated';
}

interface Project {
  id: string;
  name: string;
  type: string;
  city: string;
  region: string;
  currentStageId: string;
  currentStageOwner: string;
  stageEnteredAt: string;
  mandatoryFieldsTotal: number;
  mandatoryFieldsFilled: number;
  assessmentId: string | null;
  assessmentStatus: string;
  diagnosisVerdict: string | null;
  assignedFieldEngineer: string | null;
  data: Record<string, any>;
  budgetSAR: number;
  disbursedSAR: number;
  hasPendingAdditionalWorks: boolean;
  deliveryDate: string | null;
}

interface HomeProps {
  user: UserProfile;
  projects: Project[];
  goToProject: (id: string) => void;
  goToFieldTask: (id: string) => void;
  goToAllProjects: () => void;
  openNewProject: () => void;
  openEmergency: () => void;
}

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Record<string, any>) => void;
}

/* ─── Helpers ─── */

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];
const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const formatArabicDate = () => {
  const now = new Date();
  return `${ARABIC_DAYS[now.getDay()]} ${now.getDate()} ${ARABIC_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
};

const stageName = (id: string) => STAGES_CONFIG.find(s => s.id === id)?.name || id;
const stageDuration = (id: string) => STAGES_CONFIG.find(s => s.id === id)?.duration || '';

const FIELD_STAGE_IDS = ['5', '6', '7', '8', '14', '17', '19', '20', '22', '27'];

/* ─── Sub-Components ─── */

const WelcomeBanner = ({ user }: { user: UserProfile }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-[#4A1F66] via-[#6B3D87] to-[#56B894] p-6 md:p-8 text-white shadow-lg">
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-1/4 translate-y-1/4" />
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
            <Home className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {greeting}، {user.fullName}
            </h1>
            <p className="text-white/80 text-sm mt-1">
              {user.role} &bull; {regionLabel(user.region)}
            </p>
          </div>
        </div>
        <div className="text-sm text-white/70 whitespace-nowrap">
          {formatArabicDate()}
        </div>
      </div>
    </div>
  );
};

const Tarmeem500GoalCard = ({ completedCount }: { completedCount: number }) => {
  const goal = 500;
  const pct = Math.min(Math.round((completedCount / goal) * 100), 100);

  return (
    <Card title="هدف ترميم 500" icon={Target}>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg width={144} height={144} viewBox="0 0 144 144">
            <circle cx={72} cy={72} r={60} fill="none" stroke="#F3F4F6" strokeWidth="12" />
            <circle
              cx={72} cy={72} r={60} fill="none" stroke="#4A1F66" strokeWidth="12"
              strokeDasharray={`${(pct / 100) * 2 * Math.PI * 60} ${2 * Math.PI * 60 * 2}`}
              strokeDashoffset={0}
              transform="rotate(-90 72 72)"
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-[#4A1F66]">{completedCount}</span>
            <span className="text-xs text-gray-500">من {goal}</span>
          </div>
        </div>
        <div className="flex-1 text-center md:text-right">
          <p className="text-lg font-bold text-gray-800">
            اكتمل {pct}% من الهدف
          </p>
          <p className="text-sm text-gray-500 mt-1">
            متبقي <span className="font-bold text-[#4A1F66]">{Math.max(goal - completedCount, 0)}</span> منزل لتحقيق هدف ترميم 500 منزل
          </p>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-l from-[#4A1F66] to-[#56B894] transition-all duration-1000 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

const QuickActionsToolbar = ({
  openNewProject,
  openEmergency,
  goToAllProjects,
  goToFieldTask,
  user,
  projects,
}: {
  openNewProject: () => void;
  openEmergency: () => void;
  goToAllProjects: () => void;
  goToFieldTask: (id: string) => void;
  user: UserProfile;
  projects: Project[];
}) => {
  const hasFieldVisits = projects.some(
    p => FIELD_STAGE_IDS.includes(p.currentStageId) && p.assignedFieldEngineer === user.id
  );

  const actions = [
    {
      label: 'مشروع جديد',
      icon: Plus,
      onClick: openNewProject,
      color: 'from-[#4A1F66] to-[#6B3D87]',
      hoverColor: 'hover:shadow-purple-300',
    },
    {
      label: 'تشخيص طارئ',
      icon: AlertTriangle,
      onClick: openEmergency,
      color: 'from-red-500 to-red-600',
      hoverColor: 'hover:shadow-red-300',
    },
    {
      label: 'جميع المشاريع',
      icon: Briefcase,
      onClick: goToAllProjects,
      color: 'from-[#56B894] to-[#3F9B7A]',
      hoverColor: 'hover:shadow-teal-300',
    },
    {
      label: 'الزيارات الميدانية',
      icon: MapPin,
      onClick: () => {
        const fieldProject = projects.find(
          p => FIELD_STAGE_IDS.includes(p.currentStageId) && p.assignedFieldEngineer === user.id
        );
        if (fieldProject) goToFieldTask(fieldProject.id);
      },
      color: 'from-amber-500 to-amber-600',
      hoverColor: 'hover:shadow-amber-300',
      disabled: !hasFieldVisits,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          disabled={action.disabled}
          className={`group relative overflow-hidden rounded-xl p-4 text-white font-bold text-sm
            bg-gradient-to-l ${action.color}
            shadow-md ${action.hoverColor} hover:shadow-lg
            transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0
            disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
        >
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <action.icon className="w-6 h-6" />
            <span>{action.label}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

const GeneralStatsSection = ({ projects }: { projects: Project[] }) => {
  const total = projects.length;
  const completed = projects.filter(p => p.currentStageId === '33').length;
  const active = projects.filter(p => p.currentStageId !== '33').length;
  const pendingAssessment = projects.filter(p => p.assessmentStatus === 'pending').length;

  const segments = [
    { label: 'نشطة', value: active, color: '#4A1F66' },
    { label: 'مكتملة', value: completed, color: '#56B894' },
    { label: 'بانتظار التقييم', value: pendingAssessment, color: '#F59E0B' },
  ];

  const statsCards = [
    { label: 'إجمالي المشاريع', value: total, icon: Briefcase, color: 'text-[#4A1F66]', bg: 'bg-purple-50' },
    { label: 'مشاريع نشطة', value: active, icon: Activity, color: 'text-[#56B894]', bg: 'bg-teal-50' },
    { label: 'مشاريع مكتملة', value: completed, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'بانتظار التقييم', value: pendingAssessment, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <Card title="الإحصائيات العامة" icon={TrendingUp}>
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="shrink-0">
          <DonutChart segments={segments} size={180} label="توزيع المشاريع" />
        </div>
        <div className="flex-1 grid grid-cols-2 gap-3 w-full">
          {statsCards.map(card => (
            <div
              key={card.label}
              className={`${card.bg} rounded-xl p-4 flex items-center gap-3 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}
            >
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                <p className="text-xs text-gray-500 font-semibold">{card.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

const BudgetBurnCard = ({ projects }: { projects: Project[] }) => {
  const totalBudget = projects.reduce((sum, p) => sum + (p.budgetSAR || 0), 0);
  const totalDisbursed = projects.reduce((sum, p) => sum + (p.disbursedSAR || 0), 0);
  const pct = totalBudget > 0 ? Math.round((totalDisbursed / totalBudget) * 100) : 0;
  const remaining = totalBudget - totalDisbursed;

  const monthlySpend = useMemo(() => {
    const months: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      let spent = 0;
      projects.forEach(p => {
        if (p.deliveryDate) {
          const dd = new Date(p.deliveryDate);
          if (dd.getMonth() === m && dd.getFullYear() === y) {
            spent += p.disbursedSAR || 0;
          }
        }
      });
      months.push(spent);
    }
    return months;
  }, [projects]);

  return (
    <Card title="الميزانية والصرف" icon={DollarSign}>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-700">الميزانية الإجمالية</span>
            <span className="text-sm font-bold text-[#4A1F66]">{formatCurrency(totalBudget)}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-700">المصروف</span>
            <span className="text-sm font-bold text-red-600">{formatCurrency(totalDisbursed)}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-700">المتبقي</span>
            <span className="text-sm font-bold text-[#56B894]">{formatCurrency(remaining)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-l from-red-500 to-[#4A1F66] transition-all duration-700 ease-out"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            تم صرف {pct}% من إجمالي الميزانية
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-center">
          <span className="text-xs text-gray-500 mb-1 font-semibold">آخر 6 أشهر</span>
          <Sparkline values={monthlySpend} color="#4A1F66" />
        </div>
      </div>
    </Card>
  );
};

const RegionDeptPanel = ({ projects }: { projects: Project[] }) => {
  const regionCounts: Record<string, number> = {};
  projects.forEach(p => {
    const r = regionLabel(p.region);
    regionCounts[r] = (regionCounts[r] || 0) + 1;
  });

  const deptCounts: Record<string, number> = {};
  projects.forEach(p => {
    const dept = p.currentStageOwner;
    if (dept) {
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="حسب المنطقة" icon={MapPin}>
        <BarChart data={regionCounts} />
      </Card>
      <Card title="حسب القسم الحالي" icon={Building2}>
        <BarChart data={deptCounts} />
      </Card>
    </div>
  );
};

const TasksPanel = ({ user, projects, goToProject }: {
  user: UserProfile;
  projects: Project[];
  goToProject: (id: string) => void;
}) => {
  const myTasks = projects.filter(p =>
    user.departments.some(d => d === p.currentStageOwner)
  );

  return (
    <Card title={`مهامي (${myTasks.length})`} icon={ClipboardList}>
      {myTasks.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-gray-400">
          <CheckCircle2 className="w-10 h-10 mb-2" />
          <p className="text-sm font-semibold">لا توجد مهام حالية</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {myTasks.map(p => {
            const sla = computeSlaStatus(stageDuration(p.currentStageId), p.stageEnteredAt);
            return (
              <button
                key={p.id}
                onClick={() => goToProject(p.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200
                  hover:bg-gray-50 hover:shadow-sm transition-all duration-200 text-right"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    المرحلة: {stageName(p.currentStageId)}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${sla.ring}
                    ${sla.color === 'red' ? 'bg-red-50 text-red-700' :
                      sla.color === 'orange' ? 'bg-orange-50 text-orange-700' :
                      sla.color === 'green' ? 'bg-green-50 text-green-700' :
                      'bg-blue-50 text-blue-700'}`}
                  >
                    {sla.text}
                  </span>
                  <MandatoryGauge filled={p.mandatoryFieldsFilled} total={p.mandatoryFieldsTotal} />
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};

const ActivityFeed = ({ projects }: { projects: Project[] }) => {
  const activities = useMemo(() => {
    const items: {
      projectId: string;
      projectName: string;
      stageName: string;
      stageDept: string;
      enteredAt: string;
    }[] = [];

    projects.forEach(p => {
      items.push({
        projectId: p.id,
        projectName: p.name,
        stageName: stageName(p.currentStageId),
        stageDept: p.currentStageOwner,
        enteredAt: p.stageEnteredAt,
      });
    });

    items.sort((a, b) => new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime());
    return items.slice(0, 10);
  }, [projects]);

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`;
    return `قبل ${Math.floor(diff / 86400)} يوم`;
  };

  return (
    <Card title="آخر الأنشطة" icon={Activity}>
      {activities.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-gray-400">
          <Activity className="w-10 h-10 mb-2" />
          <p className="text-sm font-semibold">لا توجد أنشطة حديثة</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {activities.map((a, i) => (
            <div
              key={`${a.projectId}-${i}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-150"
            >
              <div className="w-2 h-2 rounded-full bg-[#56B894] shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">
                  <span className="font-bold">{a.projectName}</span>
                  {' — '}
                  انتقل إلى <span className="font-semibold text-[#4A1F66]">{a.stageName}</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  القسم: {a.stageDept} &bull; {formatTimeAgo(a.enteredAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const FieldVisitsTodayCard = ({ user, projects, goToFieldTask }: {
  user: UserProfile;
  projects: Project[];
  goToFieldTask: (id: string) => void;
}) => {
  const fieldVisits = projects.filter(
    p => FIELD_STAGE_IDS.includes(p.currentStageId) && p.assignedFieldEngineer === user.id
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayVisits = fieldVisits.filter(p => {
    if (!p.stageEnteredAt) return false;
    return p.stageEnteredAt.slice(0, 10) === todayStr;
  });

  const visitsToShow = todayVisits.length > 0 ? todayVisits : fieldVisits;

  return (
    <Card title={`الزيارات الميدانية (${visitsToShow.length})`} icon={Wrench}>
      {visitsToShow.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-gray-400">
          <MapPin className="w-10 h-10 mb-2" />
          <p className="text-sm font-semibold">لا توجد زيارات ميدانية حالية</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {visitsToShow.map(p => {
            const sla = computeSlaStatus(stageDuration(p.currentStageId), p.stageEnteredAt);
            return (
              <button
                key={p.id}
                onClick={() => goToFieldTask(p.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200
                  hover:bg-amber-50 hover:border-amber-200 transition-all duration-200 text-right"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Wrench className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">
                    {stageName(p.currentStageId)} — {p.city}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${sla.ring}
                  ${sla.color === 'red' ? 'bg-red-50 text-red-700' :
                    sla.color === 'orange' ? 'bg-orange-50 text-orange-700' :
                    sla.color === 'green' ? 'bg-green-50 text-green-700' :
                    'bg-blue-50 text-blue-700'}`}
                >
                  {sla.text}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};

const DashboardFooter = () => (
  <div className="flex items-center justify-between px-4 py-3 mt-4 border-t border-gray-200">
    <div className="flex items-center gap-2">
      <TarmeemLogo variant="icon" size={18} />
      <span className="text-xs text-gray-400 font-semibold">بيئة الإنتاج</span>
    </div>
    <span className="text-xs text-gray-400">v1.0</span>
  </div>
);

/* ─── NewProjectModal ─── */

export const NewProjectModal = ({ isOpen, onClose, onSubmit }: NewProjectModalProps) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'اسم المشروع مطلوب';
    if (!type) errs.type = 'نوع المشروع مطلوب';
    if (!city.trim()) errs.city = 'المدينة مطلوبة';
    if (!region) errs.region = 'المنطقة مطلوبة';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const project = {
      name: name.trim(),
      type,
      city: city.trim(),
      region,
      currentStageId: '1',
      currentStageOwner: 'الشراكات',
      stageEnteredAt: new Date().toISOString(),
      mandatoryFieldsTotal: 0,
      mandatoryFieldsFilled: 0,
      assessmentId: null,
      assessmentStatus: 'pending',
      diagnosisVerdict: null,
      assignedFieldEngineer: null,
      data: {},
      budgetSAR: 0,
      disbursedSAR: 0,
      projectAuditLog: [],
      hasPendingAdditionalWorks: false,
    };
    onSubmit(project);
    setSubmitting(false);
    setName('');
    setType('');
    setCity('');
    setRegion('');
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    if (!submitting) {
      setName('');
      setType('');
      setCity('');
      setRegion('');
      setErrors({});
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200"
        dir="rtl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#4A1F66] flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">مشروع جديد</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400
              hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">اسم المشروع</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] transition-shadow
                ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
              placeholder="أدخل اسم المشروع"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">نوع المشروع</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] transition-shadow
                ${errors.type ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
            >
              <option value="">اختر النوع...</option>
              {DEFAULT_LISTS.projectType.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.type && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.type}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">المدينة</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] transition-shadow
                ${errors.city ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
              placeholder="أدخل اسم المدينة"
            />
            {errors.city && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.city}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">المنطقة</label>
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] transition-shadow
                ${errors.region ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
            >
              <option value="">اختر المنطقة...</option>
              {Object.entries(REGION_LABELS)
                .filter(([k]) => k !== 'ALL')
                .map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
            </select>
            {errors.region && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.region}</p>}
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#4A1F66] text-white py-2.5 rounded-lg font-bold text-sm
                hover:bg-[#3A1652] transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                shadow-md hover:shadow-lg"
            >
              {submitting ? 'جاري الإنشاء...' : 'إنشاء المشروع'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold text-sm
                hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Main Dashboard ─── */

export const DashboardHome = ({
  user,
  projects,
  goToProject,
  goToFieldTask,
  goToAllProjects,
  openNewProject,
  openEmergency,
}: HomeProps) => {
  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 pb-6">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome banner */}
        <WelcomeBanner user={user} />

        {/* Tarmeem 500 goal */}
        <Tarmeem500GoalCard completedCount={projects.length} />

        {/* Quick actions */}
        <QuickActionsToolbar
          openNewProject={openNewProject}
          openEmergency={openEmergency}
          goToAllProjects={goToAllProjects}
          goToFieldTask={goToFieldTask}
          user={user}
          projects={projects}
        />

        {/* General stats */}
        <GeneralStatsSection projects={projects} />

        {/* Budget */}
        <BudgetBurnCard projects={projects} />

        {/* Region & Department breakdown */}
        <RegionDeptPanel projects={projects} />

        {/* Tasks & Activity in two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TasksPanel user={user} projects={projects} goToProject={goToProject} />
          <ActivityFeed projects={projects} />
        </div>

        {/* Field visits today */}
        <FieldVisitsTodayCard
          user={user}
          projects={projects}
          goToFieldTask={goToFieldTask}
        />

        {/* Footer */}
        <DashboardFooter />
      </div>
    </div>
  );
};
