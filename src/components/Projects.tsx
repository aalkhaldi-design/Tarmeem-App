import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Filter, Plus, MapPin, Activity, CheckCircle2, Lock,
  FileText, Users, ChevronLeft, Calendar, Building2, Briefcase
} from 'lucide-react';
import { Card, Pill, ProgressBar } from './ui';
import { PHASES, FORMS, FormCode } from '../lib/data';
import type { UserProfile } from './Auth';
import { formAwaitsUser } from './Forms';

interface ProjectsProps {
  user: UserProfile;
  projects: any[];
  forms: any[];
  context?: any;
  onOpenForm: (rec: any) => void;
  onCreateForm?: (code: FormCode) => void;
}

export const Projects: React.FC<ProjectsProps> = ({ user, projects, forms, context, onOpenForm, onCreateForm }) => {
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (selectedProject) {
    return (
      <ProjectDetails
        project={selectedProject}
        forms={forms.filter(f => f.projectRefId === selectedProject.id)}
        user={user}
        context={context}
        onBack={() => setSelectedProject(null)}
        onOpenForm={onOpenForm}
      />
    );
  }

  const filtered = projects.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const name = (p.beneficiaryName || '').toLowerCase();
    const pId = (p.projectId || '').toLowerCase();
    const cRef = (p.caseRef || '').toLowerCase();
    return name.includes(term) || pId.includes(term) || cRef.includes(term);
  });

  return (
    <div className="space-y-6 animate-in fade-in" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Building2 className="text-[#43bba1]" /> إدارة المشاريع
          </h1>
          <p className="text-gray-400 text-sm mt-1">تتبع الحالات، إنجاز المراحل، واعتماد النماذج.</p>
        </div>

        {['SOCIAL_RESEARCHER', 'RESEARCH_MANAGER', 'ADMIN'].includes(user.role) && (
          <button
            onClick={() => onCreateForm?.('F-02')}
            className="bg-gradient-to-r from-[#4A1F66] to-[#6B3D87] hover:from-[#502b79] text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 transition"
          >
            <Plus size={18} /> إنشاء مشروع جديد (F-02)
          </button>
        )}
      </div>

      <div className="bg-[#0c0c0c] border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="ابحث برقم المشروع، اسم المستفيد، أو رقم الحالة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111] border border-gray-800 rounded-lg pr-10 pl-4 py-2.5 text-white focus:border-[#43bba1] outline-none transition"
          />
        </div>
        <button className="bg-[#111] border border-gray-800 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-[#1a1a1a] transition">
          <Filter size={18} /> تصفية
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(proj => (
          <div
            key={proj.id}
            onClick={() => setSelectedProject(proj)}
            className="bg-[#050505] border border-gray-800 rounded-xl p-5 hover:border-[#43bba1]/50 cursor-pointer transition group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-[#4A1F66] to-[#43bba1]" />
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg text-white group-hover:text-[#43bba1] transition">{proj.beneficiaryName}</h3>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MapPin size={12} /> {proj.city} {proj.neighborhood ? `- ${proj.neighborhood}` : ''}</p>
              </div>
              <Pill>{proj.projectId}</Pill>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4 bg-[#111] p-3 rounded-lg border border-gray-800">
               <div className="text-xs"><span className="text-gray-500 block mb-1">المرحلة الحالية:</span> <span className="font-bold text-[#a871f7]">{proj.phase || 'RESEARCH'}</span></div>
               <div className="text-xs"><span className="text-gray-500 block mb-1">رقم الحالة:</span> <span className="font-bold text-white">{proj.caseRef || '-'}</span></div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-400">نسبة الإنجاز</span>
                <span className="text-[#43bba1]">{proj.progressPct || 0}%</span>
              </div>
              <ProgressBar progress={proj.progressPct || 0} />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
           <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl">
              لا توجد مشاريع مطابقة للبحث.
           </div>
        )}
      </div>
    </div>
  );
};

const ProjectDetails: React.FC<{ project: any, forms: any[], user: UserProfile, context?: any, onBack: () => void, onOpenForm: (rec: any) => void }> = ({ project, forms, user, context, onBack, onOpenForm }) => {
  const [activePhase, setActivePhase] = useState(0);

  // 🚨 FIXED: UX Amnesia Bug - Map project phase to the correct tab automatically
  useEffect(() => {
    const phaseMap: Record<string, number> = {
      'RESEARCH': 0,
      'DIAGNOSIS': 1,
      'EVACUATION': 1, // Groups into Engineering
      'TENDERING': 2,
      'EXECUTION': 3,
      'HANDOVER': 4,
      'CLOSED': 4
    };
    if (project?.phase && phaseMap[project.phase] !== undefined) {
      setActivePhase(phaseMap[project.phase]);
    }
  }, [project?.phase]);

  const currentPhaseData = PHASES[activePhase];

  // Memoize phase forms extraction to prevent expensive array lookups on every render
  const phaseForms = useMemo(() => {
    return currentPhaseData.forms.map(code => {
      const fDef = FORMS.find(f => f.code === code);
      const fRec = forms.find(f => f.code === code);
      return { code, def: fDef, rec: fRec };
    });
  }, [currentPhaseData, forms]);

  return (
    <div className="space-y-6 animate-in slide-in-from-left" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-[#111] hover:bg-[#1a1a1a] border border-gray-800 rounded-lg text-white transition"><ChevronLeft size={20} /></button>
        <div>
          <h1 className="text-2xl font-black text-white">{project.beneficiaryName}</h1>
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
            <Pill>{project.projectId}</Pill>
            <span>{project.city}</span>
          </p>
        </div>
      </div>

      {/* Project Meta Card */}
      <Card>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><span className="text-xs text-gray-500 block">رقم الحالة</span><span className="font-bold text-white text-sm">{project.caseRef || 'غير محدد'}</span></div>
            <div><span className="text-xs text-gray-500 block">تاريخ الإنشاء</span><span className="font-bold text-white text-sm">{new Date(project.createdAt).toLocaleDateString('ar-SA')}</span></div>
            <div><span className="text-xs text-gray-500 block">مهندس التشخيص</span><span className="font-bold text-[#43bba1] text-sm">{project.diagnosisEngineerId ? 'تم التعيين' : 'بانتظار التعيين'}</span></div>
            <div><span className="text-xs text-gray-500 block">مهندس التنفيذ</span><span className="font-bold text-[#a871f7] text-sm">{project.supervisingEngineerId ? 'تم التعيين' : 'بانتظار التعيين'}</span></div>
         </div>
      </Card>

      {/* Phase Timeline Tabs */}
      <div className="flex overflow-x-auto bg-[#0a0a0a] border border-gray-800 rounded-xl p-1 gap-1">
        {PHASES.map((phase, idx) => (
          <button
            key={idx}
            onClick={() => setActivePhase(idx)}
            className={`flex-1 min-w-[140px] py-3 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activePhase === idx
                ? 'bg-[#1a0f2e] text-[#a871f7] border border-[#3c1d5d] shadow-sm'
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activePhase === idx ? 'bg-[#a871f7] text-black' : 'bg-gray-800 text-gray-400'}`}>
              {idx + 1}
            </span>
            {phase.name}
          </button>
        ))}
      </div>

      {/* Forms List for Active Phase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {phaseForms.map(({ code, def, rec }) => {
          if (!def) return null;
          const status = rec?.status || 'locked';

          // 🚨 FIXED: Unified RBAC Engine
          // By spoofing 'pending' status, we test the exact unified context constraints (Helpers, Managers, Assigned Engineers)
          // without being artificially blocked by form completion state.
          const hasAccess = rec ? formAwaitsUser({ ...rec, status: 'pending' } as any, user, project) : false;

          const isPending = status === 'pending';
          const isDraft = status === 'draft';
          const isApproved = status === 'approved';

          let statusColor = 'bg-gray-900 border-gray-800 text-gray-500';
          if (isApproved) statusColor = 'bg-[#05110e] border-[#43bba1]/30 text-[#43bba1]';
          else if (isPending) statusColor = 'bg-amber-900/20 border-amber-500/30 text-amber-500';
          else if (isDraft) statusColor = 'bg-[#1a0f2e] border-[#3c1d5d] text-[#a871f7]';

          return (
            <div key={code} className={`p-5 rounded-xl border transition-all ${statusColor} ${hasAccess && (isDraft || isPending || isApproved) ? 'cursor-pointer hover:shadow-lg hover:scale-[1.01]' : 'opacity-60 cursor-not-allowed'}`}
                 onClick={() => hasAccess && rec && onOpenForm(rec)}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isApproved ? 'bg-[#43bba1]/10' : isPending ? 'bg-amber-500/10' : 'bg-gray-800'}`}>
                    {isApproved ? <CheckCircle2 size={20} /> : isPending ? <Activity size={20} /> : <FileText size={20} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{def.title}</h4>
                    <span className="text-xs opacity-70">{code} • {def.slaDays} أيام</span>
                  </div>
                </div>
                {!hasAccess ? <Lock size={16} className="text-gray-600" /> : null}
              </div>

              <div className="mt-4 pt-3 border-t border-current/10 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">{status}</span>
                {isPending && hasAccess && (
                  <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold animate-pulse">
                    إجراء مطلوب
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
