import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { TarmeemLogo } from './ui';
import { ROLES_DEF, ROLE_BY_KEY, RoleKey, DEPARTMENTS, REGION_LABELS, isAdminEmail } from '../lib/data';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  /** أحد مفاتيح الأدوار (RoleKey)؛ 'PENDING' للمستخدمين بانتظار إعادة التصنيف.
      ملاحظة: حالة "مسؤول النظام" (Admin) أصبحت علامة منفصلة (`isAdmin`) ولا تتبدّل بالدور. */
  role: RoleKey | 'PENDING';
  /** مفتاح الإدارة الأساسية للمستخدم (قد يكون فارغاً للمعلّقين) */
  department: string;
  region: string;
  /** يحدّد ما إذا كان المستخدم مديراً للقسم (للاعتمادات) */
  isManager: boolean;
  /** علامة منفصلة: مسؤول نظام (يتعايش مع أي دور). */
  isAdmin?: boolean;
  /** هاتف للتواصل (اختياري) */
  phone?: string;
  bio?: string;
  status: 'active' | 'pending' | 'deactivated';
  registeredAt: string;
  lastSeenAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  deactivatedAt: string | null;
  deactivatedBy: string | null;
  notificationPrefs: { inApp: boolean; email: boolean };
  auditLog: any[];
  /** إعادة ضبط: عند الترقية إلى البنية الجديدة، يُعيَّن لإعادة الإسناد */
  needsRoleReset?: boolean;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } as UserProfile : null;
}

export async function createUserProfile(
  uid: string, email: string, fullName: string,
  requestedRole: RoleKey | null, region: string,
): Promise<void> {
  const isPredefAdmin = isAdminEmail(email);
  const def = requestedRole ? ROLE_BY_KEY[requestedRole] : null;
  const profile: UserProfile = {
    id: uid, email: email.toLowerCase().trim(), fullName,
    role: requestedRole || 'PENDING',
    department: def?.department || (isPredefAdmin ? 'EXEC' : ''),
    region,
    isManager: !!def?.isManager,
    isAdmin: isPredefAdmin,
    status: isPredefAdmin ? 'active' : 'pending',
    registeredAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    approvedBy: isPredefAdmin ? 'system' : null,
    approvedAt: isPredefAdmin ? new Date().toISOString() : null,
    deactivatedAt: null, deactivatedBy: null,
    notificationPrefs: { inApp: true, email: true },
    auditLog: [{
      at: new Date().toISOString(),
      actor: 'system',
      action: isPredefAdmin ? 'auto-admin-registered' : 'registered',
      from: null,
      to: { status: isPredefAdmin ? 'active' : 'pending', role: requestedRole, isAdmin: isPredefAdmin },
    }],
  };
  await setDoc(doc(db, 'users', uid), profile);
}

export function AuthScreen({ onAuth }: { onAuth: (user: any) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [requestedRole, setRequestedRole] = useState<RoleKey>('SOCIAL_RESEARCHER');
  const [region, setRegion] = useState('DAM');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        onAuth(cred.user);
      } else {
        if (!fullName.trim()) { setError('الاسم الكامل مطلوب'); setLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(cred.user.uid, email, fullName, requestedRole, region);
        onAuth(cred.user);
      }
    } catch (err: any) {
      const msg = err.code === 'auth/user-not-found' ? 'الحساب غير موجود' :
        err.code === 'auth/wrong-password' ? 'كلمة المرور غير صحيحة' :
        err.code === 'auth/email-already-in-use' ? 'البريد مسجل مسبقاً' :
        err.code === 'auth/weak-password' ? 'كلمة المرور ضعيفة (6 أحرف على الأقل)' :
        err.code === 'auth/invalid-email' ? 'بريد إلكتروني غير صالح' :
        'حدث خطأ، حاول مرة أخرى';
      setError(msg);
    } finally { setLoading(false); }
  };

  const rolesByDept = DEPARTMENTS.map(d => ({
    dept: d,
    roles: ROLES_DEF.filter(r => r.department === d.key),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A1F66] via-[#6B3D87] to-[#56B894] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <TarmeemLogo variant="stacked" size={60} color="auto" animated={false} />
          <h1 className="text-xl font-bold text-[#4A1F66] dark:text-purple-300 mt-4">منصة العمليات الموحّدة</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">جمعية ترميم</p>
        </div>

        <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1 mb-6">
          <button onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition ${isLogin ? 'bg-white dark:bg-slate-700 shadow text-[#4A1F66] dark:text-purple-300' : 'text-gray-500 dark:text-slate-400'}`}>تسجيل الدخول</button>
          <button onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition ${!isLogin ? 'bg-white dark:bg-slate-700 shadow text-[#4A1F66] dark:text-purple-300' : 'text-gray-500 dark:text-slate-400'}`}>طلب حساب جديد</button>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold p-3 rounded-lg mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">الاسم الكامل</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">الدور المطلوب</label>
                <select value={requestedRole} onChange={e => setRequestedRole(e.target.value as RoleKey)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]">
                  {rolesByDept.map(g => (
                    <optgroup key={g.dept.key} label={g.dept.name}>
                      {g.roles.map(r => (
                        <option key={r.key} value={r.key}>{r.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">المنطقة</label>
                <select value={region} onChange={e => setRegion(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]">
                  {Object.entries(REGION_LABELS).filter(([k]) => k !== 'ALL').map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">البريد الإلكتروني</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required dir="ltr"
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">كلمة المرور</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]" dir="ltr" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[#4A1F66] text-white py-3 rounded-lg font-bold hover:bg-[#3A1652] transition disabled:opacity-50">
            {loading ? 'جاري...' : isLogin ? 'دخول' : 'إنشاء طلب'}
          </button>
        </form>

        {!isLogin && (
          <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center mt-4">
            بعد التسجيل سيراجع مدير النظام طلبك ويسند الدور والإدارة المناسبة قبل تفعيل الحساب.
          </p>
        )}
      </div>
    </div>
  );
}
