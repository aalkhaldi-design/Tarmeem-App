import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  LayoutDashboard, Search, Bell, WifiOff, Home, Briefcase, MapPin,
  User, ChevronDown, Settings, Activity, ClipboardList, PenTool,
  FileText, Plus, Lock, CheckCircle2, AlertTriangle, DollarSign, X
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, addDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { getUserProfile } from './components/Auth';
import { AuthScreen } from './components/Auth';
import { TarmeemLogo, TarmeemSplash, MandatoryGauge } from './components/ui';
import { DashboardHome, NewProjectModal } from './components/Home';
import { PortalERP } from './components/ERP';
import { PortalField } from './components/Field';
import { AdminUsersPortal, PortalSettings } from './components/Admin';
import {
  STAGES_CONFIG, ROLES, REGION_LABELS, regionLabel, computeSlaStatus, DEFAULT_LISTS
} from './lib/data';

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

interface Project {
  id: string;
  name: string;
  type: string;
  city: string;
  region: string;
  currentStageId: string;
  currentStageOwner: string;
  stageEnteredAt: string;
  mandatoryFieldsTotal: number;
  mandatoryFieldsFilled: number;
  assessmentId: string | null;
  assessmentStatus: string;
  diagnosisVerdict: string | null;
  assignedFieldEngineer: string | null;
  data: Record<string, any>;
  budgetSAR: number;
  disbursedSAR: number;
  projectAuditLog: any[];
  hasPendingAdditionalWorks: boolean;
  deliveryDate?: string;
  [key: string]: any;
}

interface AppNotification {
  id: number | string;
  text: string;
  subject?: string;
  type: string;
  portal: string;
  link?: string;
  recipients: string[];
  readBy: string[];
  createdAt: string;
  emailSent?: boolean;
  meta?: any;
}

function App() {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [lists, setLists] = useState(DEFAULT_LISTS);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [globalSearch, setGlobalSearch] = useState('');
  // Added 'ADMIN' to the possible tabs
  const [activeTab, setActiveTab] = useState<'HOME' | 'ERP' | 'FIELD' | 'ADMIN'>('HOME');
  const [erpView, setErpView] = useState('ALL_PROJECTS');
  const [fieldView, setFieldView] = useState('TASKS');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const [splashVisible, setSplashVisible] = useState(() => {
    const seen = sessionStorage.getItem('tarmeem_splash_seen');
    return !seen;
  });

  useEffect(() => {
    if (!splashVisible) sessionStorage.setItem('tarmeem_splash_seen', 'true');
  }, [splashVisible]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    }, (err) => console.error('Projects listener error:', err));

    const unsubAssessments = onSnapshot(collection(db, 'assessments'), (snap) => {
      setAssessments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('Assessments listener error:', err));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
    }, (err) => console.error('Users listener error:', err));

    const unsubDocs = onSnapshot(collection(db, 'documents'), (snap) => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('Documents listener error:', err));

    const unsubLists = onSnapshot(doc(db, 'settings', 'lists'), (snap) => {
      if (snap.exists()) setLists(snap.data() as any);
    }, (err) => console.error('Lists listener error:', err));

    const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification)));
    }, (err) => console.error('Notifications listener error:', err));

    return () => {
      unsubProjects(); unsubAssessments(); unsubUsers(); unsubDocs(); unsubLists(); unsubNotifs();
    };
  }, [firebaseUser]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const updateProject = useCallback(async (id: string, updates: Record<string, any>) => {
    try {
      await updateDoc(doc(db, 'projects', id), updates);
    } catch (e) { console.error('Error updating project:', e); }
  }, []);

  const updateProjectField = useCallback(async (id: string, fieldPath: string, value: any, _actorId?: string) => {
    try {
      const p = projects.find(x => x.id === id);
      if (!p) return;
      let updates: Record<string, any> = {};
      if (fieldPath.startsWith('data.')) {
        const key = fieldPath.split('.')[1];
        updates = { data: { ...p.data, [key]: value } };
      } else {
        updates = { [fieldPath]: value };
      }
      await updateDoc(doc(db, 'projects', id), updates);
    } catch (e) { console.error(e); }
  }, [projects]);

  const addProject = useCallback(async (newProj: any) => {
    try {
      const docRef = await addDoc(collection(db, 'projects'), newProj);
      await updateDoc(docRef, { id: docRef.id });
    } catch (e) { console.error('Error creating project:', e); }
  }, []);

  const addAssessment = useCallback(async (ass: any) => {
    try {
      await setDoc(doc(db, 'assessments', ass.id), ass);
    } catch (e) { console.error('Error submitting assessment:', e); }
  }, []);

  const addDocument = useCallback(async (docRec: any) => {
    try {
      await addDoc(collection(db, 'documents'), docRec);
    } catch (e) { console.error('Error adding document:', e); }
  }, []);

  const updateList = useCallback(async (listKey: string, newValues: string[]) => {
    try {
      const updated = { ...lists, [listKey]: newValues };
      await setDoc(doc(db, 'settings', 'lists'), updated, { merge: true });
      setLists(updated);
    } catch (e) { console.error('Error updating list:', e); }
  }, [lists]);

  const dispatchNotification = useCallback(async ({ text, subject, type, portal, link, recipients, meta = {} }: {
    text: string; subject?: string; type: string; portal: string; link?: string; recipients?: string[]; meta?: any;
  }) => {
    const newNotif = {
      text, subject: subject || text.slice(0, 80), type, portal, link,
      recipients: recipients || [], readBy: [], createdAt: new Date().toISOString(), meta
    };
    try {
      await addDoc(collection(db, 'notifications'), newNotif);
    } catch (e) { console.error('Error dispatching notification:', e); }
  }, []);

  const markNotificationRead = useCallback(async (notifId: string, userId: string) => {
    try {
      const notif = notifications.find(n => n.id === notifId);
      if (!notif) return;
      const updatedReadBy = notif.readBy.includes(userId) ? notif.readBy : [...notif.readBy, userId];
      await updateDoc(doc(db, 'notifications', notifId), { readBy: updatedReadBy });
    } catch (e) { console.error('Error marking notification read:', e); }
  }, [notifications]);

  const markAllNotificationsRead = useCallback(async (userId: string) => {
    try {
      const unread = notifications.filter(n => n.recipients.includes(userId) && !n.readBy.includes(userId));
      for (const n of unread) {
        await updateDoc(doc(db, 'notifications', n.id as string), { readBy: [...n.readBy, userId] });
      }
    } catch (e) { console.error('Error marking all read:', e); }
  }, [notifications]);

  const approveUser = useCallback(async (userId: string, edits: any, approverId: string) => {
    try {
      const auditEntry = { at: new Date().toISOString(), actor: approverId, action: 'approved', from: { status: 'pending' }, to: { ...edits, status: 'active' } };
      await updateDoc(doc(db, 'users', userId), {
        ...edits, status: 'active', approvedBy: approverId, approvedAt: new Date().toISOString(),
        auditLog: [...(users.find(u => u.id === userId)?.auditLog || []), auditEntry]
      });
    } catch (e) { console.error('Error approving user:', e); }
  }, [users]);

  const updateUser = useCallback(async (userId: string, edits: any, actorId: string) => {
    try {
      const existing = users.find(u => u.id === userId);
      if (!existing) return;
      const auditEntry = { at: new Date().toISOString(), actor: actorId, action: 'updated', from: pickEditableFields(existing), to: edits };
      await updateDoc(doc(db, 'users', userId), {
        ...edits, auditLog: [...(existing.auditLog || []), auditEntry]
      });
    } catch (e) { console.error('Error updating user:', e); }
  }, [users]);

  const deactivateUser = useCallback(async (userId: string, actorId: string, reassignedTo: string) => {
    try {
      const existing = users.find(u => u.id === userId);
      if (!existing) return;
      const auditEntry = { at: new Date().toISOString(), actor: actorId, action: 'deactivated', from: { status: 'active' }, to: { status: 'deactivated' }, reassignedTo };
      await updateDoc(doc(db, 'users', userId), {
        status: 'deactivated', deactivatedAt: new Date().toISOString(), deactivatedBy: actorId,
        auditLog: [...(existing.auditLog || []), auditEntry]
      });
    } catch (e) { console.error('Error deactivating user:', e); }
  }, [users]);

  const reactivateUser = useCallback(async (userId: string, actorId: string) => {
    try {
      const existing = users.find(u => u.id === userId);
      if (!existing) return;
      const auditEntry = { at: new Date().toISOString(), actor: actorId, action: 'reactivated', from: { status: 'deactivated' }, to: { status: 'active' } };
      await updateDoc(doc(db, 'users', userId), {
        status: 'active', deactivatedAt: null, deactivatedBy: null,
        auditLog: [...(existing.auditLog || []), auditEntry]
      });
    } catch (e) { console.error('Error reactivating user:', e); }
  }, [users]);

  const rejectUser = useCallback(async (userId: string, actorId: string, reason?: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (e) { console.error('Error rejecting user:', e); }
  }, []);

  const addUser = useCallback(async (userData: any) => {
    try {
      await setDoc(doc(db, 'users', userData.id), userData);
    } catch (e) { console.error('Error adding user:', e); }
  }, []);

  const goToProject = (id: string) => { setActiveProjectId(id); setActiveTab('ERP'); setErpView('PROJECT'); };
  const goToFieldTask = (id: string) => { setActiveProjectId(id); setActiveTab('FIELD'); setFieldView('WIZARD'); };
  const goToAllProjects = () => { setActiveTab('ERP'); setErpView('ALL_PROJECTS'); };

  const pickEditableFields = (u: UserProfile) => ({
    role: u.role, region: u.region, departments: u.departments,
    isDepartmentHead: u.isDepartmentHead, notificationPrefs: u.notificationPrefs
  });

  const currentUserRole = userProfile?.role || '';
  
  // Role checks for visibility
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'Admin';
  
  const canSeeERP = userProfile?.status === 'active' && (
    isAdmin || currentUserRole === 'المدير التنفيذي' ||
    currentUserRole === 'مدير المشاريع' || currentUserRole === 'المهندس المشرف' ||
    currentUserRole === 'المحاسب / المالية' || currentUserRole === 'العقود والمشتريات' ||
    userProfile?.isDepartmentHead
  );
  
  const canSeeField = userProfile?.status === 'active' && (
    currentUserRole === 'مهندس التشخيص' || currentUserRole === 'الفني المساعد للتشخيص' ||
    currentUserRole === 'المهندس المشرف' || currentUserRole === 'مدير المشاريع' ||
    isAdmin
  );

  const myNotifications = useMemo(() =>
    notifications.filter(n => n.recipients.includes(userProfile?.id || '') || n.recipients.length === 0),
    [notifications, userProfile?.id]
  );
  const unreadCount = myNotifications.filter(n => !n.readBy.includes(userProfile?.id || '')).length;

  const theme = activeTab === 'FIELD' ? { primary: '#6B21A8', primaryLight: '#8B5CF6', accent: '#14B8A6' } : 
                activeTab === 'ADMIN' ? { primary: '#1F2937', primaryLight: '#374151', accent: '#F97316' } :
                { primary: '#4A1F66', primaryLight: '#6B3D87', accent: '#56B894' };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <TarmeemLogo variant="stacked" size={60} animated={true} />
      </div>
    );
  }

  if (!firebaseUser) {
    return <AuthScreen onAuth={() => {}} />;
  }

  if (userProfile && userProfile.status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <TarmeemLogo variant="stacked" size={50} color="auto" animated={false} />
          <h2 className="text-xl font-bold text-[#4A1F66] mt-6 mb-2">حسابك بانتظار الموافقة</h2>
          <p className="text-sm text-gray-500 mb-6">تم تسجيل حسابك بنجاح. سيقوم مدير النظام بمراجعة طلبك وتفعيل حسابك قريباً.</p>
          <p className="text-xs text-gray-400 mb-4" dir="ltr">{firebaseUser.email}</p>
          <button onClick={() => signOut(auth)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-300 transition">تسجيل الخروج</button>
        </div>
      </div>
    );
  }

  if (userProfile && userProfile.status === 'deactivated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <Lock className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">الحساب معطّل</h2>
          <p className="text-sm text-gray-500 mb-6">تم تعطيل حسابك من قبل مدير النظام. تواصل مع الإدارة للمزيد من المعلومات.</p>
          <button onClick={() => signOut(auth)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-300 transition">تسجيل الخروج</button>
        </div>
      </div>
    );
  }

  const store = { projects, users, assessments, documents, lists, notifications };

  return (
    <div className="min-h-screen font-sans flex flex-col transition-colors duration-300 bg-[#F8F9FA]" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');
        body, .font-sans { font-family: 'Tajawal', system-ui, -apple-system, sans-serif !important; }
        .brick-pattern-bg {
          background-image: linear-gradient(135deg, transparent 25%, rgba(86, 184, 148, 0.04) 25%, rgba(86, 184, 148, 0.04) 50%, transparent 50%, transparent 75%, rgba(74, 31, 102, 0.04) 75%, rgba(74, 31, 102, 0.04) 100%);
          background-size: 24px 24px;
        }
        .text-display { font-size: 1.75rem; line-height: 1.2; }
        @media (min-width: 768px) { .text-display { font-size: 2.5rem; line-height: 1.1; } }
        @media (min-width: 1024px) { .text-display { font-size: 3rem; line-height: 1.05; } }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media print { .print-hide { display: none !important; } }
        .brick { opacity: 0; transform-origin: center center; animation: brickPopUp 500ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .diamond { opacity: 0; transform-origin: center center; animation: diamondDrop 450ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .brick[data-i="3"]  { animation-delay: 80ms; }
        .brick[data-i="2"]  { animation-delay: 160ms; }
        .brick[data-i="4"]  { animation-delay: 160ms; }
        .brick[data-i="1"]  { animation-delay: 260ms; }
        .brick[data-i="6"]  { animation-delay: 420ms; }
        .brick[data-i="5"]  { animation-delay: 560ms; }
        .brick[data-i="7"]  { animation-delay: 560ms; }
        .brick[data-i="10"] { animation-delay: 720ms; }
        .brick[data-i="11"] { animation-delay: 720ms; }
        .brick[data-i="9"]  { animation-delay: 820ms; }
        .brick[data-i="12"] { animation-delay: 820ms; }
        .brick[data-i="8"]  { animation-delay: 940ms; }
        .diamond[data-i="1"] { animation-delay: 1100ms; }
        .diamond[data-i="2"] { animation-delay: 1180ms; }
        @keyframes brickPopUp { 0% { opacity: 0; transform: translateY(20px) scale(0.7); } 60% { opacity: 1; transform: translateY(-3px) scale(1.05); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes diamondDrop { 0% { opacity: 0; transform: translateY(-15px) scale(0.5); } 60% { opacity: 1; transform: translateY(2px) scale(1.05); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        .splash-tagline { opacity: 0; animation: taglineFadeUp 600ms ease-out 1700ms forwards; }
        .splash-tagline-en { opacity: 0; animation: taglineFadeUp 600ms ease-out 1900ms forwards; }
        @keyframes taglineFadeUp { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        .splash-overlay.exiting { animation: crashFade 600ms cubic-bezier(0.6, 0.04, 0.98, 0.34) forwards; }
        @keyframes crashFade { 0% { opacity: 1; transform: scale(1) rotate(0deg); } 20% { opacity: 1; transform: scale(1.04) rotate(0.5deg); } 40% { opacity: 1; transform: scale(0.96) rotate(-0.5deg); } 100% { opacity: 0; transform: scale(0.85) rotate(0deg); } }
        .logo-breathe-on-hover:hover { animation: breathe 2s ease-in-out infinite; }
        @keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        .tarmeem-pulse { display: inline-flex; gap: 4px; align-items: center; }
        .tarmeem-pulse .pulse-dot { width: 8px; height: 8px; border-radius: 2px; animation: pulseFade 1200ms ease-in-out infinite; }
        .tarmeem-pulse .pulse-dot:nth-child(1) { background: #4A1F66; animation-delay: 0ms; }
        .tarmeem-pulse .pulse-dot:nth-child(2) { background: #56B894; animation-delay: 150ms; }
        .tarmeem-pulse .pulse-dot:nth-child(3) { background: #4A1F66; animation-delay: 300ms; }
        .tarmeem-pulse .pulse-dot:nth-child(4) { background: #56B894; animation-delay: 450ms; }
        @keyframes pulseFade { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .brick, .diamond, .splash-tagline, .splash-tagline-en { animation: none !important; opacity: 1 !important; }
          .splash-overlay.exiting { animation: simpleFade 300ms ease-out forwards; }
          @keyframes simpleFade { to { opacity: 0; } }
          .logo-breathe-on-hover:hover { animation: none; }
        }
      `}} />

      {splashVisible && <TarmeemSplash onComplete={() => setSplashVisible(false)} />}

      {isOffline && (
        <div className="bg-red-500 text-white text-xs font-bold py-1 text-center flex items-center justify-center gap-2">
          <WifiOff className="w-3 h-3" /> وضع عدم الاتصال - سيتم حفظ البيانات محلياً
        </div>
      )}

      <NewProjectModal isOpen={showNewModal} onClose={() => setShowNewModal(false)} onSubmit={addProject} />

      <header className="shadow-md transition-colors duration-300" style={{ backgroundColor: theme.primary }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3 text-white">
            <div className="hidden md:block logo-breathe-on-hover cursor-pointer" onClick={() => setActiveTab('HOME')}>
              <TarmeemLogo variant="horizontal" size={28} color="white" animated={false} />
            </div>
            <div className="md:hidden logo-breathe-on-hover cursor-pointer" onClick={() => setActiveTab('HOME')}>
              <TarmeemLogo variant="icon" size={28} color="white" animated={false} />
            </div>
            <div className="hidden md:block border-r border-white/20 pr-3 mr-3">
              <h1 className="text-sm font-bold leading-none text-white/90">منصة إدارة المشاريع</h1>
              <p className="text-[10px] text-white/60 leading-none mt-1">جمعية ترميم</p>
            </div>
          </div>

          <div className="flex-1 w-full md:max-w-md mx-4 hidden md:block relative">
            <Search className="w-4 h-4 absolute right-3 top-2 text-white/50" />
            <input type="text" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}
              placeholder="بحث شامل عن مشروع أو تشخيص..."
              className="w-full pl-3 pr-9 py-1.5 text-sm rounded-full border border-white/20 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:bg-white/20 transition" />
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="relative" ref={bellRef}>
              <button onClick={() => setBellOpen(v => !v)} className="relative p-1.5 hover:bg-white/10 rounded-lg transition">
                <Bell className="w-5 h-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2" style={{ borderColor: theme.primary }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white shadow-2xl rounded-xl z-50 border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
                    <span className="font-bold text-gray-700 text-sm">الإشعارات ({myNotifications.length})</span>
                    {unreadCount > 0 && (
                      <button onClick={() => markAllNotificationsRead(userProfile?.id || '')}
                        className="text-[10px] text-[#4A1F66] hover:underline font-bold">تعليم الكل كمقروء</button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {myNotifications.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-xs">لا توجد إشعارات</div>
                    ) : (
                      myNotifications.map(n => {
                        const isRead = n.readBy.includes(userProfile?.id || '');
                        return (
                          <div key={n.id} onClick={() => {
                            if (!isRead) markNotificationRead(n.id as string, userProfile?.id || '');
                            if (n.link) {
                              if (n.portal === 'FIELD') goToFieldTask(n.link);
                              else goToProject(n.link);
                            }
                            setBellOpen(false);
                          }}
                            className={`px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 transition flex gap-2 ${!isRead ? 'bg-blue-50/50' : ''}`}>
                            <div className="shrink-0 mt-0.5">
                              {n.type === 'late' || n.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-orange-500" /> :
                                n.type === 'task' ? <ClipboardList className="w-4 h-4 text-blue-500" /> :
                                  n.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                                    <Bell className="w-4 h-4 text-gray-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-xs leading-relaxed ${!isRead ? 'font-bold text-gray-800' : 'text-gray-600'}`}>{n.text}</div>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-[10px] text-gray-400">{new Date(n.createdAt).toLocaleDateString('ar-SA')}</span>
                              </div>
                            </div>
                            {!isRead && <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg p-1.5">
              <User className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-xs">{userProfile?.fullName || currentUserRole}</span>
            </div>

            <button onClick={() => signOut(auth)} className="text-white/60 hover:text-white text-[10px] font-bold hover:underline transition">خروج</button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex">
          <button onClick={() => setActiveTab('HOME')}
            className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-4 transition ${activeTab === 'HOME' ? 'border-[#E67A18] text-[#1F4E79]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            <Home className="w-4 h-4" /> الرئيسية
          </button>
          {canSeeERP && (
            <button onClick={() => setActiveTab('ERP')}
              className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-4 transition ${activeTab === 'ERP' ? 'border-[#E67A18] text-[#1F4E79]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              <Briefcase className="w-4 h-4" /> إدارة المشاريع
            </button>
          )}
          {canSeeField && (
            <button onClick={() => setActiveTab('FIELD')}
              className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-4 transition ${activeTab === 'FIELD' ? 'border-[#E67A18] text-[#1F4E79]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              <MapPin className="w-4 h-4" /> الميدان
            </button>
          )}
          
          {/* THE NEW ADMIN TAB DOOR */}
          {isAdmin && (
            <button onClick={() => setActiveTab('ADMIN')}
              className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-4 transition ${activeTab === 'ADMIN' ? 'border-[#F97316] text-[#1F2937]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              <Settings className="w-4 h-4" /> لوحة التحكم
            </button>
          )}
        </div>
      </div>

      <main className="flex-1 w-full pb-20 md:pb-0">

        {/* LOADING THE REAL ADMIN PORTAL */}
        {activeTab === 'ADMIN' && userProfile && (
          <AdminUsersPortal 
            users={users}
            approveUser={approveUser}
            updateUser={updateUser}
            deactivateUser={deactivateUser}
            reactivateUser={reactivateUser}
            rejectUser={rejectUser}
            currentUser={userProfile}
          />
        )}

        {activeTab === 'HOME' && userProfile && (
          <DashboardHome
            user={userProfile}
            projects={projects}
            goToProject={goToProject}
            goToFieldTask={goToFieldTask}
            goToAllProjects={goToAllProjects}
            openNewProject={() => setShowNewModal(true)}
            openEmergency={() => goToFieldTask('EMERGENCY')}
          />
        )}
        {activeTab === 'ERP' && userProfile && (
          <PortalERP
            store={store}
            updateProject={updateProject}
            updateProjectField={updateProjectField}
            addDocument={addDocument}
            addProject={addProject}
            currentRole={currentUserRole}
            erpView={erpView}
            setErpView={setErpView}
            user={userProfile}
            addNotification={dispatchNotification}
            activeProjectId={activeProjectId}
            setActiveProjectId={setActiveProjectId}
            globalSearch={globalSearch}
            updateList={updateList}
            approveUser={approveUser}
            updateUser={updateUser}
            deactivateUser={deactivateUser}
            reactivateUser={reactivateUser}
            rejectUser={rejectUser}
            addUser={addUser}
          />
        )}
        {activeTab === 'FIELD' && userProfile && (
          <PortalField
            store={store}
            addAssessment={addAssessment}
            updateProject={updateProject}
            addNotification={dispatchNotification}
            currentUserRole={currentUserRole}
            isOffline={isOffline}
            fieldView={fieldView}
            setFieldView={setFieldView}
            activeProjectId={activeProjectId}
            setActiveProjectId={setActiveProjectId}
          />
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-[60px] z-50 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)]">
        <div className="absolute top-0 w-full h-1" style={{ backgroundColor: theme.accent }}></div>
        <button onClick={() => setActiveTab('HOME')}
          className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'HOME' ? 'text-[#1F4E79] font-bold' : 'text-gray-400'}`}>
          <Home className="w-5 h-5 mb-1" /><span className="text-[10px]">الرئيسية</span>
        </button>
        {canSeeERP && (
          <button onClick={() => setActiveTab('ERP')}
            className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'ERP' ? 'text-[#1F4E79] font-bold' : 'text-gray-400'}`}>
            <Briefcase className="w-5 h-5 mb-1" /><span className="text-[10px]">المشاريع</span>
          </button>
        )}
        {canSeeField && (
          <button onClick={() => setActiveTab('FIELD')}
            className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'FIELD' ? 'text-[#6B21A8] font-bold' : 'text-gray-400'}`}>
            <MapPin className="w-5 h-5 mb-1" /><span className="text-[10px]">الميدان</span>
          </button>
        )}
        
        {/* MOBILE ADMIN DOOR */}
        {isAdmin && (
          <button onClick={() => setActiveTab('ADMIN')}
            className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'ADMIN' ? 'text-[#1F2937] font-bold' : 'text-gray-400'}`}>
            <Settings className="w-5 h-5 mb-1" /><span className="text-[10px]">الإدارة</span>
          </button>
        )}
      </nav>
    </div>
  );
}

export default App;
