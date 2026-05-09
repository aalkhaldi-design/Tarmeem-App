/* ──────────────────────────────────────────────────────────────────
   ترميم — أنواع مشتركة (Project, FormsContext)
   ────────────────────────────────────────────────────────────────── */

import type { FormCode } from './data';

export interface ProjectRecord {
  id: string;
  /** رقم المشروع كما أدخله الباحث في F-02 Genesis (TRM-YYYY-NNN). مقفول بعد الإنشاء. */
  projectId: string;
  beneficiaryName: string;
  beneficiaryId?: string;
  city: string;
  neighborhood?: string;
  region?: string;
  caseRef?: string;        // CS-XXXX
  /** المرحلة الحالية للمشروع — تتقدّم تلقائياً مع كل F-XX يكتمل */
  phase: 'RESEARCH' | 'DIAGNOSIS' | 'EVACUATION' | 'TENDERING' | 'EXECUTION' | 'HANDOVER' | 'CLOSED';
  /** نسبة التقدم الإجمالية للمشروع */
  progressPct: number;
  /** المهندس المسند للتشخيص — يُسنده مدير المشاريع بعد F-03 */
  diagnosisEngineerId?: string | null;
  /** المهندس المسند للإشراف الميداني — يسنده رئيس قسم الإشراف بعد F-08 */
  supervisingEngineerId?: string | null;
  contractorName?: string | null;
  awardedPrice?: number | null;
  safetyHazard?: boolean;
  partnerEntity?: string;
  /** متى وُلِد المشروع وتسلسل الأحداث الرئيسية */
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  data?: Record<string, any>;
}

/* Forms-context API: تُحقن إلى مكوّنات النماذج لاسترجاع بيانات سابقة */
import type { FormRecord } from '../components/Forms';
import type { UserProfile } from '../components/Auth';

export interface FormsContext {
  /** كل المشاريع — لاسترجاع المشروع الحالي وعرض القائمة */
  projects: ProjectRecord[];
  /** يبحث عن نموذج بكود ضمن نفس المشروع (لاستخراج البيانات السابقة) */
  findProjectForm: (projectRefId: string | null | undefined, code: FormCode) => FormRecord | null;
  /** يحدّث وثيقة المشروع (المرحلة، نسبة التقدم، المهندسون، إلخ) */
  updateProject: (projectRefId: string, patch: Partial<ProjectRecord>) => Promise<void>;
  /** ينشئ مشروعاً جديداً (يُستخدم في F-02 Genesis فقط) */
  createProject: (data: Partial<ProjectRecord>) => Promise<string | null>;
  /** الحصول على مستخدم بالمعرّف */
  userById: (id: string) => UserProfile | undefined;
  /** قائمة المهندسين المتاحين للإسناد (DIAGNOSIS_ENGINEER الفعّالين) */
  availableEngineers: () => UserProfile[];
}
