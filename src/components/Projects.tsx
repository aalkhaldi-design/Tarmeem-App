import React, { useMemo, useState } from 'react';
import {
  Building2, MapPin, ArrowLeft, CheckCircle2,
} from 'lucide-react';
import {
  Card, Pill, SearchBar, EmptyState, ProjectCardRing, Input,
} from './ui';
import { FORM_BY_CODE } from '../lib/data';
import type { FormCode } from '../lib/data';
import type { FormsApi, FormRecord } from './Forms';
import type { ProjectRecord } from './forms/FormRenderers';
import { isAdminUser, type UserProfile } from './Auth';
import WorkflowDetailBody from './workflow/WorkflowDetailBody';

/* ──────────────────────────────────────────────────────────────────
   Phase model — 5 main phases (still used by MasterProjectList card chips)
   ────────────────────────────────────────────────────────────────── */

type MainPhaseKey = 'STUDY' | 'PREP' | 'AWARD' | 'EXEC' | 'CLOSE';

interface MainPhaseDef {
  key: MainPhaseKey;
  name: string;
  mapsFromProjectPhases: ProjectRecord['phase'][];
}

const MAIN_PHASES: MainPhaseDef[] = [
  { key: 'STUDY', name: 'الدراسة والاعتماد', mapsFromProjectPhases: ['RESEARCH'] },
  { key: 'PREP',  name: 'التشخيص والتجهيز', mapsFromProjectPhases: ['DIAGNOSIS', 'EVACUATION'] },
  { key: 'AWARD', name: 'الترسية',          mapsFromProjectPhases: ['TENDERING'] },
  { key: 'EXEC',  name: 'التنفيذ والصرف',   mapsFromProjectPhases: ['EXECUTION'] },
  { key: 'CLOSE', name: 'الإغلاق',          mapsFromProjectPhases: ['HANDOVER', 'CLOSED'] },
];

const mainPhaseOf = (project: ProjectRecord): MainPhaseKey => {
  const found = MAIN_PHASES.find(mp => mp.mapsFromProjectPhases.includes(project.phase));
  return found?.key ?? 'STUDY';
};

const EXPECTED_PROJECT_FORMS: readonly FormCode[] = ['F-02', 'F-03', 'F-04', 'F-08', 'F-09', 'F-20', 'F-85', 'F-33', 'F-14', 'F-15', 'F-07'];

const projectProgressPct = (project: ProjectRecord, allForms: FormRecord[]): number => {
  const approved = allForms.filter(f =>
    f.projectRefId === project.id &&
    f.status === 'approved' &&
    EXPECTED_PROJECT_FORMS.includes(f.code),
  ).length;
  return Math.min(100, Math.round((approved / EXPECTED_PROJECT_FORMS.length) * 100));
};

/* ──────────────────────────────────────────────────────────────────
   Master list
   ────────────────────────────────────────────────────────────────── */

interface MasterProjectListProps {
  user: UserProfile;
  api: FormsApi;
  projects: ProjectRecord[];
  users: UserProfile[];
  onOpenProject: (id: string) => void;
}

export const MasterProjectList: React.FC<MasterProjectListProps> = ({ projects, onOpenProject, api }) => {
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<'all' | MainPhaseKey>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter(p => {
      if (phaseFilter !== 'all' && mainPhaseOf(p) !== phaseFilter) return false;
      if (!q) return true;
      return (
        (p.projectId || '').toLowerCase().includes(q) ||
        (p.beneficiaryName || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q)
      );
    });
  }, [projects, search, phaseFilter]);

  return (
    <div dir="rtl" className="space-y-4">
      <Card title="قائمة المشاريع الرئيسية" icon={Building2} accent="gradient">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="بحث برقم المشروع أو اسم المستفيد..." /></div>
          <div className="flex flex-wrap gap-2">
            {(['all', ...MAIN_PHASES.map(p => p.key)] as const).map(p => (
              <button key={p} onClick={() => setPhaseFilter(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${phaseFilter === p ? 'bg-[#4A1F66] text-white shadow' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200'}`}>
                {p === 'all' ? 'الكل' : MAIN_PHASES.find(mp => mp.key === p)?.name}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Building2} title="لا توجد مشاريع مطابقة" hint="ينشأ المشروع تلقائياً عند رفع استمارة البحث الاجتماعي F-02." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10">
            {filtered.map(p => {
              const projectForms = api.forms.filter(f => f.projectRefId === p.id);
              const pendingCount = projectForms.filter(f => f.status === 'pending').length;
              const lateCount = projectForms.filter(f => {
                const def = FORM_BY_CODE[f.code];
                if (!def?.slaDays || f.status !== 'pending') return false;
                const start = new Date(f.stepStartedAt || f.updatedAt).getTime();
                const elapsed = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
                return elapsed > def.slaDays;
              }).length;
              const pct = projectProgressPct(p, api.forms);
              const mainPhase = MAIN_PHASES.find(mp => mp.key === mainPhaseOf(p));

              return (
                <div key={p.id} className="relative">
                  <ProjectCardRing pct={pct}>
                    <button onClick={() => onOpenProject(p.id)}
                      className="block w-full text-right rounded-xl bg-white dark:bg-slate-800 hover:shadow-lg transition-all overflow-hidden">
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-gray-800 dark:text-slate-100 truncate">{p.beneficiaryName}</p>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" /> {p.city || '—'} {p.neighborhood ? `· ${p.neighborhood}` : ''}
                            </p>
                          </div>
                          {p.projectIdLocked
                            ? <Pill tone="green"><CheckCircle2 className="w-3 h-3" /> {p.projectId || '—'}</Pill>
                            : <Pill tone={p.projectId ? 'purple' : 'gray'}>{p.projectId || 'بلا رقم'}</Pill>
                          }
                        </div>
                        <div className="flex items-center justify-between">
                          <Pill tone="amber">{mainPhase?.name || '—'}</Pill>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            {pendingCount > 0 && <Pill tone="amber">{pendingCount} معلّق</Pill>}
                            {lateCount > 0 && <Pill tone="red">{lateCount} متأخر</Pill>}
                          </div>
                        </div>
                      </div>
                    </button>
                  </ProjectCardRing>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#3F9B7A] text-white text-[11px] font-bold shadow-md border-2 border-white dark:border-slate-900">
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   Project number widget (header) — kept verbatim
   ────────────────────────────────────────────────────────────────── */

const ProjectNumberWidget: React.FC<{
  project: ProjectRecord;
  user: UserProfile;
  projectForms: FormRecord[];
  onUpdate?: (patch: Partial<ProjectRecord>) => Promise<void>;
}> = ({ project, user, projectForms, onUpdate }) => {
  const [val, setVal] = useState(project.projectId || '');
  const [busy, setBusy] = useState(false);
  const locked = !!project.projectIdLocked;

  const canEdit = useMemo(() => {
    if (locked) return false;
    if (isAdminUser(user)) return true;
    return projectForms.some(f => f.status === 'pending' && f.approvalChain?.[f.approvalIndex] === user.role);
  }, [locked, user, projectForms]);

  const save = async (lock: boolean) => {
    if (!onUpdate) return;
    setBusy(true);
    try {
      await onUpdate({ projectId: val.trim(), projectIdLocked: lock });
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3">
      <p className="text-[11px] text-white/80 mb-1.5 font-bold">رقم المشروع</p>
      {locked ? (
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white">{project.projectId || '—'}</span>
          <span className="bg-[#3F9B7A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> مُجمَّد
          </span>
        </div>
      ) : canEdit ? (
        <div className="flex items-center gap-2 flex-wrap">
          <Input value={val} onChange={e => setVal(e.target.value)} placeholder="أدخل رقم المشروع" className="!gap-0 min-w-[180px]" />
          <button onClick={() => save(false)} disabled={busy || val === (project.projectId || '')}
            className="px-3 py-2 rounded-lg text-xs font-bold bg-white/20 text-white hover:bg-white/30 transition disabled:opacity-40">
            حفظ
          </button>
          <button onClick={() => save(true)} disabled={busy || !val.trim()}
            className="px-3 py-2 rounded-lg text-xs font-bold bg-[#3F9B7A] text-white hover:bg-[#2f7a5e] transition disabled:opacity-40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> تأكيد وتجميد
          </button>
        </div>
      ) : (
        <span className="text-base font-bold text-white">{project.projectId || '— لم يُحدَّد بعد'}</span>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   ProjectDetail — back button + gradient header (preserved verbatim
   per user constraint), then WorkflowDetailBody.
   ────────────────────────────────────────────────────────────────── */

interface ProjectDetailProps {
  project: ProjectRecord;
  user: UserProfile;
  users: UserProfile[];
  api: FormsApi;
  onBack: () => void;
  onOpenForm: (id: string) => void;
  updateProject?: (projectRefId: string, patch: Partial<ProjectRecord>) => Promise<void>;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project, user, users, api, onBack, updateProject,
}) => {
  const projectForms = useMemo(
    () => api.forms.filter(f => f.projectRefId === project.id),
    [api.forms, project.id],
  );

  const handleProjectUpdate = updateProject
    ? (patch: Partial<ProjectRecord>) => updateProject(project.id, patch)
    : undefined;

  const pct = projectProgressPct(project, api.forms);

  return (
    <div dir="rtl" className="space-y-4">
      <button onClick={onBack} className="text-xs font-bold text-[#4A1F66] dark:text-purple-300 hover:underline flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> العودة لقائمة المشاريع
      </button>

      {/* Header — DO NOT TOUCH (per user constraint) */}
      <div className="rounded-2xl p-6 text-white shadow-lg bg-gradient-to-l from-[#4A1F66] via-[#6B3D87] to-[#56B894]">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{project.beneficiaryName}</h1>
            <p className="text-white/80 text-sm mt-1 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {project.city || '—'} {project.neighborhood ? `· ${project.neighborhood}` : ''}
            </p>
            <p className="text-[11px] text-white/70 mt-2">
              نسبة الإنجاز: <strong>{pct}%</strong> · آخر تحديث {new Date(project.updatedAt).toLocaleDateString('ar-SA')}
            </p>
          </div>
          <div className="min-w-[280px]">
            <ProjectNumberWidget project={project} user={user} projectForms={projectForms} onUpdate={handleProjectUpdate} />
          </div>
        </div>
      </div>

      {/* Workflow body (dark theme contained inside) */}
      <WorkflowDetailBody project={project} user={user} users={users} api={api} />
    </div>
  );
};
