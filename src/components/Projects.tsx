import React, { useMemo, useState } from 'react';
import {
  Building2, MapPin, FileText, Activity, ArrowLeft,
  ChevronDown, ChevronUp, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';
import {
  Card, Pill, SearchBar, EmptyState,
  ProjectCardRing, PhaseBrickWall, ReadOnlyField, Input,
  BRICK_COLORS,
  type PhaseBrickItem, type SubPhaseSlot, type BrickStatus,
} from './ui';
import { FORM_BY_CODE, roleName, canCreateForm, requiredDeptForApprovalStep, FormCode } from '../lib/data';
import { FormCard, FormsApi, formAwaitsUser, FormRecord } from './Forms';
import {
  F02ReadOnlyBody, F03StepInlineSection, F04InlineSection, F09InlineSection,
  type ProjectRecord,
} from './forms/FormRenderers';
import type { UserProfile } from './Auth';

/* ──────────────────────────────────────────────────────────────────
   Phase model — 5 main phases
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

const brickStatusFor = (phase: MainPhaseDef, project: ProjectRecord): BrickStatus => {
  const currentIdx = MAIN_PHASES.findIndex(mp => mp.key === mainPhaseOf(project));
  const myIdx = MAIN_PHASES.findIndex(mp => mp.key === phase.key);
  if (project.phase === 'CLOSED' && phase.key === 'CLOSE') return 'completed';
  if (myIdx < currentIdx) return 'completed';
  if (myIdx === currentIdx) return 'pending';
  return 'notStarted';
};

const EXPECTED_PROJECT_FORMS: readonly FormCode[] = ['F-02', 'F-03', 'F-04', 'F-08', 'F-09', 'F-20', 'F-85', 'F-14', 'F-15', 'F-07'];

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
                  {/* Percentage chip — anchored at bottom-center; the ring's path starts/ends from its sides. */}
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
   Foldable form section (used inside expanded brick panels)
   ────────────────────────────────────────────────────────────────── */

type SectionStatus = 'completed' | 'pending' | 'notStarted' | 'rejected';

const SECTION_HEADER_BG: Record<SectionStatus, string> = {
  completed:  '#3F9B7A',
  pending:    '#92400E',
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
   Status helpers per form / step
   ────────────────────────────────────────────────────────────────── */

const recSectionStatus = (rec?: FormRecord): SectionStatus => {
  if (!rec) return 'notStarted';
  if (rec.status === 'approved') return 'completed';
  if (rec.status === 'rejected') return 'rejected';
  if (rec.status === 'pending') return 'pending';
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
   Mode resolution (view vs edit)
   ────────────────────────────────────────────────────────────────── */

const resolveSectionMode = (
  user: UserProfile,
  formCode: FormCode,
  rec: FormRecord | undefined,
): 'view' | 'edit' => {
  if (user.role === 'ADMIN') return 'edit';
  if (!rec) {
    return canCreateForm(formCode, user) ? 'edit' : 'view';
  }
  if (formAwaitsUser(rec, user)) {
    const requiredDept = requiredDeptForApprovalStep(rec.code, rec.approvalIndex);
    if (requiredDept && user.department !== requiredDept) return 'view';
    return 'edit';
  }
  return 'view';
};

const f03StepMode = (
  user: UserProfile,
  rec: FormRecord | undefined,
  step: number,
): 'view' | 'edit' => {
  if (!rec) return 'view';
  if (user.role === 'ADMIN') return 'edit';
  if (rec.status !== 'pending') return 'view';
  if (rec.approvalIndex !== step) return 'view';
  if (rec.approvalChain[step] !== user.role) return 'view';
  const requiredDept = requiredDeptForApprovalStep(rec.code, step);
  if (requiredDept && user.department !== requiredDept) return 'view';
  return 'edit';
};

/* ──────────────────────────────────────────────────────────────────
   Project number widget (header)
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
   Phase-1 forms panel
   ────────────────────────────────────────────────────────────────── */

const Phase1Panel: React.FC<{
  project: ProjectRecord;
  user: UserProfile;
  users: UserProfile[];
  api: FormsApi;
  projectForms: FormRecord[];
}> = ({ project, user, users, api, projectForms }) => {
  const f02 = projectForms.find(f => f.code === 'F-02');
  const f03 = projectForms.find(f => f.code === 'F-03');

  return (
    <div>
      <FoldableFormSection
        title="استمارة البحث الاجتماعي"
        status={recSectionStatus(f02)}
        defaultOpen={!!f02 && f02.status === 'pending'}>
        {f02
          ? <div className={resolveSectionMode(user, 'F-02', f02) === 'view' ? 'opacity-70' : ''}><F02ReadOnlyBody rec={f02} /></div>
          : (
            <div className="opacity-70">
              <F02ReadOnlyBody rec={syntheticEmptyRec('F-02', project)} />
            </div>
          )}
      </FoldableFormSection>

      <FoldableFormSection
        title="اعتماد مدير البحث الاجتماعي"
        status={f03StepStatus(f03, 0)}>
        <F03StepInlineSection rec={f03} step={0} mode={f03StepMode(user, f03, 0)} user={user} users={users} api={api} />
      </FoldableFormSection>

      <FoldableFormSection
        title="اعتماد المدير التنفيذي"
        status={f03StepStatus(f03, 1)}>
        <F03StepInlineSection rec={f03} step={1} mode={f03StepMode(user, f03, 1)} user={user} users={users} api={api} />
      </FoldableFormSection>

      <FoldableFormSection
        title="اعتماد وإحالة إلى إدارة المشاريع"
        status={f03StepStatus(f03, 2)}>
        <F03StepInlineSection rec={f03} step={2} mode={f03StepMode(user, f03, 2)} user={user} users={users} api={api} />
      </FoldableFormSection>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   Phase-2 forms panel
   ────────────────────────────────────────────────────────────────── */

const Phase2Panel: React.FC<{
  project: ProjectRecord;
  user: UserProfile;
  users: UserProfile[];
  api: FormsApi;
  projectForms: FormRecord[];
  onOpenForm: (id: string) => void;
}> = ({ project, user, users, api, projectForms, onOpenForm }) => {
  const f04 = projectForms.find(f => f.code === 'F-04');
  const f08 = projectForms.find(f => f.code === 'F-08');
  const f20 = projectForms.find(f => f.code === 'F-20');
  const f09 = projectForms.find(f => f.code === 'F-09');

  const f08Status = recSectionStatus(f08);
  const f20Status = recSectionStatus(f20);

  return (
    <div>
      <FoldableFormSection
        title="تعيين مهندس التشخيص"
        status={recSectionStatus(f04)}
        defaultOpen={!!f04 && f04.status === 'pending'}>
        <F04InlineSection rec={f04} mode={resolveSectionMode(user, 'F-04', f04)}
          user={user} users={users} api={api} project={project} />
      </FoldableFormSection>

      <FoldableFormSection
        title="كراسة تشخيص المبنى"
        status={f08Status}
        defaultOpen={f08Status === 'pending'}>
        <F08ProxySection rec={f08} user={user} project={project} onOpenForm={onOpenForm} />
      </FoldableFormSection>

      <FoldableFormSection
        title="خطة توريد المواد"
        status={f20Status}>
        <F20ProxySection rec={f20} user={user} project={project} onOpenForm={onOpenForm} />
      </FoldableFormSection>

      <FoldableFormSection
        title="تعيين مشرف التشخيص"
        status={recSectionStatus(f09)}>
        <F09InlineSection rec={f09} mode={resolveSectionMode(user, 'F-09', f09)}
          user={user} users={users} api={api} project={project} />
      </FoldableFormSection>
    </div>
  );
};

/* Heavy forms (F-08, F-20) keep their multi-page editor — show summary inline + a button to open the modal. */
const F08ProxySection: React.FC<{
  rec?: FormRecord; user: UserProfile; project: ProjectRecord; onOpenForm: (id: string) => void;
}> = ({ rec, user, onOpenForm }) => {
  const mode = resolveSectionMode(user, 'F-08', rec);
  const data = rec?.data || {};
  return (
    <div className={`space-y-3 ${mode === 'view' ? 'opacity-70' : ''}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ReadOnlyField label="نوع التشخيص" value={data.diagnosisType} />
        <ReadOnlyField label="حالة سلامة المبنى" value={data.safetyHazard ? 'خطر السلامة' : data.buildingCondition} />
        <ReadOnlyField label="عدد الأدوار" value={data.floorsCount} />
        <ReadOnlyField label="مساحة المبنى (م²)" value={data.buildingArea} />
      </div>
      {rec && mode === 'edit' && (
        <button onClick={() => onOpenForm(rec.id)}
          className="px-4 py-2 rounded-lg text-sm font-bold bg-[#3F9B7A] text-white hover:bg-[#2f7a5e] transition">
          فتح الكراسة للتعبئة
        </button>
      )}
      {!rec && <p className="text-xs text-gray-400 dark:text-slate-500">تُفتَح هذه الكراسة تلقائياً بعد تعيين مهندس التشخيص.</p>}
    </div>
  );
};

const F20ProxySection: React.FC<{
  rec?: FormRecord; user: UserProfile; project: ProjectRecord; onOpenForm: (id: string) => void;
}> = ({ rec, user, onOpenForm }) => {
  const mode = resolveSectionMode(user, 'F-20', rec);
  const items = rec?.data?.items as Array<{ name?: string; qty?: number; unit?: string }> | undefined;
  return (
    <div className={`space-y-3 ${mode === 'view' ? 'opacity-70' : ''}`}>
      {items && items.length > 0 ? (
        <div className="space-y-1.5">
          {items.slice(0, 6).map((it, i) => (
            <div key={i} className="text-xs text-gray-700 dark:text-slate-200 flex justify-between border-b border-gray-100 dark:border-slate-700 pb-1">
              <span>{it.name || '—'}</span>
              <span className="font-bold">{it.qty || 0} {it.unit || ''}</span>
            </div>
          ))}
          {items.length > 6 && <p className="text-[11px] text-gray-500">+{items.length - 6} عناصر أخرى</p>}
        </div>
      ) : (
        <ReadOnlyField label="المواد" value="" />
      )}
      {rec && mode === 'edit' && (
        <button onClick={() => onOpenForm(rec.id)}
          className="px-4 py-2 rounded-lg text-sm font-bold bg-[#3F9B7A] text-white hover:bg-[#2f7a5e] transition">
          فتح خطة التوريد للتعبئة
        </button>
      )}
      {!rec && <p className="text-xs text-gray-400 dark:text-slate-500">تُفتَح خطة التوريد تلقائياً عند تقديم كراسة التشخيص.</p>}
    </div>
  );
};

/* بناء سجل اصطناعي فارغ لعرض الهيكل الكامل لنموذج لم يُعبَّأ بعد. */
const syntheticEmptyRec = (code: FormCode, project: ProjectRecord): FormRecord => ({
  id: `synthetic-${code}-${project.id}`,
  code,
  title: FORM_BY_CODE[code]?.title || code,
  projectId: project.projectId || null,
  projectRefId: project.id,
  beneficiaryName: project.beneficiaryName,
  status: 'draft',
  approvalIndex: 0,
  approvalChain: FORM_BY_CODE[code]?.approvalChain || [],
  approvals: [],
  createdBy: '',
  createdByRole: 'SOCIAL_RESEARCHER',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ownerDept: FORM_BY_CODE[code]?.ownerDept || 'RESEARCH',
  bridgesTo: [],
  data: {},
});

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
  updateProject?: (projectRefId: string, patch: Partial<ProjectRecord>) => Promise<void>;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project, user, users, api, onBack, onOpenForm, updateProject,
}) => {
  const projectForms = useMemo(
    () => api.forms.filter(f => f.projectRefId === project.id),
    [api.forms, project.id],
  );
  const filesAll = projectForms.flatMap(f => (f.files || []).map(file => ({ ...file, formCode: f.code })));
  const diagnosisEng = users.find(u => u.id === project.diagnosisEngineerId);
  const supervisingEng = users.find(u => u.id === project.supervisingEngineerId);

  const phases: PhaseBrickItem[] = MAIN_PHASES.map((p, i) => ({
    key: p.key,
    name: p.name,
    index: i,
    status: brickStatusFor(p, project),
  }));

  // 4 sub-phase slots between adjacent main phases — all inactive for now.
  const subPhases: SubPhaseSlot[] = [
    { key: 'sub-1-2', name: 'مرحلة فرعية 1-2', status: 'inactive' },
    { key: 'sub-2-3', name: 'مرحلة فرعية 2-3', status: 'inactive' },
    { key: 'sub-3-4', name: 'مرحلة فرعية 3-4', status: 'inactive' },
    { key: 'sub-4-5', name: 'مرحلة فرعية 4-5', status: 'inactive' },
  ];

  const defaultExpanded = mainPhaseOf(project);
  const [expandedKey, setExpandedKey] = useState<string>(defaultExpanded);

  const expandedPhase = MAIN_PHASES.find(p => p.key === expandedKey);
  const expandedStatus = expandedPhase ? brickStatusFor(expandedPhase, project) : 'notStarted';

  const handleProjectUpdate = updateProject
    ? (patch: Partial<ProjectRecord>) => updateProject(project.id, patch)
    : undefined;

  const pct = projectProgressPct(project, api.forms);

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

      {/* Brick wall + expanded panel */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-3 space-y-3">
        <PhaseBrickWall
          phases={phases}
          subPhases={subPhases}
          expandedKey={expandedKey}
          onExpand={setExpandedKey} />

        {expandedPhase && (
          <div className="rounded-xl bg-gray-50 dark:bg-slate-900/50 p-4 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold" style={{ color: BRICK_COLORS[expandedStatus] }}>
                {`${MAIN_PHASES.findIndex(p => p.key === expandedPhase.key) + 1}. ${expandedPhase.name}`}
              </h2>
              <span className="text-[10px] font-bold text-white px-2.5 py-0.5 rounded-full"
                style={{ background: BRICK_COLORS[expandedStatus] }}>
                {expandedStatus === 'completed' ? 'مكتملة' :
                 expandedStatus === 'pending' ? 'الجارية حالياً' :
                 expandedStatus === 'rejected' ? 'مرفوضة' : 'لم تبدأ'}
              </span>
            </div>

            {expandedPhase.key === 'STUDY' && (
              <Phase1Panel project={project} user={user} users={users} api={api} projectForms={projectForms} />
            )}
            {expandedPhase.key === 'PREP' && (
              <Phase2Panel project={project} user={user} users={users} api={api}
                projectForms={projectForms} onOpenForm={onOpenForm} />
            )}
            {expandedPhase.key === 'AWARD' && <PhaseStub />}
            {expandedPhase.key === 'EXEC' && <PhaseStub />}
            {expandedPhase.key === 'CLOSE' && <PhaseStub />}
          </div>
        )}
      </div>

      {/* Legacy info cards (kept) */}
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

const PhaseStub: React.FC = () => (
  <p className="text-sm text-gray-500 dark:text-slate-400 italic py-2">
    سيتم تفعيل هذه المرحلة لاحقاً.
  </p>
);
