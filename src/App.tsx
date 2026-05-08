import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Bell, WifiOff, User as UserIcon, AlertTriangle, ClipboardList, CheckCircle2,
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc,
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { getUserProfile, AuthScreen, type UserProfile } from './components/Auth';
import { TarmeemLogo, TarmeemSplash } from './components/ui';
import {
  DashboardHome, PendingAccountScreen, DeactivatedAccountScreen,
} from './components/Home';
import {
  DEPT_PORTALS, ExecutiveHubPanel, PortalSidebar, PortalMobileNav,
  type ActivePortal,
} from './components/Departments';
import { AdminUsersPortal } from './components/Admin';
import {
  DEPARTMENTS, DepartmentKey, RoleKey, FORM_BY_CODE, FormCode,
  portalAccessForRole, roleName,
} from './lib/data';
import type { FormRecord, FormsApi } from './components/Forms';

interface AppNotification {
  id: string;
  text: string;
  subject?: string;
  type: string;
  link?: string;
  recipients: string[];
  readBy: string[];
  createdAt: string;
  meta?: any;
}

function App() {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [rawUserProfile, setRawUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [active, setActive] = useState<ActivePortal>('HOME');
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const [splashVisible, setSplashVisible] = useState(() => !sessionStorage.getItem('tarmeem_splash_seen'));

  useEffect(() => {
    if (!splashVisible) sessionStorage.setItem('tarmeem_splash_seen', 'true');
  }, [splashVisible]);

  /* ────────── Auth ────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const profile = await getUserProfile(user.uid);
        setRawUserProfile(profile);
      } else {
        setRawUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  /* ────────── Live data ────────── */
  useEffect(() => {
    if (!firebaseUser) return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
      setUsers(list);
      const me = list.find(u => u.id === firebaseUser.uid);
      if (me) setRawUserProfile(me);
    }, (err) => console.error('Users listener error:', err));

    const unsubForms = onSnapshot(collection(db, 'forms'), (snap) => {
      setForms(snap.docs.map(d => ({ id: d.id, ...d.data() } as FormRecord)));
    }, (err) => console.error('Forms listener error:', err));

    const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification)));
    }, (err) => console.error('Notifications listener error:', err));

    return () => { unsubUsers(); unsubForms(); unsubNotifs(); };
  }, [firebaseUser]);

  /* ────────── Online/Offline ────────── */
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  /* ────────── Bell click-out ────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ────────── Profile guard (Admin uppercase) ────────── */
  const userProfile: UserProfile | null = useMemo(() => {
    if (!rawUserProfile) return null;
    const r = rawUserProfile.role as string;
    if (typeof r === 'string' && r.toLowerCase() === 'admin') {
      return { ...rawUserProfile, role: 'ADMIN' } as UserProfile;
    }
    return rawUserProfile;
  }, [rawUserProfile]);

  const isAdmin = userProfile?.role === 'ADMIN';

  /* ────────── Notifications dispatch ────────── */
  const dispatchNotification = useCallback(async (n: {
    text: string; subject?: string; type: string; link?: string; recipients?: string[]; meta?: any;
  }) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        text: n.text,
        subject: n.subject || n.text.slice(0, 80),
        type: n.type,
        link: n.link || null,
        recipients: n.recipients || [],
        readBy: [],
        createdAt: new Date().toISOString(),
        meta: n.meta || {},
      });
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
      const unread = notifications.filter(n => (n.recipients || []).includes(userId) && !(n.readBy || []).includes(userId));
      for (const n of unread) {
        await updateDoc(doc(db, 'notifications', n.id as string), { readBy: [...(n.readBy || []), userId] });
      }
    } catch (e) { console.error('Error marking all read:', e); }
  }, [notifications]);

  /* ────────── Forms API ────────── */

  const usersByRole = useCallback((role: RoleKey): string[] =>
    users.filter(u => u.status === 'active' && u.role === role).map(u => u.id),
  [users]);

  const createForm = useCallback(async (input: {
    code: FormCode; user: UserProfile; projectId?: string | null; notes?: string; data?: Record<string, any>; triggeredBy?: string;
  }): Promise<string | null> => {
    try {
      const def = FORM_BY_CODE[input.code];
      if (!def) return null;
      const role = input.user.role as RoleKey;
      // المُنشِئ هو الخطوة الأولى، ويُحتسب اعتماده تلقائياً
      const startIdx = def.approvalChain[0] === role ? 1 : 0;
      const initialApprovals = startIdx === 1 ? [{
        role,
        actorId: input.user.id,
        at: new Date().toISOString(),
        decision: 'approved' as const,
        note: 'إنشاء',
      }] : [];

      const rec: Omit<FormRecord, 'id'> = {
        code: def.code,
        title: def.title,
        projectId: input.projectId || null,
        status: startIdx >= def.approvalChain.length ? 'approved' : 'pending',
        approvalIndex: startIdx,
        approvalChain: def.approvalChain,
        approvals: initialApprovals,
        createdBy: input.user.id,
        createdByRole: role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerDept: def.ownerDept,
        bridgesTo: def.bridgesTo || [],
        refKey: def.refKey,
        notes: input.notes || '',
        data: input.data || {},
        triggeredBy: input.triggeredBy,
      };
      const ref = await addDoc(collection(db, 'forms'), rec);
      await updateDoc(ref, { id: ref.id });

      // إشعار الدور التالي إن وُجد، أو الإدارات الجسرية إن لم يكن هناك سلسلة
      const nextRole = def.approvalChain[startIdx];
      if (nextRole) {
        const recipients = usersByRole(nextRole);
        await dispatchNotification({
          text: `طلب جديد بانتظار اعتمادك: ${def.code} ${def.title}`,
          subject: `${def.code} — ${def.title}`,
          type: 'form_pending',
          recipients,
          link: ref.id,
          meta: { formId: ref.id, code: def.code },
        });
      }
      // إشعار الإدارات الجسرية
      for (const bridge of (def.bridgesTo || [])) {
        const bridgeRecipients = users.filter(u => u.status === 'active' && u.department === bridge && u.isManager).map(u => u.id);
        if (bridgeRecipients.length > 0) {
          await dispatchNotification({
            text: `إخطار بنموذج جديد جسر إلى إدارتك: ${def.code} ${def.title}`,
            subject: `${def.code} — جسر`,
            type: 'form_bridge',
            recipients: bridgeRecipients,
            link: ref.id,
            meta: { formId: ref.id, code: def.code, bridge },
          });
        }
      }
      return ref.id;
    } catch (e) {
      console.error('Error creating form:', e);
      return null;
    }
  }, [dispatchNotification, usersByRole, users]);

  const advanceForm = useCallback(async (
    formId: string,
    user: UserProfile,
    decision: 'approved' | 'rejected' | 'deferred',
    note?: string,
  ) => {
    const rec = forms.find(f => f.id === formId);
    if (!rec) return;
    const myRole = user.role as RoleKey;
    const expected = rec.approvalChain[rec.approvalIndex];
    if (expected !== myRole && user.role !== 'ADMIN') return;

    const newApproval = { role: expected, actorId: user.id, at: new Date().toISOString(), decision, note };
    let nextStatus: FormRecord['status'] = rec.status;
    let nextIndex = rec.approvalIndex;

    if (decision === 'approved') {
      nextIndex = rec.approvalIndex + 1;
      nextStatus = nextIndex >= rec.approvalChain.length ? 'approved' : 'pending';
    } else if (decision === 'rejected') {
      nextStatus = 'rejected';
    } else if (decision === 'deferred') {
      nextStatus = 'deferred';
    }

    try {
      await updateDoc(doc(db, 'forms', formId), {
        approvals: [...rec.approvals, newApproval],
        approvalIndex: nextIndex,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });

      // إشعار المنشئ بالنتيجة
      if (decision !== 'approved' || nextStatus === 'approved') {
        await dispatchNotification({
          text: `${decision === 'approved' ? 'تم اعتماد' : decision === 'rejected' ? 'تم رفض' : 'تم تأجيل'} نموذجك ${rec.code} ${rec.title}`,
          subject: `${rec.code} — ${decision === 'approved' ? 'اعتماد' : decision === 'rejected' ? 'رفض' : 'تأجيل'}`,
          type: `form_${decision}`,
          recipients: [rec.createdBy],
          link: formId,
          meta: { formId, code: rec.code, decision },
        });
      }

      // إشعار الدور التالي
      if (nextStatus === 'pending' && nextIndex < rec.approvalChain.length) {
        const nextRole = rec.approvalChain[nextIndex];
        await dispatchNotification({
          text: `طلب بانتظار اعتمادك: ${rec.code} ${rec.title}`,
          subject: `${rec.code} — ${rec.title}`,
          type: 'form_pending',
          recipients: usersByRole(nextRole),
          link: formId,
          meta: { formId, code: rec.code },
        });
      }

      // إطلاق النماذج التابعة عند الاعتماد النهائي
      if (nextStatus === 'approved') {
        const def = FORM_BY_CODE[rec.code];
        for (const trig of (def?.triggers || [])) {
          // إنشاء بشكل تلقائي تحت اسم النظام (المنشئ الأصلي)
          await createForm({
            code: trig,
            user: user,
            projectId: rec.projectId,
            notes: `أُطلق تلقائياً من ${rec.code}`,
            triggeredBy: formId,
          });
        }
      }
    } catch (e) { console.error('Error advancing form:', e); }
  }, [forms, dispatchNotification, usersByRole, createForm]);

  const formsApi: FormsApi = useMemo(() => ({
    forms,
    createForm,
    approveForm: (id, user, note) => advanceForm(id, user, 'approved', note),
    rejectForm: (id, user, note) => advanceForm(id, user, 'rejected', note),
    deferForm: (id, user, note) => advanceForm(id, user, 'deferred', note),
  }), [forms, createForm, advanceForm]);

  /* ────────── Users API ────────── */
  const approveUser = useCallback(async (userId: string, edits: any, approverId: string) => {
    try {
      const existing = users.find(u => u.id === userId);
      const auditEntry = { at: new Date().toISOString(), actor: approverId, action: 'approved', from: { status: 'pending' }, to: { ...edits, status: 'active' } };
      await updateDoc(doc(db, 'users', userId), {
        ...edits, status: 'active', approvedBy: approverId, approvedAt: new Date().toISOString(),
        auditLog: [...(existing?.auditLog || []), auditEntry],
      });
    } catch (e) { console.error('Error approving user:', e); }
  }, [users]);

  const updateUser = useCallback(async (userId: string, edits: any, actorId: string) => {
    try {
      const existing = users.find(u => u.id === userId);
      if (!existing) return;
      const auditEntry = { at: new Date().toISOString(), actor: actorId, action: 'updated', from: existing, to: edits };
      await updateDoc(doc(db, 'users', userId), { ...edits, auditLog: [...(existing.auditLog || []), auditEntry] });
    } catch (e) { console.error('Error updating user:', e); }
  }, [users]);

  const deactivateUser = useCallback(async (userId: string, actorId: string, reassignedTo: string) => {
    try {
      const existing = users.find(u => u.id === userId);
      if (!existing) return;
      const auditEntry = { at: new Date().toISOString(), actor: actorId, action: 'deactivated', reassignedTo };
      await updateDoc(doc(db, 'users', userId), {
        status: 'deactivated', deactivatedAt: new Date().toISOString(), deactivatedBy: actorId,
        auditLog: [...(existing.auditLog || []), auditEntry],
      });
    } catch (e) { console.error('Error deactivating user:', e); }
  }, [users]);

  const reactivateUser = useCallback(async (userId: string, actorId: string) => {
    try {
      const existing = users.find(u => u.id === userId);
      if (!existing) return;
      const auditEntry = { at: new Date().toISOString(), actor: actorId, action: 'reactivated' };
      await updateDoc(doc(db, 'users', userId), {
        status: 'active', deactivatedAt: null, deactivatedBy: null,
        auditLog: [...(existing.auditLog || []), auditEntry],
      });
    } catch (e) { console.error('Error reactivating user:', e); }
  }, [users]);

  const rejectUser = useCallback(async (userId: string, _actorId: string, _reason?: string) => {
    try { await deleteDoc(doc(db, 'users', userId)); }
    catch (e) { console.error('Error rejecting user:', e); }
  }, []);

  /* ────────── Allowed portals for current user ────────── */
  const allowedDepts: DepartmentKey[] = useMemo(() => {
    if (!userProfile) return [];
    if (isAdmin) return DEPARTMENTS.map(d => d.key);
    return portalAccessForRole(userProfile.role as RoleKey);
  }, [userProfile, isAdmin]);

  const myNotifications = useMemo(() =>
    notifications.filter(n => (n.recipients || []).includes(userProfile?.id || '') || (n.recipients || []).length === 0),
    [notifications, userProfile?.id],
  );
  const unreadCount = myNotifications.filter(n => !(n.readBy || []).includes(userProfile?.id || '')).length;

  /* ────────── Render gates ────────── */
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
    return <PendingAccountScreen email={firebaseUser.email} onSignOut={() => signOut(auth)} />;
  }

  if (userProfile && userProfile.status === 'deactivated') {
    return <DeactivatedAccountScreen onSignOut={() => signOut(auth)} />;
  }

  /* ────────── Render layout ────────── */
  const goToPortal = (p: ActivePortal) => setActive(p);

  const renderActive = () => {
    if (!userProfile) return null;
    if (active === 'HOME') {
      return (
        <DashboardHome
          user={userProfile}
          api={formsApi}
          goToPortal={(d) => setActive(d as ActivePortal)}
          allowedDepts={allowedDepts}
        />
      );
    }
    if (active === 'EXEC_HUB') {
      return <ExecutiveHubPanel user={userProfile} users={users} api={formsApi} />;
    }
    if (active === 'ADMIN') {
      return (
        <AdminUsersPortal
          users={users}
          approveUser={approveUser}
          updateUser={updateUser}
          deactivateUser={deactivateUser}
          reactivateUser={reactivateUser}
          rejectUser={rejectUser}
          currentUser={userProfile}
        />
      );
    }
    const Portal = DEPT_PORTALS[active as DepartmentKey];
    if (Portal) return <Portal user={userProfile} users={users} api={formsApi} />;
    return null;
  };

  return (
    <div className="min-h-screen font-sans bg-[#F8F9FA]" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');
        body, .font-sans { font-family: 'Tajawal', system-ui, -apple-system, sans-serif !important; }
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
        @media (prefers-reduced-motion: reduce) {
          .brick, .diamond, .splash-tagline, .splash-tagline-en { animation: none !important; opacity: 1 !important; }
          .splash-overlay.exiting { animation: simpleFade 300ms ease-out forwards; }
          @keyframes simpleFade { to { opacity: 0; } }
          .logo-breathe-on-hover:hover { animation: none; }
        }
      `}} />

      {splashVisible && <TarmeemSplash onComplete={() => setSplashVisible(false)} />}

      {isOffline && (
        <div className="bg-red-500 text-white text-xs font-bold py-1 text-center flex items-center justify-center gap-2 z-50">
          <WifiOff className="w-3 h-3" /> وضع عدم الاتصال
        </div>
      )}

      {/* رأس الصفحة */}
      <header className="shadow-md bg-[#4A1F66]">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-white">
            <div className="hidden md:block logo-breathe-on-hover cursor-pointer" onClick={() => setActive('HOME')}>
              <TarmeemLogo variant="horizontal" size={28} color="white" animated={false} />
            </div>
            <div className="md:hidden logo-breathe-on-hover cursor-pointer" onClick={() => setActive('HOME')}>
              <TarmeemLogo variant="icon" size={28} color="white" animated={false} />
            </div>
            <div className="hidden md:block border-r border-white/20 pr-3 mr-3">
              <h1 className="text-sm font-bold leading-none text-white/90">منصة العمليات الموحّدة</h1>
              <p className="text-[10px] text-white/60 leading-none mt-1">جمعية ترميم</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* جرس الإشعارات */}
            <div className="relative" ref={bellRef}>
              <button onClick={() => setBellOpen(v => !v)} className="relative p-1.5 hover:bg-white/10 rounded-lg transition">
                <Bell className="w-5 h-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-[#4A1F66]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white shadow-2xl rounded-xl z-50 border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
                    <span className="font-bold text-gray-700 text-sm">الإشعارات ({myNotifications.length})</span>
                    {unreadCount > 0 && userProfile && (
                      <button onClick={() => markAllNotificationsRead(userProfile.id)}
                        className="text-[10px] text-[#4A1F66] hover:underline font-bold">تعليم الكل كمقروء</button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {myNotifications.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-xs">لا توجد إشعارات</div>
                    ) : (
                      myNotifications.map(n => {
                        const isRead = (n.readBy || []).includes(userProfile?.id || '');
                        return (
                          <div key={n.id} onClick={() => {
                            if (!isRead && userProfile) markNotificationRead(n.id as string, userProfile.id);
                            setBellOpen(false);
                          }}
                            className={`px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 transition flex gap-2 ${!isRead ? 'bg-blue-50/50' : ''}`}>
                            <div className="shrink-0 mt-0.5">
                              {n.type === 'form_rejected' || n.type === 'form_late' ? <AlertTriangle className="w-4 h-4 text-orange-500" /> :
                                n.type === 'form_pending' ? <ClipboardList className="w-4 h-4 text-blue-500" /> :
                                  n.type === 'form_approved' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
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

            {/* المستخدم */}
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg p-1.5">
              <UserIcon className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-xs">{userProfile?.fullName}</span>
              <span className="hidden md:inline text-white/60 text-[10px]">— {roleName(userProfile?.role || '')}</span>
            </div>
            <button onClick={() => signOut(auth)} className="text-white/60 hover:text-white text-[10px] font-bold hover:underline transition">خروج</button>
          </div>
        </div>
      </header>

      {/* جسم الصفحة: شريط جانبي + المحتوى */}
      <div className="max-w-[1600px] mx-auto flex">
        {userProfile && (
          <PortalSidebar
            active={active}
            onChange={goToPortal}
            user={userProfile}
            api={formsApi}
            isAdmin={isAdmin}
            allowedDepts={allowedDepts}
          />
        )}
        <main className="flex-1 px-4 py-6 pb-24 md:pb-8 min-w-0">
          {renderActive()}
        </main>
      </div>

      {userProfile && (
        <PortalMobileNav active={active} onChange={goToPortal} user={userProfile} isAdmin={isAdmin} allowedDepts={allowedDepts} />
      )}
    </div>
  );
}

export default App;
