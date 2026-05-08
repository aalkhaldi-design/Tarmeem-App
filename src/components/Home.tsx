import React, { useMemo } from 'react';
import {
  Home as HomeIcon, Activity, Inbox, FileText, ArrowLeft, CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  DEPARTMENTS, DEPT_BY_KEY, DepartmentKey, RoleKey, roleName, departmentName,
  regionLabel, FORMS, FORM_STATUS_LABELS, FORM_STATUS_COLORS,
} from '../lib/data';
import { Card, TarmeemLogo } from './ui';
import { FormsApi, formAwaitsRole } from './Forms';
import type { UserProfile } from './Auth';

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const formatArabicDate = () => {
  const now = new Date();
  return `${ARABIC_DAYS[now.getDay()]} ${now.getDate()} ${ARABIC_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
};

interface HomeProps {
  user: UserProfile;
  api: FormsApi;
  goToPortal: (dept: DepartmentKey | 'EXEC_HUB') => void;
  allowedDepts: DepartmentKey[];
}

export const DashboardHome: React.FC<HomeProps> = ({ user, api, goToPortal, allowedDepts }) => {
  const myRole = user.role as RoleKey;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور';

  const inbox = useMemo(() => api.forms.filter(f => formAwaitsRole(f, myRole)), [api.forms, myRole]);
  const myCreated = useMemo(() => api.forms.filter(f => f.createdBy === user.id), [api.forms, user.id]);

  const dept = DEPT_BY_KEY[user.department as DepartmentKey];

  return (
    <div dir="rtl" className="space-y-6">
      {/* ترحيب */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-[#4A1F66] via-[#6B3D87] to-[#56B894] p-6 md:p-8 text-white shadow-lg">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-1/4 translate-y-1/4" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <HomeIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{greeting}، {user.fullName}</h1>
              <p className="text-white/80 text-sm mt-1">
                {roleName(user.role)} {dept && <>· {dept.name}</>} · {regionLabel(user.region)}
              </p>
            </div>
          </div>
          <div className="text-sm text-white/70 whitespace-nowrap">{formatArabicDate()}</div>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-amber-50 p-4">
          <p className="text-2xl font-bold text-amber-700">{inbox.length}</p>
          <p className="text-xs font-semibold text-amber-700/80 mt-1">بانتظار اعتمادك</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-4">
          <p className="text-2xl font-bold text-blue-700">{myCreated.length}</p>
          <p className="text-xs font-semibold text-blue-700/80 mt-1">نماذجي المنشأة</p>
        </div>
        <div className="rounded-xl bg-green-50 p-4">
          <p className="text-2xl font-bold text-green-700">{myCreated.filter(f => f.status === 'approved' || f.status === 'completed').length}</p>
          <p className="text-xs font-semibold text-green-700/80 mt-1">معتمدة</p>
        </div>
        <div className="rounded-xl bg-red-50 p-4">
          <p className="text-2xl font-bold text-red-700">{myCreated.filter(f => f.status === 'rejected').length}</p>
          <p className="text-xs font-semibold text-red-700/80 mt-1">مرفوضة</p>
        </div>
      </div>

      {/* صندوق الوارد المختصر */}
      <Card title={`صندوق الوارد (${inbox.length})`} icon={Inbox}>
        {inbox.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">لا توجد طلبات معلّقة على دورك حالياً</p>
          </div>
        ) : (
          <div className="space-y-2">
            {inbox.slice(0, 5).map(f => (
              <button key={f.id}
                onClick={() => goToPortal(f.ownerDept)}
                className="w-full text-right p-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#4A1F66]/10 text-[#4A1F66] flex items-center justify-center font-bold text-[11px] shrink-0">
                  {f.code}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{f.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">إدارة: {departmentName(f.ownerDept)}</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-400 mt-1" />
              </button>
            ))}
            {inbox.length > 5 && (
              <p className="text-center text-xs text-gray-400 mt-2">+{inbox.length - 5} طلب آخر</p>
            )}
          </div>
        )}
      </Card>

      {/* البوابات المتاحة */}
      <Card title="البوابات المتاحة" icon={Activity}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {DEPARTMENTS.filter(d => allowedDepts.includes(d.key)).map(d => {
            const count = api.forms.filter(f => f.ownerDept === d.key || (f.bridgesTo || []).includes(d.key)).length;
            return (
              <button key={d.key} onClick={() => goToPortal(d.key)}
                className="text-right p-4 rounded-xl border border-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-2" style={{ background: d.color + '20' }}>
                  <span className="text-base font-bold" style={{ color: d.color }}>{d.shortName.charAt(0)}</span>
                </div>
                <p className="text-sm font-bold text-gray-800">{d.name}</p>
                <p className="text-[11px] text-gray-500 mt-1">{count} نموذج</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* نماذجي الأخيرة */}
      <Card title={`نماذجي الأخيرة (${myCreated.length})`} icon={FileText}>
        {myCreated.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">لم تُنشئ أي نموذج بعد</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myCreated.slice(0, 6).map(f => (
              <button key={f.id} onClick={() => goToPortal(f.ownerDept)}
                className="w-full text-right p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-[11px]">
                  {f.code}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{f.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{new Date(f.createdAt).toLocaleString('ar-SA')}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${FORM_STATUS_COLORS[f.status]}`}>
                  {FORM_STATUS_LABELS[f.status]}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* الفهرس الكامل (مرجعي) */}
      <Card title="فهرس النماذج المتاحة في النظام (27)" icon={FileText}>
        <p className="text-[11px] text-gray-500 mb-3">للمعلومية فقط — تظهر النماذج التي تستطيع إنشاءها داخل بوابة قسمك المخصصة.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {FORMS.map(f => (
            <div key={f.code} className="p-2 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#4A1F66]/10 text-[#4A1F66]">{f.code}</span>
                <span className="text-xs font-bold text-gray-800 truncate">{f.title}</span>
              </div>
              <p className="text-[10px] text-gray-500">إدارة: {departmentName(f.ownerDept)}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-between px-4 py-3 mt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <TarmeemLogo variant="icon" size={18} />
          <span className="text-xs text-gray-400 font-semibold">جمعية ترميم</span>
        </div>
        <span className="text-xs text-gray-400">v2.0</span>
      </div>
    </div>
  );
};

export const PendingAccountScreen: React.FC<{ email: string; onSignOut: () => void }> = ({ email, onSignOut }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
      <TarmeemLogo variant="stacked" size={50} color="auto" animated={false} />
      <h2 className="text-xl font-bold text-[#4A1F66] mt-6 mb-2">حسابك بانتظار الموافقة</h2>
      <p className="text-sm text-gray-500 mb-6">تم تسجيل طلبك بنجاح. سيقوم مدير النظام بمراجعة الدور المطلوب وتعيين الإدارة المناسبة قبل التفعيل.</p>
      <p className="text-xs text-gray-400 mb-4" dir="ltr">{email}</p>
      <button onClick={onSignOut} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-300 transition">تسجيل الخروج</button>
    </div>
  </div>
);

export const DeactivatedAccountScreen: React.FC<{ onSignOut: () => void }> = ({ onSignOut }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
      <AlertTriangle className="w-16 h-16 text-red-300 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-gray-700 mb-2">الحساب معطّل</h2>
      <p className="text-sm text-gray-500 mb-6">تم تعطيل حسابك من قبل مدير النظام. تواصل مع الإدارة للمزيد من المعلومات.</p>
      <button onClick={onSignOut} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-300 transition">تسجيل الخروج</button>
    </div>
  </div>
);
