import React, { useState, useMemo, useRef } from 'react';
import { Search, Filter, MapPin, Building2, Folder, BarChart3, LayoutDashboard, ClipboardList, FileText, DollarSign, Users, Settings, UploadCloud, CheckCircle, AlertCircle, Clock, X, Plus, CreditCard as Edit3, Eye, Ban, RotateCcw, ArrowLeft, Download, Lock, Unlock, AlertTriangle, TrendingUp, Wallet, UserCheck, UserX, Save, RefreshCw, Home, Briefcase, CircleUser as UserCircle, Calendar, Activity, PieChart, Phone, Shield, BadgeCheck, Stethoscope, Truck } from 'lucide-react';
import {
  STAGES_CONFIG, REQUIRED_DOCS, ROLES, REGION_LABELS,
  regionLabel, computeSlaStatus, formatCurrency, CIVIL_FIELDS, ELEC_FIELDS,
  PLUMB_FIELDS, FURN_FIELDS, APP_FIELDS, DEFAULT_LISTS, ALL_DEPTS
} from '../lib/data';
import { storage } from '../lib/firebase';
// @ts-ignore - firebase/storage types may not be installed
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Card, Input, FormField, MandatoryGauge, DonutChart,
  BarChart, AccessDeniedCard, EventIcon
} from './ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Project {
  id: string; name: string; type: string; city: string; region: string;
  currentStageId: string; currentStageOwner: string; stageEnteredAt: string;
  mandatoryFieldsTotal: number; mandatoryFieldsFilled: number;
  assessmentId: string | null; assessmentStatus: string | null;
  diagnosisVerdict: string | null; assignedFieldEngineer: string | null;
  data: Record<string, any>; budgetSAR: number | null; disbursedSAR: number | null;
  projectAuditLog: any[]; hasPendingAdditionalWorks: boolean;
  deliveryDate: string | null;
}

interface UserProfile {
  id: string; email: string; fullName: string; role: string;
  region: string; departments: string[]; isDepartmentHead: boolean;
  status: 'active' | 'pending' | 'deactivated';
  registeredAt: string; lastSeenAt: string;
  approvedBy: string | null; approvedAt: string | null;
  deactivatedAt: string | null; deactivatedBy: string | null;
  notificationPrefs: { inApp: boolean; email: boolean };
  auditLog: any[];
}

interface ERPProps {
  store: {
    projects: Project[]; users: UserProfile[]; assessments: any[];
    documents: any[]; lists: any; notifications: any[];
  };
  updateProject: (id: string, updates: Record<string, any>) => Promise<void>;
  updateProjectField: (id: string, fieldPath: string, value: any, actorId?: string) => Promise<void>;
  addDocument: (docRec: any) => Promise<void>;
  addProject: (proj: any) => Promise<void>;
  currentRole: string;
  erpView: string;
  setErpView: (v: string) => void;
  user: UserProfile;
  addNotification: (n: {
    text: string; subject?: string; type: string; portal: string;
    link?: string; recipients?: string[]; meta?: any;
  }) => Promise<void>;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  globalSearch: string;
  updateList: (key: string, values: string[]) => Promise<void>;
  approveUser: (userId: string, edits: any, approverId: string) => Promise<void>;
  updateUser: (userId: string, edits: any, actorId: string) => Promise<void>;
  deactivateUser: (userId: string, actorId: string, reassignedTo: string) => Promise<void>;
  reactivateUser: (userId: string, actorId: string) => Promise<void>;
  rejectUser: (userId: string, actorId: string, reason?: string) => Promise<void>;
  addUser: (userData: any) => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Payment Gates Config                                               */
/* ------------------------------------------------------------------ */

const PAYMENT_GATES = [
  { id: 'gate1', name: 'الدفعة الأولى', stageId: '13', label: '30%', requiredDocCodes: ['محاسبة-01-05', 'محاسبة-01-06', 'محاسبة-01-07', 'مشاريع-01-08'] },
  { id: 'gate2', name: 'الدفعة الثانية', stageId: '21', label: '40%', requiredDocCodes: ['مشاريع-01-10', 'مشاريع-01-11'] },
  { id: 'gate3', name: 'الدفعة الثالثة', stageId: '23', label: '80%', requiredDocCodes: ['مشاريع-01-12'] },
  { id: 'gate4', name: 'الدفعة النهائية', stageId: '31', label: '100%', requiredDocCodes: ['إتقان-01-13', 'مشاريع-01-14', 'بحث-01-15', 'مالية-01-16'] },
];

/* ------------------------------------------------------------------ */
/*  Form Sections Config                                                */
/* ------------------------------------------------------------------ */

const FORM_SECTIONS = [
  { key: 'A', title: 'بيانات المستفيد', icon: UserCircle },
  { key: 'B', title: 'معلومات المشروع', icon: Briefcase },
  { key: 'C', title: 'البحث الاجتماعي', icon: Users },
  { key: 'D', title: 'التشخيص', icon: Stethoscope },
  { key: 'E', title: 'الأعمال المدنية', icon: Home },
  { key: 'F', title: 'الأعمال الكهربائية', icon: Activity },
  { key: 'G', title: 'أعمال السباكة', icon: RefreshCw },
  { key: 'H', title: 'الأثاث', icon: Folder },
  { key: 'I', title: 'الأجهزة', icon: Settings },
  { key: 'J', title: 'أعمال إضافية', icon: Plus },
  { key: 'K', title: 'ملاحظات', icon: FileText },
];

/* ------------------------------------------------------------------ */
/*  Sub: Sliding Tabs                                                  */
/* ------------------------------------------------------------------ */

const SlidingTabs: React.FC<{
  tabs: { key: string; label: string; icon: React.ElementType; adminOnly?: boolean }[];
  active: string; onChange: (k: string) => void; isAdmin: boolean;
}> = ({ tabs, active, onChange, isAdmin }) => {
  const visible = tabs.filter(t => !t.adminOnly || isAdmin);
  return (
    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
      {visible.map(t => {
        const Icon = t.icon;
        const isActive = active === t.key;
        return (
          <button key={t.key} onClick={() => onChange(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200
              ${isActive
                ? 'bg-[#4A1F66] text-white shadow-md scale-105'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'}`}>
            <Icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Sub: StagePipeline                                                 */
/* ------------------------------------------------------------------ */

const StagePipeline: React.FC<{ currentStageId: string }> = ({ currentStageId }) => {
  const currentNum = parseInt(currentStageId) || 0;
  return (
    <div className="overflow-x-auto pb-2" dir="rtl">
      <div className="flex items-center min-w-[1200px] gap-0.5">
        {STAGES_CONFIG.map((stage) => {
          const stageNum = parseInt(stage.id);
          const isComplete = stageNum < currentNum;
          const isCurrent = stageNum === currentNum;
          return (
            <div key={stage.id} className="flex flex-col items-center flex-1 min-w-[32px] group">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all duration-300
                ${isComplete ? 'bg-[#56B894] border-[#56B894] text-white'
                  : isCurrent ? 'bg-[#4A1F66] border-[#4A1F66] text-white scale-110 shadow-lg'
                  : 'bg-white border-gray-300 text-gray-400'}`}>
                {isComplete ? <CheckCircle className="w-3.5 h-3.5" /> : stage.id}
              </div>
              <div className="relative">
                <span className={`text-[7px] leading-tight text-center block max-w-[48px] mt-1 whitespace-normal
                  ${isCurrent ? 'font-bold text-[#4A1F66]' : 'text-gray-400'}`}>
                  {stage.name}
                </span>
                {isCurrent && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#4A1F66] rounded-full" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Sub: DocRow                                                        */
/* ------------------------------------------------------------------ */

const DocRow: React.FC<{
  doc: any; onDelete?: () => void;
}> = ({ doc }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
    <FileText className="w-4 h-4 text-purple-500 shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-800 truncate">{doc.name || doc.code}</p>
      <p className="text-[10px] text-gray-500">{doc.code} &middot; {new Date(doc.uploadedAt).toLocaleDateString('ar-SA')}</p>
    </div>
    <a href={doc.url} target="_blank" rel="noopener noreferrer"
      className="opacity-0 group-hover:opacity-100 transition-opacity text-[#56B894] hover:text-[#3F9B7A]">
      <Download className="w-4 h-4" />
    </a>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Sub: PaymentGateCard                                               */
/* ------------------------------------------------------------------ */

const PaymentGateCard: React.FC<{
  gate: typeof PAYMENT_GATES[0]; currentStageId: string;
  projectDocs: any[]; project: Project; updateProject: ERPProps['updateProject'];
  addNotification: ERPProps['addNotification']; user: UserProfile;
}> = ({ gate, currentStageId, projectDocs, project, updateProject, addNotification, user }) => {
  const currentNum = parseInt(currentStageId) || 0;
  const gateNum = parseInt(gate.stageId) || 0;
  const isUnlocked = currentNum >= gateNum;

  const uploadedCodes = new Set(projectDocs.map((d: any) => d.code));
  const missingDocs = gate.requiredDocCodes.filter(c => !uploadedCodes.has(c));
  const allDocsUploaded = missingDocs.length === 0;

  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const alreadyPaid = project.data?.[`payment_${gate.id}`]?.amount > 0;

  const handleApprove = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    setSaving(true);
    try {
      await updateProject(project.id, {
        [`data.payment_${gate.id}`]: {
          amount: numAmount, approvedBy: user.id, approvedAt: new Date().toISOString(), stage: gate.stageId,
        },
        disbursedSAR: (project.disbursedSAR || 0) + numAmount,
      });
      await addNotification({
        text: `تم صرف ${gate.name} (${formatCurrency(numAmount)}) للمشروع ${project.name}`,
        subject: 'صرف دفعة', type: 'payment_released', portal: 'erp',
        link: `/erp/project/${project.id}`, recipients: ALL_DEPTS,
      });
    } finally { setSaving(false); }
  };

  return (
    <div className={`rounded-xl border-2 transition-all duration-300 overflow-hidden
      ${alreadyPaid ? 'border-green-300 bg-green-50' : isUnlocked && allDocsUploaded ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className={`px-4 py-3 flex items-center justify-between
        ${alreadyPaid ? 'bg-green-100' : isUnlocked && allDocsUploaded ? 'bg-[#4A1F66] text-white' : 'bg-gray-200'}`}>
        <div className="flex items-center gap-2">
          {alreadyPaid ? <CheckCircle className="w-5 h-5 text-green-600" />
            : isUnlocked && allDocsUploaded ? <Unlock className="w-5 h-5 text-[#56B894]" />
            : <Lock className="w-5 h-5 text-gray-500" />}
          <span className="font-bold text-sm">{gate.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
            ${alreadyPaid ? 'bg-green-200 text-green-800'
              : isUnlocked && allDocsUploaded ? 'bg-purple-200 text-purple-800'
              : 'bg-gray-300 text-gray-600'}`}>
            {alreadyPaid ? 'مصروفة' : isUnlocked && allDocsUploaded ? 'جاهزة للصرف' : 'مقفلة'}
          </span>
        </div>
        <span className="text-xs font-semibold">عند المرحلة {gate.stageId} &middot; {gate.label}</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Required docs */}
        <div>
          <p className="text-xs font-bold text-gray-600 mb-2">المستندات المطلوبة:</p>
          <div className="flex flex-wrap gap-2">
            {gate.requiredDocCodes.map(code => {
              const isUploaded = uploadedCodes.has(code);
              const docDef = REQUIRED_DOCS.find(d => d.code === code);
              return (
                <span key={code} className={`text-[10px] px-2 py-1 rounded-full flex items-center gap-1
                  ${isUploaded ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {isUploaded ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {docDef?.name || code}
                </span>
              );
            })}
          </div>
        </div>

        {/* Missing docs warning */}
        {!isUnlocked && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700">
              <p className="font-bold">لا يمكن صرف الدفعة</p>
              <p>المشروع في المرحلة {currentStageId} والدفعة تتطلب الوصول للمرحلة {gate.stageId}</p>
              {missingDocs.length > 0 && (
                <p className="mt-1">مستندات ناقصة: {missingDocs.map(c => REQUIRED_DOCS.find(d => d.code === c)?.name || c).join('، ')}</p>
              )}
            </div>
          </div>
        )}

        {isUnlocked && !allDocsUploaded && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700">
              <p className="font-bold">مستندات ناقصة</p>
              <p>{missingDocs.map(c => REQUIRED_DOCS.find(d => d.code === c)?.name || c).join('، ')}</p>
            </div>
          </div>
        )}

        {/* Already paid */}
        {alreadyPaid && (
          <div className="flex items-center gap-3 p-3 bg-green-100 rounded-lg">
            <Wallet className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-bold text-green-800">تم الصرف: {formatCurrency(project.data?.[`payment_${gate.id}`]?.amount)}</p>
              <p className="text-[10px] text-green-600">
                بواسطة {project.data?.[`payment_${gate.id}`]?.approvedBy} &middot; {new Date(project.data?.[`payment_${gate.id}`]?.approvedAt).toLocaleDateString('ar-SA')}
              </p>
            </div>
          </div>
        )}

        {/* Approve form */}
        {isUnlocked && allDocsUploaded && !alreadyPaid && (
          <div className="flex items-end gap-3 pt-2 border-t border-purple-200">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-700">مبلغ الدفعة (ر.س)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" min="0" step="0.01"
                className="w-full mt-1 px-3 py-2 border border-purple-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]" />
            </div>
            <button onClick={handleApprove} disabled={saving || !amount}
              className="px-5 py-2 bg-[#4A1F66] text-white rounded-lg text-sm font-bold hover:bg-[#3A1652] transition disabled:opacity-50 flex items-center gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              اعتماد الصرف
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Sub: UserRow                                                       */
/* ------------------------------------------------------------------ */

const UserRow: React.FC<{
  u: UserProfile; currentUser: UserProfile; approveUser: ERPProps['approveUser'];
  rejectUser: ERPProps['rejectUser']; updateUser: ERPProps['updateUser'];
  deactivateUser: ERPProps['deactivateUser']; reactivateUser: ERPProps['reactivateUser'];
}> = ({ u, currentUser, approveUser, rejectUser, updateUser, deactivateUser, reactivateUser }) => {
  const [editing, setEditing] = useState(false);
  const [editRole, setEditRole] = useState(u.role);
  const [editRegion, setEditRegion] = useState(u.region);
  const [deactivateReassignTo, setDeactivateReassignTo] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const handleApprove = async () => {
    setBusy(true);
    try { await approveUser(u.id, { role: editRole, region: editRegion }, currentUser.id); }
    finally { setBusy(false); }
  };

  const handleReject = async () => {
    setBusy(true);
    try { await rejectUser(u.id, currentUser.id, rejectReason || undefined); }
    finally { setBusy(false); }
  };

  const handleDeactivate = async () => {
    if (!deactivateReassignTo) return;
    setBusy(true);
    try { await deactivateUser(u.id, currentUser.id, deactivateReassignTo); }
    finally { setBusy(false); }
  };

  const handleReactivate = async () => {
    setBusy(true);
    try { await reactivateUser(u.id, currentUser.id); }
    finally { setBusy(false); }
  };

  const handleSaveEdit = async () => {
    setBusy(true);
    try { await updateUser(u.id, { role: editRole, region: editRegion }, currentUser.id); setEditing(false); }
    finally { setBusy(false); }
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    deactivated: 'bg-red-100 text-red-700',
  };
  const statusLabels: Record<string, string> = {
    active: 'فعّال', pending: 'معلّق', deactivated: 'معطّل',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A1F66] to-[#56B894] flex items-center justify-center text-white font-bold text-sm shrink-0">
            {u.fullName?.charAt(0) || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-800 truncate">{u.fullName}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColors[u.status] || ''}`}>
                {statusLabels[u.status] || u.status}
              </span>
              {u.isDepartmentHead && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">رئيس قسم</span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{u.email}</p>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{u.role}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{regionLabel(u.region)}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(u.registeredAt).toLocaleDateString('ar-SA')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {u.status === 'pending' && (
            <>
              <button onClick={handleApprove} disabled={busy}
                className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg font-bold hover:bg-green-600 transition disabled:opacity-50 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> قبول
              </button>
              <div className="relative">
                <input type="text" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="سبب الرفض (اختياري)" className="w-36 px-2 py-1 text-xs border rounded-lg" />
                <button onClick={handleReject} disabled={busy}
                  className="mt-1 px-3 py-1 bg-red-500 text-white text-xs rounded-lg font-bold hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-1">
                  <UserX className="w-3.5 h-3.5" /> رفض
                </button>
              </div>
            </>
          )}

          {u.status === 'active' && u.id !== currentUser.id && (
            <>
              <button onClick={() => setEditing(!editing)}
                className="p-1.5 text-gray-400 hover:text-purple-600 transition rounded-lg hover:bg-purple-50">
                <Edit3 className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                <select value={deactivateReassignTo} onChange={e => setDeactivateReassignTo(e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1 max-w-[140px]">
                  <option value="">إعادة تعيين إلى...</option>
                  {ALL_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <button onClick={handleDeactivate} disabled={busy || !deactivateReassignTo}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition rounded-lg hover:bg-red-50 disabled:opacity-30">
                  <Ban className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {u.status === 'deactivated' && (
            <button onClick={handleReactivate} disabled={busy}
              className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg font-bold hover:bg-blue-600 transition disabled:opacity-50 flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> إعادة تفعيل
            </button>
          )}
        </div>
      </div>

      {editing && u.status === 'active' && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-semibold text-gray-600">الدور</label>
            <select value={editRole} onChange={e => setEditRole(e.target.value)}
              className="w-full mt-1 px-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A1F66]">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="text-[10px] font-semibold text-gray-600">المنطقة</label>
            <select value={editRegion} onChange={e => setEditRegion(e.target.value)}
              className="w-full mt-1 px-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A1F66]">
              {Object.entries(REGION_LABELS).filter(([k]) => k !== 'ALL').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button onClick={handleSaveEdit} disabled={busy}
            className="px-3 py-1.5 bg-[#4A1F66] text-white text-xs rounded-lg font-bold hover:bg-[#3A1652] transition disabled:opacity-50 flex items-center gap-1">
            <Save className="w-3.5 h-3.5" /> حفظ
          </button>
          <button onClick={() => setEditing(false)}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg font-bold hover:bg-gray-300 transition">
            إلغاء
          </button>
        </div>
      )}
    </div>
  );
};

/* ================================================================== */
/*  MAIN COMPONENT: PortalERP                                          */
/* ================================================================== */

export const PortalERP: React.FC<ERPProps> = (props) => {
  const {
    store, updateProject, updateProjectField, addDocument, addProject,
    currentRole, erpView, setErpView, user, addNotification,
    activeProjectId, setActiveProjectId, globalSearch,
    updateList, approveUser, updateUser, deactivateUser, reactivateUser, rejectUser,
  } = props;
  // addUser is available via props for future user creation form
  void props.addUser;

  const isAdmin = currentRole === 'Admin' || currentRole === 'المدير التنفيذي';

  /* ---- Local state ---- */
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStage, setFilterStage] = useState('ALL');
  const [projectTab, setProjectTab] = useState('overview');
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', type: '', region: 'DAM', city: '' });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- Derived ---- */
  const activeProject = useMemo(() =>
    store.projects.find(p => p.id === activeProjectId) || null,
    [store.projects, activeProjectId]
  );

  const projectDocs = useMemo(() =>
    store.documents.filter(d => d.projectId === activeProjectId),
    [store.documents, activeProjectId]
  );

  const filteredProjects = useMemo(() => {
    let list = store.projects;
    const q = (searchTerm || globalSearch || '').trim().toLowerCase();
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || (p.type || '').toLowerCase().includes(q));
    if (filterRegion !== 'ALL') list = list.filter(p => p.region === filterRegion);
    if (filterType !== 'ALL') list = list.filter(p => p.type === filterType);
    if (filterStage !== 'ALL') list = list.filter(p => p.currentStageId === filterStage);
    return list;
  }, [store.projects, searchTerm, globalSearch, filterRegion, filterType, filterStage]);

  /* Stats for analytics */
  const analyticsStats = useMemo(() => {
    const projects = store.projects;
    const stageGroups: Record<string, number> = {};
    const regionGroups: Record<string, number> = {};
    let totalBudget = 0;
    let totalDisbursed = 0;

    projects.forEach(p => {
      const stageName = STAGES_CONFIG.find(s => s.id === p.currentStageId)?.name || 'غير محدد';
      stageGroups[stageName] = (stageGroups[stageName] || 0) + 1;
      regionGroups[regionLabel(p.region)] = (regionGroups[regionLabel(p.region)] || 0) + 1;
      totalBudget += p.budgetSAR || 0;
      totalDisbursed += p.disbursedSAR || 0;
    });

    const stageColors = ['#4A1F66', '#6B3D87', '#56B894', '#3F9B7A', '#E67A18', '#dc2626', '#2563eb', '#9333ea', '#059669', '#d97706'];
    const stageSegments = Object.entries(stageGroups).map(([label, value], i) => ({
      label, value, color: stageColors[i % stageColors.length],
    }));

    return { stageSegments, regionGroups, totalBudget, totalDisbursed, projectCount: projects.length };
  }, [store.projects]);

  /* ---- Handlers ---- */
  const handleOpenProject = (id: string) => {
    setActiveProjectId(id);
    setErpView('PROJECT');
    setProjectTab('overview');
  };

  const handleAdvanceStage = async () => {
    if (!activeProject) return;
    const currentIdx = STAGES_CONFIG.findIndex(s => s.id === activeProject.currentStageId);
    if (currentIdx >= STAGES_CONFIG.length - 1) return;
    const nextStage = STAGES_CONFIG[currentIdx + 1];
    await updateProject(activeProject.id, {
      currentStageId: nextStage.id,
      currentStageOwner: nextStage.dept,
      stageEnteredAt: new Date().toISOString(),
    });
    await addNotification({
      text: `تم إكمال المرحلة ${activeProject.currentStageId} والانتقال إلى ${nextStage.name} في مشروع ${activeProject.name}`,
      subject: 'إكمال مرحلة', type: 'stage_advanced', portal: 'erp',
      link: `/erp/project/${activeProject.id}`, recipients: ALL_DEPTS,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !activeProjectId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = `projects/${activeProjectId}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await addDocument({
          projectId: activeProjectId,
          code: file.name,
          name: file.name,
          url,
          uploadedBy: user.id,
          uploadedAt: new Date().toISOString(),
        });
      }
      await addNotification({
        text: `تم رفع ${files.length} مستند جديد في مشروع ${activeProject?.name}`,
        subject: 'مستند جديد', type: 'document_uploaded', portal: 'erp',
        link: `/erp/project/${activeProjectId}`,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddProject = async () => {
    if (!newProject.name.trim()) return;
    await addProject({
      name: newProject.name,
      type: newProject.type,
      region: newProject.region,
      city: newProject.city,
      currentStageId: '1',
      currentStageOwner: STAGES_CONFIG[0].dept,
      stageEnteredAt: new Date().toISOString(),
      mandatoryFieldsTotal: 0,
      mandatoryFieldsFilled: 0,
      data: {},
      budgetSAR: 0,
      disbursedSAR: 0,
      projectAuditLog: [],
      hasPendingAdditionalWorks: false,
      deliveryDate: null,
      assessmentId: null,
      assessmentStatus: null,
      diagnosisVerdict: null,
      assignedFieldEngineer: null,
    });
    setAddProjectOpen(false);
    setNewProject({ name: '', type: '', region: 'DAM', city: '' });
  };

  /* ================================================================ */
  /*  RENDER: ERP_Dashboard (ALL_PROJECTS)                             */
  /* ================================================================ */

  const renderDashboard = () => (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-[#4A1F66]" />
          <h1 className="text-xl font-bold text-[#4A1F66]">سير العمل المكتبية</h1>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{store.projects.length} مشروع</span>
        </div>
        <button onClick={() => setAddProjectOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#4A1F66] text-white rounded-lg text-sm font-bold hover:bg-[#3A1652] transition shadow-md hover:shadow-lg">
          <Plus className="w-4 h-4" /> مشروع جديد
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-700">تصفية وبحث</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم أو الرقم..."
              className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]" />
          </div>
          <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]">
            {Object.entries(REGION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]">
            <option value="ALL">جميع الأنواع</option>
            {(store.lists?.projectType || DEFAULT_LISTS.projectType).map((t: string) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]">
            <option value="ALL">جميع المراحل</option>
            {STAGES_CONFIG.map(s => <option key={s.id} value={s.id}>{s.id} - {s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Project cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredProjects.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400">
            <Folder className="w-12 h-12 mb-3" />
            <p className="text-sm font-bold">لا توجد مشاركنات مطابقة</p>
          </div>
        )}
        {filteredProjects.map(p => {
          const stageConf = STAGES_CONFIG.find(s => s.id === p.currentStageId);
          const sla = computeSlaStatus(stageConf?.duration || '', p.stageEnteredAt);
          return (
            <div key={p.id}
              onClick={() => handleOpenProject(p.id)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer
                hover:shadow-lg hover:border-[#4A1F66]/30 transition-all duration-300 hover:-translate-y-1 group">
              <div className="bg-gradient-to-r from-[#4A1F66] to-[#6B3D87] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 text-[#56B894] shrink-0" />
                  <h3 className="text-sm font-bold text-white truncate">{p.name}</h3>
                </div>
                <MandatoryGauge filled={p.mandatoryFieldsFilled} total={p.mandatoryFieldsTotal || 1} />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400" />{regionLabel(p.region)}</span>
                  <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-gray-400" />{p.type || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500">المرحلة {p.currentStageId}</span>
                    <span className="text-xs font-bold text-[#4A1F66]">{stageConf?.name || '—'}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ring-2 ring-offset-1 ${sla.ring}`}
                    style={{ background: 'transparent' }}>
                    {sla.text}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-500">{stageConf?.dept}</span>
                  {p.budgetSAR ? <span className="text-[#56B894] font-bold">{formatCurrency(p.budgetSAR)}</span> : null}
                </div>
                {/* Mini progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="h-full rounded-full bg-[#56B894] transition-all duration-1000"
                    style={{ width: `${((parseInt(p.currentStageId) || 0) / 33) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add project modal */}
      {addProjectOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setAddProjectOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" dir="rtl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#4A1F66]">مشروع جديد</h2>
              <button onClick={() => setAddProjectOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg transition"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <Input label="اسم المشروع" value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} placeholder="مثال: ترميم منزل آل محمد" />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">نوع المشروع</label>
              <select value={newProject.type} onChange={e => setNewProject(p => ({ ...p, type: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]">
                <option value="">اختر النوع...</option>
                {(store.lists?.projectType || DEFAULT_LISTS.projectType).map((t: string) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">المنطقة</label>
              <select value={newProject.region} onChange={e => setNewProject(p => ({ ...p, region: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]">
                {Object.entries(REGION_LABELS).filter(([k]) => k !== 'ALL').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <Input label="المدينة" value={newProject.city} onChange={e => setNewProject(p => ({ ...p, city: e.target.value }))} placeholder="مثال: الدمام" />
            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleAddProject}
                className="flex-1 py-2.5 bg-[#4A1F66] text-white rounded-lg text-sm font-bold hover:bg-[#3A1652] transition">إضافة المشروع</button>
              <button onClick={() => setAddProjectOpen(false)}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300 transition">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ================================================================ */
  /*  RENDER: ERP_AnalyticsDashboard (ANALYTICS)                       */
  /* ================================================================ */

  const renderAnalytics = () => (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-[#4A1F66]" />
        <h1 className="text-xl font-bold text-[#4A1F66]">لوحة التحليلات</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Folder, label: 'إجمالي المشاريع', value: analyticsStats.projectCount, color: '#4A1F66' },
          { icon: Wallet, label: 'إجمالي الميزانيات', value: formatCurrency(analyticsStats.totalBudget), color: '#56B894' },
          { icon: DollarSign, label: 'إجمالي المصروفات', value: formatCurrency(analyticsStats.totalDisbursed), color: '#E67A18' },
          { icon: TrendingUp, label: 'نسبة الصرف', value: analyticsStats.totalBudget ? `${Math.round((analyticsStats.totalDisbursed / analyticsStats.totalBudget) * 100)}%` : '—', color: '#dc2626' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: s.color + '15' }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold">{s.label}</p>
                <p className="text-lg font-bold text-gray-800">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="توزيع المراحل" icon={PieChart}>
          <div className="pt-2 flex justify-center">
            <DonutChart segments={analyticsStats.stageSegments} size={200} label="المراحل" />
          </div>
        </Card>
        <Card title="التوزيع الجغرافي" icon={MapPin}>
          <BarChart data={analyticsStats.regionGroups} label="عدد المشاريع حسب المنطقة" />
        </Card>
      </div>
    </div>
  );

  /* ================================================================ */
  /*  RENDER: ERP_ProjectWorkspace (PROJECT)                           */
  /* ================================================================ */

  const renderProjectWorkspace = () => {
    if (!activeProject) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400" dir="rtl">
          <Folder className="w-12 h-12 mb-3" />
          <p className="text-sm font-bold">لا يوجد مشروع محدد</p>
          <button onClick={() => setErpView('ALL_PROJECTS')}
            className="mt-4 px-4 py-2 bg-[#4A1F66] text-white rounded-lg text-sm font-bold hover:bg-[#3A1652] transition flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> العودة للمشاريع
          </button>
        </div>
      );
    }

    const stageConf = STAGES_CONFIG.find(s => s.id === activeProject.currentStageId);
    const sla = computeSlaStatus(stageConf?.duration || '', activeProject.stageEnteredAt);
    const canAdvance = parseInt(activeProject.currentStageId) < 33;

    const tabs = [
      { key: 'overview', label: 'نظرة عامة', icon: Eye },
      { key: 'diagnosis', label: 'التشخيص', icon: Stethoscope },
      { key: 'form', label: 'الاستمارة', icon: ClipboardList },
      { key: 'docs', label: 'المستندات', icon: FileText },
      { key: 'finance', label: 'المالية', icon: DollarSign },
      { key: 'users', label: 'المستخدمين', icon: Users, adminOnly: true },
      { key: 'settings', label: 'الإعدادات', icon: Settings, adminOnly: true },
    ];

    return (
      <div className="space-y-5" dir="rtl">
        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => { setActiveProjectId(null); setErpView('ALL_PROJECTS'); }}
              className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-[#4A1F66]">{activeProject.name}</h1>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{regionLabel(activeProject.region)}</span>
                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{activeProject.type || '—'}</span>
                <span className="flex items-center gap-1"><Home className="w-3 h-3" />{activeProject.city || '—'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canAdvance && (
              <button onClick={handleAdvanceStage}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#56B894] text-white rounded-lg text-sm font-bold
                  hover:bg-[#3F9B7A] transition shadow-md hover:shadow-lg active:scale-95">
                <CheckCircle className="w-4 h-4" />
                إكمال المرحلة
              </button>
            )}
          </div>
        </div>

        {/* Stage Pipeline */}
        <Card title="خط سير المراحل" icon={Activity}>
          <StagePipeline currentStageId={activeProject.currentStageId} />
        </Card>

        {/* SLA + Mandatory row */}
        <div className="flex items-center gap-6 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="font-bold text-gray-600">حالة SLA:</span>
            <span className={`px-2 py-0.5 rounded-full font-bold ring-2 ring-offset-1 ${sla.ring}`}>{sla.text}</span>
          </div>
          <div className="flex items-center gap-2">
            <MandatoryGauge filled={activeProject.mandatoryFieldsFilled} total={activeProject.mandatoryFieldsTotal || 1} size="lg" />
            <span className="font-bold text-gray-600">
              {activeProject.mandatoryFieldsFilled}/{activeProject.mandatoryFieldsTotal} حقل إلزامي
            </span>
          </div>
          {activeProject.budgetSAR != null && (
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-gray-500" />
              <span className="font-bold text-gray-600">الميزانية:</span>
              <span className="font-bold text-[#56B894]">{formatCurrency(activeProject.budgetSAR)}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <SlidingTabs tabs={tabs} active={projectTab} onChange={setProjectTab} isAdmin={isAdmin} />

        {/* Tab content */}
        <div className="min-h-[300px]">
          {projectTab === 'overview' && renderOverviewTab()}
          {projectTab === 'diagnosis' && renderDiagnosisTab()}
          {projectTab === 'form' && renderFormTab()}
          {projectTab === 'docs' && renderDocsTab()}
          {projectTab === 'finance' && renderFinanceTab()}
          {projectTab === 'users' && renderUsersTab()}
          {projectTab === 'settings' && renderSettingsTab()}
        </div>
      </div>
    );
  };

  /* ---- Overview Tab ---- */
  const renderOverviewTab = () => {
    if (!activeProject) return null;
    const stageConf = STAGES_CONFIG.find(s => s.id === activeProject.currentStageId);
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="معلومات المشروع" icon={Briefcase}>
          <div className="space-y-3">
            {[
              { l: 'رقم المشروع', v: activeProject.id },
              { l: 'اسم المشروع', v: activeProject.name },
              { l: 'النوع', v: activeProject.type },
              { l: 'المنطقة', v: regionLabel(activeProject.region) },
              { l: 'المدينة', v: activeProject.city },
              { l: 'الميزانية', v: formatCurrency(activeProject.budgetSAR) },
              { l: 'المصروفات', v: formatCurrency(activeProject.disbursedSAR) },
              { l: 'تاريخ الدخول للمرحلة', v: activeProject.stageEnteredAt ? new Date(activeProject.stageEnteredAt).toLocaleDateString('ar-SA') : '—' },
              { l: 'تاريخ التسليم', v: activeProject.deliveryDate ? new Date(activeProject.deliveryDate).toLocaleDateString('ar-SA') : '—' },
            ].map(row => (
              <div key={row.l} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-xs font-semibold text-gray-500">{row.l}</span>
                <span className="text-sm font-bold text-gray-800">{row.v || '—'}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="المرحلة الحالية" icon={Activity}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="w-12 h-12 rounded-full bg-[#4A1F66] flex items-center justify-center text-white font-bold text-lg">
                {activeProject.currentStageId}
              </div>
              <div>
                <p className="text-base font-bold text-[#4A1F66]">{stageConf?.name || '—'}</p>
                <p className="text-xs text-gray-500">{stageConf?.dept} &middot; {stageConf?.duration}</p>
              </div>
            </div>
            <div className="text-sm text-gray-700">
              <p className="font-bold mb-1">الإجراء المطلوب:</p>
              <p>{stageConf?.action || '—'}</p>
            </div>
            <div className="flex items-center gap-3">
              <MandatoryGauge filled={activeProject.mandatoryFieldsFilled} total={activeProject.mandatoryFieldsTotal || 1} size="lg" />
              <div>
                <p className="text-sm font-bold text-gray-700">{activeProject.mandatoryFieldsFilled} من {activeProject.mandatoryFieldsTotal} حقول</p>
                <p className="text-[10px] text-gray-500">الحقول الإلزامية المكتملة</p>
              </div>
            </div>
            {activeProject.assignedFieldEngineer && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Users className="w-3.5 h-3.5" />
                <span>المهندس الميداني: {activeProject.assignedFieldEngineer}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Audit log */}
        {activeProject.projectAuditLog && activeProject.projectAuditLog.length > 0 && (
          <Card title="سجل الأحداث" icon={Clock} className="lg:col-span-2">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activeProject.projectAuditLog.slice().reverse().map((entry: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-xs p-2 rounded-lg hover:bg-gray-50">
                  <EventIcon type={entry.action} />
                  <div className="flex-1">
                    <p className="text-gray-700 font-semibold">{entry.action}</p>
                    <p className="text-gray-400">{entry.actor} &middot; {new Date(entry.at).toLocaleString('ar-SA')}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  /* ---- Diagnosis Tab ---- */
  const renderDiagnosisTab = () => {
    if (!activeProject) return null;
    const assessment = store.assessments.find(a => a.id === activeProject.assessmentId);
    return (
      <div className="space-y-5">
        <Card title="نتيجة التشخيص" icon={Stethoscope}>
          {activeProject.diagnosisVerdict ? (
            <div className={`p-4 rounded-xl border-2 flex items-center gap-3
              ${activeProject.diagnosisVerdict === 'قابل للترميم' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              {activeProject.diagnosisVerdict === 'قابل للترميم'
                ? <CheckCircle className="w-6 h-6 text-green-500" />
                : <AlertCircle className="w-6 h-6 text-red-500" />}
              <div>
                <p className="text-base font-bold">{activeProject.diagnosisVerdict}</p>
                <p className="text-xs text-gray-500 mt-1">حكم التقييم المهني لقابلية المنزل للترميم</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-gray-400">
              <Stethoscope className="w-10 h-10 mb-2" />
              <p className="text-sm font-bold">لم يتم إجراء التشخيص بعد</p>
            </div>
          )}
        </Card>

        {assessment && (
          <Card title="تفاصيل التقييم" icon={ClipboardList}>
            <div className="space-y-3">
              {Object.entries(assessment.data || {}).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-xs font-semibold text-gray-500">{k}</span>
                  <span className="text-sm font-bold text-gray-800">{String(v)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeProject.assessmentStatus && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <BadgeCheck className="w-4 h-4 text-blue-500" />
            <span>حالة التقييم: <strong>{activeProject.assessmentStatus}</strong></span>
          </div>
        )}
      </div>
    );
  };

  /* ---- Form Tab ---- */
  const renderFormTab = () => {
    if (!activeProject) return null;
    const d = activeProject.data || {};
    const listSource = store.lists || DEFAULT_LISTS;

    const Field = (sectionPrefix: string, fieldKey: string, label: string, opts?: { type?: string; options?: string[] }) => (
      <FormField
        key={`${sectionPrefix}.${fieldKey}`}
        label={label}
        type={opts?.type || 'text'}
        value={d[`${sectionPrefix}_${fieldKey}`] || ''}
        onChange={v => updateProjectField(activeProject.id, `data.${sectionPrefix}_${fieldKey}`, v, user.id)}
        options={opts?.options}
        reqType="optional"
      />
    );

    return (
      <div className="space-y-4">
        {FORM_SECTIONS.map(sec => {
          const SecIcon = sec.icon;
          return (
            <Card key={sec.key} title={`${sec.key}. ${sec.title}`} icon={SecIcon}>
              <div className="divide-y divide-gray-100">
                {/* Section-specific fields */}
                {sec.key === 'A' && (
                  <>
                    {Field('A', 'beneficiaryName', 'اسم المستفيد')}
                    {Field('A', 'nationalId', 'رقم الهوية')}
                    {Field('A', 'phone', 'رقم الجوال', { type: 'tel' })}
                    {Field('A', 'familyMembers', 'عدد أفراد الأسرة', { type: 'number' })}
                    {Field('A', 'referralChannel', 'قناة الإحالة', { type: 'select', options: listSource.referralChannel || DEFAULT_LISTS.referralChannel })}
                  </>
                )}
                {sec.key === 'B' && (
                  <>
                    {Field('B', 'projectType', 'نوع المشروع', { type: 'select', options: listSource.projectType || DEFAULT_LISTS.projectType })}
                    {Field('B', 'address', 'عنوان المشروع')}
                    {Field('B', 'evacuation', 'حالة الإخلاء', { type: 'select', options: listSource.evacuation || DEFAULT_LISTS.evacuation })}
                    {Field('B', 'supplyMethod', 'طريقة التوريد', { type: 'select', options: listSource.supplyMethod || DEFAULT_LISTS.supplyMethod })}
                    {Field('B', 'budget', 'الميزانية (ر.س)', { type: 'number' })}
                  </>
                )}
                {sec.key === 'C' && (
                  <>
                    {Field('C', 'socialWorker', 'الباحث الاجتماعي')}
                    {Field('C', 'visitDate', 'تاريخ الزيارة', { type: 'date' })}
                    {Field('C', 'incomeSource', 'مصدر الدخل')}
                    {Field('C', 'monthlyIncome', 'الدخل الشهري', { type: 'number' })}
                    {Field('C', 'housingCondition', 'حالة السكن')}
                    {Field('C', 'notes', 'ملاحظات البحث')}
                  </>
                )}
                {sec.key === 'D' && (
                  <>
                    {Field('D', 'engineer', 'المهندس المشرف')}
                    {Field('D', 'visitDate', 'تاريخ الزيارة', { type: 'date' })}
                    {Field('D', 'verdict', 'حكم التشخيص', { type: 'select', options: ['قابل للترميم', 'غير قابل'] })}
                    {Field('D', 'estimatedBudget', 'الميزانية التقديرية', { type: 'number' })}
                    {Field('D', 'notes', 'ملاحظات التشخيص')}
                  </>
                )}
                {sec.key === 'E' && CIVIL_FIELDS.map(f => Field('E', f.k, f.l, { type: 'number' }))}
                {sec.key === 'F' && ELEC_FIELDS.map(f => Field('F', f.k, f.l, { type: 'number' }))}
                {sec.key === 'G' && PLUMB_FIELDS.map(f => Field('G', f.k, f.l, { type: 'number' }))}
                {sec.key === 'H' && FURN_FIELDS.map(f => Field('H', f.k, f.l, { type: 'number' }))}
                {sec.key === 'I' && APP_FIELDS.map(f => Field('I', f.k, f.l, { type: 'number' }))}
                {sec.key === 'J' && (
                  <>
                    {Field('J', 'description', 'وصف الأعمال الإضافية')}
                    {Field('J', 'estimatedCost', 'التكلفة التقديرية', { type: 'number' })}
                    {Field('J', 'approvedBy', 'معتمد من')}
                  </>
                )}
                {sec.key === 'K' && (
                  <>
                    {Field('K', 'generalNotes', 'ملاحظات عامة')}
                    {Field('K', 'internalNotes', 'ملاحظات داخلية')}
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  /* ---- Docs Tab ---- */
  const renderDocsTab = () => {
    const sortedDocs = [...projectDocs].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    const requiredDocs = REQUIRED_DOCS.map(rd => {
      const uploaded = projectDocs.find(d => d.code === rd.code);
      return { ...rd, uploaded: !!uploaded, doc: uploaded };
    });

    return (
      <div className="space-y-5">
        <Card title="رفع مستند" icon={UploadCloud}>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 px-4 py-2.5 bg-[#4A1F66] text-white rounded-lg text-sm font-bold
              hover:bg-[#3A1652] transition cursor-pointer disabled:opacity-50"
              style={uploading ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
              <UploadCloud className="w-4 h-4" />
              {uploading ? 'جاري الرفع...' : 'اختر ملفات'}
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
            {uploading && <RefreshCw className="w-5 h-5 text-[#4A1F66] animate-spin" />}
            <p className="text-xs text-gray-500">PDF, صور, مستندات &mdash; يتم الرفع إلى Firebase Storage</p>
          </div>
        </Card>

        <Card title="المستندات المرفوعة" icon={Folder}>
          {sortedDocs.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-400">
              <FileText className="w-8 h-8 mb-2" />
              <p className="text-sm">لا توجد مستندات بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedDocs.map(doc => <DocRow key={doc.id || doc.code + doc.uploadedAt} doc={doc} />)}
            </div>
          )}
        </Card>

        <Card title="المستندات المطلوبة" icon={ClipboardList}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {requiredDocs.map(rd => (
              <div key={rd.code} className={`flex items-center gap-2 p-2 rounded-lg text-xs
                ${rd.uploaded ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {rd.uploaded ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                <div className="min-w-0">
                  <p className="font-bold text-gray-700 truncate">{rd.name}</p>
                  <p className="text-gray-400 text-[10px]">{rd.code}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  /* ---- Finance Tab ---- */
  const renderFinanceTab = () => {
    if (!activeProject) return null;
    return (
      <div className="space-y-4" dir="rtl">
        {/* Budget summary */}
        <Card title="ملخص الميزانية" icon={Wallet}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-purple-50 rounded-xl text-center">
              <p className="text-[10px] font-bold text-gray-500">الميزانية المعتمدة</p>
              <p className="text-lg font-bold text-[#4A1F66] mt-1">{formatCurrency(activeProject.budgetSAR)}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl text-center">
              <p className="text-[10px] font-bold text-gray-500">المصروفات</p>
              <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(activeProject.disbursedSAR)}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl text-center">
              <p className="text-[10px] font-bold text-gray-500">المتبقي</p>
              <p className="text-lg font-bold text-amber-600 mt-1">{formatCurrency((activeProject.budgetSAR || 0) - (activeProject.disbursedSAR || 0))}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-l from-[#4A1F66] to-[#56B894] transition-all duration-700"
                style={{ width: `${activeProject.budgetSAR ? Math.min(100, ((activeProject.disbursedSAR || 0) / activeProject.budgetSAR) * 100) : 0}%` }} />
            </div>
            <p className="text-[10px] text-gray-500 mt-1 text-center">
              {activeProject.budgetSAR ? `${Math.round(((activeProject.disbursedSAR || 0) / activeProject.budgetSAR) * 100)}% من الميزانية مصروفة` : 'لم تحدد الميزانية'}
            </p>
          </div>
        </Card>

        {/* Payment gates */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#4A1F66]" /> أبواب الصرف
          </h3>
          {PAYMENT_GATES.map(gate => (
            <PaymentGateCard
              key={gate.id}
              gate={gate}
              currentStageId={activeProject.currentStageId}
              projectDocs={projectDocs}
              project={activeProject}
              updateProject={updateProject}
              addNotification={addNotification}
              user={user}
            />
          ))}
        </div>
      </div>
    );
  };

  /* ---- Users Tab (Admin) ---- */
  const renderUsersTab = () => {
    if (!isAdmin) return <AccessDeniedCard />;

    const pendingUsers = store.users.filter(u => u.status === 'pending');
    const activeUsers = store.users.filter(u => u.status === 'active');
    const deactivatedUsers = store.users.filter(u => u.status === 'deactivated');

    return (
      <div className="space-y-5" dir="rtl">
        {/* Pending users */}
        {pendingUsers.length > 0 && (
          <Card title={`مستخدمون معلّقون (${pendingUsers.length})`} icon={Clock}>
            <div className="space-y-3">
              {pendingUsers.map(u => (
                <UserRow key={u.id} u={u} currentUser={user}
                  approveUser={approveUser} rejectUser={rejectUser}
                  updateUser={updateUser} deactivateUser={deactivateUser}
                  reactivateUser={reactivateUser} />
              ))}
            </div>
          </Card>
        )}

        {/* Active users */}
        <Card title={`مستخدمون فعّالون (${activeUsers.length})`} icon={Users}>
          <div className="space-y-3">
            {activeUsers.map(u => (
              <UserRow key={u.id} u={u} currentUser={user}
                approveUser={approveUser} rejectUser={rejectUser}
                updateUser={updateUser} deactivateUser={deactivateUser}
                reactivateUser={reactivateUser} />
            ))}
          </div>
        </Card>

        {/* Deactivated users */}
        {deactivatedUsers.length > 0 && (
          <Card title={`مستخدمون معطّلون (${deactivatedUsers.length})`} icon={Ban}>
            <div className="space-y-3">
              {deactivatedUsers.map(u => (
                <UserRow key={u.id} u={u} currentUser={user}
                  approveUser={approveUser} rejectUser={rejectUser}
                  updateUser={updateUser} deactivateUser={deactivateUser}
                  reactivateUser={reactivateUser} />
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  /* ---- Settings Tab (Admin) ---- */
  const renderSettingsTab = () => {
    if (!isAdmin) return <AccessDeniedCard />;

    const listSource = store.lists || DEFAULT_LISTS;
    const listKeys = [
      { key: 'projectType', label: 'أنواع المشاريع', icon: Briefcase },
      { key: 'referralChannel', label: 'قنوات الإحالة', icon: Phone },
      { key: 'evacuation', label: 'حالات الإخلاء', icon: Home },
      { key: 'supplyMethod', label: 'طرق التوريد', icon: Truck },
    ] as const;

    return (
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-[#4A1F66]" />
          <h2 className="text-lg font-bold text-[#4A1F66]">إعدادات القوائم</h2>
        </div>

        {listKeys.map(lk => (
          <ListEditor key={lk.key} listKey={lk.key} label={lk.label} icon={lk.icon}
            values={listSource[lk.key] || DEFAULT_LISTS[lk.key as keyof typeof DEFAULT_LISTS] || []}
            updateList={updateList} />
        ))}
      </div>
    );
  };

  /* ================================================================ */
  /*  Master render                                                    */
  /* ================================================================ */

  return (
    <div className="min-h-screen bg-[#FFF8E7] p-4 md:p-6 lg:p-8" dir="rtl">
      {erpView === 'ALL_PROJECTS' && renderDashboard()}
      {erpView === 'ANALYTICS' && renderAnalytics()}
      {erpView === 'PROJECT' && renderProjectWorkspace()}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Sub: ListEditor (used in Settings tab)                             */
/* ------------------------------------------------------------------ */

const ListEditor: React.FC<{
  listKey: string; label: string; icon: React.ElementType;
  values: string[]; updateList: (key: string, values: string[]) => Promise<void>;
}> = ({ listKey, label, icon: Icon, values, updateList }) => {
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<string[]>(values);
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed || items.includes(trimmed)) return;
    setItems(prev => [...prev, trimmed]);
    setNewItem('');
  };

  const handleRemove = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateList(listKey, items);
      setEditing(false);
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    setItems(values);
    setEditing(false);
    setNewItem('');
  };

  return (
    <Card title={label} icon={Icon}>
      {!editing ? (
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {values.map((v, i) => (
              <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                {v}
              </span>
            ))}
          </div>
          <button onClick={() => setEditing(true)}
            className="text-xs text-[#4A1F66] font-bold flex items-center gap-1 hover:underline">
            <Edit3 className="w-3.5 h-3.5" /> تعديل
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {items.map((v, i) => (
              <span key={i} className="flex items-center gap-1 px-3 py-1 bg-purple-50 text-[#4A1F66] rounded-full text-xs font-semibold border border-purple-200">
                {v}
                <button onClick={() => handleRemove(i)} className="hover:text-red-500 transition"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              placeholder="إضافة عنصر جديد..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66]" />
            <button onClick={handleAdd}
              className="px-4 py-2 bg-[#56B894] text-white rounded-lg text-sm font-bold hover:bg-[#3F9B7A] transition flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> إضافة
            </button>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-[#4A1F66] text-white rounded-lg text-sm font-bold hover:bg-[#3A1652] transition disabled:opacity-50 flex items-center gap-1">
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} حفظ
            </button>
            <button onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300 transition">
              إلغاء
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

