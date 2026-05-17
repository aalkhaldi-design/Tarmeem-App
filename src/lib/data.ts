// ============================================================================
// SYSTEM ROLES & DEPARTMENTS (Unified Dictionary)
// ============================================================================

export type RoleKey =
  | 'SYSTEM'
  | 'ADMIN'
  | 'EXEC_DIRECTOR'
  | 'RESEARCH_MANAGER'
  | 'SOCIAL_RESEARCHER'
  | 'PROJECTS_MANAGER'
  | 'DIAGNOSIS_ENGINEER'
  | 'EXECUTION_ENGINEER'
  | 'SUPPLY_MANAGER'
  | 'SUPPLY_EMPLOYEE'
  | 'FINANCE_MANAGER'
  | 'FINANCE_EMPLOYEE';

export type DepartmentKey = 'RESEARCH' | 'PROJECTS' | 'SUPPLY' | 'FINANCE' | 'EXEC' | 'SYSTEM';

export interface DepartmentDef {
  key: DepartmentKey;
  name: string;
  shortName: string;
  description: string;
  color: string;
}

export const DEPARTMENTS: DepartmentDef[] = [
  { key: 'RESEARCH', name: 'البحث الاجتماعي', shortName: 'البحث', description: 'إدارة وتوجيه دراسات المستفيدين', color: '#4A1F66' },
  { key: 'PROJECTS', name: 'إدارة المشاريع', shortName: 'المشاريع', description: 'التشخيص الهندسي والتنفيذ', color: '#43bba1' },
  { key: 'SUPPLY', name: 'الإمداد والتوريد', shortName: 'التوريد', description: 'المشتريات وإدارة المستودعات', color: '#a871f7' },
  { key: 'FINANCE', name: 'الإدارة المالية', shortName: 'المالية', description: 'إدارة الميزانيات واعتمادات الصرف', color: '#eab308' },
  { key: 'EXEC', name: 'الإدارة التنفيذية', shortName: 'التنفيذي', description: 'الاعتمادات النهائية والقرارات', color: '#ef4444' },
  { key: 'SYSTEM', name: 'العمليات المؤتمتة', shortName: 'النظام', description: 'المهام والتوجيهات التلقائية', color: '#6b7280' }
];

export const DEPT_BY_KEY = DEPARTMENTS.reduce((acc, d) => {
  acc[d.key] = d;
  return acc;
}, {} as Record<DepartmentKey, DepartmentDef>);

export const departmentName = (key?: string) => DEPT_BY_KEY[key as DepartmentKey]?.name || 'غير محدد';

export interface RoleDef {
  key: RoleKey;
  name: string;
  membershipTitle: string;
  department: DepartmentKey;
  isManager?: boolean;
}

export const ROLES_DEF: RoleDef[] = [
  { key: 'SYSTEM', name: 'النظام الآلي', membershipTitle: 'نظام', department: 'SYSTEM' },
  { key: 'ADMIN', name: 'مدير النظام (Admin)', membershipTitle: 'مسؤول نظام', department: 'SYSTEM', isManager: true },
  { key: 'EXEC_DIRECTOR', name: 'المدير التنفيذي', membershipTitle: 'مدير تنفيذي', department: 'EXEC', isManager: true },
  { key: 'RESEARCH_MANAGER', name: 'مدير البحث الاجتماعي', membershipTitle: 'مدير قسم البحث', department: 'RESEARCH', isManager: true },
  { key: 'SOCIAL_RESEARCHER', name: 'باحث اجتماعي', membershipTitle: 'باحث', department: 'RESEARCH' },
  { key: 'PROJECTS_MANAGER', name: 'مدير إدارة المشاريع', membershipTitle: 'مدير مشاريع', department: 'PROJECTS', isManager: true },
  { key: 'DIAGNOSIS_ENGINEER', name: 'مهندس تشخيص', membershipTitle: 'مهندس تشخيص', department: 'PROJECTS' },
  { key: 'EXECUTION_ENGINEER', name: 'مهندس تنفيذ', membershipTitle: 'مهندس إشراف', department: 'PROJECTS' },
  { key: 'SUPPLY_MANAGER', name: 'مدير الإمداد والتوريد', membershipTitle: 'مدير التوريد', department: 'SUPPLY', isManager: true },
  { key: 'SUPPLY_EMPLOYEE', name: 'موظف توريد', membershipTitle: 'أخصائي توريد', department: 'SUPPLY' },
  { key: 'FINANCE_MANAGER', name: 'المدير المالي', membershipTitle: 'مدير مالي', department: 'FINANCE', isManager: true },
  { key: 'FINANCE_EMPLOYEE', name: 'محاسب مالي', membershipTitle: 'محاسب', department: 'FINANCE' }
];

export const ROLE_BY_KEY = ROLES_DEF.reduce((acc, r) => {
  acc[r.key] = r;
  return acc;
}, {} as Record<RoleKey, RoleDef>);

export const roleName = (key?: string) => ROLE_BY_KEY[key as RoleKey]?.name || 'غير محدد';

export const REGION_LABELS: Record<string, string> = {
  'ALL': 'جميع المناطق',
  'DAM': 'الدمام',
  'KHO': 'الخبر',
  'DHA': 'الظهران',
  'QAT': 'القطيف',
  'JUB': 'الجبيل',
  'AHS': 'الأحساء',
  'BQA': 'بقيق',
  'KHA': 'الخفجي'
};

// ============================================================================
// FORMS DICTIONARY
// ============================================================================

export type FormCode =
  | 'F-02' | 'F-03' | 'F-03.1' | 'F-03.2'
  | 'F-04' | 'F-08' | 'F-18' | 'F-22' | 'F-21'
  | 'F-20' | 'F-84' | 'F-85' | 'F-32' | 'F-33'
  | 'F-34' | 'F-19' | 'F-35' | 'F-14' | 'F-23'
  | 'F-15' | 'F-07' | 'F-52';

export type FormStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'deferred';

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  draft: 'مسودة',
  pending: 'قيد الاعتماد',
  approved: 'معتمد',
  rejected: 'مرفوض',
  deferred: 'مؤجل'
};

export interface FormDef {
  code: FormCode;
  title: string;
  titleEn: string;
  category: 'BENEFICIARY' | 'ENGINEERING' | 'SUPPLY' | 'FINANCIAL' | 'CLOSURE';
  ownerDept: DepartmentKey;
  originRoles: RoleKey[];
  approvalChain: RoleKey[];
  slaDays: number;
  description: string;
  bridgesTo: DepartmentKey[];
}

export const FORMS: FormDef[] = [
  // Phase 1: Research
  { code: 'F-02', title: 'استمارة البحث الاجتماعي', titleEn: 'Social Research Form', category: 'BENEFICIARY', ownerDept: 'RESEARCH', originRoles: ['SOCIAL_RESEARCHER'], approvalChain: ['RESEARCH_MANAGER'], slaDays: 5, description: 'يعبّئها الباحث ويولد المشروع.', bridgesTo: [] },
  { code: 'F-03', title: 'اعتماد مدير البحث', titleEn: 'Research Manager Approval', category: 'BENEFICIARY', ownerDept: 'RESEARCH', originRoles: ['RESEARCH_MANAGER'], approvalChain: ['EXEC_DIRECTOR'], slaDays: 2, description: 'اعتماد مدير البحث الاجتماعي للمشروع.', bridgesTo: ['EXEC'] },
  { code: 'F-03.1', title: 'اعتماد المدير التنفيذي', titleEn: 'Executive Director Approval', category: 'BENEFICIARY', ownerDept: 'EXEC', originRoles: ['EXEC_DIRECTOR'], approvalChain: [], slaDays: 2, description: 'قرار المدير التنفيذي بالاستحقاق.', bridgesTo: ['RESEARCH'] },
  { code: 'F-03.2', title: 'الاعتماد النهائي للإحالة', titleEn: 'Final Transfer Approval', category: 'BENEFICIARY', ownerDept: 'RESEARCH', originRoles: ['RESEARCH_MANAGER'], approvalChain: [], slaDays: 1, description: 'توجيه المشروع بعد قرار المدير التنفيذي.', bridgesTo: ['PROJECTS'] },

  // Phase 2: Diagnosis
  { code: 'F-04', title: 'تعيين مهندس التشخيص', titleEn: 'Diagnosis Engineer Assignment', category: 'ENGINEERING', ownerDept: 'PROJECTS', originRoles: ['PROJECTS_MANAGER'], approvalChain: [], slaDays: 1, description: 'تعيين المهندس للزيارة الميدانية.', bridgesTo: [] },
  { code: 'F-08', title: 'كراسة تشخيص المبنى', titleEn: 'Diagnosis Binder', category: 'ENGINEERING', ownerDept: 'PROJECTS', originRoles: ['DIAGNOSIS_ENGINEER'], approvalChain: ['PROJECTS_MANAGER'], slaDays: 3, description: 'حصر الأعمال والكروكي والكميات.', bridgesTo: [] },
  { code: 'F-18', title: 'تعهد إخلاء المنزل', titleEn: 'Evacuation Pledge', category: 'BENEFICIARY', ownerDept: 'PROJECTS', originRoles: ['DIAGNOSIS_ENGINEER', 'PROJECTS_MANAGER', 'SYSTEM'], approvalChain: [], slaDays: 2, description: 'تعهد المستفيد بإخلاء المبنى.', bridgesTo: [] },
  { code: 'F-22', title: 'طلب توفير سكن بديل', titleEn: 'Alt Housing Request', category: 'BENEFICIARY', ownerDept: 'PROJECTS', originRoles: ['DIAGNOSIS_ENGINEER', 'PROJECTS_MANAGER', 'SYSTEM'], approvalChain: [], slaDays: 2, description: 'طلب سكن مؤقت للمستفيد.', bridgesTo: [] },
  { code: 'F-21', title: 'الاعتماد الفني', titleEn: 'Technical Approval', category: 'ENGINEERING', ownerDept: 'PROJECTS', originRoles: ['PROJECTS_MANAGER'], approvalChain: [], slaDays: 1, description: 'اعتماد الكراسة وإحالتها للتوريد.', bridgesTo: ['SUPPLY'] },

  // Phase 3: Supply & Awarding
  { code: 'F-20', title: 'خطة التوريد وجدول الكميات', titleEn: 'Supply Plan & BOQ', category: 'SUPPLY', ownerDept: 'SUPPLY', originRoles: ['SUPPLY_EMPLOYEE', 'SUPPLY_MANAGER'], approvalChain: [], slaDays: 3, description: 'حصر المواد المطلوبة للتنفيذ.', bridgesTo: [] },
  { code: 'F-84', title: 'استدراج عروض الأسعار', titleEn: 'Pricing Request', category: 'SUPPLY', ownerDept: 'SUPPLY', originRoles: ['SUPPLY_EMPLOYEE', 'SUPPLY_MANAGER'], approvalChain: [], slaDays: 4, description: 'طلب تسعيرات المقاولين والموردين.', bridgesTo: [] },
  { code: 'F-85', title: 'محضر ترسية المشروع', titleEn: 'Awarding Report', category: 'SUPPLY', ownerDept: 'SUPPLY', originRoles: ['SUPPLY_MANAGER'], approvalChain: ['PROJECTS_MANAGER', 'FINANCE_MANAGER'], slaDays: 2, description: 'ترسية المشروع على المقاول.', bridgesTo: ['PROJECTS', 'FINANCE'] },
  { code: 'F-32', title: 'تعيين مشرف التنفيذ', titleEn: 'Assign Supervisor', category: 'ENGINEERING', ownerDept: 'PROJECTS', originRoles: ['PROJECTS_MANAGER'], approvalChain: [], slaDays: 1, description: 'تعيين المهندس المشرف على التنفيذ.', bridgesTo: [] },
  { code: 'F-33', title: 'محضر تسليم الموقع', titleEn: 'Site Handover', category: 'ENGINEERING', ownerDept: 'PROJECTS', originRoles: ['EXECUTION_ENGINEER'], approvalChain: [], slaDays: 1, description: 'تسليم الموقع للمقاول لبدء العمل.', bridgesTo: [] },

  // Phase 4: Execution & Finance
  { code: 'F-34', title: 'إحالة التوريد للمستودع', titleEn: 'Warehouse Transfer', category: 'SUPPLY', ownerDept: 'SUPPLY', originRoles: ['SUPPLY_MANAGER', 'SUPPLY_EMPLOYEE'], approvalChain: [], slaDays: 1, description: 'توجيه المواد للمستودع المباشر.', bridgesTo: [] },
  { code: 'F-19', title: 'سند صرف مواد', titleEn: 'Warehouse Issue Voucher', category: 'SUPPLY', ownerDept: 'SUPPLY', originRoles: ['SUPPLY_EMPLOYEE'], approvalChain: [], slaDays: 1, description: 'صرف المواد للمقاول.', bridgesTo: [] },
  { code: 'F-35', title: 'طلب الدفعة المقدمة', titleEn: 'Advance Payment', category: 'FINANCIAL', ownerDept: 'FINANCE', originRoles: ['PROJECTS_MANAGER', 'FINANCE_EMPLOYEE'], approvalChain: ['FINANCE_MANAGER'], slaDays: 2, description: 'صرف الدفعة المالية الأولى.', bridgesTo: [] },
  { code: 'F-14', title: 'تقرير الإشراف الميداني', titleEn: 'Supervision Report', category: 'ENGINEERING', ownerDept: 'PROJECTS', originRoles: ['EXECUTION_ENGINEER'], approvalChain: ['PROJECTS_MANAGER'], slaDays: 1, description: 'تقرير دوري لنسبة الإنجاز.', bridgesTo: [] },
  { code: 'F-23', title: 'اعتماد بنود إضافية', titleEn: 'Variation Order', category: 'ENGINEERING', ownerDept: 'PROJECTS', originRoles: ['EXECUTION_ENGINEER', 'PROJECTS_MANAGER'], approvalChain: ['EXEC_DIRECTOR'], slaDays: 3, description: 'اعتماد أعمال خارج الكراسة.', bridgesTo: ['EXEC'] },
  { code: 'F-15', title: 'طلب الدفعة المالية', titleEn: 'Contractor Payment Request', category: 'FINANCIAL', ownerDept: 'FINANCE', originRoles: ['PROJECTS_MANAGER', 'FINANCE_EMPLOYEE'], approvalChain: ['FINANCE_MANAGER'], slaDays: 3, description: 'صرف دفعات الإنجاز والملاحق.', bridgesTo: [] },

  // Phase 5: Handover
  { code: 'F-07', title: 'شهادة التسليم النهائي', titleEn: 'Final Handover', category: 'CLOSURE', ownerDept: 'PROJECTS', originRoles: ['EXECUTION_ENGINEER', 'PROJECTS_MANAGER'], approvalChain: [], slaDays: 2, description: 'التسليم النهائي وإغلاق المشروع هندسيا.', bridgesTo: [] },
  { code: 'F-52', title: 'التوثيق الإعلامي', titleEn: 'Media Documentation', category: 'CLOSURE', ownerDept: 'RESEARCH', originRoles: ['SOCIAL_RESEARCHER'], approvalChain: [], slaDays: 2, description: 'توثيق قصة النجاح إعلاميا.', bridgesTo: [] }
];

export const FORM_BY_CODE = FORMS.reduce((acc, f) => {
  acc[f.code] = f;
  return acc;
}, {} as Record<FormCode, FormDef>);

// ============================================================================
// PHASES & UI MAPPING
// ============================================================================

export const PHASES = [
  { name: 'البحث والاعتماد', forms: ['F-02', 'F-03', 'F-03.1', 'F-03.2'] as FormCode[] },
  { name: 'التشخيص الهندسي', forms: ['F-04', 'F-08', 'F-18', 'F-22', 'F-21'] as FormCode[] },
  { name: 'التوريد والترسية', forms: ['F-20', 'F-84', 'F-85', 'F-32', 'F-33'] as FormCode[] },
  { name: 'التنفيذ والمالية', forms: ['F-34', 'F-19', 'F-35', 'F-14', 'F-23', 'F-15'] as FormCode[] },
  { name: 'الإغلاق والتوثيق', forms: ['F-07', 'F-52'] as FormCode[] }
];

export const DEFAULT_LISTS = {
  cities: ['الدمام', 'الخبر', 'الظهران', 'القطيف', 'الجبيل', 'الأحساء', 'بقيق', 'الخفجي', 'الرياض', 'جدة'],
  housingTypes: ['منزل مستقل', 'شقة', 'ملحق', 'شعبي', 'أخرى'],
  housings: ['ملك', 'إيجار', 'ورثة', 'منحة', 'أخرى']
};

// ============================================================================
// UTILITIES
// ============================================================================

// Fix #8 — preserve admin access for the existing email-based admins.
export const isAdminEmail = (email: string) => {
  const list = [
    'admin@tarmeem.org',
    'a.alkhaldi@tarmeem.org',
    's.aldossari@tarmeem.org',
  ];
  return list.includes(email) || email.endsWith('@admin.tarmeem.org');
};

export const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'اليوم';
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;

  return date.toLocaleDateString('ar-SA');
};

export const slaStatus = (startDateStr: string | undefined, slaDays: number | undefined): { tone: string; text: string } => {
  if (!startDateStr || !slaDays) return { tone: 'gray', text: 'غير محدد' };

  const startDate = new Date(startDateStr);
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > slaDays) return { tone: 'late', text: `متأخر (${diffDays - slaDays} أيام)` };
  if (diffDays === slaDays) return { tone: 'warn', text: 'ينتهي اليوم' };
  return { tone: 'good', text: `متبقي ${slaDays - diffDays} أيام` };
};

// Fix #4 — keep the THEME export so ui.tsx's `import { THEME }` resolves.
export const THEME = {
  primary: '#4A1F66', primaryLight: '#6B3D87', primaryDark: '#3A1652',
  accent: '#56B894', accentDark: '#3F9B7A',
};
