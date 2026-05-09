import React, { useMemo, useState } from 'react';
import {
  Building2, MapPin, FileText, Activity, ArrowLeft, UserCheck, AlertTriangle,
  Send, Plus,
} from 'lucide-react';
import {
  Card, Pill, ProgressBar, SearchBar, EmptyState, RoadmapTimeline,
  FileGallery, Select,
} from './ui';
import {
  FORM_BY_CODE, FORMS_ROADMAP, FormCode, ROLE_BY_KEY, RoleKey, roleName,
} from '../lib/data';
import { FormCard, FormsApi, formAwaitsUser, FormRecord } from './Forms';
import type { ProjectRecord, FormsContext } from '../lib/types';
import type { UserProfile } from './Auth';

const PHASE_LABELS: Record<ProjectRecord['phase'], string> = {
  RESEARCH: 'البحث الاجتماعي',
  DIAGNOSIS: 'التشخيص الهندسي',
  EVACUATION: 'إخلاء وسكن بديل',
  TENDERING: 'الترسية والتسعيرات',
  EXECUTION: 'التنفيذ والإشراف',
  HANDOVER: 'التسليم',
  CLOSED: 'مغلق',
};
const PHASE_TONES: Record<ProjectRecord['phase'], 'gray' | 'amber' | 'blue' | 'purple' | 'green' | 'teal' | 'red'> = {
  RESEARCH: 'blue', DIAGNOSIS: 'purple', EVACUATION: 'amber',
  TENDERING: 'amber', EXECUTION: 'teal', HANDOVER: 'green', CLOSED: 'gray',
};

/* ════════════════════════════════════════════════════════════════════════
   MasterProjectList — قائمة المشاريع الرئيسية مع شريط تقدم نحيف
   ════════════════════════════════════════════════════════════════════════ */

interface MasterProjectListProps {
  projects: ProjectRecord[];
  api: FormsApi;
  onOpenProject: (id: string) => void;
}

export const MasterProjectList: React.FC<MasterProjectListProps> = ({ projects, api, onOpenProject }) => {
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<'all' | ProjectRecord['phase']>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter(p => {
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
      <Card title="قائمة المشاريع — جميع المشاريع المفتوحة" icon={Building2} accent="gradient">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="بحث برقم المشروع أو اسم المستفيد..." /></div>
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
          <EmptyState icon={Building2} title="لا توجد مشاريع مطابقة" hint="ينشأ المشروع من Genesis (F-02)." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(p => {
              const projectForms = api.forms.filter(f => f.projectRefId === p.id);
              const pendingCount = projectForms.filter(f => f.status === 'pending').length;
              return (
                <button key={p.id} onClick={() => onOpenProject(p.id)}
                  className="text-right rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 hover:border-[#4A1F66]/30 transition-all overflow-hidden group">
                  <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-4 py-2.5 flex items-center justify-between text-white">
                    <span className="text-sm font-bold font-mono">{p.projectId}</span>
                    <Pill tone={PHASE_TONES[p.phase]}>{PHASE_LABELS[p.phase]}</Pill>
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{p.beneficiaryName}</p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {p.city} {p.neighborhood ? `· ${p.neighborhood}` : ''}
                    </p>
                    <ProgressBar value={p.progressPct} label="التقدم" />
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-500 dark:text-slate-400">{projectForms.length} نموذج</span>
                      {pendingCount > 0 && <Pill tone="amber">{pendingCount} معلّق</Pill>}
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

/* ════════════════════════════════════════════════════════════════════════
   ProjectHub — الصفحة الكاملة لمشروع واحد
   تشمل: روادماب، تعيين المهندسين، النماذج المتاحة، الملفات، السجل الزمني
   ════════════════════════════════════════════════════════════════════════ */

interface ProjectHubProps {
  project: ProjectRecord;
  user: UserProfile;
  users: UserProfile[];
  api: FormsApi;
  context: FormsContext;
  onBack: () => void;
  onOpenForm: (id: string) => void;
  onCreateForm: (code: FormCode) => void;
}

export const ProjectHub: React.FC<ProjectHubProps> = ({
  project, user, users, api, context, onBack, onOpenForm, onCreateForm,
}) => {
  const projectForms = useMemo(
    () => api.forms.filter(f => f.projectRefId === project.id),
    [api.forms, project.id]
  );

  const filesAll = useMemo(
    () => projectForms.flatMap(f => (f.files || []).map(file => ({ ...file, formCode: f.code }))),
    [projectForms]
  );

  const diagnosisEng = users.find(u => u.id === project.diagnosisEngineerId);
  const supervisingEng = users.find(u => u.id === project.supervisingEngineerId);
  const availableEngineers = context.availableEngineers();

  const formsByCode = useMemo(() => {
    const map = new Map<FormCode, FormRecord[]>();
    projectForms.forEach(f => {
      const list = map.get(f.code) || [];
      list.push(f);
      map.set(f.code, list);
    });
    return map;
  }, [projectForms]);

  /* ── Roadmap building: status per form code ── */
  const roadmapSteps = useMemo(() =>
    FORMS_ROADMAP.map(step => {
      const forms = formsByCode.get(step.code) || [];
      let status: 'completed' | 'current' | 'upcoming' | 'pending' = 'upcoming';
      if (forms.some(f => f.status === 'approved' || f.status === 'completed')) status = 'completed';
      else if (forms.some(f => f.status === 'pending')) status = forms.some(f => formAwaitsUser(f, user)) ? 'current' : 'pending';
      return {
        code: step.code,
        label: step.label,
        status,
        onOpen: forms.length > 0 ? () => onOpenForm(forms[forms.length - 1].id) : undefined,
      };
    }),
    [formsByCode, onOpenForm, user]
  );

  const myInbox = projectForms.filter(f => formAwaitsUser(f, user));

  /* ── Phase-gated form creation: which forms can the current user trigger now? ── */
  const phaseOpenableForms = useMemo(() => {
    const result: FormCode[] = [];
    const has = (code: FormCode) => formsByCode.has(code);
    const isApproved = (code: FormCode) => (formsByCode.get(code) || []).some(f => f.status === 'approved' || f.status === 'completed');
    const myRole = user.role as RoleKey;
    const canOriginate = (code: FormCode) => FORM_BY_CODE[code]?.originRoles.includes(myRole);

    // F-03 يفتح بعد F-02 معتمد (يطلقه مدير البحث)
    if (isApproved('F-02') && !has('F-03') && canOriginate('F-03')) result.push('F-03');
    // F-08 يفتح بعد F-03 معتمد + إسناد مهندس تشخيص (يطلق آلياً عند الإسناد)
    // F-21 يفتح بعد F-08
    if (isApproved('F-08') && !has('F-21') && canOriginate('F-21')) result.push('F-21');
    // F-20 يفتح بعد F-08
    if (isApproved('F-08') && !has('F-20') && canOriginate('F-20')) result.push('F-20');
    // F-19 يفتح بعد F-20
    if (isApproved('F-20') && !has('F-19') && canOriginate('F-19')) result.push('F-19');
    // F-85 يفتح بعد F-08
    if (isApproved('F-08') && !has('F-85') && canOriginate('F-85')) result.push('F-85');
    // F-14 يفتح بعد F-85 (multiple instances allowed) — يمكن إنشاؤه عدة مرات
    if (isApproved('F-85') && canOriginate('F-14')) result.push('F-14');
    // F-15 يفتح يدوياً (طلب صرف غير محطة)
    if (isApproved('F-85') && canOriginate('F-15')) result.push('F-15');
    // F-07 يفتح بعد F-14 يبلغ 100%
    const f14s = formsByCode.get('F-14') || [];
    if (f14s.some(f => f.status === 'approved' && f.data?.milestone === '100%') && !has('F-07') && canOriginate('F-07')) result.push('F-07');

    return result;
  }, [formsByCode, user.role]);

  return (
    <div dir="rtl" className="space-y-4">
      <button onClick={onBack} className="text-xs font-bold text-[#4A1F66] dark:text-purple-300 hover:underline flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> العودة لقائمة المشاريع
      </button>

      {/* Header */}
      <div className="rounded-2xl p-6 text-white shadow-lg bg-gradient-to-l from-[#4A1F66] via-[#6B3D87] to-[#56B894]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-white/70 font-mono">{project.projectId}</p>
            <h1 className="text-2xl font-bold mt-1">{project.beneficiaryName}</h1>
            <p className="text-white/80 text-sm mt-1 flex items-center gap-2"><MapPin className="w-4 h-4" /> {project.city} {project.neighborhood ? `· ${project.neighborhood}` : ''}</p>
          </div>
          <div className="text-right">
            <Pill tone={PHASE_TONES[project.phase]}>{PHASE_LABELS[project.phase]}</Pill>
            <p className="text-xs text-white/70 mt-2">آخر تحديث {new Date(project.updatedAt).toLocaleDateString('ar-SA')}</p>
          </div>
        </div>
        <div className="mt-4 bg-white/15 rounded-lg p-3 backdrop-blur-sm">
          <ProgressBar value={project.progressPct} label="نسبة الإنجاز الإجمالية" />
        </div>
      </div>

      {/* Roadmap */}
      <Card title="مسار النماذج (Roadmap)" icon={Activity} accent="purple">
        <RoadmapTimeline steps={roadmapSteps} />
        <div className="flex items-center gap-3 mt-3 flex-wrap text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />منجز</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />قيد الاعتماد بدورك</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />قيد الاعتماد</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" />قادم</span>
        </div>
      </Card>

      {/* Engineer assignment (rule 5) */}
      <Card title="إسناد المهندسين" icon={UserCheck} accent="teal">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <EngineerAssignmentCard
            label="مهندس التشخيص"
            current={diagnosisEng}
            user={user}
            project={project}
            engineers={availableEngineers}
            allowedRoles={['PROJECTS_MANAGER']}
            kind="DIAGNOSIS"
            onAssign={async (engId) => {
              // 1) حدّث المشروع
              await context.updateProject(project.id, { diagnosisEngineerId: engId });
              // 2) إن لم يوجد F-08 بعد، أنشئه مسنداً للمهندس
              const has08 = projectForms.some(f => f.code === 'F-08');
              if (!has08) {
                await api.createForm({
                  code: 'F-08',
                  user,
                  projectId: project.projectId,
                  projectRefId: project.id,
                  beneficiaryName: project.beneficiaryName,
                  notes: 'تم إسناد F-08 لمهندس التشخيص.',
                  data: {},
                  assigneeId: engId,
                });
              }
            }}
          />
          <EngineerAssignmentCard
            label="المهندس المشرف الميداني"
            current={supervisingEng}
            user={user}
            project={project}
            engineers={availableEngineers}
            allowedRoles={['HEAD_SUPERVISION']}
            kind="SUPERVISION"
            onAssign={async (engId) => {
              await context.updateProject(project.id, { supervisingEngineerId: engId });
            }}
          />
        </div>
      </Card>

      {/* Inbox for current user */}
      {myInbox.length > 0 && (
        <Card title={`صندوق وارد المشروع (${myInbox.length})`} icon={AlertTriangle}>
          <div className="space-y-2">
            {myInbox.map(f => <FormCard key={f.id} rec={f} highlight onOpen={() => onOpenForm(f.id)} />)}
          </div>
        </Card>
      )}

      {/* Forms creatable in this phase */}
      {phaseOpenableForms.length > 0 && (
        <Card title="نماذج متاحة لك في هذه المرحلة" icon={Plus} accent="teal">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
            النماذج تُفتح فقط ضمن سياق المشروع وعندما يسمح المسار بذلك. رقم المشروع <strong className="font-mono">{project.projectId}</strong> سيُسجَّل تلقائياً ومقفلاً.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {phaseOpenableForms.map(code => {
              const def = FORM_BY_CODE[code];
              return (
                <button key={code} onClick={() => onCreateForm(code)}
                  className="text-right p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-[#4A1F66]/30 hover:shadow transition bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill tone="purple">{code}</Pill>
                    <span className="text-sm font-bold text-gray-800 dark:text-slate-100">{def?.title}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2">{def?.description}</p>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* All forms in project */}
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

      {/* File gallery — read-only preview */}
      <Card title={`معرض ملفات المشروع (${filesAll.length})`} icon={FileText} accent="purple">
        <FileGallery files={filesAll} emptyHint="لم يتم رفع ملفات بعد." />
      </Card>

      {/* Timeline (history) */}
      <Card title="السجل الزمني" icon={Activity}>
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

/* ════════════════════════════════════════════════════════════════════════
   Engineer Assignment Card (rule 5: dynamic dropdown filtered to role)
   ════════════════════════════════════════════════════════════════════════ */

const EngineerAssignmentCard: React.FC<{
  label: string;
  current?: UserProfile;
  user: UserProfile;
  project: ProjectRecord;
  engineers: UserProfile[];
  allowedRoles: RoleKey[];
  kind: 'DIAGNOSIS' | 'SUPERVISION';
  onAssign: (engId: string) => Promise<void>;
}> = ({ label, current, user, engineers, allowedRoles, onAssign }) => {
  const canAssign = allowedRoles.includes(user.role as RoleKey) || user.isAdmin;
  const [selected, setSelected] = useState<string>(current?.id || '');
  const [busy, setBusy] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">{label}</p>
      {current ? (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#4A1F66] text-white flex items-center justify-center text-sm font-bold">
            {current.fullName?.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold">{current.fullName}</p>
            <p className="text-[10px] text-gray-500">{ROLE_BY_KEY[current.role as RoleKey]?.membershipTitle || roleName(current.role)}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-3">لم يُسند بعد</p>
      )}
      {canAssign ? (
        <div className="flex gap-2">
          <Select className="flex-1" placeholder="اختر مهندساً..."
            options={engineers.map(e => ({ value: e.id, label: `${e.fullName} — ${ROLE_BY_KEY[e.role as RoleKey]?.membershipTitle}` }))}
            value={selected} onChange={e => setSelected(e.target.value)} />
          <button onClick={async () => {
            if (!selected) return;
            setBusy(true);
            try { await onAssign(selected); } finally { setBusy(false); }
          }} disabled={busy || !selected || selected === current?.id}
            className="px-3 py-2 rounded-lg bg-[#56B894] text-white text-xs font-bold hover:bg-[#3F9B7A] disabled:opacity-50 flex items-center gap-1">
            <Send className="w-3.5 h-3.5" /> {busy ? '...' : 'إسناد'}
          </button>
        </div>
      ) : (
        <p className="text-[10px] text-gray-400">يقوم بإسناد هذا المهندس: {allowedRoles.map(r => roleName(r)).join('، ')}.</p>
      )}
    </div>
  );
};
