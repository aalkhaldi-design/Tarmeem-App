import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { TarmeemLogo } from './ui';
import { ROLES } from '../lib/data';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  region: string;
  departments: string[];
  isDepartmentHead: boolean;
  status: 'active' | 'pending' | 'deactivated';
  registeredAt: string;
  lastSeenAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  deactivatedAt: string | null;
  deactivatedBy: string | null;
  notificationPrefs: { inApp: boolean; email: boolean };
  auditLog: any[];
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } as UserProfile : null;
}

export async function createUserProfile(uid: string, email: string, fullName: string): Promise<void> {
  const profile: UserProfile = {
    id: uid, email, fullName, role: 'مهندس التشخيص', region: 'DAM',
    departments: ['المشاريع'], isDepartmentHead: false, status: 'pending',
    registeredAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(),
    approvedBy: null, approvedAt: null, deactivatedAt: null, deactivatedBy: null,
    notificationPrefs: { inApp: true, email: true },
    auditLog: [{ at: new Date().toISOString(), actor: 'system', action: 'registered', from: null, to: { status: 'pending' } }]
  };
  await setDoc(doc(db, 'users', uid), profile);
}

export function AuthScreen({ onAuth }: { onAuth: (user: any) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
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
        await createUserProfile(cred.user.uid, email, fullName);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A1F66] via-[#6B3D87] to-[#56B894] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <TarmeemLogo variant="stacked" size={60} color="auto" animated={false} />
          <h1 className="text-xl font-bold text-[#4A1F66] mt-4">منصة إدارة المشاريع</h1>
          <p className="text-xs text-gray-500 mt-1">جمعية ترميم</p>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition ${isLogin ? 'bg-white shadow text-[#4A1F66]' : 'text-gray-500'}`}>تسجيل الدخول</button>
          <button onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition ${!isLogin ? 'bg-white shadow text-[#4A1F66]' : 'text-gray-500'}`}>حساب جديد</button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-lg mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">الاسم الكامل</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]" />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">البريد الإلكتروني</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required dir="ltr"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">كلمة المرور</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]" dir="ltr" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[#4A1F66] text-white py-3 rounded-lg font-bold hover:bg-[#3A1652] transition disabled:opacity-50">
            {loading ? 'جاري...' : isLogin ? 'دخول' : 'إنشاء حساب'}
          </button>
        </form>

        {!isLogin && (
          <p className="text-[10px] text-gray-400 text-center mt-4">بعد التسجيل، سيحتاج حسابك لموافقة المدير قبل التفعيل الكامل.</p>
        )}
      </div>
    </div>
  );
}
