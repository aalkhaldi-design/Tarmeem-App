import React, { useMemo, useState } from 'react';
import {
  User as UserIcon, Mail, Phone, MapPin, Calendar, Activity, FileText,
  ArrowLeft, Save, ShieldCheck, Edit3,
} from 'lucide-react';
import { Card, Input, TextArea, Pill, ReadOnlyField, EmptyState } from './ui';
import { roleName, roleMembershipTitle, departmentName, regionLabel, ROLE_BY_KEY } from '../lib/data';
import { FormCard, FormsApi } from './Forms';
import type { UserProfile } from './Auth';

export const EmployeeProfile: React.FC<{
  profile: UserProfile;
  currentUser: UserProfile;
  api: FormsApi;
  users: UserProfile[];
  onBack: () => void;
  onOpenForm: (id: string) => void;
  saveProfile: (userId: string, patch: Partial<UserProfile>) => Promise<void>;
}> = ({ profile, currentUser, api, onBack, onOpenForm, saveProfile }) => {
  const isSelf = profile.id === currentUser.id;
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(profile.phone || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [busy, setBusy] = useState(false);

  const myCreated = useMemo(() => api.forms.filter(f => f.createdBy === profile.id), [api.forms, profile.id]);
  const myApproved = useMemo(() =>
    api.forms.filter(f => f.approvals.some(a => a.actorId === profile.id)),
  [api.forms, profile.id]);

  const def = ROLE_BY_KEY[profile.role as any];

  const save = async () => {
    setBusy(true);
    try { await saveProfile(profile.id, { phone, bio }); setEditing(false); }
    finally { setBusy(false); }
  };

  return (
    <div dir="rtl" className="space-y-4">
      <button onClick={onBack} className="text-xs font-bold text-[#4A1F66] dark:text-purple-300 hover:underline flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> العودة</button>

      <div className="rounded-2xl p-6 text-white shadow-lg bg-gradient-to-l from-[#4A1F66] via-[#6B3D87] to-[#56B894]">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold">
            {profile.fullName?.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.fullName}</h1>
            <p className="text-white/80 text-sm mt-0.5">{roleMembershipTitle(profile.role)}</p>
            <div className="flex items-center gap-4 mt-2 text-xs flex-wrap">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {profile.email}</span>
              {profile.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {profile.phone}</span>}
              {profile.region && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {regionLabel(profile.region)}</span>}
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> منذ {new Date(profile.registeredAt).toLocaleDateString('ar-SA')}</span>
            </div>
          </div>
          {isSelf && !editing && (
            <button onClick={() => setEditing(true)} className="bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
              <Edit3 className="w-4 h-4" /> تعديل
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="بيانات العضوية" icon={ShieldCheck} accent="purple" className="md:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ReadOnlyField label="الدور الرسمي" value={roleName(profile.role)} />
            <ReadOnlyField label="الإدارة" value={departmentName(profile.department)} />
            <ReadOnlyField label="حالة الحساب" value={profile.status === 'active' ? 'فعّال' : profile.status} />
            <ReadOnlyField label="مدير قسم" value={profile.isManager ? 'نعم' : 'لا'} />
          </div>
        </Card>
        <Card title="إحصاءات النشاط" icon={Activity} accent="teal">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-600 dark:text-slate-300">النماذج التي أنشأتها</span>
              <Pill tone="purple">{myCreated.length}</Pill>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-600 dark:text-slate-300">القرارات التي اعتمدتها</span>
              <Pill tone="teal">{myApproved.length}</Pill>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-600 dark:text-slate-300">معتمدة</span>
              <Pill tone="green">{myCreated.filter(f => f.status === 'approved' || f.status === 'completed').length}</Pill>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-600 dark:text-slate-300">مرفوضة</span>
              <Pill tone="red">{myCreated.filter(f => f.status === 'rejected').length}</Pill>
            </div>
          </div>
        </Card>
      </div>

      <Card title="السيرة والتواصل" icon={UserIcon}>
        {editing ? (
          <div className="space-y-3">
            <Input label="رقم الجوال" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
            <TextArea label="نبذة شخصية" rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="اكتب نبذة عن خبرتك وأدوارك في الجمعية..." />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-100 dark:bg-slate-700">إلغاء</button>
              <button onClick={save} disabled={busy} className="px-5 py-2 rounded-lg text-sm font-bold bg-[#4A1F66] text-white hover:bg-[#3A1652] transition flex items-center gap-1.5">
                <Save className="w-4 h-4" /> {busy ? 'جاري...' : 'حفظ'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <ReadOnlyField label="رقم الجوال" value={profile.phone || '—'} />
            <ReadOnlyField label="نبذة" value={profile.bio || 'لم تُضَف نبذة بعد.'} />
          </div>
        )}
      </Card>

      <Card title={`أحدث نماذجي (${myCreated.length})`} icon={FileText}>
        {myCreated.length === 0 ? (
          <EmptyState icon={FileText} title="لم يُنشِئ أي نموذج بعد" />
        ) : (
          <div className="space-y-2">
            {myCreated.slice(0, 8).map(f => <FormCard key={f.id} rec={f} onOpen={() => onOpenForm(f.id)} />)}
          </div>
        )}
      </Card>

      <Card title={`القرارات التي اعتمدتها (${myApproved.length})`} icon={ShieldCheck} accent="teal">
        {myApproved.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="لا توجد قرارات بعد" />
        ) : (
          <div className="space-y-2">
            {myApproved.slice(0, 8).map(f => <FormCard key={f.id} rec={f} onOpen={() => onOpenForm(f.id)} />)}
          </div>
        )}
      </Card>

      {profile.auditLog && profile.auditLog.length > 0 && (
        <Card title="سجل الحساب" icon={Calendar}>
          <ul className="space-y-2">
            {profile.auditLog.slice().reverse().slice(0, 10).map((e: any, idx: number) => (
              <li key={idx} className="text-xs flex items-start gap-2 border-b last:border-0 dark:border-slate-700 py-1.5">
                <Activity className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-gray-700 dark:text-slate-200">{e.action}</p>
                  <p className="text-[10px] text-gray-400">{new Date(e.at).toLocaleString('ar-SA')} — بواسطة {e.actor}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-[10px] text-center text-gray-400 dark:text-slate-500">{def?.nameEn}</p>
    </div>
  );
};
