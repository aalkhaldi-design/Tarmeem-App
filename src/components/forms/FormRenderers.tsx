/* ──────────────────────────────────────────────────────────────────
   نماذج F-XX — مكوّنات المعاينة والإنشاء
   كل نموذج يحترم سلسلة الاعتماد الخاصّة به ويمتلك UX خاص
   ────────────────────────────────────────────────────────────────── */
import { FormF04Renderer } from './FormF04';
import { F02Creator, F02Renderer } from './FormF02';
import { F07Renderer } from './FormF07';
import { F23Creator, F23Renderer } from './FormF23';
import { F52Creator, F52Renderer } from './FormF52';
import { SearchablePeoplePicker } from './SearchablePeoplePicker';
import { TitledFileUploader, TitledFile } from './TitledFileUploader';

import React, { useEffect, useState } from 'react';
import {
  X, Send, Plus, Building2, Users as UsersIcon, Home as HomeIcon, Activity,
  ClipboardList, Calculator, Trophy, ShieldCheck, Camera, Truck, ShoppingCart,
  DollarSign, Briefcase, FileSignature, AlertTriangle, CheckCircle2,
  Calendar, PenTool, Edit3, Eye, Sofa, ChevronUp, ChevronDown, Trash2, RotateCcw,
} from 'lucide-react';

import {
  Card, Input, Select, TextArea, ReadOnlyField, FileUploader, Pill, NumberCounter,
  ProgressBar,
} from '../ui';
import { DEFAULT_LISTS, FormCode, SaudiRiyalGlassIcon, roleName } from '../../lib/data';
import {
  FormCreator, FormRenderer, formAwaitsUser, formIsEditableByUser, FormRecord,
} from '../Forms';
import { FormShell, SectionTitle } from './FormShell';
import { CroquisEditorModal, type Point, type Fixture } from './CroquisEditor';
import { CroquisMiniViewer } from './CroquisMiniViewer';
import type { UserProfile } from '../Auth';

/* ──────────────────────────────────────────────────────────────────
   Types passed via the registry context
   ────────────────────────────────────────────────────────────────── */

export interface FormsContext {
  /** المشاريع الكاملة لخدمة استرجاع البيانات بين النماذج */
  projects: ProjectRecord[];
  /** ينشئ مشروعاً جديداً ويولّد TRM-ID */
  generateProjectId: () => Promise<{ projectId: string; serial: number }>;
  /** يبحث عن نموذج بكود ضمن نفس المشروع */
  findProjectForm: (projectRefId: string | null | undefined, code: FormCode) => FormRecord | null;
  /** يحدّث وثيقة المشروع (عند التحويل، حالة، إلخ) */
  updateProject: (projectRefId: string, patch: Partial<ProjectRecord>) => Promise<void>;
  /** ينشئ مشروعاً جديداً (يستخدم في F-03.transfer) */
  createProject: (data: Partial<ProjectRecord>) => Promise<string | null>;
  /** الحصول على المستخدم */
  userById: (id: string) => UserProfile | undefined;
}

export interface ProjectRecord {
  id: string;
  projectId: string;       // TRM-YYYY-NNN
  beneficiaryName: string;
  beneficiaryId?: string;
  city: string;
  neighborhood?: string;
  region?: string;
  caseRef?: string;        // CS-XXXX
  /** المرحلة الحالية: تتغيّر مع كل F-XX يكتمل */
  phase: 'RESEARCH' | 'DIAGNOSIS' | 'EVACUATION' | 'TENDERING' | 'EXECUTION' | 'HANDOVER' | 'CLOSED' | 'REJECTED' | 'CANCELLED';
  /** نسبة التقدم */
  progressPct: number;
  /** المهندس المسند للتشخيص (إن وُجد) */
  diagnosisEngineerId?: string | null;
  /** المهندس المسند للإشراف (إن وُجد) */
  supervisingEngineerId?: string | null;
  contractorName?: string | null;
  awardedPrice?: number | null;
  safetyHazard?: boolean;
  partnerEntity?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  /** بيانات إضافية — مفتوحة لكنها مصنّفة */
  extraData?: Record<string, unknown>;
}

/* ──────────────────────────────────────────────────────────────────
   F-03 — اعتماد استحقاق الخدمة
   سلسلة: مدير البحث ➡️ المدير التنفيذي ➡️ مدير البحث (للتحويل)
   عند الخطوة الأخيرة يولّد مشروعاً وينشئ F-08 ويُسند مهندس التشخيص.
   ────────────────────────────────────────────────────────────────── */

export const F03Creator: FormCreator = ({ user, api, onClose }) => {
  const f02s = api.forms.filter(f => f.code === 'F-02' && f.status === 'approved');
  const [f02Id, setF02Id] = useState<string>(f02s[0]?.id || '');
  const [eligibility, setEligibility] = useState<'مستحق' | 'غير مستحق' | ''>('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const f02 = api.forms.find(f => f.id === f02Id);

  const submit = async () => {
    if (!f02 || !eligibility) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-03', user,
        beneficiaryName: f02.beneficiaryName,
        notes,
        data: { f02Id, eligibility, managerNotes: notes, f02Snapshot: f02.data },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
          <h2 className="font-bold">F-03 · اعتماد استحقاق الخدمة</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-3">
          <Select label="استمارة البحث المرتبطة (F-02)"
            options={f02s.map(f => ({ value: f.id, label: `${f.beneficiaryName || '—'} — ${new Date(f.createdAt).toLocaleDateString('ar-SA')}` }))}
            value={f02Id} onChange={e => setF02Id(e.target.value)} />
          {f02 && (
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 text-xs space-y-1">
              <p><span className="font-bold">المستفيد:</span> {f02.beneficiaryName}</p>
              <p><span className="font-bold">المدينة:</span> {f02.data?.personal?.city}</p>
              <p><span className="font-bold">رأي الباحث:</span> {f02.data?.researcher?.opinion}</p>
            </div>
          )}
          <Select label="قرار الاستحقاق" required
            options={['مستحق', 'غير مستحق']} value={eligibility} onChange={e => setEligibility(e.target.value as any)} />
          <TextArea label="ملاحظات مدير البحث" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div className="border-t dark:border-slate-700 p-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold bg-gray-100 dark:bg-slate-700 rounded-lg">إلغاء</button>
          <button onClick={submit} disabled={busy || !f02 || !eligibility} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg hover:bg-[#3A1652] transition disabled:opacity-50 flex items-center gap-1.5">
            <Send className="w-4 h-4" /> رفع للمدير التنفيذي
          </button>
        </div>
      </div>
    </div>
  );
};

export const F03Renderer: FormRenderer = ({ rec, user, api, context, onClose }) => {
  const [busy, setBusy] = useState(false);
  const [extraNote, setExtraNote] = useState('');
  const f02 = api.forms.find(f => f.id === rec.data?.f02Id);
  const awaitsMe = formAwaitsUser(rec, user);
  const isFinalStep = rec.approvalIndex === rec.approvalChain.length - 1;
  const isResearchManagerFinal = awaitsMe && user.role === 'RESEARCH_MANAGER' && isFinalStep;

  const transferToProjects = async () => {
    setBusy(true);
    try {
      // أنشئ المشروع برقم TRM-YYYY-NNN
      const { projectId } = await context.generateProjectId();
      const projectRefId = await context.createProject({
        projectId,
        beneficiaryName: rec.beneficiaryName || f02?.beneficiaryName || 'مستفيد',
        city: f02?.data?.personal?.city || '',
        neighborhood: f02?.data?.personal?.neighborhood || '',
        caseRef: f02?.data?.caseRef,
        phase: 'DIAGNOSIS',
        progressPct: 10,
        createdBy: user.id,
        data: { f02Id: f02?.id, f03Id: rec.id },
      });
      // اعتمد الخطوة الأخيرة (تنتقل تلقائياً إلى المشاريع عبر trigger F-08)
      await api.approveForm(rec.id, user, extraNote || 'تحويل إلى إدارة المشاريع', { projectId, projectRefId });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={
      isResearchManagerFinal ? (
        <div className="border border-purple-200 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-900/20 rounded-lg p-3 space-y-3">
          <div className="text-xs font-bold text-[#4A1F66] dark:text-purple-300">الخطوة النهائية: تحويل المستفيد إلى إدارة المشاريع.</div>
          <p className="text-xs text-purple-800 dark:text-purple-300">سيتم إنشاء رقم مشروع تلقائي بالصيغة <code className="bg-white dark:bg-slate-800 px-1 rounded">TRM-{new Date().getFullYear()}-NNN</code> وفتح كراسة التشخيص F-08.</p>
          <textarea value={extraNote} onChange={e => setExtraNote(e.target.value)} rows={2} placeholder="ملاحظات التحويل (اختياري)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-[#56B894]" />
          <button onClick={transferToProjects} disabled={busy} className="w-full py-2 bg-[#4A1F66] text-white rounded-lg font-bold text-sm hover:bg-[#3A1652] transition flex items-center justify-center gap-1.5">
            <Send className="w-4 h-4" /> {busy ? 'جاري التحويل...' : 'إنشاء مشروع وتحويل لإدارة المشاريع'}
          </button>
        </div>
      ) : undefined
    }>
      <Card title="ملخص البحث الاجتماعي" icon={UsersIcon}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReadOnlyField label="المستفيد" value={f02?.beneficiaryName} />
          <ReadOnlyField label="المدينة" value={f02?.data?.personal?.city} />
          <ReadOnlyField label="نوع السكن" value={f02?.data?.housing?.type} />
          <ReadOnlyField label="الاحتياج" value={f02?.data?.housing?.need} />
        </div>
        <ReadOnlyField className="mt-3" label="رأي الباحث" value={f02?.data?.researcher?.opinion} />
      </Card>
      <Card title="قرار الاستحقاق" icon={ShieldCheck}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReadOnlyField label="القرار" value={rec.data?.eligibility} />
          <ReadOnlyField label="ملاحظات مدير البحث" value={rec.data?.managerNotes} />
        </div>
      </Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-08 — كراسة تشخيص المبنى
   سلسلة: مهندس التشخيص ➡️ رئيس التشخيص ➡️ مدير المشاريع
   ────────────────────────────────────────────────────────────────── */

export const F08Creator: FormCreator = ({ user, api, context, onClose }) => {
  const myAssignments = api.forms.filter(f => f.code === 'F-08' && f.assigneeId === user.id);
  const projects = context.projects.filter((p: ProjectRecord) => p.diagnosisEngineerId === user.id);

  const [projectRefId, setProjectRefId] = useState<string>(projects[0]?.id || '');
  const [data, setData] = useState({
    visitDate: '', team: user.fullName,
    area: '', age: '', summary: '',
    civilNotes: '', elecNotes: '', plumbingNotes: '',
    finalRecommendation: '',
  });
  const [busy, setBusy] = useState(false);

  void myAssignments;

  const submit = async () => {
    const project = context.projects.find((p: ProjectRecord) => p.id === projectRefId);
    if (!project) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-08', user,
        projectId: project.projectId,
        projectRefId: project.id,
        beneficiaryName: project.beneficiaryName,
        notes: data.summary,
        data,
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
          <h2 className="font-bold">F-08 · كراسة تشخيص المبنى</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-3">
          <Card title="المشروع" icon={Building2}>
            <Select label="اختر المشروع المسند إليك"
              options={projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
              value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
          </Card>
          <Card title="بيانات الزيارة" icon={Calendar}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input type="date" label="تاريخ الزيارة" value={data.visitDate} onChange={e => setData(d => ({ ...d, visitDate: e.target.value }))} />
              <Input label="فريق التشخيص" value={data.team} onChange={e => setData(d => ({ ...d, team: e.target.value }))} />
              <Input label="المساحة التقريبية (م²)" type="number" value={data.area} onChange={e => setData(d => ({ ...d, area: e.target.value }))} />
              <Input label="العمر التقديري للبناء" value={data.age} onChange={e => setData(d => ({ ...d, age: e.target.value }))} />
            </div>
            <TextArea className="mt-3" label="ملخص تقييم المبنى" rows={3} value={data.summary} onChange={e => setData(d => ({ ...d, summary: e.target.value }))} />
          </Card>
          <Card title="ملاحظات حسب التخصص" icon={ClipboardList}>
            <TextArea label="الأعمال المدنية" rows={2} value={data.civilNotes} onChange={e => setData(d => ({ ...d, civilNotes: e.target.value }))} />
            <TextArea className="mt-2" label="الأعمال الكهربائية" rows={2} value={data.elecNotes} onChange={e => setData(d => ({ ...d, elecNotes: e.target.value }))} />
            <TextArea className="mt-2" label="أعمال السباكة" rows={2} value={data.plumbingNotes} onChange={e => setData(d => ({ ...d, plumbingNotes: e.target.value }))} />
          </Card>
          <Card title="السلامة والتوصية" icon={AlertTriangle}>
            <TextArea className="mt-3" label="التوصية النهائية" rows={2} value={data.finalRecommendation} onChange={e => setData(d => ({ ...d, finalRecommendation: e.target.value }))} />
          </Card>
        </div>
        <div className="border-t dark:border-slate-700 p-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold bg-gray-100 dark:bg-slate-700 rounded-lg">إلغاء</button>
          <button onClick={submit} disabled={busy || !projectRefId} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg hover:bg-[#3A1652] transition disabled:opacity-50 flex items-center gap-1.5">
            <Send className="w-4 h-4" /> رفع لرئيس قسم التشخيص
          </button>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-08 — كراسة تشخيص المبنى (5-tab binder with Croquis integration)
   Ported from docs/raw/geminiconversation__1_.txt lines 30742–31250.
   Approval chain unchanged: [DIAGNOSIS_ENGINEER, HEAD_DIAGNOSIS].
   FormShell wraps the binder so reject/decline/defer still work.
   ────────────────────────────────────────────────────────────────── */

interface F08Croquis {
  id: number;
  floorNum: string;
  roomName: string;
  paths: Point[][];
  fixtures: Fixture[];
  area: string;       // calculated by editor, "12.34"
  title?: string;     // derived "floor - room" for the simpler API surface
}

export const F08Renderer: FormRenderer = ({ rec, user, api, context, users }) => {
  const canEdit = formIsEditableByUser(rec, user);
  const awaitsMe = formAwaitsUser(rec, user);

  const [step, setStep] = useState(0);
  const [activeCroquisId, setActiveCroquisId] = useState<number | null>(null);
  const [activeNoteKey, setActiveNoteKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState<any>(() => ({
    autoFilled: false,
    familyName: '', contactNum: '', caseRef: '', projectId: '', partner: '',
    cityNeighborhood: '', partnerRep: '', partnerRepNum: '',
    visitDate: new Date().toISOString().split('T')[0],
    type: 'منزل', area: '', age: '', team: '',
    diagnosisResult: 'قابل للترميم', diagnosisResultOther: '',
    noEvacuation: false, summary: '',
    works: [],
    housingType: 'منزل', housingCondition: 'ترميم',
    familyCountFemale: 0, familyCountMale: 0,
    furnitureFixed: { bedSingle: 0, bed15: 0, bedDouble: 0, mattressSingle: 0, mattress15: 0, mattressDouble: 0, sofaMeters: 0, floorSeating: 0, carpet: 0, wardrobe2: 0, wardrobe3: 0, wardrobe4: 0, nightstand: 0, vanity: 0 },
    furnitureCustom: [],
    furnitureNotes: {},
    appliancesFixed: { acSplit1: 0, acSplit15: 0, acWindow15: 0, washer: 0, stove: 0, fridge: 0, vacuum: 0, waterCooler: 0 },
    appliancesCustom: [],
    appliancesNotes: {},
    croquisList: [] as F08Croquis[],
    diagnosisNotes: '', pledge: false,
    ...(rec.data || {}),
  }));

  // Auto-fill from F-02 + F-04 on first mount (verbatim Gemini logic)
  useEffect(() => {
    if (data.autoFilled) return;
    const project = context?.projects?.find((p: any) => p.id === rec.projectRefId);
    const f02 = api.forms.find(f => f.code === 'F-02' && f.projectRefId === rec.projectRefId);
    const f04 = api.forms.find(f => f.code === 'F-04' && f.projectRefId === rec.projectRefId);
    let teamStr = '';
    if (f04) {
      const head = users.find(u => u.id === f04.createdBy)?.fullName || '';
      const eng = users.find(u => u.id === (f04.data as any)?.engineerId)?.fullName || '';
      const helpers = (((f04.data as any)?.helpers as string[] | undefined) || [])
        .map(hid => users.find(u => u.id === hid)?.fullName)
        .filter(Boolean)
        .join('، ');
      teamStr = `رئيس التشخيص: ${head} | مهندس التشخيص: ${eng}` + (helpers ? ` | الفزعة: ${helpers}` : '');
    }
    setData((prev: any) => ({
      ...prev,
      familyName: prev.familyName || rec.beneficiaryName || '',
      contactNum: prev.contactNum || (f02?.data as any)?.personal?.mobile1 || '',
      caseRef: prev.caseRef || (f02?.data as any)?.caseRef || '',
      projectId: prev.projectId || project?.projectId || '',
      cityNeighborhood: prev.cityNeighborhood || `${(f02?.data as any)?.personal?.city || ''} - ${(f02?.data as any)?.personal?.neighborhood || ''}`,
      team: prev.team || teamStr,
      autoFilled: true,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ───── Works (Tab 2) CRUD ───── */
  const addWorkSpace = () => setData((prev: any) => ({
    ...prev,
    works: [...prev.works, {
      id: Date.now(), name: '', isExpanded: true, images: [],
      civilFixed: { ceiling: '', concrete: '', ceramic: '', insulation: '', plaster: '', paint: '', aluminum: '', wood: '' },
      civilCustom: [], civilNotes: '',
      electricalFixed: { ceilingLight: 0, breaker: 0, normalSocket: 0, spotlight: 0 },
      electricalCustom: [], electricalNotes: '',
      plumbingFixed: { westernToilet: 0, arabicToilet: 0, ceramicSink: 0, heater: 0 },
      plumbingCustom: [], plumbingNotes: '',
    }],
  }));
  const removeWorkSpace = (id: number) => setData((prev: any) => ({ ...prev, works: prev.works.filter((w: any) => w.id !== id) }));
  const toggleExpand = (id: number) => setData((prev: any) => ({ ...prev, works: prev.works.map((w: any) => w.id === id ? { ...w, isExpanded: !w.isExpanded } : w) }));
  const updateWorkSpace = (id: number, category: string | null, field: string, value: any) => setData((prev: any) => ({
    ...prev,
    works: prev.works.map((w: any) => {
      if (w.id !== id) return w;
      if (category) return { ...w, [category]: { ...w[category], [field]: value } };
      return { ...w, [field]: value };
    }),
  }));
  const addSpaceCustomField = (spaceId: number, category: 'civilCustom' | 'electricalCustom' | 'plumbingCustom') => setData((prev: any) => ({
    ...prev,
    works: prev.works.map((w: any) => w.id === spaceId
      ? { ...w, [category]: [...w[category], { id: Date.now(), name: '', value: category === 'civilCustom' ? '' : 0 }] }
      : w),
  }));
  const updateSpaceCustomField = (spaceId: number, category: string, fieldId: number, key: string, val: any) => setData((prev: any) => ({
    ...prev,
    works: prev.works.map((w: any) => w.id === spaceId
      ? { ...w, [category]: w[category].map((f: any) => f.id === fieldId ? { ...f, [key]: val } : f) }
      : w),
  }));
  const removeSpaceCustomField = (spaceId: number, category: string, fieldId: number) => setData((prev: any) => ({
    ...prev,
    works: prev.works.map((w: any) => w.id === spaceId
      ? { ...w, [category]: w[category].filter((f: any) => f.id !== fieldId) }
      : w),
  }));

  /* ───── Tab 3 helpers ───── */
  const updateNestedData = (group: string, key: string, val: any) =>
    setData((prev: any) => ({ ...prev, [group]: { ...prev[group], [key]: val } }));
  const toggleNote = (key: string) => setActiveNoteKey(prev => prev === key ? null : key);

  /* ───── Croquis (Tab 4) CRUD ───── */
  const addCroquis = () => {
    const newCroquis: F08Croquis = { id: Date.now(), floorNum: '', roomName: '', paths: [], fixtures: [], area: '0' };
    setData((prev: any) => ({ ...prev, croquisList: [...(prev.croquisList || []), newCroquis] }));
    setActiveCroquisId(newCroquis.id);
  };
  const updateCroquis = (id: number, key: keyof F08Croquis, value: any) =>
    setData((prev: any) => ({ ...prev, croquisList: prev.croquisList.map((c: F08Croquis) => c.id === id ? { ...c, [key]: value } : c) }));
  const removeCroquis = (id: number) =>
    setData((prev: any) => ({ ...prev, croquisList: prev.croquisList.filter((c: F08Croquis) => c.id !== id) }));
  const saveCroquisFromEditor = (paths: Point[][], fixtures: Fixture[], area: string) => {
    setData((prev: any) => ({
      ...prev,
      croquisList: prev.croquisList.map((c: F08Croquis) => c.id === activeCroquisId
        ? { ...c, paths, fixtures, area, title: [c.floorNum, c.roomName].filter(Boolean).join(' - ') }
        : c),
    }));
    setActiveCroquisId(null);
  };

  const activeCroquis = (data.croquisList as F08Croquis[]).find(c => c.id === activeCroquisId);

  const [saved, setSaved] = useState(false);
  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      // Firestore rejects `undefined` — strip it before writing, no submit/status change.
      const clean = JSON.parse(JSON.stringify(data));
      await api.updateFormData(rec.id, clean);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error('F-08 save failed:', e);
      alert('تعذّر حفظ التعديلات — تحقق من الاتصال وحاول مجدداً');
    } finally { setSaving(false); }
  };

  const [submitting, setSubmitting] = useState(false);
  const submitBinder = async () => {
    setSubmitting(true);
    try {
      const clean = JSON.parse(JSON.stringify(data)); // persist current edits before approving
      await api.updateFormData(rec.id, clean);
      await api.approveForm(rec.id, user, '');
    } catch (e) {
      console.error('F-08 submit failed:', e);
      alert('تعذّر تقديم الكراسة — تحقق من الاتصال وحاول مجدداً');
    } finally { setSubmitting(false); }
  };

  const steps = ['الأساسية', 'حصر الأعمال', 'الأثاث والأجهزة', 'كروكي المبنى', 'الاعتماد والرفع'];

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={formAwaitsUser(rec, user) ? (
      <button disabled={submitting} onClick={submitBinder} className="w-full py-2.5 bg-[#4A1F66] text-white rounded-lg font-bold text-sm hover:bg-[#3A1652] disabled:opacity-50 transition">
        {submitting ? 'جارٍ التقديم…' : 'اعتماد وتقديم كراسة التشخيص'}
      </button>
    ) : undefined}>
      {/* Full-screen Croquis editor overlay */}
      {activeCroquis && (
        <CroquisEditorModal
          initialPaths={activeCroquis.paths || []}
          initialFixtures={activeCroquis.fixtures || []}
          readOnly={!canEdit}
          onSave={saveCroquisFromEditor}
          onClose={() => setActiveCroquisId(null)}
        />
      )}

      {/* Tab strip — sticky scroll-snap */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-surface dark:bg-slate-900 border-b border-subtle dark:border-slate-700 flex gap-2 overflow-x-auto snap-x snap-mandatory hide-scrollbar">
        {steps.map((s, i) => (
          <button key={i} onClick={() => setStep(i)}
            className={`snap-start flex-shrink-0 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all
              ${i === step ? 'bg-[#4A1F66] text-white shadow' : 'bg-gray-100 dark:bg-slate-800 text-fg-muted dark:text-slate-400'}`}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* Tab 1 — الأساسية */}
      {step === 0 && (
        <div className="space-y-4">
          <Card title="بيانات الأسرة والمنزل (تُجلب من F-02)" icon={HomeIcon}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input readOnly={!canEdit} label="اسم الأسرة" value={data.familyName} onChange={(e) => setData({ ...data, familyName: e.target.value })} />
              <Input readOnly={!canEdit} label="رقم التواصل" value={data.contactNum} onChange={(e) => setData({ ...data, contactNum: e.target.value })} />
              <Input readOnly={!canEdit} label="رقم المشروع" value={data.projectId} onChange={(e) => setData({ ...data, projectId: e.target.value })} />
              <Input readOnly={!canEdit} label="رقم الحالة المرجعي" value={data.caseRef} onChange={(e) => setData({ ...data, caseRef: e.target.value })} />
              <Input readOnly={!canEdit} label="الجهة الشريكة" value={data.partner} onChange={(e) => setData({ ...data, partner: e.target.value })} />
              <Input readOnly={!canEdit} label="المدينة - الحي" value={data.cityNeighborhood} onChange={(e) => setData({ ...data, cityNeighborhood: e.target.value })} />
              <Input readOnly={!canEdit} label="ممثل الجهة الشريكة" value={data.partnerRep} onChange={(e) => setData({ ...data, partnerRep: e.target.value })} />
              <Input readOnly={!canEdit} label="رقم تواصل الممثل" value={data.partnerRepNum} onChange={(e) => setData({ ...data, partnerRepNum: e.target.value })} />
            </div>
          </Card>

          <Card title="زيارة التشخيص" icon={Activity}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <Input type="date" readOnly={!canEdit} label="تاريخ الزيارة" value={data.visitDate} onChange={(e) => setData({ ...data, visitDate: e.target.value })} />
              <Select readOnly={!canEdit} label="نوع المبنى" options={['منزل', 'شقة', 'ملحق', 'شعبي']} value={data.type} onChange={(e) => setData({ ...data, type: e.target.value })} />
              <Input readOnly={!canEdit} label="المساحة التقريبية (م²)" value={data.area} onChange={(e) => setData({ ...data, area: e.target.value })} />
              <Input readOnly={!canEdit} label="العمر التقديري (سنوات)" value={data.age} onChange={(e) => setData({ ...data, age: e.target.value })} />
              <Input className="md:col-span-2" readOnly={!canEdit} label="فريق التشخيص (يُجلب من F-04)" value={data.team} onChange={(e) => setData({ ...data, team: e.target.value })} />
            </div>

            <label className="block text-xs font-bold text-fg-muted mb-2">النتيجة المبدئية للزيارة:</label>
            <div className="flex flex-wrap gap-4 mb-4 p-3 rounded-lg border border-subtle bg-surface-up">
              {['قابل للترميم', 'غير قابل للترميم', 'يحوّل صيانة', 'أخرى'].map(res => (
                <label key={res} className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                  <input disabled={!canEdit} type="radio" checked={data.diagnosisResult === res}
                    onChange={() => setData({ ...data, diagnosisResult: res })}
                    className="w-4 h-4 accent-[#43bba1]" />
                  {res}
                </label>
              ))}
              {data.diagnosisResult === 'أخرى' && (
                <div className="w-full mt-2">
                  <Input readOnly={!canEdit} placeholder="حدد النتيجة..." value={data.diagnosisResultOther}
                    onChange={(e) => setData({ ...data, diagnosisResultOther: e.target.value })} />
                </div>
              )}
            </div>

            <div className={`mt-3 p-3 rounded-lg flex items-start gap-3 transition border-2 ${data.noEvacuation ? 'bg-[#05110e] border-[#43bba1]/50' : 'bg-surface-up border-subtle'}`}>
              <input disabled={!canEdit} type="checkbox" checked={data.noEvacuation}
                onChange={(e) => setData({ ...data, noEvacuation: e.target.checked })}
                className="w-5 h-5 mt-0.5 rounded accent-[#43bba1] cursor-pointer" />
              <label className="cursor-pointer select-none font-bold text-sm text-[#43bba1] mt-1">المبنى ليس بحاجة إخلاء</label>
            </div>

            <TextArea readOnly={!canEdit} className="mt-4" label="ملخص تقييم المبنى المبدئي" rows={4}
              placeholder="ملاحظات عامة حول التقييم..." value={data.summary}
              onChange={(e) => setData({ ...data, summary: e.target.value })} />
          </Card>
        </div>
      )}

      {/* Tab 2 — حصر الأعمال */}
      {step === 1 && (
        <Card title="حصر كميات الأعمال (البنود المبدئية)" icon={ClipboardList}>
          <div className="space-y-4">
            {(data.works || []).length === 0 ? (
              <div className="p-6 rounded-lg text-center border-2 border-dashed border-subtle text-fg-muted">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-60" />
                <h3 className="text-sm font-bold">لا توجد مساحات مضافة</h3>
              </div>
            ) : (
              (data.works as any[]).map((space, index) => (
                <div key={space.id} className="rounded-lg border border-subtle overflow-hidden">
                  <div className="border-b border-subtle p-3 flex items-center justify-between gap-3 bg-surface-up">
                    <div className="flex-1 flex items-center gap-2">
                      <button onClick={() => toggleExpand(space.id)} className="p-1.5 rounded-md border border-subtle">
                        {space.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <span className="font-bold text-[#a871f7] text-sm">{index + 1}.</span>
                      <input readOnly={!canEdit} type="text" placeholder="اسم المساحة (مثال: غرفة النوم 1)"
                        value={space.name} onChange={(e) => updateWorkSpace(space.id, null, 'name', e.target.value)}
                        className="w-full md:w-1/2 text-sm font-bold bg-input-bg border border-subtle rounded px-3 py-1.5 outline-none" />
                    </div>
                    {canEdit && (
                      <button onClick={() => removeWorkSpace(space.id)} className="text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className={`${space.isExpanded ? 'block' : 'hidden'} p-4 space-y-6`}>
                    {/* Civil */}
                    <div>
                      <h4 className="text-sm font-bold text-[#43bba1] mb-3 pb-1 border-b border-subtle">الأعمال المدنية والتشطيبات</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        {[
                          ['ceiling', 'أسقف'], ['concrete', 'خرسانة'], ['ceramic', 'سيراميك'], ['insulation', 'عزل'],
                          ['plaster', 'مساح'], ['paint', 'دهانات'], ['aluminum', 'ألمنيوم (نوافذ)'], ['wood', 'نجارة (أبواب)'],
                        ].map(([k, l]) => (
                          <Input key={k} readOnly={!canEdit} label={l} value={space.civilFixed[k]}
                            onChange={(e) => updateWorkSpace(space.id, 'civilFixed', k, e.target.value)} />
                        ))}
                      </div>
                      {space.civilCustom.map((c: any) => (
                        <div key={c.id} className="flex gap-2 mb-2">
                          <Input className="flex-1" readOnly={!canEdit} placeholder="اسم البند" value={c.name}
                            onChange={(e) => updateSpaceCustomField(space.id, 'civilCustom', c.id, 'name', e.target.value)} />
                          <Input className="flex-1" readOnly={!canEdit} placeholder="القيمة" value={c.value}
                            onChange={(e) => updateSpaceCustomField(space.id, 'civilCustom', c.id, 'value', e.target.value)} />
                          {canEdit && (
                            <button onClick={() => removeSpaceCustomField(space.id, 'civilCustom', c.id)} className="px-3 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-lg">
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      {canEdit && (
                        <button onClick={() => addSpaceCustomField(space.id, 'civilCustom')} className="text-xs text-[#a871f7] font-bold flex items-center gap-1 mt-2 hover:underline">
                          <Plus size={14} /> أعمال وتشطيبات أخرى
                        </button>
                      )}
                      <TextArea className="mt-3" readOnly={!canEdit} label="ملاحظات الأعمال المدنية" rows={2}
                        value={space.civilNotes} onChange={(e) => updateWorkSpace(space.id, null, 'civilNotes', e.target.value)} />
                    </div>

                    {/* Electrical */}
                    <div>
                      <h4 className="text-sm font-bold text-[#43bba1] mb-3 pb-1 border-b border-subtle">أعمال الكهرباء</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                        {[
                          ['ceilingLight', 'مصباح مستعار'], ['breaker', 'لوح/بريكر'],
                          ['normalSocket', 'أفياش عادية'], ['spotlight', 'سبوت لايت'],
                        ].map(([k, l]) => (
                          <NumberCounter key={k} label={l} value={space.electricalFixed[k]}
                            onChange={(v) => canEdit && updateWorkSpace(space.id, 'electricalFixed', k, v)} />
                        ))}
                      </div>
                      <div className="mt-3 space-y-2">
                        {space.electricalCustom.map((c: any) => (
                          <div key={c.id} className="flex gap-2 items-center">
                            <Input className="flex-1" readOnly={!canEdit} placeholder="اسم البند الإضافي" value={c.name}
                              onChange={(e) => updateSpaceCustomField(space.id, 'electricalCustom', c.id, 'name', e.target.value)} />
                            <div className="w-[140px] shrink-0">
                              <NumberCounter value={c.value} onChange={(v) => canEdit && updateSpaceCustomField(space.id, 'electricalCustom', c.id, 'value', v)} />
                            </div>
                            {canEdit && (
                              <button onClick={() => removeSpaceCustomField(space.id, 'electricalCustom', c.id)} className="p-2 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-lg">
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {canEdit && (
                        <button onClick={() => addSpaceCustomField(space.id, 'electricalCustom')} className="text-xs text-[#a871f7] font-bold flex items-center gap-1 mt-3 hover:underline">
                          <Plus size={14} /> أعمال كهرباء أخرى
                        </button>
                      )}
                      <TextArea className="mt-3" readOnly={!canEdit} label="ملاحظات أعمال الكهرباء" rows={2}
                        value={space.electricalNotes} onChange={(e) => updateWorkSpace(space.id, null, 'electricalNotes', e.target.value)} />
                    </div>

                    {/* Plumbing */}
                    <div>
                      <h4 className="text-sm font-bold text-[#43bba1] mb-3 pb-1 border-b border-subtle">أعمال السباكة</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                        {[
                          ['arabicToilet', 'كرسي عربي'], ['westernToilet', 'كرسي إفرنجي'],
                          ['ceramicSink', 'مغاسل خزف'], ['heater', 'سخانة'],
                        ].map(([k, l]) => (
                          <NumberCounter key={k} label={l} value={space.plumbingFixed[k]}
                            onChange={(v) => canEdit && updateWorkSpace(space.id, 'plumbingFixed', k, v)} />
                        ))}
                      </div>
                      <div className="mt-3 space-y-2">
                        {space.plumbingCustom.map((c: any) => (
                          <div key={c.id} className="flex gap-2 items-center">
                            <Input className="flex-1" readOnly={!canEdit} placeholder="اسم البند الإضافي" value={c.name}
                              onChange={(e) => updateSpaceCustomField(space.id, 'plumbingCustom', c.id, 'name', e.target.value)} />
                            <div className="w-[140px] shrink-0">
                              <NumberCounter value={c.value} onChange={(v) => canEdit && updateSpaceCustomField(space.id, 'plumbingCustom', c.id, 'value', v)} />
                            </div>
                            {canEdit && (
                              <button onClick={() => removeSpaceCustomField(space.id, 'plumbingCustom', c.id)} className="p-2 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-lg">
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {canEdit && (
                        <button onClick={() => addSpaceCustomField(space.id, 'plumbingCustom')} className="text-xs text-[#a871f7] font-bold flex items-center gap-1 mt-3 hover:underline">
                          <Plus size={14} /> أعمال سباكة أخرى
                        </button>
                      )}
                      <TextArea className="mt-3" readOnly={!canEdit} label="ملاحظات أعمال السباكة" rows={2}
                        value={space.plumbingNotes} onChange={(e) => updateWorkSpace(space.id, null, 'plumbingNotes', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))
            )}
            {canEdit && (
              <button onClick={addWorkSpace} className="w-full border border-dashed border-[#502b79] text-[#a871f7] py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-[#1a0f2e]/10 transition">
                <Plus className="w-5 h-5" /> إضافة مساحة إضافية لحصر الأعمال
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Tab 3 — الأثاث والأجهزة */}
      {step === 2 && (
        <Card title="جرد الأثاث والأجهزة" icon={Sofa}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 border-b border-subtle pb-4">
            <Select readOnly={!canEdit} label="نوع السكن" options={['منزل', 'شقة']} value={data.housingType}
              onChange={(e) => setData({ ...data, housingType: e.target.value })} />
            <Select readOnly={!canEdit} label="حالة المنزل" options={['ترميم', 'حريق']} value={data.housingCondition}
              onChange={(e) => setData({ ...data, housingCondition: e.target.value })} />
            <NumberCounter label="عدد الأفراد (ذكور)" value={data.familyCountMale}
              onChange={(v) => canEdit && setData({ ...data, familyCountMale: v })} />
            <NumberCounter label="عدد الأفراد (إناث)" value={data.familyCountFemale}
              onChange={(v) => canEdit && setData({ ...data, familyCountFemale: v })} />
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-subtle">
              <h4 className="text-sm font-bold text-[#43bba1] mb-3 pb-1 border-b border-subtle">الأثاث المطلوب</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {[
                  { k: 'bedSingle', l: 'سرير مفرد' }, { k: 'bed15', l: 'سرير نفر ونص' }, { k: 'bedDouble', l: 'سرير مزدوج' },
                  { k: 'mattressSingle', l: 'مراتب نفر' }, { k: 'mattress15', l: 'مرتبة نفر ونص' }, { k: 'mattressDouble', l: 'مراتب نفرين' },
                  { k: 'sofaMeters', l: 'كنب (أمتار)' }, { k: 'floorSeating', l: 'جلسة أرضية' }, { k: 'carpet', l: 'سجاد' },
                  { k: 'wardrobe2', l: 'دولاب بابين' }, { k: 'wardrobe3', l: 'دولاب 3 أبواب' }, { k: 'wardrobe4', l: 'دولاب 4 أبواب' },
                  { k: 'nightstand', l: 'كومدينة درجين' }, { k: 'vanity', l: 'تسريحة' },
                ].map(item => (
                  <div key={item.k} className="flex flex-col gap-1">
                    <NumberCounter label={item.l} value={data.furnitureFixed[item.k]}
                      onChange={(v) => canEdit && updateNestedData('furnitureFixed', item.k, v)} />
                    <button onClick={() => toggleNote(`f_${item.k}`)} className="text-[10px] text-fg-faint font-bold self-start hover:text-[#43bba1] transition flex items-center gap-1">
                      <Plus size={10} /> إضافة ملاحظة
                    </button>
                    {(activeNoteKey === `f_${item.k}` || data.furnitureNotes[item.k]) && (
                      <input readOnly={!canEdit} type="text" placeholder="اكتب الملاحظة هنا..."
                        className="w-full bg-input-bg border border-subtle rounded-md px-2 py-1 text-xs outline-none focus:border-[#43bba1]"
                        value={data.furnitureNotes[item.k] || ''}
                        onChange={(e) => updateNestedData('furnitureNotes', item.k, e.target.value)} />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {(data.furnitureCustom || []).map((c: any) => (
                  <div key={c.id} className="flex flex-col gap-1">
                    <div className="flex gap-2 items-center">
                      <Input className="flex-1" readOnly={!canEdit} placeholder="اسم الأثاث الإضافي" value={c.name}
                        onChange={(e) => {
                          const arr = [...data.furnitureCustom];
                          const idx = arr.findIndex((x: any) => x.id === c.id);
                          arr[idx].name = e.target.value;
                          setData({ ...data, furnitureCustom: arr });
                        }} />
                      <div className="w-[140px] shrink-0">
                        <NumberCounter value={c.count} onChange={(v) => {
                          if (!canEdit) return;
                          const arr = [...data.furnitureCustom];
                          const idx = arr.findIndex((x: any) => x.id === c.id);
                          arr[idx].count = v;
                          setData({ ...data, furnitureCustom: arr });
                        }} />
                      </div>
                      {canEdit && (
                        <button onClick={() => setData({ ...data, furnitureCustom: data.furnitureCustom.filter((x: any) => x.id !== c.id) })} className="p-2 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-lg">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <input readOnly={!canEdit} type="text" placeholder="ملاحظة..."
                      className="w-full bg-input-bg border border-subtle rounded-md px-2 py-1.5 text-xs outline-none focus:border-[#43bba1]"
                      value={c.note || ''}
                      onChange={(e) => {
                        const arr = [...data.furnitureCustom];
                        const idx = arr.findIndex((x: any) => x.id === c.id);
                        arr[idx].note = e.target.value;
                        setData({ ...data, furnitureCustom: arr });
                      }} />
                  </div>
                ))}
              </div>
              {canEdit && (
                <button onClick={() => setData({ ...data, furnitureCustom: [...(data.furnitureCustom || []), { id: Date.now(), name: '', count: 0, note: '' }] })}
                  className="text-xs text-[#a871f7] font-bold flex items-center gap-1 mt-3 hover:underline">
                  <Plus size={14} /> إضافة أثاث آخر
                </button>
              )}
            </div>

            <div className="p-4 rounded-lg border border-subtle">
              <h4 className="text-sm font-bold text-[#43bba1] mb-3 pb-1 border-b border-subtle">الأجهزة الكهربائية</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {[
                  { k: 'acSplit1', l: 'مكيف سبلت طن' }, { k: 'acSplit15', l: 'مكيف سبلت طن ونص' }, { k: 'acWindow15', l: 'مكيف شباك طن ونص' },
                  { k: 'washer', l: 'غسالة' }, { k: 'stove', l: 'فرن غاز' }, { k: 'fridge', l: 'ثلاجة' },
                  { k: 'vacuum', l: 'مكنسة كهربائية' }, { k: 'waterCooler', l: 'براد ماء' },
                ].map(item => (
                  <div key={item.k} className="flex flex-col gap-1">
                    <NumberCounter label={item.l} value={data.appliancesFixed[item.k]}
                      onChange={(v) => canEdit && updateNestedData('appliancesFixed', item.k, v)} />
                    <button onClick={() => toggleNote(`a_${item.k}`)} className="text-[10px] text-fg-faint font-bold self-start hover:text-[#43bba1] transition flex items-center gap-1">
                      <Plus size={10} /> إضافة ملاحظة
                    </button>
                    {(activeNoteKey === `a_${item.k}` || data.appliancesNotes[item.k]) && (
                      <input readOnly={!canEdit} type="text" placeholder="اكتب الملاحظة هنا..."
                        className="w-full bg-input-bg border border-subtle rounded-md px-2 py-1 text-xs outline-none focus:border-[#43bba1]"
                        value={data.appliancesNotes[item.k] || ''}
                        onChange={(e) => updateNestedData('appliancesNotes', item.k, e.target.value)} />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {(data.appliancesCustom || []).map((c: any) => (
                  <div key={c.id} className="flex flex-col gap-1">
                    <div className="flex gap-2 items-center">
                      <Input className="flex-1" readOnly={!canEdit} placeholder="اسم الجهاز الإضافي" value={c.name}
                        onChange={(e) => {
                          const arr = [...data.appliancesCustom];
                          const idx = arr.findIndex((x: any) => x.id === c.id);
                          arr[idx].name = e.target.value;
                          setData({ ...data, appliancesCustom: arr });
                        }} />
                      <div className="w-[140px] shrink-0">
                        <NumberCounter value={c.count} onChange={(v) => {
                          if (!canEdit) return;
                          const arr = [...data.appliancesCustom];
                          const idx = arr.findIndex((x: any) => x.id === c.id);
                          arr[idx].count = v;
                          setData({ ...data, appliancesCustom: arr });
                        }} />
                      </div>
                      {canEdit && (
                        <button onClick={() => setData({ ...data, appliancesCustom: data.appliancesCustom.filter((x: any) => x.id !== c.id) })} className="p-2 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-lg">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <input readOnly={!canEdit} type="text" placeholder="ملاحظة..."
                      className="w-full bg-input-bg border border-subtle rounded-md px-2 py-1.5 text-xs outline-none focus:border-[#43bba1]"
                      value={c.note || ''}
                      onChange={(e) => {
                        const arr = [...data.appliancesCustom];
                        const idx = arr.findIndex((x: any) => x.id === c.id);
                        arr[idx].note = e.target.value;
                        setData({ ...data, appliancesCustom: arr });
                      }} />
                  </div>
                ))}
              </div>
              {canEdit && (
                <button onClick={() => setData({ ...data, appliancesCustom: [...(data.appliancesCustom || []), { id: Date.now(), name: '', count: 0, note: '' }] })}
                  className="text-xs text-[#a871f7] font-bold flex items-center gap-1 mt-3 hover:underline">
                  <Plus size={14} /> إضافة أجهزة كهربائية أخرى
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Tab 4 — كروكي المبنى */}
      {step === 3 && (
        <Card title="كروكي المبنى" icon={PenTool}>
          <p className="text-sm text-fg-muted mb-4 leading-relaxed">
            يمكنك إضافة كروكي لكل غرفة أو دور موضحاً أماكن الأبواب والنوافذ والسباكة بضغطة زر. المساحات ستُحسب آلياً.
          </p>

          <div className="space-y-4">
            {(data.croquisList as F08Croquis[]).map((croquis, index) => (
              <div key={croquis.id} className="border border-subtle rounded-2xl overflow-hidden flex flex-col md:flex-row bg-surface-up">
                <div className="p-4 flex-1 border-b md:border-b-0 md:border-l border-subtle flex flex-col justify-between gap-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Pill tone="purple">كروكي #{index + 1}</Pill>
                      <Pill tone="teal">{croquis.area || '0'} م²</Pill>
                    </div>
                    <Input readOnly={!canEdit} label="رقم الدور" placeholder="مثال: الدور الأرضي" value={croquis.floorNum}
                      onChange={(e) => updateCroquis(croquis.id, 'floorNum', e.target.value)} />
                    <Input readOnly={!canEdit} label="اسم الغرفة" placeholder="مثال: الصالة الرئيسية" value={croquis.roomName}
                      onChange={(e) => updateCroquis(croquis.id, 'roomName', e.target.value)} />
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-subtle">
                    <button onClick={() => setActiveCroquisId(croquis.id)}
                      className="flex-1 bg-[#2D124C]/20 text-[#a871f7] border border-[#2D124C] hover:bg-[#2D124C]/40 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition">
                      <Eye size={14} /> عرض الكروكي
                    </button>
                    {canEdit && (
                      <>
                        <button onClick={() => setActiveCroquisId(croquis.id)}
                          className="flex-1 bg-[#05110e] text-[#43bba1] border border-[#43bba1]/30 hover:bg-[#43bba1]/20 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition">
                          <Edit3 size={14} /> تعديل
                        </button>
                        <button onClick={() => removeCroquis(croquis.id)}
                          className="bg-red-100 dark:bg-red-950/40 text-red-600 hover:bg-red-200 dark:hover:bg-red-900 p-2 rounded-lg transition">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-64 h-48 md:h-auto">
                  <CroquisMiniViewer
                    paths={croquis.paths || []}
                    fixtures={croquis.fixtures || []}
                    area={croquis.area}
                    onOpen={() => setActiveCroquisId(croquis.id)}
                  />
                </div>
              </div>
            ))}
          </div>

          {canEdit && (
            <button onClick={addCroquis}
              className="mt-4 w-full border border-dashed border-[#502b79] text-[#a871f7] py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#1a0f2e]/10 transition">
              <Plus size={18} /> أضف كروكي
            </button>
          )}
        </Card>
      )}

      {/* Tab 5 — الاعتماد والرفع */}
      {step === 4 && (
        <Card title="ملاحظات وتوصيات" icon={ShieldCheck}>
          <TextArea readOnly={!canEdit} label="ملاحظات وتوصيات استثنائية؟" rows={3}
            value={data.diagnosisNotes} onChange={(e) => setData({ ...data, diagnosisNotes: e.target.value })} />

          <div className="mt-4">
            <h4 className="text-xs font-bold text-[#43bba1] mb-3">توصيات الأقسام المعنيّة</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-subtle text-center bg-surface-up">
                <p className="text-[10px] text-fg-muted font-bold mb-1">توصيات البحث الاجتماعي</p>
                <p className="text-xs font-medium">بانتظار المراجعة</p>
              </div>
              <div className="p-3 rounded-lg border border-subtle text-center bg-surface-up">
                <p className="text-[10px] text-fg-muted font-bold mb-1">توصيات الإدارة التنفيذية</p>
                <p className="text-xs font-medium">بانتظار المراجعة</p>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="mt-5 p-4 rounded-lg border border-subtle bg-surface-up flex items-start gap-3">
              <input type="checkbox" id="pledge_08" checked={!!data.pledge}
                onChange={(e) => setData({ ...data, pledge: e.target.checked })}
                className="w-5 h-5 mt-0.5 rounded accent-[#43bba1] cursor-pointer" />
              <label htmlFor="pledge_08" className="cursor-pointer select-none">
                <h4 className="text-sm font-bold mb-1">أتعهد بأن المدخلات والحصر دقيق</h4>
                <p className="text-[11px] text-fg-muted leading-relaxed">
                  استخدم زر «الاعتماد» في الأسفل لرفع الكراسة إلى المرحلة التالية بعد التأكد من اكتمال جميع التبويبات.
                </p>
              </label>
            </div>
          )}
        </Card>
      )}

      {/* Save + tab nav */}
      <div className="flex justify-between items-center pt-4 border-t border-subtle gap-2 flex-wrap">
        {canEdit ? (
          <button onClick={save} disabled={saving}
            className="px-5 py-2 text-sm font-bold rounded-lg bg-[#4A1F66] text-white hover:bg-[#3A1652] disabled:opacity-50 transition">
            {saving ? 'جارٍ الحفظ…' : saved ? 'تم الحفظ ✓' : 'حفظ التعديلات'}
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-surface-up text-fg-muted disabled:opacity-40">
            السابق
          </button>
          <button onClick={() => setStep((s) => Math.min(4, s + 1))} disabled={step === 4}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-[#a871f7]/20 text-[#a871f7] disabled:opacity-40">
            التالي
          </button>
        </div>
      </div>

      {awaitsMe && !data.pledge && step !== 4 && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-2 text-center">
          ⚠ يجب التوقيع على الإقرار في تبويب «الاعتماد والرفع» قبل اعتماد الكراسة.
        </p>
      )}
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-18 — تعهد إخلاء المنزل
   ────────────────────────────────────────────────────────────────── */

export const F18Creator: FormCreator = ({ user, api, context, onClose }) => {
  const projects = context.projects;
  const [projectRefId, setProjectRefId] = useState<string>(projects[0]?.id || '');
  const [evacDate, setEvacDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [pledgeFiles, setPledgeFiles] = useState<{ name: string; url?: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const p = projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-18', user,
        projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { evacDate, returnDate },
        notes, files: pledgeFiles,
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-18 · تعهد إخلاء المنزل" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع التعهد</button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="تواريخ الإخلاء" icon={Calendar}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input type="date" label="تاريخ الإخلاء" value={evacDate} onChange={e => setEvacDate(e.target.value)} />
          <Input type="date" label="تاريخ العودة المتوقع" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
        </div>
      </Card>
      <Card title="رفع التعهد الموقّع" icon={FileSignature}>
        <FileUploader files={pledgeFiles}
          onAdd={f => setPledgeFiles([...pledgeFiles, ...Array.from(f).map(file => ({ name: file.name }))])}
          onRemove={i => setPledgeFiles(pledgeFiles.filter((_, idx) => idx !== i))}
          label="أرفق التعهد (PDF أو صورة)" accept=".pdf,.jpg,.jpeg,.png" />
        <TextArea className="mt-3" label="ملاحظات" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

export const F18Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  const canEdit = formIsEditableByUser(rec, user);
  const [evacDate, setEvacDate] = useState<string>((d.evacDate as string) || '');
  const [returnDate, setReturnDate] = useState<string>((d.returnDate as string) || '');
  const [files, setFiles] = useState<TitledFile[]>((d.attachments as TitledFile[]) || []);
  useEffect(() => {
    if (!canEdit) return;
    const t = setTimeout(() => { api.updateFormData(rec.id, { evacDate, returnDate }); }, 500);
    return () => clearTimeout(t);
  }, [evacDate, returnDate, canEdit]);
  const updateFiles = (next: TitledFile[]) => { setFiles(next); api.updateFormData(rec.id, { attachments: next }); };
  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="تواريخ الإخلاء" icon={Calendar}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {canEdit
            ? <Input type="date" label="تاريخ الإخلاء" value={evacDate} onChange={e => setEvacDate(e.target.value)} />
            : <ReadOnlyField label="تاريخ الإخلاء" value={d.evacDate} />}
          {canEdit
            ? <Input type="date" label="تاريخ العودة" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
            : <ReadOnlyField label="تاريخ العودة" value={d.returnDate} />}
        </div>
      </Card>
      <Card title="مرفقات التعهد" icon={FileSignature}>
        <TitledFileUploader files={files} onChange={updateFiles} pathPrefix="f18-uploads" disabled={!canEdit} />
      </Card>
      {rec.notes && <Card title="ملاحظات" icon={ClipboardList}><ReadOnlyField label="" value={rec.notes} /></Card>}
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-22 — طلب توفير سكن بديل (يُولَّد آلياً مع F-18)
   ────────────────────────────────────────────────────────────────── */

export const F22Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  const state = (d.housingState as string) || 'dormant';
  const isResearch = !!user.isAdmin || user.department === 'RESEARCH';
  const isProjects = user.department === 'PROJECTS';
  const canFill = state === 'active' && (!!user.isAdmin || user.department === 'RESEARCH');
  const [files, setFiles] = useState<TitledFile[]>((d.attachments as TitledFile[]) || []);
  const [reqNote, setReqNote] = useState('');
  const [busy, setBusy] = useState(false);

  const setHousing = (next: string, extra: Record<string, unknown> = {}) => api.updateFormData(rec.id, { housingState: next, ...extra });
  const requestActivation = () => {
    if (!reqNote.trim()) { alert('اكتب سبب الطلب أولاً'); return; }
    setHousing('requested', { housingRequestNote: reqNote.trim(), housingRequestedByName: user.fullName });
  };
  const updateFiles = (next: TitledFile[]) => { setFiles(next); api.updateFormData(rec.id, { attachments: next }); };
  const submit = async () => { setBusy(true); try { await api.approveForm(rec.id, user, ''); } finally { setBusy(false); } };

  let action: React.ReactNode = <></>;
  if (state === 'dormant' && isResearch) action = <button onClick={() => setHousing('active')} className="w-full py-2.5 rounded-lg bg-[#43bba1] text-white font-bold text-sm">تفعيل النموذج وتعبئته</button>;
  else if (state === 'dormant' && isProjects) action = (
    <div className="space-y-2">
      <TextArea label="سبب طلب تفعيل النموذج" rows={2} value={reqNote} onChange={e => setReqNote(e.target.value)} />
      <button onClick={requestActivation} className="w-full py-2.5 rounded-lg bg-[#4A1F66] text-white font-bold text-sm">طلب التفعيل من البحث الاجتماعي</button>
    </div>
  );
  else if (state === 'requested' && isResearch) action = <button onClick={() => setHousing('active')} className="w-full py-2.5 rounded-lg bg-[#43bba1] text-white font-bold text-sm">تفعيل وتعبئة</button>;
  else if (state === 'active' && canFill) action = <button disabled={busy} onClick={submit} className="w-full py-2.5 rounded-lg bg-[#4A1F66] text-white font-bold text-sm disabled:opacity-50">{busy ? 'جارٍ التقديم…' : 'تقديم الطلب'}</button>;

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={action}>
      {state !== 'active' && (
        <Card title="طلب توفير سكن بديل (اختياري)" icon={HomeIcon}>
          <div className="p-3 rounded-lg bg-surface-up border border-subtle">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-fg-muted"><span className="w-2 h-2 rounded-full bg-gray-400" /> غير مفعّل</span>
            <p className="text-xs text-fg-muted mt-2">نموذج اختياري يبقى غير مفعّل حتى يفعّله البحث الاجتماعي، أو تطلب إدارة المشاريع تفعيله مع ذكر السبب. تقديمه لا يؤثّر على سير العمل.</p>
            {state === 'requested' && (
              <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300">طلب تفعيل من: {(d.housingRequestedByName as string) || '—'}</p>
                <p className="text-xs text-fg-muted mt-1">السبب: {(d.housingRequestNote as string) || '—'}</p>
              </div>
            )}
          </div>
        </Card>
      )}
      {state === 'active' && (
        <>
          <Card title="نص الخطاب الآلي للجهة الشريكة" icon={FileSignature}>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-sm leading-7">
              إلى مدير الجهة الشريكة المحترم،<br />
              نرجو التكرم بتوفير سكن بديل للأسرة المستفيدة <strong>{rec.beneficiaryName}</strong> في مدينة <strong>{(d.city as string) || '—'}</strong> خلال فترة الترميم.
              <br /><br />مع الشكر،<br />إدارة البحث الاجتماعي — جمعية ترميم.
            </div>
          </Card>
          <Card title="مرفقات (اختياري)" icon={ClipboardList}>
            <TitledFileUploader files={files} onChange={updateFiles} pathPrefix="f22-uploads" disabled={!canFill} />
          </Card>
        </>
      )}
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-21 — حصر الأثاث والأجهزة
   ────────────────────────────────────────────────────────────────── */

const FURNITURE_CATALOG = [
  { key: 'bed15', label: 'سرير نفر ونص', avgPrice: 800 },
  { key: 'bed1',   label: 'سرير نفر', avgPrice: 600 },
  { key: 'bedDouble', label: 'سرير مزدوج', avgPrice: 1200 },
  { key: 'mattress15', label: 'مرتبة نفر ونص', avgPrice: 500 },
  { key: 'wardrobe2', label: 'دولاب درفتين', avgPrice: 900 },
  { key: 'wardrobe3', label: 'دولاب 3 درف', avgPrice: 1300 },
  { key: 'sofa', label: 'كنب', avgPrice: 2500 },
  { key: 'carpet', label: 'سجاد/موكيت', avgPrice: 600 },
];
const APPLIANCE_CATALOG = [
  { key: 'fridge', label: 'ثلاجة', avgPrice: 2200 },
  { key: 'washer', label: 'غسالة', avgPrice: 1800 },
  { key: 'stove', label: 'طباخ/فرن', avgPrice: 1500 },
  { key: 'acSplit12', label: 'مكيف سبليت 12', avgPrice: 2000 },
  { key: 'acSplit18', label: 'مكيف سبليت 18', avgPrice: 2700 },
  { key: 'waterCooler', label: 'برادة مياه', avgPrice: 600 },
];

export const F21Creator: FormCreator = ({ user, api, context, onClose }) => {
  const projects = context.projects;
  const [projectRefId, setProjectRefId] = useState<string>(projects[0]?.id || '');
  const [furniture, setFurniture] = useState<Record<string, number>>({});
  const [appliances, setAppliances] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const totalFurniture = FURNITURE_CATALOG.reduce((s, i) => s + (furniture[i.key] || 0) * i.avgPrice, 0);
  const totalAppliance = APPLIANCE_CATALOG.reduce((s, i) => s + (appliances[i.key] || 0) * i.avgPrice, 0);

  const submit = async () => {
    const p = projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-21', user, projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { furniture, appliances, totalFurniture, totalAppliance, total: totalFurniture + totalAppliance },
      });
      onClose();
    } finally { setBusy(false); }
  };

  const QtyGrid = ({ catalog, qty, setQty }: { catalog: typeof FURNITURE_CATALOG; qty: any; setQty: any }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {catalog.map(item => (
        <div key={item.key} className={`border rounded-lg p-2 ${qty[item.key] > 0 ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300' : 'border-gray-200 dark:border-slate-700'}`}>
          <p className="text-xs font-bold text-gray-700 dark:text-slate-200 mb-1">{item.label}</p>
          <p className="text-[10px] text-gray-400 flex items-center gap-1">{item.avgPrice} <SaudiRiyalGlassIcon className="w-3 h-3 inline" /> / وحدة</p>
          <NumberCounter value={qty[item.key] || 0} onChange={v => setQty({ ...qty, [item.key]: v })} />
        </div>
      ))}
    </div>
  );

  return (
    <CreatorShell title="F-21 · حصر الأثاث والأجهزة" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع الحصر</button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="الأثاث" icon={HomeIcon}>
        <QtyGrid catalog={FURNITURE_CATALOG} qty={furniture} setQty={setFurniture} />
        <p className="text-xs font-bold text-purple-700 mt-3 flex items-center gap-1">إجمالي الأثاث: {totalFurniture} <SaudiRiyalGlassIcon className="w-4 h-4 inline" /></p>
      </Card>
      <Card title="الأجهزة" icon={Activity}>
        <QtyGrid catalog={APPLIANCE_CATALOG} qty={appliances} setQty={setAppliances} />
        <p className="text-xs font-bold text-purple-700 mt-3 flex items-center gap-1">إجمالي الأجهزة: {totalAppliance} <SaudiRiyalGlassIcon className="w-4 h-4 inline" /></p>
      </Card>
    </CreatorShell>
  );
};

// ── F-21 catalogs (mirror F-08 furnitureFixed / appliancesFixed / works) ──
const F21_FURNITURE = [
  { k: 'bedSingle', l: 'سرير مفرد' }, { k: 'bed15', l: 'سرير نفر ونص' }, { k: 'bedDouble', l: 'سرير مزدوج' },
  { k: 'mattressSingle', l: 'مراتب نفر' }, { k: 'mattress15', l: 'مرتبة نفر ونص' }, { k: 'mattressDouble', l: 'مراتب نفرين' },
  { k: 'sofaMeters', l: 'كنب (أمتار)' }, { k: 'floorSeating', l: 'جلسة أرضية' }, { k: 'carpet', l: 'سجاد' },
  { k: 'wardrobe2', l: 'دولاب بابين' }, { k: 'wardrobe3', l: 'دولاب 3 أبواب' }, { k: 'wardrobe4', l: 'دولاب 4 أبواب' },
  { k: 'nightstand', l: 'كومدينة درجين' }, { k: 'vanity', l: 'تسريحة' },
];
const F21_APPLIANCES = [
  { k: 'acSplit1', l: 'مكيف سبلت طن' }, { k: 'acSplit15', l: 'مكيف سبلت طن ونص' }, { k: 'acWindow15', l: 'مكيف شباك طن ونص' },
  { k: 'washer', l: 'غسالة' }, { k: 'stove', l: 'فرن غاز' }, { k: 'fridge', l: 'ثلاجة' },
  { k: 'vacuum', l: 'مكنسة كهربائية' }, { k: 'waterCooler', l: 'براد ماء' },
];
const F21_CIVIL = [
  { k: 'ceiling', l: 'أسقف' }, { k: 'concrete', l: 'خرسانة' }, { k: 'ceramic', l: 'سيراميك' }, { k: 'insulation', l: 'عزل' },
  { k: 'plaster', l: 'مساح' }, { k: 'paint', l: 'دهانات' }, { k: 'aluminum', l: 'ألمنيوم (نوافذ)' }, { k: 'wood', l: 'نجارة (أبواب)' },
];
const F21_ELEC = [
  { k: 'ceilingLight', l: 'مصباح مستعار' }, { k: 'breaker', l: 'لوح/بريكر' }, { k: 'normalSocket', l: 'أفياش عادية' }, { k: 'spotlight', l: 'سبوت لايت' },
];
const F21_PLUMB = [
  { k: 'arabicToilet', l: 'كرسي عربي' }, { k: 'westernToilet', l: 'كرسي إفرنجي' }, { k: 'ceramicSink', l: 'مغاسل خزف' }, { k: 'heater', l: 'سخانة' },
];

interface InvRow { id: string; label: string; qty: string; comment: string }
interface InvSection { rows: InvRow[]; comment: string }

const f21Uid = (p: string) => p + Math.random().toString(36).slice(2, 8);
function f21Extract(f08?: Record<string, any>): { furniture: InvSection; appliances: InvSection; materials: InvSection } {
  const d = f08 || {};
  const fur: InvRow[] = [];
  F21_FURNITURE.forEach(i => { const q = Number(d.furnitureFixed?.[i.k]); if (q > 0) fur.push({ id: f21Uid('f_'), label: i.l, qty: String(q), comment: '' }); });
  (d.furnitureCustom || []).forEach((c: any) => { if (Number(c.count) > 0) fur.push({ id: f21Uid('fc_'), label: c.name || 'بند', qty: String(c.count), comment: c.note || '' }); });
  const app: InvRow[] = [];
  F21_APPLIANCES.forEach(i => { const q = Number(d.appliancesFixed?.[i.k]); if (q > 0) app.push({ id: f21Uid('a_'), label: i.l, qty: String(q), comment: '' }); });
  (d.appliancesCustom || []).forEach((c: any) => { if (Number(c.count) > 0) app.push({ id: f21Uid('ac_'), label: c.name || 'بند', qty: String(c.count), comment: c.note || '' }); });
  const mat: InvRow[] = [];
  (d.works || []).forEach((w: any) => {
    const room = w.roomName || w.title || 'غرفة';
    F21_CIVIL.forEach(i => { const v = w.civilFixed?.[i.k]; if (v && String(v).trim()) mat.push({ id: f21Uid('mc_'), label: `${i.l} — ${room}`, qty: String(v), comment: '' }); });
    F21_ELEC.forEach(i => { const q = Number(w.electricalFixed?.[i.k]); if (q > 0) mat.push({ id: f21Uid('me_'), label: `${i.l} — ${room}`, qty: String(q), comment: '' }); });
    F21_PLUMB.forEach(i => { const q = Number(w.plumbingFixed?.[i.k]); if (q > 0) mat.push({ id: f21Uid('mp_'), label: `${i.l} — ${room}`, qty: String(q), comment: '' }); });
  });
  return { furniture: { rows: fur, comment: '' }, appliances: { rows: app, comment: '' }, materials: { rows: mat, comment: '' } };
}

const InvSectionEditor: React.FC<{ title: string; icon: any; section: InvSection; catalog: { l: string }[]; canEdit: boolean; onChange: (s: InvSection) => void }> = ({ title, icon, section, catalog, canEdit, onChange }) => {
  const [showAdd, setShowAdd] = useState(false);
  const setRows = (rows: InvRow[]) => onChange({ ...section, rows });
  const upd = (id: string, k: keyof InvRow, v: string) => setRows(section.rows.map(r => r.id === id ? { ...r, [k]: v } : r));
  const addRow = (label: string) => { setRows([...section.rows, { id: f21Uid('n_'), label, qty: '', comment: '' }]); setShowAdd(false); };
  return (
    <Card title={title} icon={icon}>
      <div className="space-y-2">
        {section.rows.map(r => (
          <div key={r.id} className="p-2.5 rounded-xl border border-subtle bg-surface-up space-y-2">
            <div className="flex items-center gap-2">
              <Input className="flex-1" placeholder="البند" value={r.label} readOnly={!canEdit} onChange={e => upd(r.id, 'label', e.target.value)} />
              <Input className="w-24" placeholder="الكمية" value={r.qty} readOnly={!canEdit} onChange={e => upd(r.id, 'qty', e.target.value)} />
              {canEdit && <button onClick={() => setRows(section.rows.filter(x => x.id !== r.id))} className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 shrink-0"><Trash2 className="w-4 h-4" /></button>}
            </div>
            <Input placeholder="ملاحظة على البند" value={r.comment} readOnly={!canEdit} onChange={e => upd(r.id, 'comment', e.target.value)} />
          </div>
        ))}
        {section.rows.length === 0 && <p className="text-xs text-fg-faint">لا بنود بكميات في هذا القسم.</p>}
        {canEdit && (
          <div>
            <button onClick={() => setShowAdd(s => !s)} className="px-3 py-1.5 rounded-lg bg-[#56B894] text-white text-xs font-bold flex items-center gap-1.5"><Plus className="w-3 h-3" /> أضف بنداً</button>
            {showAdd && (
              <div className="mt-2 p-2 rounded-lg border border-subtle bg-surface-up flex flex-wrap gap-1.5">
                {catalog.map(c => <button key={c.l} onClick={() => addRow(c.l)} className="px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800 text-xs">{c.l}</button>)}
                <button onClick={() => addRow('')} className="px-2 py-1 rounded-md bg-[#4A1F66] text-white text-xs">+ بند مخصص</button>
              </div>
            )}
          </div>
        )}
        <TextArea label="ملاحظة عامة على القسم" rows={2} value={section.comment} readOnly={!canEdit} onChange={e => onChange({ ...section, comment: e.target.value })} />
      </div>
    </Card>
  );
};

export const F21Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  const f04 = api.forms.find(f => f.code === 'F-04' && f.projectRefId === rec.projectRefId);
  const helperIds = ((f04?.data?.helpers as string[]) || []);
  const canEdit = rec.status === 'pending' && (user.isAdmin || user.role === 'HEAD_DIAGNOSIS' || user.id === rec.assigneeId || helperIds.includes(user.id));
  const f08 = api.forms.find(f => f.code === 'F-08' && f.projectRefId === rec.projectRefId);

  const [sections, setSections] = useState<{ furniture: InvSection; appliances: InvSection; materials: InvSection }>(
    () => (d.f21_sections as any) || f21Extract(f08?.data as any),
  );
  const [recommendation, setRecommendation] = useState<string>((d.f21_recommendation as string) || '');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const persist = () => api.updateFormData(rec.id, JSON.parse(JSON.stringify({ f21_sections: sections, f21_recommendation: recommendation })));
  const save = async () => { setSaved(false); try { await persist(); setSaved(true); setTimeout(() => setSaved(false), 2500); } catch (e) { console.error('F-21 save failed:', e); alert('تعذّر الحفظ — حاول مجدداً'); } };
  const submit = async () => { setBusy(true); try { await persist(); await api.approveForm(rec.id, user, ''); } finally { setBusy(false); } };
  const restore = () => { if (confirm('استرجاع البنود الأصلية من كراسة التشخيص؟ سيُستبدل ما أدخلته.')) setSections(f21Extract(f08?.data as any)); };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={canEdit ? (
      <div className="flex gap-2">
        <button onClick={save} className="flex-1 py-2.5 rounded-lg border-2 border-[#4A1F66] text-[#4A1F66] dark:text-purple-300 font-bold text-sm">{saved ? 'تم الحفظ ✓' : 'حفظ المسودة'}</button>
        <button disabled={busy} onClick={submit} className="flex-1 py-2.5 rounded-lg bg-[#4A1F66] text-white font-bold text-sm disabled:opacity-50">{busy ? 'جارٍ التقديم…' : 'تقديم نهائي'}</button>
      </div>
    ) : <></>}>
      {canEdit && <button onClick={restore} className="mb-1 px-3 py-1.5 rounded-lg border border-subtle text-xs font-bold text-fg-muted flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> استرجاع الأصل من كراسة التشخيص</button>}
      <InvSectionEditor title="الأثاث" icon={Sofa} section={sections.furniture} catalog={F21_FURNITURE.map(i => ({ l: i.l }))} canEdit={canEdit} onChange={s => setSections(p => ({ ...p, furniture: s }))} />
      <InvSectionEditor title="الأجهزة" icon={ShoppingCart} section={sections.appliances} catalog={F21_APPLIANCES.map(i => ({ l: i.l }))} canEdit={canEdit} onChange={s => setSections(p => ({ ...p, appliances: s }))} />
      <InvSectionEditor title="المواد" icon={Truck} section={sections.materials} catalog={[...F21_CIVIL, ...F21_ELEC, ...F21_PLUMB].map(i => ({ l: i.l }))} canEdit={canEdit} onChange={s => setSections(p => ({ ...p, materials: s }))} />
      <Card title="التوصية" icon={ClipboardList}>
        <TextArea label="" rows={3} value={recommendation} readOnly={!canEdit} onChange={e => setRecommendation(e.target.value)} />
      </Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-20 — خطة توريد المواد
   ────────────────────────────────────────────────────────────────── */

interface SupplyItem { id: string; name: string; unit: string; qty: number; supplier?: string; eta?: string; }

export const F20Creator: FormCreator = ({ user, api, context, onClose }) => {
  const projects = context.projects;
  const [projectRefId, setProjectRefId] = useState<string>(projects[0]?.id || '');
  const [items, setItems] = useState<SupplyItem[]>([
    { id: '1', name: '', unit: '', qty: 1 },
  ]);
  const [busy, setBusy] = useState(false);

  const updateItem = (id: string, k: keyof SupplyItem, v: any) =>
    setItems(it => it.map(x => x.id === id ? { ...x, [k]: v } : x));
  const addItem = () => setItems(it => [...it, { id: Date.now() + '', name: '', unit: '', qty: 1 }]);
  const removeItem = (id: string) => setItems(it => it.filter(x => x.id !== id));

  const submit = async () => {
    const p = projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-20', user, projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { items },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-20 · خطة توريد المواد" onClose={onClose}
      footer={<button onClick={submit} disabled={busy} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع للخدمات المساندة</button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="بنود المواد" icon={ShoppingCart}>
        <div className="space-y-2">
          {items.map(it => (
            <div key={it.id} className="grid grid-cols-12 gap-2 items-end">
              <Input className="col-span-5" label="اسم المادة" value={it.name} onChange={e => updateItem(it.id, 'name', e.target.value)} />
              <Input className="col-span-3" label="الوحدة" value={it.unit} onChange={e => updateItem(it.id, 'unit', e.target.value)} />
              <Input className="col-span-2" type="number" label="الكمية" value={it.qty} onChange={e => updateItem(it.id, 'qty', Number(e.target.value || 0))} />
              <button onClick={() => removeItem(it.id)} className="col-span-2 h-9 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 text-xs font-bold">حذف</button>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="mt-3 px-3 py-1.5 rounded-lg bg-[#56B894] text-white text-xs font-bold flex items-center gap-1.5"><Plus className="w-3 h-3" /> إضافة بند</button>
      </Card>
    </CreatorShell>
  );
};

export const F20Renderer: FormRenderer = ({ rec, user, api }) => {
  const items: SupplyItem[] = rec.data?.items || [];
  const awaitsSupport = formAwaitsUser(rec, user) && user.role === 'SUPPORT_MANAGER';
  const [edited, setEdited] = useState(items);
  useEffect(() => setEdited(items), [rec.id]);

  const persist = async () => api.updateFormData(rec.id, { items: edited });

  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="بنود التوريد" icon={Truck}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-2 py-2 text-right font-bold">المادة</th>
                <th className="px-2 py-2 text-right font-bold">الوحدة</th>
                <th className="px-2 py-2 text-right font-bold">الكمية</th>
                <th className="px-2 py-2 text-right font-bold">المورد المقترح</th>
                <th className="px-2 py-2 text-right font-bold">تاريخ التسليم</th>
              </tr>
            </thead>
            <tbody>
              {edited.map(it => (
                <tr key={it.id} className="border-t dark:border-slate-700">
                  <td className="px-2 py-1.5">{it.name}</td>
                  <td className="px-2 py-1.5">{it.unit}</td>
                  <td className="px-2 py-1.5">{it.qty}</td>
                  <td className="px-2 py-1.5">
                    {awaitsSupport ? (
                      <input value={it.supplier || ''} onChange={e => setEdited(arr => arr.map(x => x.id === it.id ? { ...x, supplier: e.target.value } : x))}
                        className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-xs w-full" />
                    ) : (it.supplier || '—')}
                  </td>
                  <td className="px-2 py-1.5">
                    {awaitsSupport ? (
                      <input type="date" value={it.eta || ''} onChange={e => setEdited(arr => arr.map(x => x.id === it.id ? { ...x, eta: e.target.value } : x))}
                        className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-xs" />
                    ) : (it.eta || '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {awaitsSupport && (
          <button onClick={persist} className="mt-3 px-4 py-1.5 rounded-lg bg-[#56B894] text-white text-xs font-bold">حفظ التعديلات</button>
        )}
      </Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-19 — تعميد المقاول بتوريد الموارد
   ────────────────────────────────────────────────────────────────── */

export const F19Creator: FormCreator = ({ user, api, context, onClose }) => {
  const projects = context.projects;
  const [projectRefId, setProjectRefId] = useState<string>(projects[0]?.id || '');
  const [contractor, setContractor] = useState('');
  const [amount, setAmount] = useState('');
  const [items, setItems] = useState('');
  const [supplyMethod, setSupplyMethod] = useState('شراء مباشر');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const p = projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-19', user, projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { contractor, amount: Number(amount || 0), items, supplyMethod },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-19 · تعميد المقاول بالتوريد" onClose={onClose}
      footer={<button onClick={submit} disabled={busy} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع للمدير</button>}>
      <Card title="المشروع والمورد" icon={Truck}>
        <Select label="المشروع" options={projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <Input label="اسم المقاول" value={contractor} onChange={e => setContractor(e.target.value)} />
          <Input type="number" label={<span className="flex items-center gap-1">القيمة الإجمالية <SaudiRiyalGlassIcon className="w-4 h-4 inline" /></span>} value={amount} onChange={e => setAmount(e.target.value)} />
          <Select label="آلية التوريد" options={['شراء مباشر', 'عقد مع مورد', 'مستودع الجمعية']} value={supplyMethod} onChange={e => setSupplyMethod(e.target.value)} />
        </div>
        <TextArea className="mt-3" label="تفاصيل المواد" rows={3} value={items} onChange={e => setItems(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

export const F19Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="تفاصيل التعميد" icon={Truck}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReadOnlyField label="المقاول" value={d.contractor} />
          <ReadOnlyField label="القيمة" value={<span className="flex items-center gap-1">{Number(d.amount || 0)} <SaudiRiyalGlassIcon className="w-4 h-4 inline" /></span>} />
          <ReadOnlyField label="آلية التوريد" value={d.supplyMethod} />
        </div>
        <ReadOnlyField className="mt-3" label="تفاصيل المواد" value={d.items} />
      </Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-85 — اعتماد التسعيرات والترسية
   ────────────────────────────────────────────────────────────────── */

interface BidRow { id: string; contractor: string; price: number; duration?: string; notes?: string; }

export const F85Creator: FormCreator = ({ user, api, context, onClose }) => {
  const projects = context.projects;
  const [projectRefId, setProjectRefId] = useState<string>(projects[0]?.id || '');
  const [bids, setBids] = useState<BidRow[]>([{ id: '1', contractor: '', price: 0 }]);
  const [winnerId, setWinnerId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const updateBid = (id: string, k: keyof BidRow, v: any) =>
    setBids(b => b.map(x => x.id === id ? { ...x, [k]: v } : x));

  const submit = async () => {
    const p = projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p || !winnerId) return;
    const winner = bids.find(b => b.id === winnerId);
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-85', user, projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { bids, winnerId, winnerContractor: winner?.contractor, winnerPrice: winner?.price },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-85 · التسعيرات والترسية" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !winnerId} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع للمالية</button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="عروض المقاولين" icon={Calculator}>
        <div className="space-y-2">
          {bids.map(b => (
            <div key={b.id} className={`grid grid-cols-12 gap-2 items-end p-2 rounded-lg border ${winnerId === b.id ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-slate-700'}`}>
              <Input className="col-span-5" label="اسم المقاول" value={b.contractor} onChange={e => updateBid(b.id, 'contractor', e.target.value)} />
              <Input className="col-span-3" type="number" label={<span className="flex items-center gap-1">السعر <SaudiRiyalGlassIcon className="w-4 h-4 inline" /></span>} value={b.price} onChange={e => updateBid(b.id, 'price', Number(e.target.value || 0))} />
              <Input className="col-span-3" label="ملاحظات" value={b.notes || ''} onChange={e => updateBid(b.id, 'notes', e.target.value)} />
              <button onClick={() => setWinnerId(b.id)} className={`col-span-1 h-9 rounded-lg text-xs font-bold ${winnerId === b.id ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-slate-700'}`}>
                <Trophy className="w-4 h-4 mx-auto" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setBids(b => [...b, { id: Date.now() + '', contractor: '', price: 0 }])} className="mt-3 px-3 py-1.5 rounded-lg bg-[#56B894] text-white text-xs font-bold flex items-center gap-1.5"><Plus className="w-3 h-3" /> إضافة عرض</button>
      </Card>
    </CreatorShell>
  );
};

export const F85Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  const awaits = formAwaitsUser(rec, user); // مدير إدارة المشاريع
  const f84 = api.forms.find(f => f.code === 'F-84' && f.projectRefId === rec.projectRefId);
  const bids = ((f84?.data?.f84_bids as BidRow[]) || []);
  const [winnerId, setWinnerId] = useState<string>((d.winnerId as string) || '');
  const [busy, setBusy] = useState(false);
  const winner = bids.find(b => b.id === winnerId);

  const submit = async () => {
    if (!winner) return;
    setBusy(true);
    try {
      await api.approveForm(rec.id, user, '', {
        winnerId: winner.id, winnerContractor: winner.contractor,
        winnerPrice: winner.price, winnerDuration: winner.duration || '',
      });
    } finally { setBusy(false); }
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={awaits ? (
      <button disabled={busy || !winner} onClick={submit} className="w-full py-2.5 rounded-lg bg-[#4A1F66] text-white font-bold text-sm disabled:opacity-50">{busy ? 'جارٍ الترسية…' : 'ترسية المشروع على المقاول المختار'}</button>
    ) : <></>}>
      <Card title="عروض المقاولين (من تسعيرات المقاولين)" icon={Calculator}>
        {bids.length === 0 ? (
          <p className="text-xs text-fg-faint">لم تُسجَّل عروض في نموذج تسعيرات المقاولين بعد.</p>
        ) : (
          <div className="space-y-2">
            {bids.map(b => {
              const sel = winnerId === b.id;
              const isFinal = d.winnerId === b.id;
              return (
                <button type="button" key={b.id} disabled={!awaits} onClick={() => awaits && setWinnerId(b.id)}
                  className={`w-full text-right p-3 rounded-xl border-2 transition ${sel || isFinal ? 'border-[#43bba1] bg-[#43bba1]/10' : 'border-subtle bg-surface-up'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-fg">{b.contractor || '—'}</span>
                    {(sel || isFinal) && <Pill tone="teal"><Trophy className="w-3 h-3" /> {isFinal ? 'الفائز' : 'محدد'}</Pill>}
                  </div>
                  <div className="mt-1 text-xs text-fg-muted flex flex-wrap gap-x-4 gap-y-1">
                    <span className="inline-flex items-center gap-1">التسعير: {b.price} <SaudiRiyalGlassIcon className="w-3.5 h-3.5 inline" /></span>
                    {b.duration && <span>المدة: {b.duration}</span>}
                    {b.notes && <span className="text-fg-faint">{b.notes}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {d.winnerContractor && (
          <p className="mt-3 text-sm font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">قيمة الترسية: {d.winnerPrice || 0} <SaudiRiyalGlassIcon className="w-4 h-4 inline" /> — {d.winnerContractor as string}</p>
        )}
      </Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-14 — تقرير الزيارة الميدانية
   ────────────────────────────────────────────────────────────────── */

export const F14Creator: FormCreator = ({ user, api, context, onClose }) => {
  const myProjects = context.projects.filter((p: ProjectRecord) =>
    p.supervisingEngineerId === user.id || p.diagnosisEngineerId === user.id);
  const [projectRefId, setProjectRefId] = useState<string>(myProjects[0]?.id || '');
  const [visitDate, setVisitDate] = useState('');
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [requestScopeChange, setRequestScopeChange] = useState(false);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<{ name: string; url?: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const p = myProjects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-14', user, projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { visitDate, overallProgress, requestScopeChange, notes },
        files: photos,
      });
      onClose();
    } finally { setBusy(false); }
  };

  const paymentHint =
    overallProgress >= 100 ? 'الدفعة الأخيرة (10%)' :
    overallProgress >= 90  ? 'الدفعة الثالثة (30%)' :
    overallProgress >= 60  ? 'الدفعة الثانية (30%)' : null;

  return (
    <CreatorShell title="F-14 · تقرير الزيارة الميدانية" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع التقرير</button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={myProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="تقدم الإنجاز" icon={Activity}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input type="date" label="تاريخ الزيارة" value={visitDate} onChange={e => setVisitDate(e.target.value)} />
          <Input type="number" label="نسبة الإنجاز الكلية %" value={overallProgress}
            onChange={e => setOverallProgress(Math.min(100, Math.max(0, Number(e.target.value || 0))))} />
        </div>
        <div className="mt-3"><ProgressBar value={overallProgress} /></div>
        <label className="mt-3 flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={requestScopeChange} onChange={e => setRequestScopeChange(e.target.checked)} className="rounded border-gray-300 text-[#4A1F66]" />
          <span>تغيير في نطاق العمل (سيُفتح F-23 آلياً)</span>
        </label>
      </Card>
      <Card title="الصور والملاحظات" icon={Camera}>
        <FileUploader files={photos}
          onAdd={f => setPhotos([...photos, ...Array.from(f).map(file => ({ name: file.name }))])}
          onRemove={i => setPhotos(photos.filter((_, idx) => idx !== i))}
          label="ارفع صور التقدم" accept="image/*" />
        <TextArea className="mt-3" label="ملاحظات" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
      </Card>
      {paymentHint && (
        <Card title="إشعار المالية" icon={DollarSign} accent="teal">
          <p className="text-xs text-teal-800 dark:text-teal-200">عند اعتماد التقرير سيتم فتح F-15 (طلب صرف دفعة) تلقائياً — <strong>{paymentHint}</strong>.</p>
        </Card>
      )}
    </CreatorShell>
  );
};

export const F14Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  const overall = Number(d.overallProgress ?? 0);
  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="ملخص التقرير" icon={Activity}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ReadOnlyField label="تاريخ الزيارة" value={d.visitDate as string} />
          <ReadOnlyField label="نسبة الإنجاز الكلية" value={`${overall}%`} />
          <ReadOnlyField label="رقم الزيارة" value={String(d.visitNumber ?? '—')} />
        </div>
        <div className="mt-3"><ProgressBar value={overall} /></div>
        <ReadOnlyField className="mt-3" label="ملاحظات" value={d.notes as string} />
        {d.requestScopeChange && <Pill tone="amber" className="mt-2">تغيير نطاق — يستلزم F-23</Pill>}
      </Card>
      {(rec.files || []).length > 0 && (
        <Card title="الصور" icon={Camera}>
          <FileUploader files={rec.files || []} onAdd={() => {}} onRemove={() => {}} label="" />
        </Card>
      )}
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-23 — اعتماد بنود الأعمال الإضافية
   Moved to FormF23.tsx — imported above. Decline-eligible; 2-stage approval.
   ────────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────────
   F-15 — طلب صرف دفعة
   ────────────────────────────────────────────────────────────────── */

export const F15Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState<string>(context.projects[0]?.id || '');
  const [milestone, setMilestone] = useState('30%');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-15', user, projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { milestone, amount: Number(amount || 0) }, notes,
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-15 · طلب صرف دفعة" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !amount} className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> رفع للمالية</button>}>
      <Card title="المشروع والمحطة" icon={DollarSign}>
        <Select label="المشروع" options={context.projects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <Select label="محطة الإنجاز" options={['30%', '60%', '90%', '100%']} value={milestone} onChange={e => setMilestone(e.target.value)} />
          <Input type="number" label={<span className="flex items-center gap-1">قيمة الدفعة <SaudiRiyalGlassIcon className="w-4 h-4 inline" /></span>} value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <TextArea className="mt-3" label="ملاحظات" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

export const F15Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  return (
    <FormShell rec={rec} user={user} api={api}>
      <Card title="بيانات الدفعة" icon={DollarSign}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReadOnlyField label="محطة الإنجاز" value={d.milestone} />
          <ReadOnlyField label="القيمة" value={<span className="flex items-center gap-1">{Number(d.amount || 0)} <SaudiRiyalGlassIcon className="w-4 h-4 inline" /></span>} />
        </div>
        <ReadOnlyField className="mt-3" label="ملاحظات" value={rec.notes} />
      </Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-07 — شهادة تسليم المنزل
   Moved to FormF07.tsx — imported above. No manual creator (system-activated).
   ────────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────────
   F-52 — طلب تصوير وتوثيق
   Moved to FormF52.tsx — imported above. COMMS delivery section
   unlocks post-approval for PR_OFFICER / COMMS department users.
   ────────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────────
   Reusable Creator Shell
   ────────────────────────────────────────────────────────────────── */

const CreatorShell: React.FC<{ title: string; onClose: () => void; footer: React.ReactNode; children: React.ReactNode }> = ({ title, onClose, footer, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" dir="rtl">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
      <div className="bg-gradient-to-l from-[#4A1F66] to-[#6B3D87] px-5 py-4 flex items-center justify-between text-white">
        <h2 className="font-bold">{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15"><X className="w-5 h-5" /></button>
      </div>
      <div className="overflow-y-auto p-5 space-y-4 flex-1">{children}</div>
      <div className="border-t dark:border-slate-700 p-3 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm font-bold bg-gray-100 dark:bg-slate-700 rounded-lg">إلغاء</button>
        {footer}
      </div>
    </div>
  </div>
);

/* ──────────────────────────────────────────────────────────────────
   Batch Eta — renderers for the 7 previously view-less forms
   ────────────────────────────────────────────────────────────────── */

// Verdict can arrive as English ('eligible'/'ineligible' from F03_1Creator),
// Arabic ('مستحق'/'غير مستحق' from F-03's `eligibility`), or blank (Big-Bang
// cascade leaves `eligibilityVerdict` undefined). Normalize to an Arabic label.
function verdictLabel(
  data: Record<string, unknown> | undefined,
  f03Eligibility?: unknown,
): string {
  const raw = (data?.eligibilityVerdict ?? data?.eligibility ?? f03Eligibility) as string | undefined;
  if (raw === 'eligible' || raw === 'مستحق') return 'مستحق';
  if (raw === 'ineligible' || raw === 'غير مستحق') return 'غير مستحق';
  return '—';
}

export const F03_1Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  const f03 = api.forms.find(f => f.code === 'F-03' && f.projectRefId === rec.projectRefId);
  const verdict = verdictLabel(d, (f03?.data as Record<string, unknown> | undefined)?.eligibility);
  return (
    <FormShell rec={rec} user={user} api={api} approveLabel="اعتماد تنفيذي">
      <Card title="قرار الاستحقاق" icon={ShieldCheck}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReadOnlyField label="حكم الاستحقاق" value={verdict} />
          <ReadOnlyField label="ملاحظات مدير البحث"
            value={(d.managerNotes as string) || (f03?.data as Record<string, unknown> | undefined)?.managerNotes as string} />
        </div>
      </Card>
    </FormShell>
  );
};

export const F03_2Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  const awaits = formAwaitsUser(rec, user);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const f031 = api.forms.find(f => f.code === 'F-03.1' && f.projectRefId === rec.projectRefId);
  const f03 = api.forms.find(f => f.code === 'F-03' && f.projectRefId === rec.projectRefId);
  const verdict = verdictLabel(f031?.data as Record<string, unknown> | undefined, (f03?.data as Record<string, unknown> | undefined)?.eligibility);
  const execApproved = f031?.status === 'approved' && verdict !== 'غير مستحق';

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };
  const approveTransfer = () => run(() => api.approveForm(rec.id, user, note));
  const closeProject = () => run(async () => {
    await api.updateFormData(rec.id, { closureNote: note });
    await api.rejectForm(rec.id, user, note || 'إغلاق بعد رفض تنفيذي');
  });
  const returnToResearcher = () => run(() => api.deferForm(rec.id, user, note));

  const branchButtons = !awaits ? null : (
    <div className="border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 rounded-lg p-3 space-y-3">
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
        placeholder="ملاحظة / سبب القرار"
        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-[#56B894]" />
      {execApproved ? (
        <button onClick={approveTransfer} disabled={busy}
          className="w-full py-2 bg-[#4A1F66] text-white rounded-lg font-bold text-sm hover:bg-[#3A1652] disabled:opacity-40 transition flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> اعتماد وإحالة إلى إدارة المشاريع
        </button>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <button onClick={closeProject} disabled={busy || !note.trim()}
            className="flex-1 min-w-[140px] py-2 bg-red-700 text-white rounded-lg font-bold text-sm hover:bg-red-800 disabled:opacity-40 transition">
            إغلاق المشروع نهائياً
          </button>
          <button onClick={returnToResearcher} disabled={busy || !note.trim()}
            className="flex-1 min-w-[140px] py-2 bg-amber-500 text-white rounded-lg font-bold text-sm hover:bg-amber-600 disabled:opacity-40 transition">
            إعادة إلى الباحث الاجتماعي
          </button>
        </div>
      )}
    </div>
  );

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={branchButtons}>
      <Card title="الاعتماد النهائي للإحالة" icon={FileSignature}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReadOnlyField label="حكم الاستحقاق" value={verdict} />
          <ReadOnlyField label="ملاحظات مدير البحث"
            value={(f031?.data as Record<string, unknown> | undefined)?.managerNotes as string || (d.managerNotes as string)} />
        </div>
        {d.confirmationNotes ? <ReadOnlyField className="mt-3" label="ملاحظات الإحالة" value={d.confirmationNotes as string} /> : null}
      </Card>
    </FormShell>
  );
};

export const F32Renderer: FormRenderer = ({ rec, user, api, users }) => {
  const d = rec.data || {};
  const awaits = formAwaitsUser(rec, user);
  const isReadOnly = !awaits;
  const [engineerId, setEngineerId] = useState<string>((d.engineerId as string) || '');
  const [helpers, setHelpers] = useState<string[]>((d.helpers as string[]) || []);
  const supervisors = users.filter(u => u.role === 'DIAGNOSIS_ENGINEER' && u.status === 'active');
  // فريق الفزعة pool: active PROJECTS members, EXCLUDING admins,
  // مدير إدارة المشاريع (PROJECTS_MANAGER), and the chosen supervisor.
  const helperPool = users.filter(u =>
    u.department === 'PROJECTS' && u.status === 'active' &&
    !u.isAdmin && u.role !== 'PROJECTS_MANAGER' && u.id !== engineerId);
  const selected = supervisors.find(e => e.id === engineerId);

  useEffect(() => {
    if (!engineerId || isReadOnly) return;
    const t = setTimeout(() => { api.updateFormData(rec.id, { engineerId, helpers }); }, 500);
    return () => clearTimeout(t);
  }, [engineerId, helpers, isReadOnly]);

  return (
    <FormShell rec={rec} user={user} api={api} approveLabel="اعتماد التعيين">
      <Card title="تعيين المهندس المشرف" icon={UsersIcon}>
        <label className="block text-xs font-bold text-fg-muted mb-1">المهندس المشرف</label>
        <SearchablePeoplePicker
          people={supervisors}
          selected={engineerId ? [engineerId] : []}
          onChange={ids => setEngineerId(ids[0] || '')}
          multi={false}
          placeholder="ابحث واختر المهندس المشرف (بالاسم أو البريد)"
          disabled={isReadOnly}
        />
        {selected && (
          <div className="mt-3 bg-gray-50 dark:bg-slate-800 border border-[#43bba1] rounded-lg p-3">
            <p className="font-bold text-[#43bba1]">{selected.fullName}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{selected.email}</p>
          </div>
        )}
        {supervisors.length === 0 && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-300 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> لا يوجد مهندسون نشطون في النظام.
          </p>
        )}
        <div className="mt-4 border-t border-gray-200 dark:border-slate-700 pt-3">
          <p className="text-xs font-bold text-gray-700 dark:text-slate-200 flex items-center gap-1.5 mb-2">
            <UsersIcon className="w-3.5 h-3.5" /> فريق الفزعة (مساعدون اختياريون)
          </p>
          <SearchablePeoplePicker
            people={helperPool}
            selected={helpers}
            onChange={setHelpers}
            multi={true}
            placeholder="ابحث واختر فريق الفزعة (بالاسم أو البريد)"
            disabled={isReadOnly}
          />
        </div>
      </Card>
    </FormShell>
  );
};

export const F33Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  const awaits = formAwaitsUser(rec, user);
  const isReadOnly = !awaits;
  const [startDate, setStartDate] = useState<string>((d.startDate as string) || '');
  const [supervisorNotes, setSupervisorNotes] = useState<string>((d.supervisorNotes as string) || '');

  useEffect(() => {
    if (isReadOnly) return;
    const t = setTimeout(() => { api.updateFormData(rec.id, { startDate, supervisorNotes }); }, 500);
    return () => clearTimeout(t);
  }, [startDate, supervisorNotes, isReadOnly]);

  return (
    <FormShell rec={rec} user={user} api={api} approveLabel="اعتماد البدء">
      <Card title="توثيق بدء التنفيذ" icon={Calendar}>
        {isReadOnly ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ReadOnlyField label="تاريخ البدء" value={d.startDate as string} />
            <ReadOnlyField label="ملاحظات المشرف" value={d.supervisorNotes as string} />
          </div>
        ) : (
          <>
            <Input type="date" label="تاريخ البدء الفعلي" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <TextArea className="mt-3" label="ملاحظات المشرف" rows={3} value={supervisorNotes} onChange={e => setSupervisorNotes(e.target.value)} />
          </>
        )}
      </Card>
    </FormShell>
  );
};

export const F34Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  const awaits = formAwaitsUser(rec, user);
  const isReadOnly = !awaits;
  const items = (d.f20_items as Array<{ id?: string; name?: string; unit?: string; qty?: number; supplier?: string }>) || [];
  const [materialSummary, setMaterialSummary] = useState<string>((d.materialSummary as string) || '');
  const [totalCost, setTotalCost] = useState<string>((d.totalCost as string | number | undefined)?.toString() ?? '');

  useEffect(() => {
    if (isReadOnly) return;
    const t = setTimeout(() => { api.updateFormData(rec.id, { materialSummary, totalCost: Number(totalCost || 0) }); }, 500);
    return () => clearTimeout(t);
  }, [materialSummary, totalCost, isReadOnly]);

  return (
    <FormShell rec={rec} user={user} api={api} approveLabel="اعتماد الإحالة">
      <Card title="بنود المواد (من F-20)" icon={Truck}>
        {items.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-slate-400">لم تُستخرج بنود من F-20 بعد.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-2 py-2 text-right">البند</th>
                <th className="px-2 py-2 text-right">الكمية</th>
                <th className="px-2 py-2 text-right">المصدر</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id || i} className="border-t dark:border-slate-700">
                  <td className="px-2 py-1.5 font-bold">{it.name || '—'}</td>
                  <td className="px-2 py-1.5">{it.qty ?? '—'} {it.unit || ''}</td>
                  <td className="px-2 py-1.5 text-gray-500">{it.supplier || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card title="ملخّص الإحالة" icon={ClipboardList}>
        {isReadOnly ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ReadOnlyField label="ملخّص المواد" value={d.materialSummary as string} />
            <ReadOnlyField label="التكلفة الإجمالية"
              value={<span className="flex items-center gap-1">{Number(d.totalCost || 0)} <SaudiRiyalGlassIcon className="w-4 h-4 inline" /></span>} />
          </div>
        ) : (
          <>
            <TextArea label="ملخّص المواد" rows={3} value={materialSummary} onChange={e => setMaterialSummary(e.target.value)} />
            <Input className="mt-3" type="number" value={totalCost} onChange={e => setTotalCost(e.target.value)}
              label={<span className="flex items-center gap-1">التكلفة الإجمالية <SaudiRiyalGlassIcon className="w-4 h-4 inline" /></span>} />
          </>
        )}
      </Card>
    </FormShell>
  );
};

export const F35Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  const awaits = formAwaitsUser(rec, user);
  const canEditPayment = awaits && user.role === 'ACCOUNTANT';
  const [paymentAmount, setPaymentAmount] = useState<string>((d.paymentAmount as string | number | undefined)?.toString() ?? '');
  const [paymentNotes, setPaymentNotes] = useState<string>((d.paymentNotes as string) || '');
  const currentStage = rec.approvalChain[rec.approvalIndex];

  useEffect(() => {
    if (!canEditPayment) return;
    const t = setTimeout(() => { api.updateFormData(rec.id, { paymentAmount: Number(paymentAmount || 0), paymentNotes }); }, 500);
    return () => clearTimeout(t);
  }, [paymentAmount, paymentNotes, canEditPayment]);

  return (
    <FormShell rec={rec} user={user} api={api} approveLabel="اعتماد الدفعة">
      <Card title="طلب صرف الدفعة الأولى" icon={DollarSign}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReadOnlyField label="الدفعة" value="الدفعة الأولى (30%)" />
          <ReadOnlyField label="المرحلة الحالية" value={currentStage ? roleName(currentStage) : '—'} />
        </div>
        {canEditPayment ? (
          <>
            <Input className="mt-3" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
              label={<span className="flex items-center gap-1">قيمة الدفعة <SaudiRiyalGlassIcon className="w-4 h-4 inline" /></span>} />
            <TextArea className="mt-3" label="ملاحظات الصرف" rows={2} value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} />
          </>
        ) : (
          <ReadOnlyField className="mt-3" label="القيمة"
            value={<span className="flex items-center gap-1">{Number(d.paymentAmount || 0)} <SaudiRiyalGlassIcon className="w-4 h-4 inline" /></span>} />
        )}
      </Card>
    </FormShell>
  );
};

export const F84Renderer: FormRenderer = ({ rec, user, api }) => {
  const d = rec.data || {};
  // Editable by رئيس التشخيص + the chosen engineer (assignee) + فريق الفزعة (from F-04) + admin.
  const f04 = api.forms.find(f => f.code === 'F-04' && f.projectRefId === rec.projectRefId);
  const helperIds = ((f04?.data?.helpers as string[]) || []);
  const canEdit = rec.status === 'pending' && (
    user.isAdmin || user.role === 'HEAD_DIAGNOSIS' || user.id === rec.assigneeId || helperIds.includes(user.id)
  );
  const [bids, setBids] = useState<BidRow[]>((d.f84_bids as BidRow[]) || []);
  const [notes, setNotes] = useState<string>((d.f84_pricingNotes as string) || '');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const addBid = () => setBids(b => [...b, { id: Date.now() + '', contractor: '', price: 0, duration: '', notes: '' }]);
  const updateBid = (id: string, k: keyof BidRow, v: unknown) => setBids(b => b.map(x => x.id === id ? { ...x, [k]: v } : x));
  const removeBid = (id: string) => setBids(b => b.filter(x => x.id !== id));

  const persist = () => api.updateFormData(rec.id, JSON.parse(JSON.stringify({ f84_bids: bids, f84_pricingNotes: notes })));
  const save = async () => {
    setSaved(false);
    try { await persist(); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    catch (e) { console.error('F-84 save failed:', e); alert('تعذّر الحفظ — حاول مجدداً'); }
  };
  const submit = async () => {
    setBusy(true);
    try { await persist(); await api.approveForm(rec.id, user, ''); }
    finally { setBusy(false); }
  };

  return (
    <FormShell rec={rec} user={user} api={api} approvalSection={canEdit ? (
      <div className="flex gap-2">
        <button onClick={save} className="flex-1 py-2.5 rounded-lg border-2 border-[#4A1F66] text-[#4A1F66] dark:text-purple-300 font-bold text-sm">{saved ? 'تم الحفظ ✓' : 'حفظ المسودة'}</button>
        <button disabled={busy || bids.length === 0} onClick={submit} className="flex-1 py-2.5 rounded-lg bg-[#4A1F66] text-white font-bold text-sm disabled:opacity-50">{busy ? 'جارٍ التقديم…' : 'تقديم نهائي'}</button>
      </div>
    ) : <></>}>
      <Card title="عروض المقاولين" icon={Calculator}>
        <div className="space-y-3">
          {bids.map(b => (
            <div key={b.id} className="p-3 rounded-xl border border-subtle bg-surface-up space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-fg-muted">عرض مقاول</span>
                {canEdit && <button onClick={() => removeBid(b.id)} className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600"><Trash2 className="w-4 h-4" /></button>}
              </div>
              <Input label="المقاول" value={b.contractor} readOnly={!canEdit} onChange={e => updateBid(b.id, 'contractor', e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={b.price} readOnly={!canEdit} onChange={e => updateBid(b.id, 'price', Number(e.target.value || 0))}
                  label={<span className="flex items-center gap-1">التسعير <SaudiRiyalGlassIcon className="w-4 h-4 inline" /></span>} />
                <Input label="المدة" placeholder="مثال: 45 يوم" value={b.duration || ''} readOnly={!canEdit} onChange={e => updateBid(b.id, 'duration', e.target.value)} />
              </div>
              <TextArea label="ملاحظات" rows={2} value={b.notes || ''} readOnly={!canEdit} onChange={e => updateBid(b.id, 'notes', e.target.value)} />
            </div>
          ))}
          {bids.length === 0 && <p className="text-xs text-fg-faint">لا توجد عروض بعد.</p>}
          {canEdit && <button onClick={addBid} className="px-3 py-1.5 rounded-lg bg-[#56B894] text-white text-xs font-bold flex items-center gap-1.5"><Plus className="w-3 h-3" /> أضف عرض مقاول</button>}
        </div>
      </Card>
      <Card title="ملاحظات عامة على التسعير" icon={FileSignature}>
        <TextArea label="" rows={2} value={notes} readOnly={!canEdit} onChange={e => setNotes(e.target.value)} />
      </Card>
    </FormShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   Registries
   ────────────────────────────────────────────────────────────────── */

export const RENDERERS: Record<string, FormRenderer | undefined> = {
  'F-02': F02Renderer,
  'F-03': F03Renderer,
  'F-04': FormF04Renderer,
  'F-08': F08Renderer,
  'F-18': F18Renderer,
  'F-22': F22Renderer,
  'F-21': F21Renderer,
  'F-20': F20Renderer,
  'F-19': F19Renderer,
  'F-85': F85Renderer,
  'F-14': F14Renderer,
  'F-23': F23Renderer,
  'F-15': F15Renderer,
  'F-07': F07Renderer,
  'F-52': F52Renderer,
  'F-03.1': F03_1Renderer,
  'F-03.2': F03_2Renderer,
  'F-32':   F32Renderer,
  'F-33':   F33Renderer,
  'F-34':   F34Renderer,
  'F-35':   F35Renderer,
  'F-84':   F84Renderer,
};

/* ──────────────────────────────────────────────────────────────────
   F-04 Creator — تعيين مهندس التشخيص (HEAD_DIAGNOSIS originates)
   Data written: { engineerId } per RENDERER_CONTRACT
   ────────────────────────────────────────────────────────────────── */

export const F04Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState('');
  const [engineerId, setEngineerId] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const eligibleProjects = context.projects.filter(
    (p: ProjectRecord) => p.phase === 'DIAGNOSIS' && !p.diagnosisEngineerId
  );
  const engineers = context.projects.length > 0
    ? [] // populated from users prop — injected via context.userById scan
    : [];

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p || !engineerId) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-04', user,
        projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        notes,
        data: { engineerId },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-04 · تعيين مهندس التشخيص" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId || !engineerId}
        className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5">
        <Send className="w-4 h-4" /> إرسال التعيين
      </button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={eligibleProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="المهندس" icon={UsersIcon}>
        <Input label="معرّف المهندس (engineerId)" value={engineerId} onChange={e => setEngineerId(e.target.value)}
          placeholder="أدخل معرّف المستخدم من الإدارة" />
        <TextArea className="mt-3" label="ملاحظات" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-03.1 Creator — اعتماد المدير التنفيذي (EXEC_DIRECTOR originates)
   Data written: { eligibilityVerdict, managerNotes } per ACTIVATE_DATA_PROPAGATIONS
   ────────────────────────────────────────────────────────────────── */

export const F03_1Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState('');
  const [eligibilityVerdict, setEligibilityVerdict] = useState<'eligible' | 'ineligible' | ''>('');
  const [managerNotes, setManagerNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const eligibleProjects = context.projects.filter((p: ProjectRecord) => p.phase === 'RESEARCH');

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p || !eligibilityVerdict) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-03.1', user,
        projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { eligibilityVerdict, managerNotes },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-03.1 · اعتماد المدير التنفيذي" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId || !eligibilityVerdict}
        className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5">
        <Send className="w-4 h-4" /> إرسال للاعتماد
      </button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={eligibleProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="قرار الاستحقاق" icon={ShieldCheck}>
        <Select label="الحكم" required options={['', 'eligible', 'ineligible']}
          value={eligibilityVerdict} onChange={e => setEligibilityVerdict(e.target.value as 'eligible' | 'ineligible' | '')} />
        <TextArea className="mt-3" label="ملاحظات مدير البحث" rows={3} value={managerNotes} onChange={e => setManagerNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-03.2 Creator — الاعتماد النهائي للإحالة (RESEARCH_MANAGER originates)
   ────────────────────────────────────────────────────────────────── */

export const F03_2Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState('');
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const eligibleProjects = context.projects.filter((p: ProjectRecord) => p.phase === 'RESEARCH');

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-03.2', user,
        projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { confirmationNotes },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-03.2 · الاعتماد النهائي للإحالة" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId}
        className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5">
        <Send className="w-4 h-4" /> إرسال الإحالة
      </button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={eligibleProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="ملاحظات الإحالة" icon={FileSignature}>
        <TextArea label="ملاحظات الاعتماد النهائي" rows={3} value={confirmationNotes} onChange={e => setConfirmationNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-32 Creator — تعيين المهندس المشرف (HEAD_SUPERVISION originates)
   Data written: { engineerId } per RENDERER_CONTRACT
   ────────────────────────────────────────────────────────────────── */

export const F32Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState('');
  const [engineerId, setEngineerId] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const eligibleProjects = context.projects.filter(
    (p: ProjectRecord) => p.phase === 'TENDERING' && !p.supervisingEngineerId
  );

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p || !engineerId) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-32', user,
        projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        notes,
        data: { engineerId },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-32 · تعيين المهندس المشرف" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId || !engineerId}
        className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5">
        <Send className="w-4 h-4" /> إرسال التعيين
      </button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={eligibleProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="المهندس المشرف" icon={UsersIcon}>
        <Input label="معرّف المهندس (engineerId)" value={engineerId} onChange={e => setEngineerId(e.target.value)}
          placeholder="أدخل معرّف المستخدم من الإدارة" />
        <TextArea className="mt-3" label="ملاحظات" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-33 Creator — توثيق البدء (DIAGNOSIS_ENGINEER / assigned supervisor)
   Data written: seeds f08_works, visitNumber, f20_* for downstream F-14 and F-34
   ────────────────────────────────────────────────────────────────── */

export const F33Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const eligibleProjects = context.projects.filter(
    (p: ProjectRecord) => p.phase === 'TENDERING' && p.supervisingEngineerId
  );

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p || !startDate) return;
    setBusy(true);
    try {
      const f08 = context.findProjectForm(p.id, 'F-08');
      const f08Works = (f08?.data?.f08_works as unknown[] | undefined) ||
        ((f08?.data as Record<string, unknown>)?.works as unknown[] | undefined) || [];
      const f20 = context.findProjectForm(p.id, 'F-20');
      const f20data = (f20?.data || {}) as Record<string, unknown>;

      await api.createForm({
        code: 'F-33', user,
        projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        assigneeId: p.supervisingEngineerId,
        data: {
          startDate,
          supervisorNotes,
          f08_works: f08Works,
          visitNumber: 1,
          f20_items:           f20data.items || [],
          f20_directNotes:     f20data.directNotes as string || '',
          f20_inkindNotes:     f20data.inkindNotes as string || '',
          f20_partnershipNotes: f20data.partnershipNotes as string || '',
        },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-33 · توثيق البدء" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId || !startDate}
        className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5">
        <Send className="w-4 h-4" /> إرسال توثيق البدء
      </button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={eligibleProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="تفاصيل البدء" icon={Calendar}>
        <Input type="date" label="تاريخ البدء الفعلي" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <TextArea className="mt-3" label="ملاحظات المشرف" rows={3} value={supervisorNotes} onChange={e => setSupervisorNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-34 Creator — إحالة حصر المواد (DIAGNOSIS_ENGINEER / HEAD_SUPERVISION)
   ────────────────────────────────────────────────────────────────── */

export const F34Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState('');
  const [materialSummary, setMaterialSummary] = useState('');
  const [totalCost, setTotalCost] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  const eligibleProjects = context.projects.filter((p: ProjectRecord) => p.phase === 'EXECUTION');

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      const f20 = context.findProjectForm(p.id, 'F-20');
      const f20data = (f20?.data || {}) as Record<string, unknown>;
      await api.createForm({
        code: 'F-34', user,
        projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: {
          materialSummary,
          totalCost,
          f20_items:            f20data.items || [],
          f20_directNotes:      f20data.directNotes as string || '',
          f20_inkindNotes:      f20data.inkindNotes as string || '',
          f20_partnershipNotes: f20data.partnershipNotes as string || '',
        },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-34 · إحالة حصر المواد" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId}
        className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5">
        <Send className="w-4 h-4" /> إرسال الإحالة
      </button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={eligibleProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="ملخص المواد" icon={ShoppingCart}>
        <TextArea label="وصف المواد المطلوبة" rows={4} value={materialSummary} onChange={e => setMaterialSummary(e.target.value)} />
        <Input className="mt-3" type="number" label={<span className="flex items-center gap-1">التكلفة التقديرية <SaudiRiyalGlassIcon className="w-4 h-4 inline" /></span>} value={totalCost}
          onChange={e => setTotalCost(Number(e.target.value || 0))} />
      </Card>
    </CreatorShell>
  );
};

/* ──────────────────────────────────────────────────────────────────
   F-84 Creator — تسعيرات المقاولين (HEAD_DIAGNOSIS / DIAGNOSIS_ENGINEER)
   Data written: { f84_bids, f84_pricingNotes } per ACTIVATE_DATA_PROPAGATIONS
   ────────────────────────────────────────────────────────────────── */

export const F84Creator: FormCreator = ({ user, api, context, onClose }) => {
  const [projectRefId, setProjectRefId] = useState('');
  const [f84_pricingNotes, setF84PricingNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const eligibleProjects = context.projects.filter((p: ProjectRecord) => p.phase === 'TENDERING');

  const submit = async () => {
    const p = context.projects.find((x: ProjectRecord) => x.id === projectRefId);
    if (!p) return;
    setBusy(true);
    try {
      await api.createForm({
        code: 'F-84', user,
        projectId: p.projectId, projectRefId: p.id,
        beneficiaryName: p.beneficiaryName,
        data: { f84_bids: [], f84_pricingNotes },
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <CreatorShell title="F-84 · تسعيرات المقاولين" onClose={onClose}
      footer={<button onClick={submit} disabled={busy || !projectRefId}
        className="px-5 py-2 text-sm font-bold bg-[#4A1F66] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5">
        <Send className="w-4 h-4" /> فتح جدول التسعير
      </button>}>
      <Card title="المشروع" icon={Building2}>
        <Select label="المشروع" options={eligibleProjects.map((p: ProjectRecord) => ({ value: p.id, label: `${p.projectId} — ${p.beneficiaryName}` }))}
          value={projectRefId} onChange={e => setProjectRefId(e.target.value)} />
      </Card>
      <Card title="ملاحظات التسعير" icon={Calculator}>
        <TextArea label="ملاحظات أولية (يُكمّل المهندس الجدول لاحقاً)" rows={3}
          value={f84_pricingNotes} onChange={e => setF84PricingNotes(e.target.value)} />
      </Card>
    </CreatorShell>
  );
};

export const CREATORS: Record<string, FormCreator | undefined> = {
  'F-02':   F02Creator,
  'F-03':   F03Creator,
  'F-03.1': F03_1Creator,
  'F-03.2': F03_2Creator,
  'F-04':   F04Creator,
  'F-08':   F08Creator,
  'F-18':   F18Creator,
  'F-21':   F21Creator,
  'F-20':   F20Creator,
  'F-19':   F19Creator,
  'F-32':   F32Creator,
  'F-33':   F33Creator,
  'F-34':   F34Creator,
  'F-84':   F84Creator,
  'F-85':   F85Creator,
  'F-14':   F14Creator,
  'F-23':   F23Creator,
  // F-15 يُولَّد آلياً من TRIGGER_MAP (F-14 milestones) — لا Creator يدوي
  // F-07 يُفعَّل آلياً من TRIGGER_MAP (F-15 final payment) — لا Creator يدوي
  'F-52':   F52Creator,
  // F-22 ينشأ تلقائياً مع F-18 — لا يحتاج Creator يدوي
};
