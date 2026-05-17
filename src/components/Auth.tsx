import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { TarmeemLogo } from './ui';
import { RoleKey, DepartmentKey } from '../lib/data';

// 🚨 FIXED: Strict types added for mobile and ext to prevent dangerous 'any' casting downstream
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  fullName: string;
  mobile?: string;
  ext?: string;
  role: RoleKey | 'PENDING';
  department: DepartmentKey | '';
  isManager: boolean;
  isAdmin?: boolean;
  status: 'pending' | 'active' | 'deactivated';
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  deactivatedAt?: string | null;
  deactivatedBy?: string | null;
  needsRoleReset?: boolean;
  auditLog?: { at: string; actor: string; action: string }[];
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const d = await getDoc(doc(db, 'users', uid));
    if (d.exists()) return { id: d.id, ...d.data() } as UserProfile;
    return null;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const AuthScreen: React.FC<{ onAuth: () => void }> = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        const user = auth.currentUser;
        if (user) {
           const profile = await getUserProfile(user.uid);
           if (profile && !profile.username) {
              const username = `@${email.split('@')[0].toLowerCase()}`;
              await setDoc(doc(db, 'users', user.uid), { username }, { merge: true });
           }
        }
      } else {
        if (!fullName.trim()) throw new Error('يرجى إدخال الاسم الرباعي');
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const username = `@${email.split('@')[0].toLowerCase()}`;

        const newProfile: UserProfile = {
          id: cred.user.uid,
          email: cred.user.email || email,
          username,
          fullName: fullName.trim(),
          role: 'PENDING',
          department: '',
          isManager: false,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      }
      onAuth();
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setError('البريد الإلكتروني مسجل مسبقاً.');
      else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      else if (err.code === 'auth/weak-password') setError('كلمة المرور ضعيفة. يجب أن تكون 6 أحرف على الأقل.');
      else setError(err.message || 'حدث خطأ أثناء المصادقة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-[#4A1F66] rounded-full blur-[120px] opacity-20 animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] bg-[#43bba1] rounded-full blur-[120px] opacity-10 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-3xl shadow-[0_0_40px_rgba(74,31,102,0.2)] border border-[#2D124C] p-8 relative z-10">
        <div className="text-center mb-8">
          <TarmeemLogo variant="stacked" size={64} color="white" className="mx-auto mb-6" animated />
          <h1 className="text-2xl font-black text-white mb-2">{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}</h1>
          <p className="text-sm text-gray-400">منصة العمليات الموحّدة (ERP) - جمعية ترميم</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm font-bold mb-6 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 ml-1">الاسم الرباعي</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><UserIcon className="h-5 w-5 text-gray-500" /></div>
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="block w-full pl-3 pr-10 py-3 border border-gray-800 rounded-xl leading-5 bg-[#111] text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#4A1F66] focus:border-[#4A1F66] transition-all" placeholder="أحمد عبدالله الخالدي" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 ml-1">البريد الإلكتروني</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-500" /></div>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full pl-3 pr-10 py-3 border border-gray-800 rounded-xl leading-5 bg-[#111] text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#4A1F66] focus:border-[#4A1F66] transition-all text-left dir-ltr" placeholder="email@tarmeem.org" dir="ltr" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 ml-1">كلمة المرور</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-500" /></div>
              <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full pl-10 pr-10 py-3 border border-gray-800 rounded-xl leading-5 bg-[#111] text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#4A1F66] focus:border-[#4A1F66] transition-all text-left dir-ltr" placeholder="••••••••" dir="ltr" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-6 bg-gradient-to-r from-[#4A1F66] to-[#6B3D87] text-white py-3.5 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(74,31,102,0.4)] hover:shadow-[0_0_30px_rgba(74,31,102,0.6)] disabled:opacity-50 transition-all flex justify-center items-center gap-2">
            {loading ? 'جاري المعالجة...' : isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب'} {loading ? null : <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-800 pt-6">
          <p className="text-sm text-gray-400">
            {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-[#43bba1] font-bold hover:underline transition-colors focus:outline-none">
              {isLogin ? 'سجل الآن' : 'سجل دخولك'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Fix #1 — App.tsx imports { Auth } from this file; alias to the supplied AuthScreen.
export const Auth = AuthScreen;
