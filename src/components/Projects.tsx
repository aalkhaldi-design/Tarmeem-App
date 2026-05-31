import React, { useMemo, useState } from 'react';
import {
  Building2, MapPin, FileText, Activity, ArrowLeft, ChevronDown, ChevronUp, Lock, Plus,
} from 'lucide-react';
import { Card, Pill, ProgressBar, SearchBar, EmptyState } from './ui';
import { FORM_BY_CODE, FormCode, FormDef, roleName, SaudiRiyalGlassIcon } from '../lib/data';
import { FormsApi, formAwaitsUser } from './Forms';
import type { FormRecord } from './Forms';
import type { ProjectRecord, FormsContext } from './forms/FormRenderers';
import { RENDERERS } from './forms/FormRenderers';
import type { UserProfile } from './Auth';
import { ProjectActionsMenu } from './ProjectActionsMenu';
import { FormErrorBoundary } from './forms/FormErrorBoundary';

const PHASE_LABELS: Record<ProjectRecord['phase'], string> = {
  RESEARCH: 'البحث الاجتماعي',
  DIAGNOSIS: 'التشخيص الهندسي',
  EVACUATION: 'إخلاء وسكن بديل',
  TENDERING: 'الترسية والتسعيرات',
  EXECUTION: 'التنفيذ والإشراف',
  HANDOVER: 'التسليم',
  CLOSED: 'مغلق',
  REJECTED: 'مرفوض',
  CANCELLED: 'ملغى',
};

const PHASE_TONES: Record<ProjectRecord['phase'], 'gray' | 'amber' | 'blue' | 'purple' | 'green' | 'teal' | 'red'> = {
  RESEARCH: 'blue',
  DIAGNOSIS: 'purple',
  EVACUATION: 'amber',
  TENDERING: 'amber',
  EXECUTION: 'teal',
  HANDOVER: 'green',
  CLOSED: 'gray',
  REJECTED: 'red',
  CANCELLED: 'gray',
};

interface MasterProjectListProps {
  user: UserProfile;
  api: FormsApi;
  projects: ProjectRecord[];
  users: UserProfile[];
  onOpenProject: (id: string) => void;
  onCreateForm: (code?: FormCode) => void;
}

export const MasterProjectList: React.FC<MasterProjectListProps> = ({ projects, onOpenProject, api, user, onCreateForm }) => {
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<'all' | ProjectRecord['phase']>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...projects]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter(p => {
      if (phaseFilter !== 'all' && p.phase !== phaseFilter) return false;
      if (!q) return true;
      return (
        p.projectId.toLowerCase().includes(q) ||
        p.beneficiaryName.toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q)
      );
    });
  }, [projects, search, phaseFilter]);

  return (
    <div dir="rtl" className="space-y-4">
      <Card title="قائمة المشاريع الرئيسية" icon={Building2} accent="gradient">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="بحث برقم المشروع أو اسم المستفيد..." /></div>
          {(user.role === 'SOCIAL_RESEARCHER' || user.isAdmin) && (
            <button onClick={() => onCreateForm('F-02')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-[#4A1F66] text-white hover:bg-[#3A1652] transition shadow whitespace-nowrap">
              <Plus className="w-4 h-4" /> استمارة بحث جديدة
            </button>
          )}
          <div className="flex flex-wrap gap-2">
            {(['all', 'RESEARCH', 'DIAGNOSIS', 'EVACUATION', 'TENDERING', 'EXECUTION', 'HANDOVER', 'CLOSED'] as const).map(p => (
              <button key={p} onClick={() => setPhaseFilter(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${phaseFilter === p ? 'bg-[#4A1F66] text-white shadow' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200'}`}>
                {p === 'all' ? 'الكل' : PHASE_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Building2} title="لا توجد مشاريع مطابقة" hint="ينشأ المشروع تلقائياً عند اعتماد F-03 وتحويله إلى المشاريع." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
              return (
                <button key={p.id} onClick={() => onOpenProject(p.id)}
                  className="text-right rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg hover:border-[#4A1F66]/30 transition-all overflow-hidden group">
                  <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-4 py-2.5 flex items-center justify-between text-white">
                    <span className="text-sm font-bold truncate">{p.projectId}</span>
                    <Pill tone={PHASE_TONES[p.phase]}>{PHASE_LABELS[p.phase]}</Pill>
                  </div>
                  <div className="p-4 space-y-2">
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{p.beneficiaryName}</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {p.city} {p.neighborhood ? `· ${p.neighborhood}` : ''}
                      </p>
                    </div>
                    <ProgressBar value={p.progressPct} label="التقدم" />
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-500 dark:text-slate-400">{projectForms.length} نموذج</span>
                      <div className="flex items-center gap-1.5">
                        {pendingCount > 0 && <Pill tone="amber">{pendingCount} معلّق</Pill>}
                        {lateCount > 0 && <Pill tone="red">{lateCount} متأخر</Pill>}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

interface ProjectDetailProps {
  project: ProjectRecord;
  user: UserProfile;
  users: UserProfile[];
  api: FormsApi;
  context: FormsContext;
  onBack: () => void;
  onOpenForm: (id: string) => void;
}

type PhaseIdx = 1 | 2 | 3 | 4 | 5;
type PhaseEntry = { code: FormCode; def: FormDef; records: FormRecord[] };

const PHASE_FORMS: Record<PhaseIdx, FormCode[]> = {
  1: ['F-02'],
  2: ['F-04', 'F-08', 'F-18', 'F-22', 'F-21', 'F-84'],
  3: ['F-85', 'F-32', 'F-33.1', 'F-35', 'F-20', 'F-33'],
  4: ['F-34', 'F-15.1', 'F-15.2', 'F-14', 'F-15', 'F-23', 'F-19'],
  5: ['F-07', 'F-52'],
};

const PHASE_TITLES: Record<PhaseIdx, string> = {
  1: 'الدراسة والاعتماد',
  2: 'التشخيص والتجهيز',
  3: 'الترسية والبدء',
  4: 'التنفيذ والصرف',
  5: 'الإغلاق',
};

const PROJECT_PHASE_TO_TAB: Record<ProjectRecord['phase'], PhaseIdx> = {
  RESEARCH:   1,
  DIAGNOSIS:  2,
  EVACUATION: 2,
  TENDERING:  3,
  EXECUTION:  4,
  HANDOVER:   5,
  CLOSED:     5,
  REJECTED:   1,
  CANCELLED:  1,
};

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, user, users, api, context, onBack }) => {
  const projectForms = useMemo(
    () => api.forms.filter(f => f.projectRefId === project.id),
    [api.forms, project.id],
  );
  const filesAll = projectForms.flatMap(f => (f.files || []).map(file => ({ ...file, formCode: f.code })));
  const diagnosisEng = users.find(u => u.id === project.diagnosisEngineerId);
  const supervisingEng = users.find(u => u.id === project.supervisingEngineerId);

  const [activePhase, setActivePhase] = useState<PhaseIdx>(() => PROJECT_PHASE_TO_TAB[project.phase] || 1);
  const [unfolded, setUnfolded] = useState<string[]>([]);
  const toggle = (id: string) =>
    setUnfolded(arr => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  // Build the full per-phase roadmap: one entry per code (real records + not-yet-created).
  const phaseEntries = useMemo<PhaseEntry[]>(() => {
    return PHASE_FORMS[activePhase].flatMap(code => {
      const def = FORM_BY_CODE[code];
      if (!def) return [];
      const records = projectForms.filter(f => f.code === code);
      if (code === 'F-14') {
        records.sort((a, b) =>
          Number((a.data as { f14_version?: number } | undefined)?.f14_version || 1) -
          Number((b.data as { f14_version?: number } | undefined)?.f14_version || 1));
      } else if (code === 'F-15') {
        records.sort((a, b) =>
          Number((a.data as { paymentIndex?: number } | undefined)?.paymentIndex || 1) -
          Number((b.data as { paymentIndex?: number } | undefined)?.paymentIndex || 1));
      }
      return [{ code, def, records }];
    });
  }, [projectForms, activePhase]);

  return (
    <div dir="rtl" className="space-y-4">
      <button onClick={onBack} className="text-xs font-bold text-[#4A1F66] dark:text-purple-300 hover:underline flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> العودة لقائمة المشاريع</button>

      <div className="rounded-2xl p-6 text-white shadow-lg bg-gradient-to-l from-[#4A1F66] via-[#6B3D87] to-[#56B894]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-white/70">{project.projectId}</p>
            <h1 className="text-2xl font-bold mt-1">{project.beneficiaryName}</h1>
            <p className="text-white/80 text-sm mt-1 flex items-center gap-2"><MapPin className="w-4 h-4" /> {project.city} {project.neighborhood ? `· ${project.neighborhood}` : ''}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <Pill tone={PHASE_TONES[project.phase]}>{PHASE_LABELS[project.phase]}</Pill>
              <ProjectActionsMenu project={project} user={user} context={context} />
            </div>
            <p className="text-xs text-white/70 mt-2">آخر تحديث {new Date(project.updatedAt).toLocaleDateString('ar-SA')}</p>
          </div>
        </div>
        <div className="mt-4 bg-white/15 rounded-lg p-3 backdrop-blur-sm">
          <ProgressBar value={project.progressPct} label="نسبة الإنجاز الإجمالية" />
        </div>
      </div>

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
              {project.awardedPrice && (
                <p className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-1">
                  {project.awardedPrice.toLocaleString('ar-SA')} <SaudiRiyalGlassIcon className="w-3.5 h-3.5 inline" />
                </p>
              )}
            </>
          ) : <p className="text-xs text-gray-400">لم تتم الترسية بعد</p>}
        </div>
      </div>

      {/* Phase tracker */}
      <div className="flex w-full gap-2 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2 shadow-sm">
        {([1, 2, 3, 4, 5] as PhaseIdx[]).map(p => {
          const isActive = p === activePhase;
          return (
            <button key={p} onClick={() => setActivePhase(p)}
              className={`transition-all duration-500 rounded-xl text-center px-3 py-2.5 font-bold text-xs
                ${isActive ? 'flex-[4] bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] text-white shadow' : 'flex-[1] bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}>
              {isActive ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[11px]">{p}</span>
                  <span>{PHASE_TITLES[p]}</span>
                </span>
              ) : (
                <span>{p}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Phase forms accordion — full roadmap (real + not-yet-created) */}
      <Card title={`نماذج ${PHASE_TITLES[activePhase]} (${phaseEntries.length})`} icon={FileText}>
        <div className="space-y-2">
          {phaseEntries.map(entry => (
            entry.records.length > 0
              ? entry.records.map(rec => (
                  <FormAccordionItem
                    key={rec.id}
                    rec={rec}
                    user={user}
                    users={users}
                    api={api}
                    context={context}
                    open={unfolded.includes(rec.id)}
                    onToggle={() => toggle(rec.id)}
                  />
                ))
              : (
                <div key={entry.code}
                  className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/30 p-4 opacity-75">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                      {entry.code}
                    </span>
                    <span className="text-sm font-bold text-gray-700 dark:text-slate-200">
                      {entry.def.title}
                    </span>
                    <span className="ms-auto inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400">
                      <Lock className="w-3 h-3" /> قيد الانتظار — للاطلاع فقط
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                    {entry.def.description}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2">
                    {(entry.code === 'F-18' || entry.code === 'F-22')
                      ? 'يُفتح عند تقديم كراسة التشخيص (F-08).'
                      : 'سيُفتح للتعبئة تلقائياً عندما يصل سير العمل إلى هذه المرحلة.'}
                  </p>
                </div>
              )
          ))}
        </div>
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
            .filter(f => f.status !== 'draft')
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

/* ──────────────────────────────────────────────────────────────────
   FormAccordionItem — collapsible form row with inline renderer
   ────────────────────────────────────────────────────────────────── */

const FormAccordionItem: React.FC<{
  rec: FormRecord;
  user: UserProfile;
  users: UserProfile[];
  api: FormsApi;
  context: FormsContext;
  open: boolean;
  onToggle: () => void;
}> = ({ rec, user, users, api, context, open, onToggle }) => {
  const def = FORM_BY_CODE[rec.code];
  const Renderer = RENDERERS[rec.code];
  const awaits = formAwaitsUser(rec, user);
  const isClosed = rec.status === 'approved' || rec.status === 'completed';
  const reportN = Number((rec.data as { f14_version?: number } | undefined)?.f14_version || 1);
  const paymentIdx = (rec.data as { paymentIndex?: number } | undefined)?.paymentIndex;
  const suffix =
    rec.code === 'F-14' ? ` ${reportN}` :
    rec.code === 'F-15' && paymentIdx ? ` · دفعة ${paymentIdx}` :
    '';
  const statusTone =
    rec.status === 'approved'  ? 'green'  :
    rec.status === 'completed' ? 'green'  :
    rec.status === 'rejected'  ? 'red'    :
    rec.status === 'declined'  ? 'red'    :
    rec.status === 'pending'   ? 'amber'  :
    rec.status === 'deferred'  ? 'blue'   :
    'gray';
  const statusLabel: Record<FormRecord['status'], string> = {
    draft:     'مسودة',
    pending:   'بانتظار الاعتماد',
    approved:  'معتمد',
    rejected:  'مرفوض',
    deferred:  'مؤجَّل',
    completed: 'مكتمل',
    declined:  'مرفوض نهائياً',
  };

  // For a draft, find the upstream form that must be approved first.
  const upstreamWaiting = useMemo(() => {
    if (rec.status !== 'draft') return null;
    const order = ['F-02','F-03','F-03.1','F-03.2','F-04','F-08','F-18','F-22','F-21','F-84',
      'F-85','F-32','F-33.1','F-35','F-20','F-33','F-34','F-15.1','F-15.2','F-14','F-15','F-23','F-19','F-07','F-52'];
    const projectForms = api.forms
      .filter(f => f.projectRefId === rec.projectRefId)
      .sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
    const myIdx = projectForms.findIndex(f => f.id === rec.id);
    for (let i = myIdx - 1; i >= 0; i--) {
      if (projectForms[i].status !== 'approved' && projectForms[i].status !== 'completed') return projectForms[i];
    }
    return null;
  }, [api.forms, rec]);

  return (
    <div className={`rounded-xl border-2 transition overflow-hidden bg-white dark:bg-slate-800
      ${isClosed ? 'border-[#43bba1]' : 'border-[#6B3D87]/40'}`}>
      <button onClick={onToggle}
        className="w-full text-right flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition">
        <div className="w-10 h-10 rounded-lg bg-[#4A1F66]/10 dark:bg-purple-900/40 text-[#4A1F66] dark:text-purple-300 flex items-center justify-center font-bold text-[11px] shrink-0">
          {rec.code}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{rec.title || def?.title}{suffix}</span>
            <Pill tone={statusTone}>{statusLabel[rec.status]}</Pill>
            {awaits && <Pill tone="amber">بانتظار اعتمادك</Pill>}
          </div>
          {rec.status === 'pending' && rec.approvalIndex < rec.approvalChain.length && (
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
              التالي: {roleName(rec.approvalChain[rec.approvalIndex])}
            </p>
          )}
          {rec.status === 'draft' && rec.code !== 'F-19' && (
            <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 flex items-start gap-1.5">
              <Lock className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                {upstreamWaiting ? (
                  <>مقفل — بانتظار <strong className="text-amber-700 dark:text-amber-300">{upstreamWaiting.title || FORM_BY_CODE[upstreamWaiting.code]?.title}</strong> من {roleName(upstreamWaiting.approvalChain[upstreamWaiting.approvalIndex] || upstreamWaiting.approvalChain[0])}</>
                ) : 'مقفل — يفتح تلقائياً عند تفعيل النموذج'}
              </span>
            </div>
          )}
        </div>
        <div className="shrink-0 text-gray-400 mt-1">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-200 dark:border-slate-700 p-3 bg-gray-50/50 dark:bg-slate-900/40">
          {rec.status === 'draft' && rec.code !== 'F-19' && (
            <div className="mb-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
              🔒 <strong>هذا النموذج مقفل حالياً.</strong> سيُفتح للتعبئة بواسطة <strong>{roleName(rec.approvalChain[0])}</strong> فور اعتماد النموذج السابق في سلسلة المشروع. يمكنك مطالعة بنيته أدناه للاطلاع.
            </div>
          )}
          {Renderer ? (
            <FormErrorBoundary key={rec.id} formCode={rec.code}>
              <Renderer rec={rec} user={user} api={api} users={users} context={context} onClose={onToggle} />
            </FormErrorBoundary>
          ) : (
            <p className="text-xs text-gray-500 dark:text-slate-400 text-center py-6">
              لا يوجد عرض مخصص لهذا النموذج. افتح من صندوق الوارد للوصول إلى الإجراءات.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

