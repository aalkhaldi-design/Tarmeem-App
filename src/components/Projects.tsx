import React, { useMemo, useState } from 'react';
import {
  Building2, MapPin, FileText, Activity, ArrowLeft,
  ChevronDown, ChevronUp, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';
import {
  Card, Pill, SearchBar, EmptyState,
  ProjectCardRing, PhaseStepper, ReadOnlyField, Input,
  type PhaseStepperItem, type StepperPhaseStatus,
} from './ui';
import { FORM_BY_CODE, roleName } from '../lib/data';
import { FormCard, FormsApi, formAwaitsUser, FormRecord } from './Forms';
import { F02ReadOnlyBody, type ProjectRecord } from './forms/FormRenderers';
import type { UserProfile } from './Auth';

/* ──────────────────────────────────────────────────────────────────
   Phase model — 5 main phases (sub-phases like EVACUATION are deferred)
   ────────────────────────────────────────────────────────────────── */

type MainPhaseKey = 'STUDY' | 'PREP' | 'AWARD' | 'EXEC' | 'CLOSE';

interface MainPhaseDef {
  key: MainPhaseKey;
  name: string;
  /** أي قيمة من project.phase تُعتبر داخل هذه المرحلة الرئيسية */
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

const phaseStatusFor = (phase: MainPhaseDef, project: ProjectRecord): StepperPhaseStatus => {
  const currentIdx = MAIN_PHASES.findIndex(mp => mp.key === mainPhaseOf(project));
  const myIdx = MAIN_PHASES.findIndex(mp => mp.key === phase.key);
  if (project.phase === 'CLOSED' && phase.key === 'CLOSE') return 'completed';
  if (myIdx < currentIdx) return 'completed';
  if (myIdx === currentIdx) return 'pending';
  return 'notStarted';
};

/* الحقول المتوقعة لحساب نسبة الإنجاز — تعكس phaseTransition في App.tsx */
const EXPECTED_PROJECT_FORMS = ['F-02', 'F-03', 'F-08', 'F-85', 'F-14', 'F-15', 'F-07'] as const;

const expectedFormsCount = () => EXPECTED_PROJECT_FORMS.length;

const approvedFormCountForProject = (projectId: string, allForms: FormRecord[]): number =>
  allForms.filter(f =>
    f.projectRefId === projectId &&
    f.status === 'approved' &&
    (EXPECTED_PROJECT_FORMS as readonly string[]).includes(f.code),
  ).length;

const projectProgressPct = (project: ProjectRecord, allForms: FormRecord[]): number => {
  const approved = approvedFormCountForProject(project.id, allForms);
  return Math.min(100, Math.round((approved / expectedFormsCount()) * 100));
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-8">
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
                  {/* Percentage chip — outside the ring (room kept for countdown/timeframe later) */}
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
   Foldable phase-1 form sections (read-only view)
   ────────────────────────────────────────────────────────────────── */

type SectionStatus = 'completed' | 'pending' | 'notStarted' | 'rejected';

const SECTION_HEADER_BG: Record<SectionStatus, string> = {
  completed:  '#3F9B7A',
  pending:    '#B45309',
  notStarted: '#4A1F66',
  rejected:   '#B91C1C',
};

const SECTION_LABEL: Record<SectionStatus, string> = {
  completed:  'مكتمل',
  pending:    'بانتظار الاعتماد',
  notStarted: 'لم يبدأ',
  rejected:   'مرفوض',
};

const FoldableFormSection: React.FC<{
  title: string;
  status: SectionStatus;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, status, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 mb-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 transition"
        style={{ background: SECTION_HEADER_BG[status], color: '#FFFFFF' }}>
        <div className="flex items-center gap-2 min-w-0">
          {status === 'completed' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {status === 'pending' && <Clock className="w-4 h-4 shrink-0 animate-pulse" />}
          {status === 'rejected' && <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span className="text-sm font-bold truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{SECTION_LABEL[status]}</span>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {open && (
        <div className="bg-white dark:bg-slate-800 p-4 text-gray-800 dark:text-slate-100">
          {children}
        </div>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   Status derivation for the 4 sections of phase 1
   ────────────────────────────────────────────────────────────────── */

const f02SectionStatus = (f02?: FormRecord): SectionStatus => {
  if (!f02) return 'notStarted';
  if (f02.status === 'approved') return 'completed';
  if (f02.status === 'rejected') return 'rejected';
  if (f02.status === 'pending') return 'pending';
  return 'notStarted';
};

const f03StepStatus = (f03: FormRecord | undefined, step: number): SectionStatus => {
  if (!f03) return 'notStarted';
  if (f03.status === 'rejected' && f03.approvalIndex === step) return 'rejected';
  if (f03.status === 'approved') return 'completed';
  if (f03.approvalIndex > step) return 'completed';
  if (f03.approvalIndex === step && f03.status === 'pending') return 'pending';
  return 'notStarted';
};

/* ──────────────────────────────────────────────────────────────────
   Read-only views for individual F-03 approval steps
   ────────────────────────────────────────────────────────────────── */

const F03StepReadOnly: React.FC<{ rec?: FormRecord; step: 0 | 1 | 2 }> = ({ rec, step }) => {
  if (!rec) {
    return <p className="text-xs text-gray-400 dark:text-slate-500">لم تبدأ هذه الخطوة بعد.</p>;
  }
  const approval = rec.approvals?.[step];
  if (step === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ReadOnlyField label="القرار (اعتماد استحقاق الخدمة)" value={rec.data?.eligibility} />
        <ReadOnlyField label="ملاحظات مدير البحث" value={rec.data?.managerNotes} />
        {approval && <ReadOnlyField label="بواسطة" value={`${approval.actorName || '—'} · ${new Date(approval.at).toLocaleDateString('ar-SA')}`} />}
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ReadOnlyField label="قرار المدير التنفيذي" value={approval?.decision === 'approved' ? 'اعتماد' : approval?.decision === 'rejected' ? 'رفض' : approval?.decision === 'deferred' ? 'تأجيل' : ''} />
        <ReadOnlyField label="ملاحظات المدير التنفيذي" value={approval?.note} />
        {approval && <ReadOnlyField label="بواسطة" value={`${approval.actorName || '—'} · ${new Date(approval.at).toLocaleDateString('ar-SA')}`} />}
      </div>
    );
  }
  // step 2 — final transfer
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <ReadOnlyField label="ملاحظات التحويل" value={approval?.note} />
      <ReadOnlyField label="رقم المشروع المُحوَّل" value={rec.projectId} />
      {approval && <ReadOnlyField label="بواسطة" value={`${approval.actorName || '—'} · ${new Date(approval.at).toLocaleDateString('ar-SA')}`} />}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   Project number widget — editable + freeze button
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

  // أي مستخدم لديه دور مطابق لاعتماد معلّق على هذا المشروع يستطيع التعديل
  const canEdit = useMemo(() => {
    if (locked) return false;
    if (user.role === 'ADMIN') return true;
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
          <Input
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="أدخل رقم المشروع"
            className="!gap-0 min-w-[180px]" />
          <button
            onClick={() => save(false)}
            disabled={busy || val === (project.projectId || '')}
            className="px-3 py-2 rounded-lg text-xs font-bold bg-white/20 text-white hover:bg-white/30 transition disabled:opacity-40">
            حفظ
          </button>
          <button
            onClick={() => save(true)}
            disabled={busy || !val.trim()}
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
   ProjectDetail
   ────────────────────────────────────────────────────────────────── */

interface ProjectDetailProps {
  project: ProjectRecord;
  user: UserProfile;
  users: UserProfile[];
  api: FormsApi;
  onBack: () => void;
  onOpenForm: (id: string) => void;
  /** اختياري: تحديث وثيقة المشروع (يُستخدم لتجميد رقم المشروع). */
  updateProject?: (projectRefId: string, patch: Partial<ProjectRecord>) => Promise<void>;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project, user, users, api, onBack, onOpenForm, updateProject,
}) => {
  const projectForms = api.forms.filter(f => f.projectRefId === project.id);
  const filesAll = projectForms.flatMap(f => (f.files || []).map(file => ({ ...file, formCode: f.code })));
  const diagnosisEng = users.find(u => u.id === project.diagnosisEngineerId);
  const supervisingEng = users.find(u => u.id === project.supervisingEngineerId);

  const f02 = projectForms.find(f => f.code === 'F-02');
  const f03 = projectForms.find(f => f.code === 'F-03');

  const stepperItems: PhaseStepperItem[] = MAIN_PHASES.map((p, i) => ({
    key: p.key,
    name: p.name,
    status: phaseStatusFor(p, project),
    index: i,
  }));

  const pct = projectProgressPct(project, api.forms);

  const handleProjectUpdate = updateProject
    ? (patch: Partial<ProjectRecord>) => updateProject(project.id, patch)
    : undefined;

  return (
    <div dir="rtl" className="space-y-4">
      <button onClick={onBack} className="text-xs font-bold text-[#4A1F66] dark:text-purple-300 hover:underline flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> العودة لقائمة المشاريع
      </button>

      {/* Header */}
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
            <ProjectNumberWidget
              project={project}
              user={user}
              projectForms={projectForms}
              onUpdate={handleProjectUpdate} />
          </div>
        </div>
      </div>

      {/* 5-phase stepper */}
      <Card title="المراحل الرئيسية" icon={Activity} accent="purple">
        <PhaseStepper phases={stepperItems} />
      </Card>

      {/* Phase 1 — fully implemented */}
      <Card title="١. الدراسة والاعتماد" icon={FileText} accent="purple">
        <FoldableFormSection
          title="استمارة البحث الاجتماعي"
          status={f02SectionStatus(f02)}
          defaultOpen={!!f02}>
          {f02
            ? <F02ReadOnlyBody rec={f02} />
            : <p className="text-xs text-gray-400 dark:text-slate-500">لم تُعبَّأ الاستمارة بعد.</p>}
        </FoldableFormSection>

        <FoldableFormSection
          title="اعتماد مدير البحث الاجتماعي"
          status={f03StepStatus(f03, 0)}>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-3 italic">
            يعرض هذا القسم نتيجة نموذج "اعتماد استحقاق الخدمة" بعد رفعه.
          </p>
          <F03StepReadOnly rec={f03} step={0} />
        </FoldableFormSection>

        <FoldableFormSection
          title="اعتماد المدير التنفيذي"
          status={f03StepStatus(f03, 1)}>
          <F03StepReadOnly rec={f03} step={1} />
        </FoldableFormSection>

        <FoldableFormSection
          title="اعتماد وإحالة إلى إدارة المشاريع"
          status={f03StepStatus(f03, 2)}>
          <F03StepReadOnly rec={f03} step={2} />
        </FoldableFormSection>
      </Card>

      {/* Phases 2-5 — placeholders */}
      {MAIN_PHASES.slice(1).map((mp, idx) => {
        const status = phaseStatusFor(mp, project);
        return (
          <Card
            key={mp.key}
            title={`${idx + 2}. ${mp.name}`}
            icon={FileText}
            accent={status === 'completed' ? 'teal' : 'purple'}>
            <p className="text-xs text-gray-500 dark:text-slate-400 italic">
              سيتم تفعيل هذه المرحلة لاحقاً.
            </p>
          </Card>
        );
      })}

      {/* Legacy info + forms list — kept as reference (read-only) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">مهندس التشخيص</p>
          {diagnosisEng ? (
            <>
              <p className="text-sm font-bold">{diagnosisEng.fullName}</p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">{roleName(diagnosisEng.role)}</p>
            </>
          ) : <p className="text-xs text-gray-400">لم يُسند بعد</p>}
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">المهندس المشرف</p>
          {supervisingEng ? (
            <>
              <p className="text-sm font-bold">{supervisingEng.fullName}</p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">{roleName(supervisingEng.role)}</p>
            </>
          ) : <p className="text-xs text-gray-400">لم يُسند بعد</p>}
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">المقاول</p>
          {project.contractorName ? (
            <>
              <p className="text-sm font-bold">{project.contractorName}</p>
              {project.awardedPrice && <p className="text-[11px] text-gray-500 dark:text-slate-400">{project.awardedPrice} ر.س</p>}
            </>
          ) : <p className="text-xs text-gray-400">لم تتم الترسية بعد</p>}
        </div>
      </div>

      <Card title={`نماذج المشروع (${projectForms.length})`} icon={FileText}>
        {projectForms.length === 0 ? (
          <EmptyState icon={FileText} title="لا توجد نماذج بعد" />
        ) : (
          <div className="space-y-2">
            {projectForms
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map(f => (
                <FormCard key={f.id} rec={f} highlight={formAwaitsUser(f, user)} onOpen={() => onOpenForm(f.id)} />
              ))}
          </div>
        )}
      </Card>

      <Card title={`الملفات المرفقة (${filesAll.length})`} icon={FileText}>
        {filesAll.length === 0 ? (
          <EmptyState icon={FileText} title="لا توجد مرفقات بعد" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filesAll.map((f, i) => (
              <a key={i} href={f.url || '#'} target={f.url ? '_blank' : undefined} rel="noopener noreferrer"
                className="flex items-center justify-between bg-gray-50 dark:bg-slate-700 p-2 rounded-lg border border-gray-200 dark:border-slate-600 text-xs hover:bg-gray-100 dark:hover:bg-slate-600 transition">
                <span className="truncate font-semibold text-gray-700 dark:text-slate-200">
                  <FileText className="w-4 h-4 inline ml-1 text-purple-500" /> {f.name}
                </span>
                <Pill tone="purple">{f.formCode}</Pill>
              </a>
            ))}
          </div>
        )}
      </Card>

      <Card title="الجدول الزمني" icon={Activity}>
        <ol className="space-y-2">
          {projectForms
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map(f => (
              <li key={f.id} className="flex items-start gap-3 p-2 rounded-lg border border-gray-200 dark:border-slate-700">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                  ${f.status === 'approved' || f.status === 'completed' ? 'bg-green-500 text-white'
                    : f.status === 'rejected' ? 'bg-red-500 text-white'
                      : f.status === 'pending' ? 'bg-amber-500 text-white' : 'bg-gray-300'}`}>
                  {f.code.replace('F-', '')}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{f.title}</p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">{new Date(f.createdAt).toLocaleString('ar-SA')} — {f.createdByName} ({roleName(f.createdByRole)})</p>
                </div>
                <Pill tone={f.status === 'approved' ? 'green' : f.status === 'rejected' ? 'red' : f.status === 'pending' ? 'amber' : 'gray'}>{f.status}</Pill>
              </li>
            ))}
        </ol>
      </Card>
    </div>
  );
};

