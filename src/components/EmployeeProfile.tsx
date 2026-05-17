import React, { useMemo, useState } from 'react';
import { User as UserIcon, Mail, Shield, Building2, MapPin, Phone, Calendar, AtSign, CheckCircle2, Clock, Activity, Award, ArrowLeft } from 'lucide-react';
import { UserProfile } from './Auth';
import { roleName, departmentName } from '../lib/data';
import { Input } from './ui';
import { FormsApi } from './Forms';

export const EmployeeProfile: React.FC<{ profile: UserProfile; currentUser: UserProfile; api: FormsApi; users: UserProfile[]; onBack: () => void; onOpenForm: (id: string) => void; saveProfile?: (uid: string, patch: Partial<UserProfile>) => Promise<void>; }> = ({ profile, currentUser, api, users, onBack, onOpenForm, saveProfile }) => {
  const isMe = currentUser.id === profile.id;
  const canEdit = isMe || currentUser.isAdmin;

  // 🚨 FIXED: Stripped out dangerous `(profile as any)` casts by relying on updated UserProfile strict types
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({ fullName: profile.fullName, mobile: profile.mobile || '', ext: profile.ext || '' });

  const userForms = useMemo(() => {
     let completed = 0; let pending = 0; let late = 0;
     api.forms.forEach(f => {
        const myApproval = f.approvals.find(a => a.actorId === profile.id);
        if (myApproval) completed++;
        if (myApproval && (myApproval as any).isLate) late++;
        if (f.status === 'pending' && f.approvalChain[f.approvalIndex] === profile.role) {
           if (!f.assigneeId || f.assigneeId === profile.id) pending++;
        }
     });
     return { completed, pending, late };
  }, [api.forms, profile]);

  const handleSave = async () => {
    if (saveProfile) {
      await saveProfile(profile.id, { fullName: draft.fullName, ...(draft.mobile && { mobile: draft.mobile }), ...(draft.ext && { ext: draft.ext }) });
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10" dir="rtl">
      <button onClick={onBack} className="text-xs font-bold text-[#43bba1] hover:text-white transition flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> العودة</button>

      <div className="bg-[#0c0c0c] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl relative">
        <div className="h-32 bg-gradient-to-l from-[#4A1F66] to-[#2c1545] relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        </div>

        <div className="px-6 md:px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-12 mb-6">
            <div className="w-24 h-24 rounded-2xl bg-[#050505] border-4 border-[#0c0c0c] flex items-center justify-center shadow-xl">
              <UserIcon className="w-12 h-12 text-[#a871f7]" />
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3">
                 <h1 className="text-2xl font-black text-white">{profile.fullName}</h1>
                 {profile.isAdmin && <span className="bg-amber-500/20 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">مدير نظام</span>}
              </div>
              <p className="text-sm text-[#43bba1] font-bold flex items-center gap-1 mt-1"><AtSign className="w-3.5 h-3.5"/>{profile.username?.replace('@', '')}</p>
            </div>
            {canEdit && !isEditing && (
              <button onClick={() => setIsEditing(true)} className="bg-[#111] hover:bg-[#1a1a1a] text-white border border-gray-800 px-4 py-2 rounded-lg text-sm font-bold transition">تعديل الملف</button>
            )}
          </div>

          {isEditing ? (
            <div className="bg-[#111] p-5 rounded-xl border border-gray-800 space-y-4">
               <h3 className="font-bold text-white mb-2">تحديث البيانات</h3>
               <Input label="الاسم الكامل" value={draft.fullName} onChange={(e:any) => setDraft({...draft, fullName: e.target.value})} />
               <div className="grid grid-cols-2 gap-4">
                 <Input label="رقم الجوال" value={draft.mobile} onChange={(e:any) => setDraft({...draft, mobile: e.target.value})} />
                 <Input label="التحويلة الداخلية" value={draft.ext} onChange={(e:any) => setDraft({...draft, ext: e.target.value})} />
               </div>
               <div className="flex gap-2 pt-2">
                 <button onClick={handleSave} className="bg-[#43bba1] text-black px-6 py-2 rounded-lg font-bold text-sm">حفظ</button>
                 <button onClick={() => setIsEditing(false)} className="bg-gray-800 text-white px-6 py-2 rounded-lg font-bold text-sm">إلغاء</button>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-300 text-sm bg-[#111] p-3 rounded-lg border border-gray-800"><Building2 className="w-5 h-5 text-gray-500" /> <span className="font-bold w-20">القسم:</span> {departmentName(profile.department)}</div>
                <div className="flex items-center gap-3 text-gray-300 text-sm bg-[#111] p-3 rounded-lg border border-gray-800"><Shield className="w-5 h-5 text-gray-500" /> <span className="font-bold w-20">الصلاحية:</span> {roleName(profile.role)}</div>
                <div className="flex items-center gap-3 text-gray-300 text-sm bg-[#111] p-3 rounded-lg border border-gray-800"><Mail className="w-5 h-5 text-gray-500" /> <span className="font-bold w-20">البريد:</span> <span className="font-mono text-xs">{profile.email}</span></div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-300 text-sm bg-[#111] p-3 rounded-lg border border-gray-800"><Phone className="w-5 h-5 text-gray-500" /> <span className="font-bold w-20">الجوال:</span> {profile.mobile || 'غير مسجل'}</div>
                <div className="flex items-center gap-3 text-gray-300 text-sm bg-[#111] p-3 rounded-lg border border-gray-800"><Phone className="w-5 h-5 text-gray-500" /> <span className="font-bold w-20">تحويلة:</span> {profile.ext || 'غير مسجل'}</div>
                <div className="flex items-center gap-3 text-gray-300 text-sm bg-[#111] p-3 rounded-lg border border-gray-800"><Calendar className="w-5 h-5 text-gray-500" /> <span className="font-bold w-20">انضمام:</span> {new Date(profile.createdAt).toLocaleDateString('ar-SA')}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#05110e] border border-[#43bba1]/30 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
           <div className="w-12 h-12 bg-[#43bba1]/20 rounded-full flex items-center justify-center mb-3"><CheckCircle2 className="w-6 h-6 text-[#43bba1]" /></div>
           <p className="text-3xl font-black text-[#43bba1]">{userForms.completed}</p>
           <p className="text-xs text-gray-400 font-bold mt-1">مهام ونماذج منجزة</p>
        </div>
        <div className="bg-amber-900/10 border border-amber-500/30 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
           <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-3"><Clock className="w-6 h-6 text-amber-500" /></div>
           <p className="text-3xl font-black text-amber-500">{userForms.pending}</p>
           <p className="text-xs text-gray-400 font-bold mt-1">مهام معلقة بانتظاره</p>
        </div>
        <div className="bg-red-900/10 border border-red-500/30 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
           <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-3"><Activity className="w-6 h-6 text-red-500" /></div>
           <p className="text-3xl font-black text-red-500">{userForms.late}</p>
           <p className="text-xs text-gray-400 font-bold mt-1">تجاوز للوقت (Late)</p>
        </div>
      </div>

    </div>
  );
};
