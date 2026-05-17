import React, { useMemo } from 'react';
// Fix #3 — Building2 is used in the stat tile below; add it to the lucide import.
import { LayoutDashboard, Users, UserCheck, AlertTriangle, ArrowLeft, LogOut, CheckCircle2, ShieldCheck, Activity, Award, Trophy, Building2 } from 'lucide-react';
import { UserProfile } from './Auth';
import { FormsApi } from './Forms';
import { DepartmentKey, DEPARTMENTS, roleName } from '../lib/data';
import { ProjectRecord } from './forms/FormRenderers';
import { Card, Pill } from './ui';

export const DashboardHome: React.FC<{ user: UserProfile; api: FormsApi; projects: ProjectRecord[]; goToPortal: (dept: string) => void; goToProjects: () => void; goToProject: (id: string) => void; allowedDepts: DepartmentKey[]; }> = ({ user, api, projects, goToPortal, goToProjects, goToProject, allowedDepts }) => {
  const pendingForms = useMemo(() => api.forms.filter(f => f.status === 'pending'), [api.forms]);
  const activeProjects = useMemo(() => projects.filter(p => p.phase !== 'CLOSED'), [projects]);
  const myPending = useMemo(() => {
      return pendingForms.filter(f => {
         const nextRole = f.approvalChain[f.approvalIndex];
         return nextRole === user.role && (!f.assigneeId || f.assigneeId === user.id);
      });
  }, [pendingForms, user]);

  const globalActivities = useMemo(() => {
     let activities: any[] = [];
     api.forms.forEach(f => {
        f.approvals.forEach(a => {
           activities.push({ id: `${f.id}_${a.at}`, actorName: a.actorName, action: a.decision === 'approved' ? 'اعتمد' : 'تفاعل مع', formTitle: f.title, projectRef: f.projectRefId, at: new Date(a.at), role: a.role });
        });
     });
     return activities.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 15);
  }, [api.forms]);

  const leaderboard = useMemo(() => {
      const counts: Record<string, number> = {};
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      api.forms.forEach(f => {
         f.approvals.forEach(a => {
            if (new Date(a.at) >= sevenDaysAgo && a.actorName && a.actorName !== 'النظام') {
               counts[a.actorName] = (counts[a.actorName] || 0) + 1;
            }
         });
      });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [api.forms]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in" dir="rtl">
      <div className="bg-[#0c0c0c] border border-[#2D124C] rounded-3xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#4A1F66] rounded-full blur-[100px] opacity-20" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white mb-2">مرحباً بك، {user.fullName.split(' ')[0]} 👋</h1>
          <p className="text-[#a871f7] text-sm font-bold flex items-center gap-2">
             <ShieldCheck className="w-4 h-4" /> {roleName(user.role)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
             <div onClick={goToProjects} className="bg-[#111] border border-gray-800 p-4 rounded-2xl cursor-pointer hover:border-[#4A1F66] transition group">
               <Building2 className="w-6 h-6 text-[#a871f7] mb-2 group-hover:scale-110 transition-transform" />
               <p className="text-3xl font-black text-white">{activeProjects.length}</p>
               <p className="text-[10px] text-gray-500 font-bold mt-1">مشاريع نشطة</p>
             </div>
             <div className="bg-[#05110e] border border-[#43bba1]/30 p-4 rounded-2xl">
               <CheckCircle2 className="w-6 h-6 text-[#43bba1] mb-2" />
               <p className="text-3xl font-black text-[#43bba1]">{myPending.length}</p>
               <p className="text-[10px] text-[#43bba1]/70 font-bold mt-1">مهام بانتظارك</p>
             </div>
             <div className="bg-[#111] border border-gray-800 p-4 rounded-2xl">
               <Activity className="w-6 h-6 text-blue-500 mb-2" />
               <p className="text-3xl font-black text-white">{pendingForms.length}</p>
               <p className="text-[10px] text-gray-500 font-bold mt-1">إجمالي المهام الجارية</p>
             </div>
             <div className="bg-[#111] border border-gray-800 p-4 rounded-2xl">
               <Award className="w-6 h-6 text-amber-500 mb-2" />
               <p className="text-3xl font-black text-white">{projects.filter(p => p.phase === 'HANDOVER' || p.phase === 'CLOSED').length}</p>
               <p className="text-[10px] text-gray-500 font-bold mt-1">مشاريع منجزة</p>
             </div>
           </div>

           <Card title="بوابات الأقسام (مشاركة المعرفة)" icon={LayoutDashboard}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                 {DEPARTMENTS.sort((a,b) => (a.key === user.department ? -1 : b.key === user.department ? 1 : 0)).map(dept => {
                    const isMyDept = dept.key === user.department;
                    const hasAccess = allowedDepts.includes(dept.key);
                    return (
                      <button key={dept.key} onClick={() => goToPortal(dept.key)} className={`p-4 rounded-xl text-right transition-all border ${isMyDept ? 'bg-gradient-to-l from-[#1a0f2e] to-[#0c0c0c] border-[#3c1d5d] shadow-[0_0_15px_rgba(74,31,102,0.3)]' : 'bg-[#0a0a0a] border-gray-800 hover:border-gray-600'}`}>
                         <h3 className={`font-bold text-sm mb-1 ${isMyDept ? 'text-[#a871f7]' : 'text-gray-300'}`}>{dept.shortName}</h3>
                         <p className="text-[9px] text-gray-500 leading-tight line-clamp-2">{dept.description}</p>
                      </button>
                    );
                 })}
              </div>
           </Card>
        </div>

        <div className="space-y-6">
           <Card title="نجوم الأسبوع (إنجاز المهام)" icon={Trophy}>
              <div className="space-y-3">
                 {leaderboard.length === 0 ? <p className="text-xs text-gray-500">لا يوجد نشاط هذا الأسبوع</p> : leaderboard.map(([name, count], i) => (
                    <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a0a] border border-gray-800">
                       <div className="flex items-center gap-2">
                         <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' : i === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/50' : i === 2 ? 'bg-amber-800/30 text-amber-700 border border-amber-800/50' : 'bg-[#111] text-gray-500'}`}>{i + 1}</span>
                         <span className="text-xs font-bold text-gray-200">{name.split(' ')[0]}</span>
                       </div>
                       <span className="text-[10px] text-[#43bba1] font-bold">{count} مهمة</span>
                    </div>
                 ))}
              </div>
           </Card>

           <div className="bg-[#050505] border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col h-[400px]">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-blue-500"/> النشاطات المباشرة</h3>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                 {globalActivities.length === 0 ? <p className="text-xs text-gray-500 text-center mt-10">لا يوجد نشاط حديث</p> : globalActivities.map((act, i) => (
                    <div key={act.id} className="relative pl-4 border-r-2 border-gray-800 last:border-0 pb-4 last:pb-0">
                       <div className="absolute -right-[5px] top-0 w-2 h-2 rounded-full bg-[#4A1F66]"></div>
                       <p className="text-[11px] text-gray-300 leading-relaxed"><span className="font-bold text-[#a871f7]">{act.actorName}</span> {act.action} <span className="font-bold text-white">{act.formTitle}</span></p>
                       <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-gray-500">{roleName(act.role)}</span>
                          <span className="text-[9px] text-gray-500">{act.at.toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}</span>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export const PendingAccountScreen: React.FC<{ email: string | null; onSignOut: () => void; }> = ({ email, onSignOut }) => (
  <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4" dir="rtl"><div className="w-full max-w-md bg-[#0a0a0a] rounded-3xl shadow-2xl p-8 text-center border border-gray-800"><div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6"><UserCheck className="w-10 h-10 text-amber-500" /></div><h1 className="text-2xl font-black text-white mb-3">حسابك قيد المراجعة</h1><p className="text-gray-400 text-sm mb-6 leading-relaxed">أهلاً بك. تم تسجيل حسابك بنجاح ({email}). يرجى الانتظار حتى يقوم مدير النظام بتفعيل حسابك وتعيين صلاحياتك.</p><button onClick={onSignOut} className="w-full bg-[#111] hover:bg-[#1a1a1a] text-white py-3 rounded-xl font-bold text-sm transition-colors border border-gray-800 flex items-center justify-center gap-2"><LogOut className="w-4 h-4" /> تسجيل الخروج</button></div></div>
);

export const DeactivatedAccountScreen: React.FC<{ onSignOut: () => void; }> = ({ onSignOut }) => (
  <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4" dir="rtl"><div className="w-full max-w-md bg-[#0a0a0a] rounded-3xl shadow-2xl p-8 text-center border border-red-900/30"><div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-10 h-10 text-red-500" /></div><h1 className="text-2xl font-black text-red-500 mb-3">الحساب موقوف</h1><p className="text-gray-400 text-sm mb-6 leading-relaxed">عذراً، تم إيقاف حسابك من قبل الإدارة. يرجى مراجعة مدير النظام لمزيد من التفاصيل.</p><button onClick={onSignOut} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 rounded-xl font-bold text-sm transition-colors border border-red-500/20 flex items-center justify-center gap-2"><LogOut className="w-4 h-4" /> تسجيل الخروج</button></div></div>
);
