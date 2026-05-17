import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where, orderBy, writeBatch, serverTimestamp, limit, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { Auth, UserProfile } from './components/Auth';
import { Projects } from './components/Projects';
import { Admin } from './components/Admin';
import { FormCode, FORMS, DEPARTMENTS, DepartmentKey } from './lib/data';
import { LayoutDashboard, Users, Building2, Bell, LogOut, Menu, X } from 'lucide-react';
import { F02Creator, F03Creator, RENDERERS } from './components/forms/FormRenderers';

// Newly Integrated Portal Modules
import { DashboardHome } from './components/Home';
import { DEPT_PORTALS, PortalSidebar, PortalMobileNav, ActivePortal } from './components/Departments';
import { EmployeeProfile } from './components/EmployeeProfile';
import { ThemeProvider, ThemeToggle, TarmeemSplash, TarmeemLoader } from './components/ui';

// ============================================================================
// MAIN APP WRAPPER (FOR THEME CONTEXT)
// ============================================================================
export default function AppWrapper() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

// ============================================================================
// CORE APPLICATION
// ============================================================================
function MainApp() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [splashFinished, setSplashFinished] = useState(false);

  // App State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<ActivePortal>('HOME');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modal State
  const [creatingForm, setCreatingForm] = useState<FormCode | null>(null);
  const [viewingForm, setViewingForm] = useState<any | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUser({ id: docSnap.id, ...docSnap.data() } as UserProfile);
          } else {
            setUser(null);
          }
          setAuthLoading(false);
        });
      } else {
        setUser(null);
        setAuthLoading(false);
      }
    });
    return unsubAuth;
  }, []);

  const userId = user?.id;
  const userRole = user?.role;

  // Memoized allowed departments for lateral routing access
  const allowedDepts = useMemo(() => {
    if (!user) return [];
    if (user.role === 'ADMIN' || user.role === 'EXEC_DIRECTOR') {
      return DEPARTMENTS.map(d => d.key);
    }
    return [user.department as DepartmentKey].filter(Boolean);
  }, [user]);

  useEffect(() => {
    if (!userId || !userRole) return;

    let unsubUsers = () => {};
    if (['ADMIN', 'EXEC_DIRECTOR', 'RESEARCH_MANAGER', 'PROJECTS_MANAGER'].includes(userRole)) {
      const qUsers = query(collection(db, 'users'), limit(500));
      unsubUsers = onSnapshot(qUsers, (snap) => {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
      });
    }

    const qProjects = query(collection(db, 'projects'), orderBy('updatedAt', 'desc'), limit(150));
    const unsubProjects = onSnapshot(qProjects, (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qForms = query(collection(db, 'forms'), orderBy('updatedAt', 'desc'), limit(300));
    const unsubForms = onSnapshot(qForms, (snap) => {
      setForms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qNotif = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubNotifs = onSnapshot(qNotif, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubUsers();
      unsubProjects();
      unsubForms();
      unsubNotifs();
    };
  }, [userId, userRole]);

  // ============================================================================
  // CORE API ENGINE (WITH TRANSACTIONAL BATCHING)
  // ============================================================================
  const api = {
    forms,
    createForm: async (params: any) => {
      const batch = writeBatch(db);
      const formRef = doc(collection(db, 'forms'));
      // Fix #5 — populate every field that downstream readers expect on a FormRecord.
      const def = FORMS.find(f => f.code === params.code);

      batch.set(formRef, {
        code: params.code,
        title: params.title || def?.title || '',
        projectId: params.projectId ?? null,
        projectRefId: params.projectRefId ?? null,
        beneficiaryName: params.beneficiaryName || '',
        status: params.status || 'draft',
        approvalChain: def?.approvalChain || [],
        approvalIndex: 0,
        approvals: [],
        ownerDept: def?.ownerDept || 'SYSTEM',
        bridgesTo: def?.bridgesTo || [],
        createdBy: params.user.id,
        createdByName: params.user.fullName,
        createdByRole: params.user.role,
        data: params.data || {},
        notes: params.notes || '',
        triggeredBy: params.triggeredBy ?? null,
        assigneeId: params.assigneeId ?? null,
        files: params.files || [],
        stepStartedAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      return formRef.id;
    },

    activateForm: async (formId: string) => {
      await updateDoc(doc(db, 'forms', formId), {
        status: 'pending',
        stepStartedAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      });
    },

    updateFormData: async (formId: string, patchData: any) => {
      await updateDoc(doc(db, 'forms', formId), {
        data: patchData,
        updatedAt: serverTimestamp()
      });
    },

    approveForm: async (formId: string, actor: UserProfile, note?: string, patchData?: any) => {
      const form = forms.find(f => f.id === formId);
      if (!form) return;

      const batch = writeBatch(db);
      const formRef = doc(db, 'forms', formId);

      // Fix #6 — write to `approvals` (FormApproval shape) so EmployeeProfile / Home /
      // ApprovalChainView find what they iterate.
      const newApproval = {
        role: actor.role,
        actorId: actor.id,
        actorName: actor.fullName,
        at: new Date().toISOString(),
        decision: 'approved' as const,
        note: note || 'تم الاعتماد'
      };
      const newApprovals = [...(form.approvals || []), newApproval];

      batch.update(formRef, {
        status: 'approved',
        data: patchData ? { ...form.data, ...patchData } : form.data,
        approvals: newApprovals,
        approvalIndex: (form.approvalIndex || 0) + 1,
        updatedAt: serverTimestamp()
      });

      const formDef = FORMS.find(f => f.code === form.code);
      if (formDef && formDef.approvalChain.length > 0) {
        const currentApprovalCount = newApprovals.length;
        const nextRole = formDef.approvalChain[currentApprovalCount];

        if (nextRole) {
          const targetUsers = users.filter(u =>
            u.role === nextRole ||
            (u.isManager && u.department === formDef.ownerDept)
          );

          targetUsers.forEach(tUser => {
            const notifRef = doc(collection(db, 'notifications'));
            batch.set(notifRef, {
              userId: tUser.id,
              message: `نموذج ${form.code} (${form.beneficiaryName || 'جديد'}) بانتظار إجراءك بعد اعتماد ${actor.fullName}.`,
              read: false,
              createdAt: serverTimestamp()
            });
          });
        }
      }

      await batch.commit();
    },

    rejectForm: async (formId: string, actor: UserProfile, note: string, patchData?: any) => {
      const form = forms.find(f => f.id === formId);
      if (!form) return;

      const batch = writeBatch(db);
      const formRef = doc(db, 'forms', formId);

      const newApproval = {
        role: actor.role,
        actorId: actor.id,
        actorName: actor.fullName,
        at: new Date().toISOString(),
        decision: 'rejected' as const,
        note: note || 'تم الرفض'
      };
      const newApprovals = [...(form.approvals || []), newApproval];

      batch.update(formRef, {
        status: 'rejected',
        data: patchData ? { ...form.data, ...patchData } : form.data,
        approvals: newApprovals,
        updatedAt: serverTimestamp()
      });

      await batch.commit();
    },

    deferForm: async (formId: string, actor: UserProfile, note?: string) => {
      const form = forms.find(f => f.id === formId);
      if (!form) return;
      const newApproval = {
        role: actor.role,
        actorId: actor.id,
        actorName: actor.fullName,
        at: new Date().toISOString(),
        decision: 'deferred' as const,
        note: note || 'تم التأجيل'
      };
      await updateDoc(doc(db, 'forms', formId), {
        status: 'deferred',
        approvals: [...(form.approvals || []), newApproval],
        updatedAt: serverTimestamp()
      });
    },

    attachFiles: async (formId: string, files: any[]) => {
      const form = forms.find(f => f.id === formId);
      if (!form) return;
      await updateDoc(doc(db, 'forms', formId), {
        files: [...(form.files || []), ...(files || [])],
        updatedAt: serverTimestamp()
      });
    }
  };

  // ============================================================================
  // CONTEXT OBJECT (Projects & Global Logic)
  // ============================================================================
  const context = {
    projects,
    generateProjectId: async () => {
      const serial = projects.length + 1;
      return { projectId: `PRJ-2024-${String(serial).padStart(4, '0')}`, serial };
    },
    createProject: async (data: any) => {
      const docRef = doc(collection(db, 'projects'));
      await setDoc(docRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return docRef.id;
    },
    updateProject: async (projectRefId: string, patch: any) => {
      await updateDoc(doc(db, 'projects', projectRefId), { ...patch, updatedAt: serverTimestamp() });
    },
    findProjectForm: (projectRefId: string, code: FormCode) => {
      return forms.find(f => f.projectRefId === projectRefId && f.code === code) || null;
    },
    userById: (id: string) => users.find(u => u.id === id)
  };

  // ============================================================================
  // RENDER LOGIC & ROUTING
  // ============================================================================
  if (authLoading || !splashFinished) {
    return <TarmeemSplash onComplete={() => setSplashFinished(true)} />;
  }
  // Fix #10 — supplied AuthScreen requires an `onAuth` callback; pass a no-op since
  // `onAuthStateChanged` above will move the user past the gate naturally.
  if (!user) return <Auth onAuth={() => {}} />;

  const logout = () => auth.signOut();

  const renderCreator = () => {
    if (creatingForm === 'F-02') return <F02Creator user={user} api={api as any} context={context} onClose={() => setCreatingForm(null)} users={users} />;
    if (creatingForm === 'F-03') return <F03Creator user={user} api={api as any} context={context} onClose={() => setCreatingForm(null)} users={users} />;
    return null;
  };

  const renderViewer = () => {
    if (!viewingForm) return null;
    const Renderer = RENDERERS[viewingForm.code];
    if (!Renderer) return <div className="p-4 text-white">Renderer Not Found</div>;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" dir="rtl">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setViewingForm(null)} />
        <div className="relative bg-white dark:bg-[#050505] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
          <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
            <h2 className="font-bold">{FORMS.find(f => f.code === viewingForm.code)?.title} ({viewingForm.code})</h2>
            <button onClick={() => setViewingForm(null)} className="p-1.5 rounded-lg hover:bg-white/15"><X className="w-5 h-5" /></button>
          </div>
          <div className="overflow-y-auto p-5 flex-1 bg-gray-50 dark:bg-[#0a0a0a]">
            <Renderer rec={viewingForm} user={user} api={api as any} users={users} context={context} onClose={() => setViewingForm(null)} />
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (activeTab === 'HOME') {
      return (
        <DashboardHome
          user={user}
          api={api as any}
          projects={projects}
          goToPortal={(dept) => setActiveTab(dept as ActivePortal)}
          goToProjects={() => setActiveTab('PROJECTS_LIST')}
          goToProject={(id) => {
             const projForms = forms.filter(f => f.projectRefId === id);
             if(projForms.length > 0) setViewingForm(projForms[0]);
          }}
          allowedDepts={allowedDepts}
        />
      );
    }
    if (activeTab === 'PROJECTS_LIST') {
      const ProjectsComponent = Projects as any;
      return <ProjectsComponent user={user} projects={projects} forms={forms} onOpenForm={setViewingForm} onCreateForm={setCreatingForm} context={context} />;
    }
    if (activeTab === 'ADMIN') {
      return (
        <Admin
          users={users}
          currentUser={user}
          approveUser={async (uid, edits, actorId) => {
            await updateDoc(doc(db, 'users', uid), { ...edits, status: 'active', approvedBy: actorId, approvedAt: new Date().toISOString() });
          }}
          updateUser={async (uid, edits, actorId) => {
            await updateDoc(doc(db, 'users', uid), { ...edits });
          }}
          deactivateUser={async (uid, actorId, reassignedTo) => {
            await updateDoc(doc(db, 'users', uid), { status: 'deactivated', deactivatedBy: actorId, deactivatedAt: new Date().toISOString() });
          }}
          reactivateUser={async (uid, actorId) => {
            await updateDoc(doc(db, 'users', uid), { status: 'active', deactivatedAt: null, deactivatedBy: null });
          }}
          rejectUser={async (uid, actorId, reason) => {
            await updateDoc(doc(db, 'users', uid), { status: 'rejected', rejectedBy: actorId, rejectReason: reason });
          }}
          resetUserRole={async (uid, actorId) => {
            await updateDoc(doc(db, 'users', uid), { needsRoleReset: true });
          }}
          onOpenProfile={(uid) => setActiveTab('PROFILE')}
        />
      );
    }
    if (activeTab === 'PROFILE') {
      return (
        <EmployeeProfile
          profile={user}
          currentUser={user}
          api={api as any}
          users={users}
          onBack={() => setActiveTab('HOME')}
          onOpenForm={setViewingForm}
          saveProfile={async (uid, patch) => {
            await updateDoc(doc(db, 'users', uid), patch);
          }}
        />
      );
    }
    if (DEPT_PORTALS[activeTab as DepartmentKey]) {
      const Portal = DEPT_PORTALS[activeTab as DepartmentKey];
      return <Portal user={user} api={api as any} onOpenForm={setViewingForm} onCreateForm={setCreatingForm} />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-800 dark:text-gray-200 font-sans flex flex-col transition-colors duration-300" dir="rtl">
      {/* Dynamic Navbar */}
      <nav className="bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 shrink-0 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('HOME')}>
              <div className="w-8 h-8 rounded bg-gradient-to-tr from-[#34B390] to-[#582E7A] flex items-center justify-center shadow-lg shadow-[#34B390]/20">
                <Building2 size={18} className="text-white" />
              </div>
              <span className="font-black text-xl tracking-tight text-gray-900 dark:text-white hidden sm:block">بناء <span className="text-[#34B390]">ERP</span></span>
            </div>

            <div className="hidden lg:flex items-center gap-1">
              <button onClick={() => setActiveTab('HOME')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${activeTab === 'HOME' ? 'bg-gray-100 dark:bg-[#111] text-[#34B390]' : 'hover:bg-gray-100 dark:hover:bg-[#111] text-gray-500 dark:text-gray-400'}`}><LayoutDashboard size={18}/> الرئيسية</button>
              <button onClick={() => setActiveTab('PROJECTS_LIST')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${activeTab === 'PROJECTS_LIST' ? 'bg-gray-100 dark:bg-[#111] text-[#34B390]' : 'hover:bg-gray-100 dark:hover:bg-[#111] text-gray-500 dark:text-gray-400'}`}><Building2 size={18}/> المشاريع والنماذج</button>
              {['ADMIN', 'EXEC_DIRECTOR'].includes(user.role) && (
                 <button onClick={() => setActiveTab('ADMIN')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${activeTab === 'ADMIN' ? 'bg-gray-100 dark:bg-[#111] text-[#34B390]' : 'hover:bg-gray-100 dark:hover:bg-[#111] text-gray-500 dark:text-gray-400'}`}><Users size={18}/> الإدارة</button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                 <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition relative">
                    <Bell size={20} />
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    )}
                 </button>
              </div>

              {/* Theme Toggle Button safely injected */}
              <ThemeToggle />

              <div className="h-8 w-px bg-gray-300 dark:bg-gray-800 mx-1 transition-colors duration-300"></div>

              <div className="flex items-center gap-3">
                <div className="text-left hidden sm:block cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded transition" onClick={() => setActiveTab('PROFILE')}>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{user.fullName}</div>
                  <div className="text-[10px] text-[#34B390]">{user.role}</div>
                </div>
                <button onClick={logout} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 transition" title="تسجيل الخروج"><LogOut size={20} /></button>
              </div>
              <button className="lg:hidden p-2 text-gray-500 dark:text-gray-400" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}><Menu size={24}/></button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Layout containing Sidebars and Routing Content */}
      <div className="flex flex-1 overflow-hidden relative">
        <PortalSidebar active={activeTab} onChange={setActiveTab} user={user} api={api as any} isAdmin={user.role === 'ADMIN' || user.role === 'EXEC_DIRECTOR'} allowedDepts={allowedDepts} />

        <main className="flex-1 overflow-y-auto max-w-7xl mx-auto w-full px-4 py-6 pb-24 md:pb-6 custom-scrollbar">
          {renderContent()}
        </main>
      </div>

      <PortalMobileNav active={activeTab} onChange={setActiveTab} isAdmin={user.role === 'ADMIN' || user.role === 'EXEC_DIRECTOR'} allowedDepts={allowedDepts} />

      {/* Global Renders */}
      {renderCreator()}
      {renderViewer()}
    </div>
  );
}
