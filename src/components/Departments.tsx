import React, { useState } from 'react';
import { Home, Users, Briefcase, FileText, CheckCircle2, Bell, Info, X } from 'lucide-react';
import { DepartmentKey, DEPARTMENTS, FormCode, FORMS, roleName } from '../lib/data';
import { UserProfile } from './Auth';
import { FormsApi, formAwaitsUser, FormCard } from './Forms';
import { Pill } from './ui';

export type ActivePortal = DepartmentKey | 'HOME' | 'ADMIN' | 'PROJECTS_LIST' | 'PROFILE';

export const PortalSidebar: React.FC<{ active: ActivePortal; onChange: (p: ActivePortal) => void; user: UserProfile; api: FormsApi; isAdmin: boolean; allowedDepts: DepartmentKey[]; }> = ({ active, onChange, user, api, isAdmin, allowedDepts }) => {
  // Fix #7 — guard `bridgesTo` in case a snapshot record lacks the field.
  const pendingCountFor = (deptKey: string) => {
    return api.forms.filter(f => f.status === 'pending' && (f.ownerDept === deptKey || (f.bridgesTo || []).includes(deptKey as any)) && formAwaitsUser(f, user)).length;
  };

  const orderedDepts = [...DEPARTMENTS].sort((a,b) => (a.key === user.department ? -1 : b.key === user.department ? 1 : 0));

  return (
    <aside className="w-64 bg-[#050505] border-l border-gray-800 hidden md:flex flex-col h-[calc(100vh-64px)] sticky top-16 shadow-xl" dir="rtl">
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        <button onClick={() => onChange('HOME')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${active === 'HOME' ? 'bg-[#4A1F66] text-white shadow-md' : 'text-gray-400 hover:bg-[#111] hover:text-white'}`}><Home className="w-5 h-5" /> الرئيسية</button>
        <button onClick={() => onChange('PROJECTS_LIST')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${active === 'PROJECTS_LIST' ? 'bg-[#4A1F66] text-white shadow-md' : 'text-gray-400 hover:bg-[#111] hover:text-white'}`}><Briefcase className="w-5 h-5" /> قائمة المشاريع</button>
        {isAdmin && <button onClick={() => onChange('ADMIN')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${active === 'ADMIN' ? 'bg-[#4A1F66] text-white shadow-md' : 'text-gray-400 hover:bg-[#111] hover:text-white'}`}><Users className="w-5 h-5" /> إدارة المستخدمين</button>}

        <div className="pt-4 pb-2"><p className="text-[10px] font-black text-gray-600 uppercase tracking-wider px-4">مراكز الإدارات</p></div>

        {orderedDepts.map(d => {
          const isAllowed = allowedDepts.includes(d.key);
          const pCount = pendingCountFor(d.key);
          const isMyDept = d.key === user.department;

          return (
            <button key={d.key} onClick={() => onChange(d.key)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-bold text-sm ${active === d.key ? 'bg-gradient-to-l from-[#1a0f2e] to-[#0c0c0c] text-[#a871f7] border border-[#3c1d5d]' : 'text-gray-400 hover:bg-[#111] hover:text-white border border-transparent'}`}>
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${isMyDept ? 'bg-[#43bba1]' : 'bg-transparent'}`}></span>
                {d.shortName}
              </div>
              {pCount > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pCount}</span>}
            </button>
          );
        })}
      </div>
    </aside>
  );
};

export const PortalMobileNav: React.FC<{ active: ActivePortal; onChange: (p: ActivePortal) => void; isAdmin: boolean; allowedDepts: DepartmentKey[]; }> = ({ active, onChange, isAdmin }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-[#050505] border-t border-gray-800 md:hidden flex justify-around p-2 z-40 pb-safe shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
      <button onClick={() => onChange('HOME')} className={`p-2 flex flex-col items-center gap-1 rounded-lg transition-colors ${active === 'HOME' ? 'text-[#a871f7] bg-[#1a0f2e]' : 'text-gray-500 hover:text-white'}`}><Home className="w-5 h-5" /><span className="text-[9px] font-bold">الرئيسية</span></button>
      <button onClick={() => onChange('PROJECTS_LIST')} className={`p-2 flex flex-col items-center gap-1 rounded-lg transition-colors ${active === 'PROJECTS_LIST' ? 'text-[#a871f7] bg-[#1a0f2e]' : 'text-gray-500 hover:text-white'}`}><Briefcase className="w-5 h-5" /><span className="text-[9px] font-bold">المشاريع</span></button>
      {isAdmin && <button onClick={() => onChange('ADMIN')} className={`p-2 flex flex-col items-center gap-1 rounded-lg transition-colors ${active === 'ADMIN' ? 'text-[#a871f7] bg-[#1a0f2e]' : 'text-gray-500 hover:text-white'}`}><Users className="w-5 h-5" /><span className="text-[9px] font-bold">المستخدمين</span></button>}
    </div>
  );
};

const DepartmentPortalTemplate: React.FC<{ deptKey: DepartmentKey; user: UserProfile; api: FormsApi; onOpenForm: (id: string) => void; onCreateForm?: (code?: FormCode) => void; }> = ({ deptKey, user, api, onOpenForm }) => {
  const deptDef = DEPARTMENTS.find(d => d.key === deptKey)!;
  const [tab, setTab] = useState<'myQueue' | 'deptAlerts' | 'sops'>('myQueue');
  const [sopModal, setSopModal] = useState<string | null>(null);

  // Fix #7 — guard `bridgesTo` everywhere it's read on the record.
  const myQueue = api.forms.filter(f => (f.ownerDept === deptKey || (f.bridgesTo || []).includes(deptKey)) && formAwaitsUser(f, user));
  const deptAlerts = api.forms.filter(f => f.status === 'pending' && (f.ownerDept === deptKey || (f.bridgesTo || []).includes(deptKey)));
  const myFormsDef = FORMS.filter(f => f.ownerDept === deptKey || (f.bridgesTo || []).includes(deptKey));

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none" style={{ backgroundColor: deptDef.color }} />
        <div className="relative z-10">
           <h1 className="text-2xl font-black text-white mb-2">{deptDef.name}</h1>
           <p className="text-sm text-gray-400">{deptDef.description}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row bg-[#050505] p-1.5 rounded-xl border border-gray-800 shadow-md gap-1">
         <button onClick={() => setTab('myQueue')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 ${tab === 'myQueue' ? 'bg-[#4A1F66] text-white shadow' : 'text-gray-500 hover:text-white hover:bg-[#111]'}`}>
            <CheckCircle2 size={18}/> مهامي ({myQueue.length})
         </button>
         <button onClick={() => setTab('deptAlerts')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 ${tab === 'deptAlerts' ? 'bg-[#4A1F66] text-white shadow' : 'text-gray-500 hover:text-white hover:bg-[#111]'}`}>
            <Bell size={18}/> تنبيهات القسم ({deptAlerts.length})
         </button>
         <button onClick={() => setTab('sops')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 ${tab === 'sops' ? 'bg-[#4A1F66] text-white shadow' : 'text-gray-500 hover:text-white hover:bg-[#111]'}`}>
            <FileText size={18}/> نماذج القسم (SOP)
         </button>
      </div>

      <div className="min-h-[400px]">
        {tab === 'myQueue' && (
           <div className="space-y-3">
             {myQueue.length === 0 ? <div className="text-center py-20 text-gray-500"><CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20"/>لا توجد مهام بانتظارك حالياً في هذا القسم.</div> : myQueue.map(f => <FormCard key={f.id} rec={f} onOpen={() => onOpenForm(f.id)} highlight />)}
           </div>
        )}

        {tab === 'deptAlerts' && (
           <div className="space-y-3">
             <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl text-xs text-blue-300 leading-relaxed mb-4">هذه القائمة تعرض جميع المهام النشطة المتعلقة بالقسم لغرض الاطلاع. لا يمكنك تعديل أو اعتماد المهمة إلا إذا كانت مطابقة لصلاحيتك في "مهامي". النقر على المهمة سيأخذك للنموذج المخصص.</div>
             {deptAlerts.length === 0 ? <div className="text-center py-20 text-gray-500"><Bell className="w-12 h-12 mx-auto mb-3 opacity-20"/>القسم خالي من التنبيهات والمهام المعلقة.</div> : deptAlerts.map(f => <FormCard key={f.id} rec={f} onOpen={() => onOpenForm(f.id)} />)}
           </div>
        )}

        {tab === 'sops' && (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
             {myFormsDef.map(f => (
               <button key={f.code} onClick={() => setSopModal(f.code)} className="text-right bg-[#0a0a0a] border border-gray-800 rounded-xl p-5 hover:border-[#a871f7] hover:shadow-[0_0_20px_rgba(168,113,247,0.15)] transition group">
                 <div className="flex items-center gap-2 mb-3">
                    <span className="bg-[#111] text-[#a871f7] font-bold text-[10px] px-2 py-1 rounded border border-gray-800">{f.code}</span>
                    <h3 className="font-bold text-gray-200 group-hover:text-white">{f.title}</h3>
                 </div>
                 <p className="text-xs text-gray-500 line-clamp-2">{f.description}</p>
                 <div className="mt-4 pt-3 border-t border-gray-800 flex items-center text-[10px] text-[#43bba1] font-bold gap-1"><Info size={12}/> عرض الدليل الإجرائي</div>
               </button>
             ))}
           </div>
        )}
      </div>

      {sopModal && (() => {
         const def = FORMS.find(f => f.code === sopModal)!;
         return (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
             <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
                <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#111]">
                   <h2 className="text-lg font-black text-white flex items-center gap-2"><FileText className="text-[#a871f7]"/> دليل إجراءات: {def.title}</h2>
                   <button onClick={() => setSopModal(null)} className="text-gray-500 hover:text-white p-1"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                   <div><h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">الهدف من النموذج</h4><p className="text-sm text-gray-200 leading-relaxed bg-[#111] p-4 rounded-xl border border-gray-800">{def.description}</p></div>
                   <div className="grid grid-cols-2 gap-4">
                      <div><h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">منشئ النموذج</h4><div className="flex flex-wrap gap-2">{def.originRoles.map(r => <Pill key={r} tone="blue">{roleName(r)}</Pill>)}</div></div>
                      <div><h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">المدة الزمنية (SLA)</h4><Pill tone="amber">{def.slaDays ? `خلال ${def.slaDays} أيام` : 'غير محدد'}</Pill></div>
                   </div>
                   <div>
                      <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase">سلسلة الاعتماد والمسار (Workflow)</h4>
                      <div className="bg-[#111] p-4 rounded-xl border border-gray-800 space-y-3">
                         {def.approvalChain.map((r, i) => (
                           <div key={i} className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-[#2D124C] text-[#a871f7] font-bold text-xs flex items-center justify-center border border-[#502b79]">{i+1}</span>
                              <span className="text-sm text-gray-300 font-bold">{roleName(r)}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
           </div>
         );
      })()}
    </div>
  );
};

export const DEPT_PORTALS: Record<DepartmentKey, React.FC<any>> = DEPARTMENTS.reduce((acc, dept) => {
  acc[dept.key] = (props: any) => <DepartmentPortalTemplate deptKey={dept.key} {...props} />;
  return acc;
}, {} as Record<DepartmentKey, React.FC<any>>);
