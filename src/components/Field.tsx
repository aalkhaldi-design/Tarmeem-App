import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin, Camera, CheckCircle, ChevronLeft, ChevronRight, Save, Send, Download,
  WifiOff, AlertTriangle, Plus, ClipboardList, FileText, Image, PenTool, Mic
} from 'lucide-react';
import {
  STAGES_CONFIG, CIVIL_FIELDS, ELEC_FIELDS, PLUMB_FIELDS, FURN_FIELDS, APP_FIELDS,
  compressImage, computeSlaStatus, regionLabel, formatCurrency
} from '../lib/data';
import { Card, NumberCounter, DrawingCanvas, MandatoryGauge, Input, TextArea } from './ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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
  diagnosisVerdict: string;
  assignedFieldEngineer: string;
  data: Record<string, any>;
  budgetSAR: number;
  disbursedSAR: number;
  projectAuditLog: any[];
  hasPendingAdditionalWorks: boolean;
  deliveryDate: string;
}

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

interface FieldProps {
  store: {
    projects: Project[];
    users: UserProfile[];
    assessments: any[];
    documents: any[];
    lists: any;
    notifications: any[];
  };
  addAssessment: (assessment: any) => Promise<void>;
  updateProject: (id: string, updates: Record<string, any>) => Promise<void>;
  addNotification: (n: {
    text: string;
    subject?: string;
    type: string;
    portal: string;
    link?: string;
    recipients?: string[];
    meta?: any;
  }) => Promise<void>;
  currentUserRole: string;
  isOffline: boolean;
  fieldView: string;
  setFieldView: (v: string) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const FIELD_STAGES = ['4', '5', '6', '7'];

const DRAFT_KEY = 'tarmeem_field_draft';
const OFFLINE_QUEUE_KEY = 'tarmeem_offline_assessments';

const WIZARD_STEPS = [
  { id: 1, label: 'معلومات المشروع', icon: FileText },
  { id: 2, label: 'التصوير', icon: Camera },
  { id: 3, label: 'التقييم الفني', icon: ClipboardList },
  { id: 4, label: 'الأثاث والأجهزة', icon: Image },
  { id: 5, label: 'المراجعة والإرسال', icon: Send },
];

function buildEmptyAssessment(): AssessmentData {
  const civil: Record<string, number> = {};
  CIVIL_FIELDS.forEach(f => { civil[f.k] = 0; });
  const elec: Record<string, number> = {};
  ELEC_FIELDS.forEach(f => { elec[f.k] = 0; });
  const plumb: Record<string, number> = {};
  PLUMB_FIELDS.forEach(f => { plumb[f.k] = 0; });
  const furn: Record<string, number> = {};
  FURN_FIELDS.forEach(f => { furn[f.k] = 0; });
  const app: Record<string, number> = {};
  APP_FIELDS.forEach(f => { app[f.k] = 0; });
  return {
    photos: [],
    civil,
    elec,
    plumb,
    furn,
    app,
    sketch: '',
    notes: '',
  };
}

function stageName(stageId: string): string {
  const cfg = STAGES_CONFIG.find(s => s.id === stageId);
  return cfg ? cfg.name : stageId;
}

function stageDuration(stageId: string): string {
  const cfg = STAGES_CONFIG.find(s => s.id === stageId);
  return cfg ? cfg.duration : '';
}

/* ------------------------------------------------------------------ */
/*  Assessment Data Shape                                              */
/* ------------------------------------------------------------------ */

interface AssessmentData {
  photos: string[];
  civil: Record<string, number>;
  elec: Record<string, number>;
  plumb: Record<string, number>;
  furn: Record<string, number>;
  app: Record<string, number>;
  sketch: string;
  notes: string;
}

/* ------------------------------------------------------------------ */
/*  Local-Storage Helpers                                              */
/* ------------------------------------------------------------------ */

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota exceeded — best effort */ }
}

function removeKey(key: string): void {
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

/* ------------------------------------------------------------------ */
/*  CSV Export                                                         */
/* ------------------------------------------------------------------ */

function assessmentToCSV(project: Project, data: AssessmentData): string {
  const rows: string[][] = [];
  rows.push(['القسم', 'الحقل', 'العدد']);
  CIVIL_FIELDS.forEach(f => rows.push(['أعمال مدنية', f.l, String(data.civil[f.k] || 0)]));
  ELEC_FIELDS.forEach(f => rows.push(['كهرباء', f.l, String(data.elec[f.k] || 0)]));
  PLUMB_FIELDS.forEach(f => rows.push(['سباكة', f.l, String(data.plumb[f.k] || 0)]));
  FURN_FIELDS.forEach(f => rows.push(['أثاث', f.l, String(data.furn[f.k] || 0)]));
  APP_FIELDS.forEach(f => rows.push(['أجهزة', f.l, String(data.app[f.k] || 0)]));
  rows.push([]);
  rows.push(['ملاحظات', data.notes || '']);
  rows.push(['عدد الصور', String(data.photos.length)]);
  rows.push(['مخطط', data.sketch ? 'نعم' : 'لا']);

  const BOM = '\uFEFF';
  const csvContent = BOM + rows.map(r =>
    r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\r\n');
  return csvContent;
}

function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Sync Status Indicator                                              */
/* ------------------------------------------------------------------ */

function SyncIndicator({ isOffline, queueCount }: { isOffline: boolean; queueCount: number }) {
  if (isOffline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs font-bold">
        <WifiOff className="w-4 h-4" />
        <span>غير متصل</span>
        {queueCount > 0 && <span className="bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full text-[10px]">{queueCount} معلق</span>}
      </div>
    );
  }
  if (queueCount > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs font-bold">
        <Save className="w-4 h-4 animate-pulse" />
        <span>جاري المزامنة... ({queueCount})</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs font-bold">
      <CheckCircle className="w-4 h-4" />
      <span>متصل</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Field Dashboard                                                    */
/* ------------------------------------------------------------------ */

function FieldDashboard({
  projects,
  users,
  onSelectProject,
  onEmergency,
}: {
  projects: Project[];
  users: UserProfile[];
  onSelectProject: (id: string) => void;
  onEmergency: () => void;
}) {
  const fieldProjects = projects.filter(p => FIELD_STAGES.includes(p.currentStageId));

  const getEngineerName = (uid: string) => {
    const u = users.find(u => u.id === uid);
    return u ? u.fullName : uid || 'غير معين';
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">مهام الميدان</h2>
        <button
          onClick={onEmergency}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition shadow"
        >
          <AlertTriangle className="w-4 h-4" />
          تشخيص طارئ
        </button>
      </div>

      {fieldProjects.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-bold">لا توجد مهام ميدانية حالياً</p>
        </div>
      )}

      <div className="grid gap-3">
        {fieldProjects.map(p => {
          const sla = computeSlaStatus(stageDuration(p.currentStageId), p.stageEnteredAt);
          return (
            <button
              key={p.id}
              onClick={() => onSelectProject(p.id)}
              className="w-full text-right bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-4 flex flex-col gap-2 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate group-hover:text-[#6B21A8] transition">{p.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ${sla.ring} text-[11px] font-bold`}>
                      {sla.text}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {p.city}{p.region ? ` - ${regionLabel(p.region)}` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 mr-3">
                  <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">
                    {stageName(p.currentStageId)}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {getEngineerName(p.assignedFieldEngineer)}
                  </span>
                </div>
              </div>

              {p.mandatoryFieldsTotal > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <MandatoryGauge filled={p.mandatoryFieldsFilled} total={p.mandatoryFieldsTotal} />
                  <span className="text-[10px] text-gray-400">
                    {p.mandatoryFieldsFilled}/{p.mandatoryFieldsTotal} حقول
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step Indicator                                                     */
/* ------------------------------------------------------------------ */

function StepIndicator({ current, steps }: { current: number; steps: typeof WIZARD_STEPS }) {
  return (
    <div className="flex items-center justify-center gap-1 py-3 overflow-x-auto">
      {steps.map((step, i) => {
        const isDone = step.id < current;
        const isCurrent = step.id === current;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.id}>
            <div className={`flex flex-col items-center gap-1 min-w-[56px] transition ${isCurrent ? 'scale-110' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all
                ${isDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-[#6B21A8] text-white ring-2 ring-purple-300' : 'bg-gray-100 text-gray-400'}`}>
                {isDone ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[9px] font-bold text-center leading-tight ${isCurrent ? 'text-[#6B21A8]' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-4 mt-[-8px] rounded ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1 — Project Selection & Info Review                           */
/* ------------------------------------------------------------------ */

function StepProjectInfo({
  projects,
  selectedId,
  onSelect,
}: {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const fieldProjects = projects.filter(p => FIELD_STAGES.includes(p.currentStageId));
  const selected = projects.find(p => p.id === selectedId);

  return (
    <div dir="rtl" className="space-y-4">
      {!selected && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">اختر المشروع</h3>
          <div className="grid gap-2">
            {fieldProjects.map(p => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="w-full text-right bg-white rounded-lg border border-gray-200 hover:border-[#6B21A8] p-3 transition group"
              >
                <p className="font-bold text-sm text-gray-800 group-hover:text-[#6B21A8]">{p.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  المرحلة {p.currentStageId} - {stageName(p.currentStageId)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <Card title="معلومات المشروع" icon={FileText}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500 text-xs">اسم المشروع</span>
              <p className="font-bold">{selected.name}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">النوع</span>
              <p className="font-bold">{selected.type}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">المدينة</span>
              <p className="font-bold">{selected.city}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">المنطقة</span>
              <p className="font-bold">{regionLabel(selected.region)}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">المرحلة الحالية</span>
              <p className="font-bold">{stageName(selected.currentStageId)}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">الميزانية</span>
              <p className="font-bold">{formatCurrency(selected.budgetSAR)}</p>
            </div>
          </div>
          {selected.assignedFieldEngineer && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-gray-500 text-xs">مهندس الميدان</span>
              <p className="font-bold text-sm">{selected.assignedFieldEngineer}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2 — Photo Capture                                             */
/* ------------------------------------------------------------------ */

function StepPhotoCapture({
  photos,
  onAdd,
  onRemove,
}: {
  photos: string[];
  onAdd: (dataUrl: string) => void;
  onRemove: (index: number) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setCompressing(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        onAdd(compressed);
      }
    } catch {
      /* compression failed — skip */
    }
    setCompressing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onAdd]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
    } catch {
      /* camera not available */
    }
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    onAdd(dataUrl);
    stopCamera();
  }, [onAdd]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play();
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">التقاط الصور</h3>
        <span className="text-xs text-gray-400">{photos.length} صورة</span>
      </div>

      {/* Camera view */}
      {cameraStream && (
        <div className="relative rounded-xl overflow-hidden border-2 border-purple-300">
          <video ref={videoRef} className="w-full h-64 object-cover bg-black" playsInline muted />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            <button
              onClick={capturePhoto}
              className="w-14 h-14 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition"
            >
              <Camera className="w-6 h-6 text-[#6B21A8]" />
            </button>
            <button
              onClick={stopCamera}
              className="px-3 py-2 bg-red-500 text-white rounded-lg text-xs font-bold shadow"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!cameraStream && (
        <div className="flex gap-2">
          <button
            onClick={startCamera}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#6B21A8] hover:bg-purple-800 text-white rounded-xl text-sm font-bold transition"
          >
            <Camera className="w-5 h-5" />
            فتح الكاميرا
          </button>
          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition cursor-pointer">
            <Image className="w-5 h-5" />
            اختيار ملف
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        </div>
      )}

      {compressing && (
        <div className="flex items-center justify-center gap-2 py-3 text-purple-600 text-sm font-bold">
          <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          جاري ضغط الصور...
        </div>
      )}

      {/* Thumbnails */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square">
              <img src={photo} alt={`صورة ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => onRemove(i)}
                className="absolute top-1 left-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3 — Technical Assessment (Civil / Electrical / Plumbing)       */
/* ------------------------------------------------------------------ */

function StepTechnicalAssessment({
  civil, setCivil,
  elec, setElec,
  plumb, setPlumb,
}: {
  civil: Record<string, number>;
  setCivil: (v: Record<string, number>) => void;
  elec: Record<string, number>;
  setElec: (v: Record<string, number>) => void;
  plumb: Record<string, number>;
  setPlumb: (v: Record<string, number>) => void;
}) {
  const updateField = (obj: Record<string, number>, setter: (v: Record<string, number>) => void, key: string, val: number) => {
    setter({ ...obj, [key]: val });
  };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Civil */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#6B21A8]" />
          أعمال مدنية
        </h4>
        <div className="grid gap-2">
          {CIVIL_FIELDS.map(f => (
            <NumberCounter
              key={f.k}
              label={f.l}
              value={civil[f.k] || 0}
              onChange={v => updateField(civil, setCivil, f.k, v)}
            />
          ))}
        </div>
      </div>

      {/* Electrical */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          كهرباء
        </h4>
        <div className="grid gap-2">
          {ELEC_FIELDS.map(f => (
            <NumberCounter
              key={f.k}
              label={f.l}
              value={elec[f.k] || 0}
              onChange={v => updateField(elec, setElec, f.k, v)}
            />
          ))}
        </div>
      </div>

      {/* Plumbing */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          سباكة
        </h4>
        <div className="grid gap-2">
          {PLUMB_FIELDS.map(f => (
            <NumberCounter
              key={f.k}
              label={f.l}
              value={plumb[f.k] || 0}
              onChange={v => updateField(plumb, setPlumb, f.k, v)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 4 — Furniture & Appliances                                    */
/* ------------------------------------------------------------------ */

function StepFurnitureAppliances({
  furn, setFurn,
  app, setApp,
}: {
  furn: Record<string, number>;
  setFurn: (v: Record<string, number>) => void;
  app: Record<string, number>;
  setApp: (v: Record<string, number>) => void;
}) {
  const updateField = (obj: Record<string, number>, setter: (v: Record<string, number>) => void, key: string, val: number) => {
    setter({ ...obj, [key]: val });
  };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Furniture */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          أثاث
        </h4>
        <div className="grid gap-2">
          {FURN_FIELDS.map(f => (
            <NumberCounter
              key={f.k}
              label={f.l}
              value={furn[f.k] || 0}
              onChange={v => updateField(furn, setFurn, f.k, v)}
            />
          ))}
        </div>
      </div>

      {/* Appliances */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          أجهزة
        </h4>
        <div className="grid gap-2">
          {APP_FIELDS.map(f => (
            <NumberCounter
              key={f.k}
              label={f.l}
              value={app[f.k] || 0}
              onChange={v => updateField(app, setApp, f.k, v)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 5 — Review & Submit                                           */
/* ------------------------------------------------------------------ */

function StepReviewSubmit({
  project,
  assessment,
  notes,
  setNotes,
  onSketchSave,
  onSketchClear,
  onSubmit,
  submitting,
  onExportCSV,
}: {
  project: Project | undefined;
  assessment: AssessmentData;
  notes: string;
  setNotes: (v: string) => void;
  onSketchSave: (data: string) => void;
  onSketchClear: () => void;
  onSubmit: () => void;
  submitting: boolean;
  onExportCSV: () => void;
}) {
  const totalCivil = Object.values(assessment.civil).reduce((a, b) => a + b, 0);
  const totalElec = Object.values(assessment.elec).reduce((a, b) => a + b, 0);
  const totalPlumb = Object.values(assessment.plumb).reduce((a, b) => a + b, 0);
  const totalFurn = Object.values(assessment.furn).reduce((a, b) => a + b, 0);
  const totalApp = Object.values(assessment.app).reduce((a, b) => a + b, 0);
  const grandTotal = totalCivil + totalElec + totalPlumb + totalFurn + totalApp;

  return (
    <div dir="rtl" className="space-y-4">
      {/* Summary boxes */}
      <Card title="ملخص التقييم" icon={ClipboardList}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-[#6B21A8]">{totalCivil}</p>
            <p className="text-[10px] text-purple-600 font-bold">أعمال مدنية</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{totalElec}</p>
            <p className="text-[10px] text-amber-600 font-bold">كهرباء</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalPlumb}</p>
            <p className="text-[10px] text-blue-600 font-bold">سباكة</p>
          </div>
          <div className="bg-teal-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-teal-600">{totalFurn}</p>
            <p className="text-[10px] text-teal-600 font-bold">أثاث</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center col-span-2">
            <p className="text-2xl font-bold text-red-600">{totalApp}</p>
            <p className="text-[10px] text-red-600 font-bold">أجهزة</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center col-span-2 border border-gray-200">
            <p className="text-3xl font-bold text-gray-800">{grandTotal}</p>
            <p className="text-xs text-gray-500 font-bold">إجمالي البنود</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
          <span>{assessment.photos.length} صورة</span>
          <span>{assessment.sketch ? 'يتضمن مخطط' : 'بدون مخطط'}</span>
        </div>
      </Card>

      {/* Detailed entries */}
      <Card title="تفاصيل البنود" icon={FileText}>
        <div className="space-y-3 text-xs">
          {[
            { label: 'أعمال مدنية', fields: CIVIL_FIELDS, data: assessment.civil },
            { label: 'كهرباء', fields: ELEC_FIELDS, data: assessment.elec },
            { label: 'سباكة', fields: PLUMB_FIELDS, data: assessment.plumb },
            { label: 'أثاث', fields: FURN_FIELDS, data: assessment.furn },
            { label: 'أجهزة', fields: APP_FIELDS, data: assessment.app },
          ].map(section => {
            const nonZero = section.fields.filter(f => (section.data[f.k] || 0) > 0);
            if (nonZero.length === 0) return null;
            return (
              <div key={section.label} className="border-b border-gray-100 pb-2 last:border-0">
                <p className="font-bold text-gray-600 mb-1">{section.label}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {nonZero.map(f => (
                    <div key={f.k} className="flex justify-between">
                      <span className="text-gray-500">{f.l}</span>
                      <span className="font-bold text-gray-800">{section.data[f.k]}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Notes */}
      <TextArea
        label="ملاحظات إضافية"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="أضف أي ملاحظات إضافية هنا..."
        rows={3}
      />

      {/* Sketch */}
      <Card title="رسم توضيحي" icon={PenTool}>
        <DrawingCanvas onSave={onSketchSave} onClear={onSketchClear} />
      </Card>

      {/* Photos preview */}
      {assessment.photos.length > 0 && (
        <Card title={`الصور المرفقة (${assessment.photos.length})`} icon={Image}>
          <div className="grid grid-cols-4 gap-2">
            {assessment.photos.map((photo, i) => (
              <img key={i} src={photo} alt={`صورة ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
            ))}
          </div>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 sticky bottom-0 bg-white py-3 border-t border-gray-100 -mx-4 px-4">
        <button
          onClick={onExportCSV}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition flex-1"
        >
          <Download className="w-4 h-4" />
          تصدير CSV
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#6B21A8] hover:bg-purple-800 text-white rounded-xl text-sm font-bold transition flex-[2] disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Emergency Diagnosis                                                */
/* ------------------------------------------------------------------ */

function EmergencyDiagnosis({
  onSubmit,
  submitting,
}: {
  onSubmit: (data: { familyName: string; phone: string; address: string; description: string }) => void;
  submitting: boolean;
}) {
  const [familyName, setFamilyName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim() || !phone.trim() || !address.trim()) return;
    onSubmit({ familyName, phone, address, description });
  };

  return (
    <div dir="rtl" className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">تشخيص طارئ</h2>
          <p className="text-xs text-gray-500">إنشاء مشروع وتقييم طارئ فوراً</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border border-red-200 p-5 shadow-sm">
        <Input label="اسم الأسرة *" value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="اسم الأسرة المستفيدة" />
        <Input label="رقم الجوال *" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="05XXXXXXXX" />
        <Input label="العنوان *" value={address} onChange={e => setAddress(e.target.value)} placeholder="المدينة - الحي - الشارع" />
        <TextArea label="وصف الطوارئ" value={description} onChange={e => setDescription(e.target.value)} placeholder="صف الحالة الطارئة بالتفصيل..." rows={4} />
        <button
          type="submit"
          disabled={submitting || !familyName.trim() || !phone.trim() || !address.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {submitting ? 'جاري الإنشاء...' : 'إنشاء مشروع طارئ'}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Assessment Wizard                                                  */
/* ------------------------------------------------------------------ */

function AssessmentWizard({
  project,
  addAssessment,
  updateProject,
  addNotification,
  isOffline,
  onBack,
}: {
  project: Project | undefined;
  addAssessment: FieldProps['addAssessment'];
  updateProject: FieldProps['updateProject'];
  addNotification: FieldProps['addNotification'];
  isOffline: boolean;
  onBack: () => void;
}) {
  const [step, setStep] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(project?.id ?? null);
  const [assessment, setAssessment] = useState<AssessmentData>(buildEmptyAssessment);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [lastSaved, setLastSaved] = useState<string>('');

  const actualProject = project;

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const key = `${DRAFT_KEY}_${selectedProjectId || 'new'}`;
    const interval = setInterval(() => {
      const draft = {
        assessment,
        notes,
        selectedProjectId,
        savedAt: new Date().toISOString(),
      };
      saveJSON(key, draft);
      setLastSaved(new Date().toLocaleTimeString('ar-SA'));
    }, 30000);
    return () => clearInterval(interval);
  }, [assessment, notes, selectedProjectId]);

  // Load draft on mount
  useEffect(() => {
    const key = `${DRAFT_KEY}_${selectedProjectId || 'new'}`;
    const draft = loadJSON<{ assessment: AssessmentData; notes: string; selectedProjectId: string | null } | null>(key, null);
    if (draft) {
      setAssessment(draft.assessment);
      setNotes(draft.notes || '');
      if (draft.selectedProjectId && !selectedProjectId) {
        setSelectedProjectId(draft.selectedProjectId);
      }
      setLastSaved('مسودة محفوظة');
    }
  }, []);

  const addPhoto = useCallback((dataUrl: string) => {
    setAssessment(prev => ({ ...prev, photos: [...prev.photos, dataUrl] }));
  }, []);

  const removePhoto = useCallback((index: number) => {
    setAssessment(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSketchSave = useCallback((data: string) => {
    setAssessment(prev => ({ ...prev, sketch: data }));
  }, []);

  const handleSketchClear = useCallback(() => {
    setAssessment(prev => ({ ...prev, sketch: '' }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!actualProject) return;
    setSubmitting(true);
    setSubmitError('');

    const assessmentRecord = {
      projectId: actualProject.id,
      type: 'diagnosis',
      status: 'submitted',
      data: {
        ...assessment,
        notes,
      },
      submittedAt: new Date().toISOString(),
      civilTotal: Object.values(assessment.civil).reduce((a, b) => a + b, 0),
      elecTotal: Object.values(assessment.elec).reduce((a, b) => a + b, 0),
      plumbTotal: Object.values(assessment.plumb).reduce((a, b) => a + b, 0),
      furnTotal: Object.values(assessment.furn).reduce((a, b) => a + b, 0),
      appTotal: Object.values(assessment.app).reduce((a, b) => a + b, 0),
    };

    try {
      if (isOffline) {
        // Queue for later
        const queue = loadJSON<any[]>(OFFLINE_QUEUE_KEY, []);
        queue.push({ assessment: assessmentRecord, projectId: actualProject.id });
        saveJSON(OFFLINE_QUEUE_KEY, queue);
      } else {
        await addAssessment(assessmentRecord);
      }

      // Update project to next stage if diagnosed
      await updateProject(actualProject.id, {
        assessmentStatus: 'submitted',
        diagnosisVerdict: 'pending_review',
      });

      // Clear draft
      const key = `${DRAFT_KEY}_${selectedProjectId || 'new'}`;
      removeKey(key);

      // Notification
      await addNotification({
        text: `تم إرسال تقرير التشخيص للمشروع: ${actualProject.name}`,
        type: 'assessment_submitted',
        portal: 'field',
        link: `/projects/${actualProject.id}`,
      });

      onBack();
    } catch (err: any) {
      setSubmitError(err.message || 'حدث خطأ أثناء الإرسال');
    } finally {
      setSubmitting(false);
    }
  }, [actualProject, assessment, notes, isOffline, addAssessment, updateProject, addNotification, selectedProjectId, onBack]);

  const handleExportCSV = useCallback(() => {
    if (!actualProject) return;
    const csv = assessmentToCSV(actualProject, { ...assessment, notes });
    const filename = `assessment_${actualProject.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(filename, csv);
  }, [actualProject, assessment, notes]);

  const canAdvance = () => {
    if (step === 1 && !selectedProjectId) return false;
    return true;
  };

  return (
    <div dir="rtl" className="flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
        <h2 className="text-base font-bold text-gray-800 flex-1 truncate">
          {actualProject ? `معالج التقييم: ${actualProject.name}` : 'معالج التقييم'}
        </h2>
        {lastSaved && (
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <Save className="w-3 h-3" />
            {lastSaved}
          </span>
        )}
      </div>

      {/* Steps indicator */}
      <StepIndicator current={step} steps={WIZARD_STEPS} />

      {/* Step content */}
      <div className="flex-1 overflow-y-auto py-2 pb-20">
        {step === 1 && (
          <StepProjectInfo
            projects={[]}
            selectedId={selectedProjectId}
            onSelect={setSelectedProjectId}
          />
        )}
        {step === 2 && (
          <StepPhotoCapture
            photos={assessment.photos}
            onAdd={addPhoto}
            onRemove={removePhoto}
          />
        )}
        {step === 3 && (
          <StepTechnicalAssessment
            civil={assessment.civil}
            setCivil={v => setAssessment(prev => ({ ...prev, civil: v }))}
            elec={assessment.elec}
            setElec={v => setAssessment(prev => ({ ...prev, elec: v }))}
            plumb={assessment.plumb}
            setPlumb={v => setAssessment(prev => ({ ...prev, plumb: v }))}
          />
        )}
        {step === 4 && (
          <StepFurnitureAppliances
            furn={assessment.furn}
            setFurn={v => setAssessment(prev => ({ ...prev, furn: v }))}
            app={assessment.app}
            setApp={v => setAssessment(prev => ({ ...prev, app: v }))}
          />
        )}
        {step === 5 && (
          <StepReviewSubmit
            project={actualProject}
            assessment={{ ...assessment }}
            notes={notes}
            setNotes={setNotes}
            onSketchSave={handleSketchSave}
            onSketchClear={handleSketchClear}
            onSubmit={handleSubmit}
            submitting={submitting}
            onExportCSV={handleExportCSV}
          />
        )}

        {submitError && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-lg">
            {submitError}
          </div>
        )}
      </div>

      {/* Footer navigation */}
      {step < 5 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex items-center justify-between z-10">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-bold transition disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
            السابق
          </button>
          <button
            onClick={() => setStep(Math.min(5, step + 1))}
            disabled={!canAdvance()}
            className="flex items-center gap-1 px-4 py-2 bg-[#6B21A8] hover:bg-purple-800 text-white rounded-lg text-sm font-bold transition disabled:opacity-30"
          >
            التالي
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main PortalField Component                                         */
/* ------------------------------------------------------------------ */

export function PortalField({
  store,
  addAssessment,
  updateProject,
  addNotification,
  currentUserRole,
  isOffline,
  fieldView,
  setFieldView,
  activeProjectId,
  setActiveProjectId,
}: FieldProps) {
  const [offlineQueue, setOfflineQueue] = useState<any[]>(loadJSON(OFFLINE_QUEUE_KEY, []));
  const [emergencySubmitting, setEmergencySubmitting] = useState(false);

  // Flush offline queue when back online
  useEffect(() => {
    if (!isOffline && offlineQueue.length > 0) {
      const flush = async () => {
        const queue = [...offlineQueue];
        for (const item of queue) {
          try {
            await addAssessment(item.assessment);
          } catch {
            // If a single item fails, keep it in queue and stop
            break;
          }
        }
        // Re-read queue: remove successfully flushed items
        const remaining = loadJSON<any[]>(OFFLINE_QUEUE_KEY, []);
        const flushedIds = new Set(queue.map(q => q.assessment?.projectId));
        const newRemaining = remaining.filter((r: any) => !flushedIds.has(r.assessment?.projectId));
        saveJSON(OFFLINE_QUEUE_KEY, newRemaining);
        setOfflineQueue(newRemaining);
      };
      flush();
    }
  }, [isOffline, offlineQueue.length, addAssessment]);

  // Emergency project creation
  const handleEmergencySubmit = useCallback(async (data: {
    familyName: string;
    phone: string;
    address: string;
    description: string;
  }) => {
    setEmergencySubmitting(true);
    try {
      const newProjectId = `emergency_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const projectName = `طارئ - ${data.familyName}`;

      // Create assessment
      const assessmentRecord = {
        projectId: newProjectId,
        type: 'emergency_diagnosis',
        status: 'submitted',
        data: {
          familyName: data.familyName,
          phone: data.phone,
          address: data.address,
          emergencyDescription: data.description,
        },
        submittedAt: new Date().toISOString(),
      };

      if (isOffline) {
        const queue = loadJSON<any[]>(OFFLINE_QUEUE_KEY, []);
        queue.push({ assessment: assessmentRecord, projectId: newProjectId });
        saveJSON(OFFLINE_QUEUE_KEY, queue);
        setOfflineQueue(queue);
      } else {
        await addAssessment(assessmentRecord);
      }

      // Update project data (create project record via updateProject)
      await updateProject(newProjectId, {
        name: projectName,
        type: 'ترميم وتأثيث',
        city: data.address.split('-')[0]?.trim() || '',
        region: '',
        currentStageId: '5',
        currentStageOwner: 'المشاريع',
        stageEnteredAt: new Date().toISOString(),
        diagnosisVerdict: 'emergency',
        assessmentStatus: 'submitted',
        data: {
          familyName: data.familyName,
          phone: data.phone,
          address: data.address,
          emergencyDescription: data.description,
        },
      });

      await addNotification({
        text: `تم إنشاء مشروع طارئ: ${projectName}`,
        type: 'project_created',
        portal: 'field',
      });

      setActiveProjectId(null);
      setFieldView('TASKS');
    } catch {
      // Error silently — data is queued offline
    } finally {
      setEmergencySubmitting(false);
    }
  }, [isOffline, addAssessment, updateProject, addNotification, setActiveProjectId, setFieldView]);

  // Select a project and open wizard
  const handleSelectProject = useCallback((id: string) => {
    setActiveProjectId(id);
    setFieldView('WIZARD');
  }, [setActiveProjectId, setFieldView]);

  // Back from wizard
  const handleWizardBack = useCallback(() => {
    setFieldView('TASKS');
    setActiveProjectId(null);
  }, [setFieldView, setActiveProjectId]);

  // Open emergency
  const handleEmergency = useCallback(() => {
    setActiveProjectId('EMERGENCY');
    setFieldView('EMERGENCY');
  }, [setActiveProjectId, setFieldView]);

  // Get active project
  const activeProject = store.projects.find(p => p.id === activeProjectId);

  return (
    <div dir="rtl" className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Sync indicator */}
      <div className="flex justify-end">
        <SyncIndicator isOffline={isOffline} queueCount={offlineQueue.length} />
      </div>

      {/* Field Dashboard */}
      {fieldView === 'TASKS' && (
        <FieldDashboard
          projects={store.projects}
          users={store.users}
          onSelectProject={handleSelectProject}
          onEmergency={handleEmergency}
        />
      )}

      {/* Wizard */}
      {fieldView === 'WIZARD' && (
        <AssessmentWizard
          project={activeProject}
          addAssessment={addAssessment}
          updateProject={updateProject}
          addNotification={addNotification}
          isOffline={isOffline}
          onBack={handleWizardBack}
        />
      )}

      {/* Emergency */}
      {fieldView === 'EMERGENCY' && activeProjectId === 'EMERGENCY' && (
        <div>
          <button
            onClick={() => { setActiveProjectId(null); setFieldView('TASKS'); }}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition"
          >
            <ChevronRight className="w-5 h-5" />
            العودة للمهام
          </button>
          <EmergencyDiagnosis
            onSubmit={handleEmergencySubmit}
            submitting={emergencySubmitting}
          />
        </div>
      )}
    </div>
  );
}

export default PortalField;
