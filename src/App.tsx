import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Bell, WifiOff, User as UserIcon, AlertTriangle, ClipboardList, CheckCircle2,
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, runTransaction,
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { getUserProfile, AuthScreen, type UserProfile } from './components/Auth';
import { TarmeemLogo, TarmeemSplash, ThemeProvider, ThemeToggle } from './components/ui';
import {
  DashboardHome, PendingAccountScreen, DeactivatedAccountScreen,
} from './components/Home';
import {
  DEPT_PORTALS, PortalSidebar, PortalMobileNav, type ActivePortal,
} from './components/Departments';
import { AdminUsersPortal } from './components/Admin';
import { MasterProjectList, ProjectDetail } from './components/Projects';
import { EmployeeProfile } from './components/EmployeeProfile';
import {
  DEPARTMENTS, DepartmentKey, RoleKey, FORM_BY_CODE, FormCode,
  portalAccessForRole, roleName, isAdminEmail, formatProjectId,
  requiredDeptForApprovalStep,
} from './lib/data';
import type { FormRecord, FormsApi } from './components/Forms';
import { FormDetailModal, NewFormModal } from './components/Forms';
import { RENDERERS, CREATORS, ProjectRecord, FormsContext } from './components/forms/FormRenderers';

/* ──────────────────────────────────────────────────────────────────
   Notifications
   ────────────────────────────────────────────────────────────────── */

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
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [active, setActive] = useState<ActivePortal>('HOME');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [openFormId, setOpenFormId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFormPreselect, setNewFormPreselect] = useState<FormCode | undefined>(undefined);

  const [splashVisible, setSplashVisible] = useState(() => !sessionStorage.getItem('tarmeem_splash_seen'));
  useEffect(() => { if (!splashVisible) sessionStorage.setItem('tarmeem_splash_seen', 'true'); }, [splashVisible]);

  /* ────────── Auth ────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const profile = await getUserProfile(user.uid);
        setRawUserProfile(profile);
        // Auto-promote configured admin emails on first sign-in if profile exists but isn't admin
        if (profile && isAdminEmail(user.email) && profile.role !== 'ADMIN') {
          await updateDoc(doc(db, 'users', user.uid), {
            role: 'ADMIN',
            status: 'active',
            isManager: true,
            department: profile.department || 'EXEC',
            auditLog: [...(profile.auditLog || []), {
              at: new Date().toISOString(), actor: 'system', action: 'auto-promoted-admin', from: { role: profile.role }, to: { role: 'ADMIN' },
            }],
          });
        }
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

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectRecord)));
    }, (err) => console.error('Projects listener error:', err));

    const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification)));
    }, (err) => console.error('Notifications listener error:', err));

    return () => { unsubUsers(); unsubForms(); unsubProjects(); unsubNotifs(); };
  }, [firebaseUser]);

  /* ────────── Online / Bell ────────── */
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ────────── Profile guard (Admin uppercase + email-based admin) ────────── */
  const userProfile: UserProfile | null = useMemo(() => {
    if (!rawUserProfile) return null;
    const r = rawUserProfile.role as string;
    if (isAdminEmail(rawUserProfile.email) || (typeof r === 'string' && r.toLowerCase() === 'admin')) {
      return { ...rawUserProfile, role: 'ADMIN', status: 'active' } as UserProfile;
    }
    return rawUserProfile;
  }, [rawUserProfile]);

  const isAdmin = userProfile?.role === 'ADMIN';

  /* ────────── Notifications ────────── */
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
        await updateDoc(doc(db, 'notifications', n.id), { readBy: [...(n.readBy || []), userId] });
      }
    } catch (e) { console.error('Error marking all read:', e); }
  }, [notifications]);

  /* ────────── Workflow Engine ────────── */

  const usersByRole = useCallback((role: RoleKey): string[] =>
    users.filter(u => u.status === 'active' && u.role === role).map(u => u.id),
  [users]);

  const usersByDeptManager = useCallback((dept: DepartmentKey): string[] =>
    users.filter(u => u.status === 'active' && u.department === dept && u.isManager).map(u => u.id),
  [users]);

  /** مولِّد رقم المشروع TRM-YYYY-NNN — يستخدم Firestore transaction على counter */
  const generateProjectId = useCallback(async (): Promise<{ projectId: string; serial: number }> => {
    const year = new Date().getFullYear();
    const counterRef = doc(db, 'counters', `projects-${year}`);
    const serial = await runTransaction(db, async (trx) => {
      const snap = await trx.get(counterRef);
      const current = snap.exists() ? (snap.data().value || 0) : 0;
      const next = current + 1;
      trx.set(counterRef, { value: next, year }, { merge: true });
      return next;
    });
    return { projectId: formatProjectId(year, serial), serial };
  }, []);

  /** ينشئ سجل مشروع في مجموعة projects ويعيد المعرّف */
  const createProject = useCallback(async (data: Partial<ProjectRecord>): Promise<string | null> => {
    try {
      const now = new Date().toISOString();
      const ref = await addDoc(collection(db, 'projects'), {
        ...data,
        createdAt: now, updatedAt: now,
        progressPct: data.progressPct || 0,
        phase: data.phase || 'RESEARCH',
      });
      await updateDoc(ref, { id: ref.id });
      await dispatchNotification({
        text: `تم إنشاء مشروع جديد ${data.projectId} للمستفيد ${data.beneficiaryName}`,
        subject: `${data.projectId} — مشروع جديد`,
        type: 'project_created',
        recipients: usersByDeptManager('PROJECTS'),
        link: ref.id,
        meta: { projectId: data.projectId, projectRefId: ref.id },
      });
      return ref.id;
    } catch (e) { console.error('createProject:', e); return null; }
  }, [dispatchNotification, usersByDeptManager]);

  const updateProject = useCallback(async (projectRefId: string, patch: Partial<ProjectRecord>) => {
    try { await updateDoc(doc(db, 'projects', projectRefId), { ...patch, updatedAt: new Date().toISOString() }); }
    catch (e) { console.error('updateProject:', e); }
  }, []);

  /** يحدّد المرحلة حسب اعتمادات النموذج المكتمل */
  const phaseTransition = useCallback((code: FormCode): { phase: ProjectRecord['phase']; progress: number } | null => {
    switch (code) {
      case 'F-03': return { phase: 'DIAGNOSIS', progress: 25 };
      case 'F-08': return { phase: 'DIAGNOSIS', progress: 35 };
      case 'F-18': return { phase: 'EVACUATION', progress: 40 };
      case 'F-85': return { phase: 'TENDERING', progress: 55 };
      case 'F-33': return { phase: 'EXECUTION', progress: 60 };
      case 'F-14': return { phase: 'EXECUTION', progress: 70 };
      case 'F-07': return { phase: 'CLOSED', progress: 100 };
      default: return null;
    }
  }, []);

  const createForm: FormsApi['createForm'] = useCallback(async (input) => {
    try {
      const def = FORM_BY_CODE[input.code];
      if (!def) return null;
      const role = input.user.role as RoleKey;
      const startIdx = def.approvalChain[0] === role ? 1 : 0;
      const initialApprovals = startIdx === 1 ? [{
        role, actorId: input.user.id, actorName: input.user.fullName,
        at: new Date().toISOString(), decision: 'approved' as const, note: 'إنشاء',
      }] : [];

      // إذا كان F-08 — أسنده لمهندس التشخيص الخاص بالمشروع تلقائياً
      let assigneeId = input.assigneeId || null;
      if (def.code === 'F-08' && input.projectRefId) {
        const project = projects.find(p => p.id === input.projectRefId);
        if (project?.diagnosisEngineerId) assigneeId = project.diagnosisEngineerId;
      }

      const rec: Omit<FormRecord, 'id'> = {
        code: def.code,
        title: def.title,
        projectId: input.projectId || null,
        projectRefId: input.projectRefId || null,
        beneficiaryName: input.beneficiaryName || '',
        status: startIdx >= def.approvalChain.length ? 'approved' : 'pending',
        approvalIndex: startIdx,
        approvalChain: def.approvalChain,
        approvals: initialApprovals,
        createdBy: input.user.id,
        createdByName: input.user.fullName,
        createdByRole: role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerDept: def.ownerDept,
        bridgesTo: def.bridgesTo || [],
        notes: input.notes || '',
        data: input.data || {},
        triggeredBy: input.triggeredBy || null,
        assigneeId,
        files: input.files || [],
        stepStartedAt: new Date().toISOString(),
      };
      const ref = await addDoc(collection(db, 'forms'), rec);
      await updateDoc(ref, { id: ref.id });
      const newFormId = ref.id;

      // إشعار التالي
      const nextRole = def.approvalChain[startIdx];
      if (nextRole) {
        const recipients = assigneeId ? [assigneeId] : usersByRole(nextRole);
        await dispatchNotification({
          text: `طلب جديد بانتظار اعتمادك: ${def.code} ${def.title}${input.beneficiaryName ? ' — ' + input.beneficiaryName : ''}`,
          subject: `${def.code} — ${def.title}`,
          type: 'form_pending',
          recipients,
          link: ref.id,
          meta: { formId: ref.id, code: def.code, projectId: input.projectId },
        });
      }
      // إشعار جسور
      for (const bridge of (def.bridgesTo || [])) {
        const bridgeRecipients = usersByDeptManager(bridge);
        if (bridgeRecipients.length > 0) {
          await dispatchNotification({
            text: `إخطار جسري إلى إدارتك: ${def.code} ${def.title}`,
            subject: `${def.code} — جسر`,
            type: 'form_bridge',
            recipients: bridgeRecipients,
            link: ref.id,
            meta: { formId: ref.id, code: def.code, bridge },
          });
        }
      }
      // F-08 (كراسة تشخيص المبنى): فور إنشائها أطلق F-20 و F-09 لرئيس قسم الإشراف
      if (def.code === 'F-08' && input.projectRefId) {
        await createFormRef.current?.({
          code: 'F-20', user: input.user,
          projectId: input.projectId, projectRefId: input.projectRefId,
          beneficiaryName: input.beneficiaryName,
          triggeredBy: newFormId,
          notes: 'أُطلق تلقائياً مع كراسة التشخيص F-08.',
        });
        await createFormRef.current?.({
          code: 'F-09', user: input.user,
          projectId: input.projectId, projectRefId: input.projectRefId,
          beneficiaryName: input.beneficiaryName,
          triggeredBy: newFormId,
          notes: 'أُطلق تلقائياً مع كراسة التشخيص F-08.',
        });
      }

      return newFormId;
    } catch (e) { console.error('createForm:', e); return null; }
  }, [dispatchNotification, usersByRole, usersByDeptManager, projects]);

  /** مرجع متغيّر إلى createForm حتى نتمكّن من الاستدعاء الذاتي للنماذج المُتسلسلة (F-08 ➡️ F-20/F-09 …). */
  const createFormRef = useRef<FormsApi['createForm'] | null>(null);
  useEffect(() => { createFormRef.current = createForm; }, [createForm]);

  /** إجراءات الاعتماد المركزية */
  const advanceForm = useCallback(async (
    formId: string, user: UserProfile, decision: 'approved' | 'rejected' | 'deferred', note?: string,
    dataPatch?: Record<string, any>,
  ) => {
    const rec = forms.find(f => f.id === formId);
    if (!rec) return;
    const myRole = user.role as RoleKey;
    const expected = rec.approvalChain[rec.approvalIndex];
    if (expected !== myRole && user.role !== 'ADMIN') return;
    const requiredDept = requiredDeptForApprovalStep(rec.code, rec.approvalIndex);
    if (requiredDept && user.department !== requiredDept && user.role !== 'ADMIN') return;
    if (rec.assigneeId && rec.assigneeId !== user.id && user.role !== 'ADMIN') return;

    const now = new Date().toISOString();
    const newApproval = { role: expected, actorId: user.id, actorName: user.fullName, at: now, decision, note };
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

    const patch: any = {
      approvals: [...rec.approvals, newApproval],
      approvalIndex: nextIndex,
      status: nextStatus,
      updatedAt: now,
      stepStartedAt: now,
    };
    if (dataPatch) {
      patch.data = { ...(rec.data || {}), ...(dataPatch as any) };
      // استخراج projectId/projectRefId من dataPatch
      if (dataPatch.projectId) patch.projectId = dataPatch.projectId;
      if (dataPatch.projectRefId) patch.projectRefId = dataPatch.projectRefId;
    }

    try {
      await updateDoc(doc(db, 'forms', formId), patch);
    } catch (e) { console.error('advanceForm:', e); return; }

    // إشعار المنشئ
    if (decision !== 'approved' || nextStatus === 'approved') {
      await dispatchNotification({
        text: `${decision === 'approved' ? 'تم اعتماد' : decision === 'rejected' ? 'تم رفض' : 'تم تأجيل'} نموذجك ${rec.code} ${rec.title}`,
        subject: `${rec.code} — ${decision}`,
        type: `form_${decision}`,
        recipients: [rec.createdBy],
        link: formId,
        meta: { formId, code: rec.code, decision },
      });
    }

    // إشعار التالي
    if (nextStatus === 'pending' && nextIndex < rec.approvalChain.length) {
      const nextRole = rec.approvalChain[nextIndex];
      const recipients = (rec.code === 'F-08' && rec.assigneeId) ? [rec.assigneeId] : usersByRole(nextRole);
      await dispatchNotification({
        text: `طلب بانتظار اعتمادك: ${rec.code} ${rec.title}`,
        subject: `${rec.code} — ${rec.title}`,
        type: 'form_pending',
        recipients,
        link: formId,
        meta: { formId, code: rec.code },
      });
    }

    // عند الاعتماد النهائي
    if (nextStatus === 'approved') {
      // تحديث المرحلة ونسبة المشروع (إن وجد)
      if (rec.projectRefId) {
        const t = phaseTransition(rec.code);
        if (t) await updateProject(rec.projectRefId, { phase: t.phase, progressPct: t.progress });
        // Trigger A — F-08.safetyHazard => spawn BOTH F-18 and F-22 simultaneously
        if (rec.code === 'F-08' && (rec.data?.safetyHazard || dataPatch?.safetyHazard)) {
          await createForm({
            code: 'F-18', user, projectId: rec.projectId, projectRefId: rec.projectRefId,
            beneficiaryName: rec.beneficiaryName, notes: 'أُطلق تلقائياً من F-08 (سلامة).',
            triggeredBy: rec.id,
          });
          await createForm({
            code: 'F-22', user, projectId: rec.projectId, projectRefId: rec.projectRefId,
            beneficiaryName: rec.beneficiaryName, notes: 'أُطلق تلقائياً من F-08 (سلامة).',
            triggeredBy: rec.id,
          });
        }
        // F-14 dynamic loop — triggersPayment spawns matching F-15 + next-seq F-14
        if (rec.code === 'F-14') {
          const patched = { ...(rec.data || {}), ...(dataPatch || {}) };
          const seq = (patched.seq as number) || 1;
          if (patched.triggersPayment) {
            await createForm({
              code: 'F-15', user, projectId: rec.projectId, projectRefId: rec.projectRefId,
              beneficiaryName: rec.beneficiaryName,
              data: { seq, milestone: seq, amount: 0 },
              notes: `أُطلق تلقائياً من F-14 #${seq}`,
              triggeredBy: rec.id,
            });
            await createForm({
              code: 'F-14', user, projectId: rec.projectId, projectRefId: rec.projectRefId,
              beneficiaryName: rec.beneficiaryName,
              data: { seq: seq + 1, triggersPayment: false, requestScopeChange: false },
              notes: `تقرير دوري جديد متابعة لـ #${seq}`,
              triggeredBy: rec.id,
            });
          }
          // Trigger B — requestScopeChange => spawn F-23
          if (patched.requestScopeChange) {
            await createForm({
              code: 'F-23', user, projectId: rec.projectId, projectRefId: rec.projectRefId,
              beneficiaryName: rec.beneficiaryName,
              data: { items: [], reason: 'تغيير نطاق ميداني', seq },
              notes: 'أُطلق تلقائياً من F-14 (تغيير نطاق).',
              triggeredBy: rec.id,
            });
          }
        }
        // F-85: تحدّث contractor & price على المشروع
        if (rec.code === 'F-85') {
          await updateProject(rec.projectRefId, {
            contractorName: rec.data?.winnerContractor,
            awardedPrice: rec.data?.winnerPrice,
          });
        }
        // F-07: media trigger
        if (rec.code === 'F-07' && rec.data?.mediaRequested) {
          await createForm({
            code: 'F-52', user, projectId: rec.projectId, projectRefId: rec.projectRefId,
            beneficiaryName: rec.beneficiaryName,
            data: { type: 'قبل/بعد', details: 'تم طلب التوثيق من شهادة التسليم.' },
            notes: 'أُطلق تلقائياً من F-07.',
            triggeredBy: rec.id,
          });
        }
        // F-03 (التحويل النهائي إلى إدارة المشاريع): افتح F-04 لرئيس قسم التشخيص
        if (rec.code === 'F-03') {
          await createForm({
            code: 'F-04', user,
            projectId: rec.projectId, projectRefId: rec.projectRefId,
            beneficiaryName: rec.beneficiaryName,
            notes: 'أُطلق تلقائياً بعد اعتماد F-03 وإحالة المشروع إلى إدارة المشاريع.',
            triggeredBy: rec.id,
          });
        }
        // F-04: يحفظ مهندس التشخيص في المشروع ثم يفتح كراسة التشخيص F-08 للمهندس المُختار
        if (rec.code === 'F-04') {
          const patchedData = { ...(rec.data || {}), ...(dataPatch || {}) };
          if (patchedData.engineerId) {
            await updateProject(rec.projectRefId, { diagnosisEngineerId: patchedData.engineerId });
          }
          await createForm({
            code: 'F-08', user,
            projectId: rec.projectId, projectRefId: rec.projectRefId,
            beneficiaryName: rec.beneficiaryName,
            assigneeId: patchedData.engineerId || null,
            notes: 'أُطلق تلقائياً بعد تعيين مهندس التشخيص.',
            triggeredBy: rec.id,
          });
        }
        // F-09: يحفظ المهندس المشرف في المشروع
        if (rec.code === 'F-09') {
          const patchedData = { ...(rec.data || {}), ...(dataPatch || {}) };
          if (patchedData.engineerId) {
            await updateProject(rec.projectRefId, { supervisingEngineerId: patchedData.engineerId });
          }
        }
      }

      // (Note: F-22 is now spawned directly from F-08.safetyHazard above,
      // not chained via F-18 approval, per the user's Trigger A requirement.)

      // التحريك التلقائي حسب triggers الموجودة في FORMS
      const def = FORM_BY_CODE[rec.code];
      for (const trig of (def?.triggers || [])) {
        // F-03 → F-08 يُعالَج خصيصاً (يحتاج إسناد المهندس عبر F-03 transfer)
        if (rec.code === 'F-03' && trig === 'F-08') {
          // F-08 سيُنشأ يدوياً عبر F03Renderer.transferToProjects عبر createProject + createForm
          continue;
        }
        // عام: ينشئ النموذج كمسودة لاحقة (نظري — في هذا المسار نُترك يدوياً)
      }
    }
  }, [forms, dispatchNotification, usersByRole, phaseTransition, updateProject, createForm]);

  const updateFormData: FormsApi['updateFormData'] = useCallback(async (formId, dataPatch) => {
    const rec = forms.find(f => f.id === formId);
    if (!rec) return;
    await updateDoc(doc(db, 'forms', formId), { data: { ...(rec.data || {}), ...dataPatch }, updatedAt: new Date().toISOString() });
  }, [forms]);

  const attachFiles: FormsApi['attachFiles'] = useCallback(async (formId, files) => {
    const rec = forms.find(f => f.id === formId);
    if (!rec) return;
    await updateDoc(doc(db, 'forms', formId), { files: [...(rec.files || []), ...(files || [])], updatedAt: new Date().toISOString() });
  }, [forms]);

  const formsApi: FormsApi = useMemo(() => ({
    forms,
    createForm,
    approveForm: (id, user, note, patch) => advanceForm(id, user, 'approved', note, patch),
    rejectForm: (id, user, note) => advanceForm(id, user, 'rejected', note),
    deferForm: (id, user, note) => advanceForm(id, user, 'deferred', note),
    updateFormData,
    attachFiles,
  }), [forms, createForm, advanceForm, updateFormData, attachFiles]);

  /* ────────── Forms context for renderers ────────── */
  const formsContext: FormsContext = useMemo(() => ({
    projects,
    generateProjectId,
    createProject,
    updateProject,
    findProjectForm: (projectRefId, code) =>
      formsApi.forms.find(f => f.projectRefId === projectRefId && f.code === code) || null,
    userById: (id) => users.find(u => u.id === id),
  }), [projects, generateProjectId, createProject, updateProject, formsApi.forms, users]);

  /* ────────── Users API ────────── */
  const approveUser = useCallback(async (userId: string, edits: any, approverId: string) => {
    try {
      const existing = users.find(u => u.id === userId);
      const auditEntry = { at: new Date().toISOString(), actor: approverId, action: 'approved', from: { status: 'pending' }, to: { ...edits, status: 'active' } };
      await updateDoc(doc(db, 'users', userId), {
        ...edits, status: 'active', approvedBy: approverId, approvedAt: new Date().toISOString(),
        needsRoleReset: false,
        auditLog: [...(existing?.auditLog || []), auditEntry],
      });
      // notify the user
      await dispatchNotification({
        text: `تم تفعيل حسابك بدور ${roleName(edits.role)}.`,
        subject: 'تفعيل الحساب',
        type: 'account_approved',
        recipients: [userId],
        meta: { role: edits.role },
      });
    } catch (e) { console.error('approveUser:', e); }
  }, [users, dispatchNotification]);

  const updateUser = useCallback(async (userId: string, edits: any, actorId: string) => {
    try {
      const existing = users.find(u => u.id === userId);
      if (!existing) return;
      const auditEntry = { at: new Date().toISOString(), actor: actorId, action: 'updated', from: { role: existing.role, department: existing.department }, to: edits };
      await updateDoc(doc(db, 'users', userId), { ...edits, auditLog: [...(existing.auditLog || []), auditEntry] });
    } catch (e) { console.error('updateUser:', e); }
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
    } catch (e) { console.error('deactivateUser:', e); }
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
    } catch (e) { console.error('reactivateUser:', e); }
  }, [users]);

  const rejectUser = useCallback(async (userId: string, _actorId: string, _reason?: string) => {
    try { await deleteDoc(doc(db, 'users', userId)); }
    catch (e) { console.error('rejectUser:', e); }
  }, []);

  /** يعيد ضبط مستخدم قديم: يضع status=pending ويفرغ role/department */
  const resetUserRole = useCallback(async (userId: string, actorId: string) => {
    try {
      const existing = users.find(u => u.id === userId);
      if (!existing) return;
      const auditEntry = { at: new Date().toISOString(), actor: actorId, action: 'role-reset', from: { role: existing.role, department: existing.department }, to: { role: 'PENDING' } };
      await updateDoc(doc(db, 'users', userId), {
        role: 'PENDING', department: '', isManager: false,
        status: 'pending', needsRoleReset: true,
        auditLog: [...(existing.auditLog || []), auditEntry],
      });
    } catch (e) { console.error('resetUserRole:', e); }
  }, [users]);

  const saveProfile = useCallback(async (userId: string, patch: Partial<UserProfile>) => {
    try { await updateDoc(doc(db, 'users', userId), patch); }
    catch (e) { console.error('saveProfile:', e); }
  }, []);

  /* ────────── Allowed portals ────────── */
  const allowedDepts: DepartmentKey[] = useMemo(() => {
    if (!userProfile) return [];
    if (isAdmin) return DEPARTMENTS.map(d => d.key);
    if (userProfile.role === 'PENDING') return [];
    return portalAccessForRole(userProfile.role as RoleKey);
  }, [userProfile, isAdmin]);

  const myNotifications = useMemo(() =>
    notifications.filter(n => (n.recipients || []).includes(userProfile?.id || '')),
    [notifications, userProfile?.id],
  );
  const unreadCount = myNotifications.filter(n => !(n.readBy || []).includes(userProfile?.id || '')).length;

  /* ────────── Render gates ────────── */
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center" dir="rtl">
        <TarmeemLogo variant="stacked" size={60} animated={true} />
      </div>
    );
  }
  if (!firebaseUser) return <AuthScreen onAuth={() => {}} />;
  if (userProfile && userProfile.status === 'pending') return <PendingAccountScreen email={firebaseUser.email} onSignOut={() => signOut(auth)} />;
  if (userProfile && userProfile.status === 'deactivated') return <DeactivatedAccountScreen onSignOut={() => signOut(auth)} />;

  /* ────────── Render ────────── */
  const goToPortal = (p: ActivePortal) => {
    setActive(p);
    if (p !== 'PROJECTS_LIST') setActiveProjectId(null);
    if (p !== 'PROFILE') setActiveProfileId(null);
  };
  const openForm = (id: string) => setOpenFormId(id);
  const openProject = (id: string) => { setActiveProjectId(id); setActive('PROJECTS_LIST'); };
  const openProfile = (id: string) => { setActiveProfileId(id); setActive('PROFILE'); };
  const openCreator = (preselect?: FormCode) => { setNewFormPreselect(preselect); setShowNewForm(true); };

  const openRec = openFormId ? formsApi.forms.find(f => f.id === openFormId) || null : null;
  const activeProject = activeProjectId ? projects.find(p => p.id === activeProjectId) || null : null;
  const profileTarget = activeProfileId
    ? users.find(u => u.id === activeProfileId) || null
    : userProfile;

  const renderActive = () => {
    if (!userProfile) return null;
    if (active === 'HOME') {
      return (
        <DashboardHome
          user={userProfile}
          api={formsApi}
          projects={projects}
          goToPortal={(d) => setActive(d as ActivePortal)}
          goToProjects={() => setActive('PROJECTS_LIST')}
          goToProject={openProject}
          allowedDepts={allowedDepts}
        />
      );
    }
    if (active === 'PROJECTS_LIST') {
      return activeProject ? (
        <ProjectDetail project={activeProject} user={userProfile} users={users} api={formsApi}
          onBack={() => setActiveProjectId(null)} onOpenForm={openForm}
          updateProject={updateProject} />
      ) : (
        <MasterProjectList user={userProfile} api={formsApi} projects={projects} users={users} onOpenProject={openProject} />
      );
    }
    if (active === 'PROFILE' && profileTarget) {
      return (
        <EmployeeProfile profile={profileTarget} currentUser={userProfile} api={formsApi} users={users}
          onBack={() => { setActiveProfileId(null); if (profileTarget.id !== userProfile.id) setActive('ADMIN'); else setActive('HOME'); }}
          onOpenForm={openForm} saveProfile={saveProfile} />
      );
    }
    if (active === 'ADMIN') {
      return (
        <AdminUsersPortal
          users={users}
          approveUser={approveUser} updateUser={updateUser}
          deactivateUser={deactivateUser} reactivateUser={reactivateUser}
          rejectUser={rejectUser} resetUserRole={resetUserRole}
          currentUser={userProfile}
          onOpenProfile={openProfile}
        />
      );
    }
    const Portal = DEPT_PORTALS[active as DepartmentKey];
    if (Portal) return <Portal user={userProfile} users={users} api={formsApi}
      onOpenForm={openForm} onCreateForm={(c) => openCreator(c)} />;
    return null;
  };

  return (
    <div className="min-h-screen font-sans bg-[#F8F9FA] dark:bg-slate-950 transition-colors text-gray-900 dark:text-slate-100" dir="rtl">
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

      <header className="shadow-md bg-[#4A1F66]">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-white">
            <div className="hidden md:block logo-breathe-on-hover cursor-pointer" onClick={() => goToPortal('HOME')}>
              <TarmeemLogo variant="horizontal" size={28} color="white" animated={false} />
            </div>
            <div className="md:hidden logo-breathe-on-hover cursor-pointer" onClick={() => goToPortal('HOME')}>
              <TarmeemLogo variant="icon" size={28} color="white" animated={false} />
            </div>
            <div className="hidden md:block border-r border-white/20 pr-3 mr-3">
              <h1 className="text-sm font-bold leading-none text-white/90">منصة العمليات الموحّدة</h1>
              <p className="text-[10px] text-white/60 leading-none mt-1">جمعية ترميم</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
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
                <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-800 shadow-2xl rounded-xl z-50 border border-gray-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex justify-between items-center">
                    <span className="font-bold text-gray-700 dark:text-slate-200 text-sm">الإشعارات ({myNotifications.length})</span>
                    {unreadCount > 0 && userProfile && (
                      <button onClick={() => markAllNotificationsRead(userProfile.id)}
                        className="text-[10px] text-[#4A1F66] dark:text-purple-300 hover:underline font-bold">تعليم الكل كمقروء</button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {myNotifications.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-xs">لا توجد إشعارات</div>
                    ) : (
                      myNotifications.map(n => {
                        const isRead = (n.readBy || []).includes(userProfile?.id || '');
                        return (
                          <div key={n.id} onClick={() => {
                            if (!isRead && userProfile) markNotificationRead(n.id, userProfile.id);
                            if (n.link) setOpenFormId(n.link);
                            setBellOpen(false);
                          }}
                            className={`px-4 py-3 border-b last:border-0 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900 transition flex gap-2 ${!isRead ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                            <div className="shrink-0 mt-0.5">
                              {n.type === 'form_rejected' || n.type === 'form_late' ? <AlertTriangle className="w-4 h-4 text-orange-500" /> :
                                n.type === 'form_pending' ? <ClipboardList className="w-4 h-4 text-blue-500" /> :
                                  n.type === 'form_approved' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                                    <Bell className="w-4 h-4 text-gray-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-xs leading-relaxed ${!isRead ? 'font-bold text-gray-800 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}>{n.text}</div>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-[10px] text-gray-400 dark:text-slate-500">{new Date(n.createdAt).toLocaleDateString('ar-SA')}</span>
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

            <button onClick={() => goToPortal('PROFILE')} className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg p-1.5 hover:bg-white/20 transition">
              <UserIcon className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-xs">{userProfile?.fullName}</span>
              <span className="hidden md:inline text-white/60 text-[10px]">— {roleName(userProfile?.role || '')}</span>
            </button>
            <button onClick={() => signOut(auth)} className="text-white/60 hover:text-white text-[10px] font-bold hover:underline transition">خروج</button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto flex">
        {userProfile && (
          <PortalSidebar
            active={active} onChange={goToPortal}
            user={userProfile} api={formsApi}
            isAdmin={isAdmin} allowedDepts={allowedDepts}
          />
        )}
        <main className="flex-1 px-4 py-6 pb-24 md:pb-8 min-w-0">
          {renderActive()}
        </main>
      </div>

      {userProfile && (
        <PortalMobileNav active={active} onChange={goToPortal} isAdmin={isAdmin} allowedDepts={allowedDepts} />
      )}

      {openRec && userProfile && (
        <FormDetailModal rec={openRec} user={userProfile} api={formsApi} users={users}
          registry={RENDERERS} context={formsContext}
          onClose={() => setOpenFormId(null)} />
      )}
      {showNewForm && userProfile && (
        <NewFormModal user={userProfile} api={formsApi} users={users}
          context={formsContext} creators={CREATORS} preselect={newFormPreselect}
          onClose={() => { setShowNewForm(false); setNewFormPreselect(undefined); }} />
      )}
    </div>
  );
}

export default function AppWithTheme() {
  return <ThemeProvider><App /></ThemeProvider>;
}
