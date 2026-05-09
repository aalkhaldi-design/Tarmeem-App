import React, { useMemo, useState } from 'react';
import {
  Building2, MapPin, FileText, Activity, ArrowLeft,
} from 'lucide-react';
import { Card, Pill, ProgressBar, SearchBar, EmptyState } from './ui';
import { FORM_BY_CODE, roleName } from '../lib/data';
import { FormCard, FormsApi, formAwaitsUser } from './Forms';
import type { ProjectRecord } from './forms/FormRenderers';
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

const PHASE_TONES: Record<ProjectRecord['phase'], 'gray' | 'amber' | 'blue' | 'purple' | 'green' | 'teal'> = {
  RESEARCH: 'blue',
  DIAGNOSIS: 'purple',
  EVACUATION: 'amber',
  TENDERING: 'amber',
  EXECUTION: 'teal',
  HANDOVER: 'green',
  CLOSED: 'gray',
};

interface MasterProjectListProps {
  user: UserProfile;
  api: FormsApi;
  projects: ProjectRecord[];
  users: UserProfile[];
  onOpenProject: (id: string) => void;
}

export const MasterProjectList: React.FC<MasterProjectListProps> = ({ projects, onOpenProject, api }) => {
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
      <Card title="قائمة المشاريع الرئيسية" icon={Building2} accent="gradient">
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
  onBack: () => void;
  onOpenForm: (id: string) => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, user, users, api, onBack, onOpenForm }) => {
  const projectForms = api.forms.filter(f => f.projectRefId === project.id);
  const filesAll = projectForms.flatMap(f => (f.files || []).map(file => ({ ...file, formCode: f.code })));
  const diagnosisEng = users.find(u => u.id === project.diagnosisEngineerId);
  const supervisingEng = users.find(u => u.id === project.supervisingEngineerId);

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
            <Pill tone={PHASE_TONES[project.phase]}>{PHASE_LABELS[project.phase]}</Pill>
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

