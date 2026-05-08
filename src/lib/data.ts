/* ──────────────────────────────────────────────────────────────────
   ترميم — البنية الأساسية للبيانات
   9 إدارات | 20 دور وظيفي | 27 نموذجاً مُحدّداً
   ────────────────────────────────────────────────────────────────── */

export const TARMEEM_BRAND = {
  purple: '#4A1F66', purpleLight: '#6B3D87', purpleDark: '#3A1652',
  teal: '#56B894', tealLight: '#7AC8AD', tealDark: '#3F9B7A', cream: '#FFF8E7'
};

export const THEME = {
  shared: { fontFamily: 'sans-serif', radius: 'rounded-xl' },
  primary: TARMEEM_BRAND.purple,
  primaryLight: TARMEEM_BRAND.purpleLight,
  primaryDark: TARMEEM_BRAND.purpleDark,
  accent: TARMEEM_BRAND.teal,
  accentLight: TARMEEM_BRAND.tealLight,
  success: '#16a34a', warning: '#f59e0b', danger: '#dc2626',
  form: { headerBg: TARMEEM_BRAND.purple, labelBg: '#F2F2F2', inputBg: '#FFF2CC', alertBg: '#FFFF00' }
};

/* ──────────────────────────────────────────────────────────────────
   الإدارات التسع (Departments / Membership Kinds)
   ────────────────────────────────────────────────────────────────── */

export type DepartmentKey =
  | 'EXEC'   // الإدارة التنفيذية
  | 'RESEARCH' // البحث الاجتماعي
  | 'PROJECTS' // المشاريع والترميم
  | 'SUPPORT'  // الخدمات المساندة
  | 'IT'       // تقنية المعلومات
  | 'FINANCE'  // الشؤون المالية
  | 'MARKETING' // التسويق
  | 'COMMS'    // الاتصال المؤسسي
  | 'GOVERNANCE'; // الحوكمة (التدقيق والامتثال)

export interface DepartmentDef {
  key: DepartmentKey;
  name: string;        // الاسم بالعربية
  shortName: string;   // اختصار للعرض
  nameEn: string;
  color: string;       // لون الإدارة (HEX)
  accent: string;
  description: string;
}

export const DEPARTMENTS: DepartmentDef[] = [
  { key: 'EXEC',       name: 'الإدارة التنفيذية',     shortName: 'تنفيذية',   nameEn: 'Executive Management',     color: '#4A1F66', accent: '#56B894', description: 'القرارات التنفيذية واعتماد المعاملات الكبرى.' },
  { key: 'RESEARCH',   name: 'البحث الاجتماعي',        shortName: 'البحث',     nameEn: 'Social Research',          color: '#0EA5E9', accent: '#0284C7', description: 'دراسة الحالات وتحديد الاستحقاق وإدارة العلاقة مع الأسر.' },
  { key: 'PROJECTS',   name: 'المشاريع والترميم',       shortName: 'المشاريع',  nameEn: 'Projects & Renovation',    color: '#7C3AED', accent: '#8B5CF6', description: 'التشخيص الهندسي والتنفيذ والإشراف على المقاولين.' },
  { key: 'SUPPORT',    name: 'الخدمات المساندة',        shortName: 'الخدمات',   nameEn: 'Support Services',         color: '#F97316', accent: '#FB923C', description: 'سلسلة التوريد، المشتريات، المستودعات.' },
  { key: 'IT',         name: 'تقنية المعلومات',         shortName: 'تقنية',     nameEn: 'IT',                        color: '#0891B2', accent: '#06B6D4', description: 'الدعم الفني، الأجهزة، الأنظمة والصلاحيات.' },
  { key: 'FINANCE',    name: 'الشؤون المالية',          shortName: 'المالية',   nameEn: 'Finance',                   color: '#16A34A', accent: '#22C55E', description: 'الميزانية، الصرف، المحاسبة والتدقيق المالي.' },
  { key: 'MARKETING',  name: 'التسويق',                 shortName: 'التسويق',   nameEn: 'Marketing',                 color: '#DB2777', accent: '#EC4899', description: 'الحملات، الموارد المالية، توفير الأثاث المطلوب.' },
  { key: 'COMMS',      name: 'الاتصال المؤسسي',         shortName: 'الاتصال',   nameEn: 'Corporate Communications',  color: '#9333EA', accent: '#A855F7', description: 'العلاقات العامة، الإعلام، التغطية الإعلامية.' },
  { key: 'GOVERNANCE', name: 'الحوكمة (التدقيق والامتثال)', shortName: 'الحوكمة', nameEn: 'Governance (Audit & Compliance)', color: '#1F2937', accent: '#F59E0B', description: 'التدقيق الداخلي وحماية البيانات والامتثال.' },
];

export const DEPT_BY_KEY: Record<DepartmentKey, DepartmentDef> =
  DEPARTMENTS.reduce((acc, d) => { acc[d.key] = d; return acc; }, {} as Record<DepartmentKey, DepartmentDef>);

export const departmentName = (key: string) => DEPT_BY_KEY[key as DepartmentKey]?.name || key;

/* ──────────────────────────────────────────────────────────────────
   الأدوار العشرون (20 Authorized Roles / Account Types)
   ────────────────────────────────────────────────────────────────── */

export type RoleKey =
  // Executive
  | 'EXEC_DIRECTOR' | 'BOARD_MEMBER'
  // Social Research
  | 'RESEARCH_MANAGER' | 'SOCIAL_RESEARCHER' | 'FIELD_DATA_OFFICER'
  // Projects & Renovation
  | 'PROJECTS_MANAGER' | 'SUPERVISING_ENGINEER' | 'DIAGNOSIS_OFFICER'
  // Support Services
  | 'SUPPORT_MANAGER' | 'PROCUREMENT_OFFICER' | 'WAREHOUSE_CLERK'
  // IT
  | 'IT_MANAGER' | 'IT_HELPDESK' | 'SYSTEM_ADMIN'
  // Finance
  | 'FINANCE_HEAD' | 'ACCOUNTANT'
  // Marketing
  | 'MARKETING_OFFICER'
  // Comms
  | 'PR_OFFICER'
  // Governance
  | 'DPO' | 'INTERNAL_AUDITOR';

export interface RoleDef {
  key: RoleKey;
  name: string;     // الاسم العربي
  nameEn: string;
  department: DepartmentKey;
  isManager?: boolean; // مدير القسم
}

export const ROLES_DEF: RoleDef[] = [
  // 1-2 Executive
  { key: 'EXEC_DIRECTOR',        name: 'المدير التنفيذي',                    nameEn: 'Executive Director',         department: 'EXEC',       isManager: true },
  { key: 'BOARD_MEMBER',         name: 'عضو مجلس الإدارة / اللجنة التوجيهية', nameEn: 'Board / Steering Member',    department: 'EXEC' },
  // 3-5 Social Research
  { key: 'RESEARCH_MANAGER',     name: 'مدير البحث الاجتماعي',                nameEn: 'Social Research Manager',    department: 'RESEARCH',   isManager: true },
  { key: 'SOCIAL_RESEARCHER',    name: 'باحث اجتماعي',                        nameEn: 'Social Researcher',          department: 'RESEARCH' },
  { key: 'FIELD_DATA_OFFICER',   name: 'مدخل بيانات ميداني',                  nameEn: 'Field Data Entry Officer',   department: 'RESEARCH' },
  // 6-8 Projects & Renovation
  { key: 'PROJECTS_MANAGER',     name: 'مدير المشاريع والترميم',              nameEn: 'Projects & Renovation Manager', department: 'PROJECTS', isManager: true },
  { key: 'SUPERVISING_ENGINEER', name: 'المهندس المشرف',                      nameEn: 'Supervising Engineer',       department: 'PROJECTS' },
  { key: 'DIAGNOSIS_OFFICER',    name: 'مسؤول التشخيص',                       nameEn: 'Diagnosis Officer',          department: 'PROJECTS' },
  // 9-11 Support Services
  { key: 'SUPPORT_MANAGER',      name: 'مدير الخدمات المساندة',                nameEn: 'Support Services Manager',   department: 'SUPPORT',    isManager: true },
  { key: 'PROCUREMENT_OFFICER',  name: 'مسؤول المشتريات',                      nameEn: 'Procurement Officer',        department: 'SUPPORT' },
  { key: 'WAREHOUSE_CLERK',      name: 'أمين المستودع',                        nameEn: 'Warehouse Clerk',            department: 'SUPPORT' },
  // 12-14 IT
  { key: 'IT_MANAGER',           name: 'مدير تقنية المعلومات',                  nameEn: 'IT Manager',                 department: 'IT',         isManager: true },
  { key: 'IT_HELPDESK',          name: 'فني الدعم الفني',                      nameEn: 'IT Helpdesk Technician',     department: 'IT' },
  { key: 'SYSTEM_ADMIN',         name: 'مدير النظام',                          nameEn: 'System Administrator',       department: 'IT' },
  // 15-16 Finance
  { key: 'FINANCE_HEAD',         name: 'رئيس الشؤون المالية',                   nameEn: 'Head of Financial Affairs',  department: 'FINANCE',    isManager: true },
  { key: 'ACCOUNTANT',           name: 'محاسب',                                nameEn: 'Accountant',                 department: 'FINANCE' },
  // 17 Marketing
  { key: 'MARKETING_OFFICER',    name: 'مسؤول التسويق',                        nameEn: 'Marketing Officer',          department: 'MARKETING',  isManager: true },
  // 18 Comms
  { key: 'PR_OFFICER',           name: 'مسؤول العلاقات العامة والإعلام',        nameEn: 'PR / Media Officer',         department: 'COMMS',      isManager: true },
  // 19-20 Governance
  { key: 'DPO',                  name: 'مسؤول حماية البيانات',                  nameEn: 'Data Protection Officer',    department: 'GOVERNANCE' },
  { key: 'INTERNAL_AUDITOR',     name: 'المدقق الداخلي',                        nameEn: 'Internal Auditor',           department: 'GOVERNANCE' },
];

export const ROLE_BY_KEY: Record<RoleKey, RoleDef> =
  ROLES_DEF.reduce((acc, r) => { acc[r.key] = r; return acc; }, {} as Record<RoleKey, RoleDef>);

/** الأدوار التي تُعدّ "مدير قسم" (يحق لها اعتماد طلبات داخل قسمها) */
export const MANAGER_ROLES: RoleKey[] = ROLES_DEF.filter(r => r.isManager).map(r => r.key);

/** أدوار الإدارة التنفيذية */
export const EXECUTIVE_ROLES: RoleKey[] = ['EXEC_DIRECTOR', 'BOARD_MEMBER'];

export const roleName = (key: string) => ROLE_BY_KEY[key as RoleKey]?.name || key;
export const roleDepartment = (key: string): DepartmentKey | null =>
  ROLE_BY_KEY[key as RoleKey]?.department || null;

/* ──────────────────────────────────────────────────────────────────
   النماذج السبعة والعشرون (27 Scoped Forms & Documents)
   ────────────────────────────────────────────────────────────────── */

export type FormCode =
  // Beneficiary & Assessment
  | 'F-02' | 'F-03' | 'F-08' | 'F-18' | 'F-21' | 'F-22' | 'F-07'
  // Project Execution & Tendering
  | 'F-13' | 'F-14' | 'F-15' | 'F-23' | 'F-82' | 'F-83' | 'F-84' | 'F-85'
  // Supply Chain & Stock Ledger
  | 'F-19' | 'F-20' | 'F-24' | 'F-25' | 'F-87'
  // IT Service & Governance
  | 'F-52' | 'F-53' | 'F-64' | 'F-65' | 'F-66' | 'F-72'
  // Executive Decision Hub
  | 'F-73';

export interface FormDef {
  code: FormCode;
  title: string;            // العنوان بالعربية
  titleEn: string;
  category: 'BENEFICIARY' | 'EXECUTION' | 'SUPPLY' | 'IT_GOV' | 'EXEC_HUB';
  ownerDept: DepartmentKey;     // الإدارة المالكة
  originRole: RoleKey | RoleKey[]; // من ينشئ النموذج
  approvalChain: RoleKey[];     // سلسلة الاعتماد بالترتيب
  bridgesTo?: DepartmentKey[];  // إدارات تتلقى نسخة (الجسور)
  refKey?: string;              // مفتاح المرجعية (case_study_ref, …)
  description: string;
  triggers?: FormCode[];        // النماذج التي يطلقها هذا النموذج تلقائياً
}

export const FORMS: FormDef[] = [
  /* 1. Beneficiary & Assessment Routing */
  {
    code: 'F-02', title: 'استمارة دراسة الحالة', titleEn: 'Case Study Form',
    category: 'BENEFICIARY', ownerDept: 'RESEARCH',
    originRole: 'SOCIAL_RESEARCHER',
    approvalChain: ['SOCIAL_RESEARCHER', 'RESEARCH_MANAGER'],
    refKey: 'case_study_ref',
    description: 'يسحب بيانات المستفيد والأسرة (للقراءة) ويُعبّأ معها تفاصيل المنزل وعمره. يغذّي F-03 مباشرة.',
    triggers: ['F-03'],
  },
  {
    code: 'F-03', title: 'قرار الاستحقاق', titleEn: 'Eligibility Decision',
    category: 'BENEFICIARY', ownerDept: 'RESEARCH',
    originRole: 'RESEARCH_MANAGER',
    approvalChain: ['RESEARCH_MANAGER', 'EXEC_DIRECTOR'],
    bridgesTo: ['EXEC'],
    description: 'قرار الاستحقاق يجمع بيانات F-02 تلقائياً. عند الحالات الكبرى يتحوّل إلى F-73 لاعتماد المدير التنفيذي.',
    triggers: ['F-08'],
  },
  {
    code: 'F-08', title: 'تقرير التشخيص الهندسي', titleEn: 'Engineering Diagnosis Report',
    category: 'BENEFICIARY', ownerDept: 'PROJECTS',
    originRole: 'DIAGNOSIS_OFFICER',
    approvalChain: ['DIAGNOSIS_OFFICER', 'SUPERVISING_ENGINEER', 'PROJECTS_MANAGER'],
    refKey: 'diagnosis_ref',
    description: 'ينشأ من قبل مسؤول التشخيص في الموقع. يُسلَّم للمهندس المشرف ومدير المشاريع لبناء خطة التوريد F-20.',
    triggers: ['F-20'],
  },
  {
    code: 'F-18', title: 'طلب إخلاء المنزل', titleEn: 'Evacuation Request',
    category: 'BENEFICIARY', ownerDept: 'PROJECTS',
    originRole: 'SUPERVISING_ENGINEER',
    approvalChain: ['SUPERVISING_ENGINEER', 'PROJECTS_MANAGER'],
    description: 'يصدر إذا كان F-08 يثبت عدم سلامة المنزل لإقامة الأسرة أثناء الترميم.',
    triggers: ['F-22'],
  },
  {
    code: 'F-22', title: 'طلب سكن بديل', titleEn: 'Alternative Housing Request',
    category: 'BENEFICIARY', ownerDept: 'RESEARCH',
    originRole: 'SOCIAL_RESEARCHER',
    approvalChain: ['SOCIAL_RESEARCHER', 'RESEARCH_MANAGER'],
    refKey: 'request_ref',
    description: 'يطلق متزامناً مع F-18 لتأمين سكن مؤقت للأسرة خلال التنفيذ.',
  },
  {
    code: 'F-21', title: 'حصر الأثاث المطلوب', titleEn: 'Furniture Inventory',
    category: 'BENEFICIARY', ownerDept: 'RESEARCH',
    originRole: ['SOCIAL_RESEARCHER', 'SUPERVISING_ENGINEER'],
    approvalChain: ['SOCIAL_RESEARCHER', 'MARKETING_OFFICER'],
    bridgesTo: ['MARKETING'],
    refKey: 'allocation_ref',
    description: 'بعد التشخيص يلتقط الباحث/المهندس قائمة الأثاث المطلوبة، ثم تتحوّل إلى التسويق لمطابقة المخزون أو الحملات.',
  },
  {
    code: 'F-07', title: 'محضر تسليم المنزل', titleEn: 'Home Handover Receipt',
    category: 'BENEFICIARY', ownerDept: 'PROJECTS',
    originRole: 'SUPERVISING_ENGINEER',
    approvalChain: ['SUPERVISING_ENGINEER', 'PROJECTS_MANAGER', 'RESEARCH_MANAGER'],
    bridgesTo: ['COMMS'],
    description: 'محضر التسليم النهائي. عند تفعيل خانة "طلب تغطية إعلامية" يُطلق تلقائياً F-52 لقسم العلاقات العامة.',
    triggers: ['F-52'],
  },

  /* 2. Project Execution & Tendering Exceptions */
  {
    code: 'F-82', title: 'زيارة موقع ما قبل العطاء', titleEn: 'Pre-Bid Site Visit',
    category: 'EXECUTION', ownerDept: 'PROJECTS',
    originRole: 'SUPERVISING_ENGINEER',
    approvalChain: ['SUPERVISING_ENGINEER', 'PROJECTS_MANAGER'],
    refKey: 'TRM-PBSV-YYYY-NNNNN',
    description: 'يحدّد إحداثيات السياج الجغرافي وموعد الزيارة الميدانية قبل فتح العطاء.',
  },
  {
    code: 'F-83', title: 'مسح تحقّق المقاول الميداني', titleEn: 'Contractor On-Site Verification Scan',
    category: 'EXECUTION', ownerDept: 'PROJECTS',
    originRole: 'SUPERVISING_ENGINEER',
    approvalChain: ['SUPERVISING_ENGINEER'],
    refKey: 'TRM-SCAN-YYYYMMDD-NNNNN',
    description: 'يلتقط مسح QR/الإحداثيات الجغرافية لإثبات وقوف المقاول قبل الإفراج عن النطاق الفني.',
  },
  {
    code: 'F-84', title: 'دعوة استثناء المقاول', titleEn: 'Contractor Override Invitation',
    category: 'EXECUTION', ownerDept: 'PROJECTS',
    originRole: 'PROJECTS_MANAGER',
    approvalChain: ['PROJECTS_MANAGER', 'EXEC_DIRECTOR'],
    bridgesTo: ['EXEC'],
    refKey: 'TRM-OVR-YYYY-NNNNN',
    description: 'تجاوز F-82 و F-83 في الحالات الطارئة. يتطلّب اعتماد المدير التنفيذي عبر F-73.',
  },
  {
    code: 'F-85', title: 'نشر عرض مباشر', titleEn: 'Direct Offer Publication',
    category: 'EXECUTION', ownerDept: 'PROJECTS',
    originRole: 'PROJECTS_MANAGER',
    approvalChain: ['PROJECTS_MANAGER', 'FINANCE_HEAD'],
    bridgesTo: ['FINANCE'],
    refKey: 'TRM-DO-YYYY-NNNNN',
    description: 'تجاوز التعطية القياسية لنطاق فوري بسعر ثابت. يحوَّل لرئيس الشؤون المالية لإجازة الميزانية.',
  },
  {
    code: 'F-13', title: 'الجدول الزمني للمشروع', titleEn: 'Project Timeline',
    category: 'EXECUTION', ownerDept: 'PROJECTS',
    originRole: 'PROJECTS_MANAGER',
    approvalChain: ['PROJECTS_MANAGER'],
    refKey: 'timeline_ref',
    description: 'يُؤسس الجدول الرئيسي والاعتماديات لمرحلة التنفيذ.',
  },
  {
    code: 'F-14', title: 'تقرير الإشراف الميداني', titleEn: 'Site Supervision Report',
    category: 'EXECUTION', ownerDept: 'PROJECTS',
    originRole: 'SUPERVISING_ENGINEER',
    approvalChain: ['SUPERVISING_ENGINEER'],
    description: 'تقرير دوري يتضمّن صور الموقع وتحديث المهام، يضاف لملف المشروع.',
  },
  {
    code: 'F-23', title: 'إخطار تغيير النطاق', titleEn: 'Scope Change Notice',
    category: 'EXECUTION', ownerDept: 'PROJECTS',
    originRole: 'SUPERVISING_ENGINEER',
    approvalChain: ['SUPERVISING_ENGINEER', 'PROJECTS_MANAGER'],
    description: 'يُستخدم عند تغيّر متطلبات المواد أثناء التنفيذ (إضافة أو إلغاء) ويعتمده مدير المشاريع.',
  },
  {
    code: 'F-15', title: 'طلب صرف دفعة', titleEn: 'Installment Disbursement Request',
    category: 'EXECUTION', ownerDept: 'PROJECTS',
    originRole: 'SUPERVISING_ENGINEER',
    approvalChain: ['SUPERVISING_ENGINEER', 'FINANCE_HEAD', 'EXEC_DIRECTOR'],
    bridgesTo: ['FINANCE', 'EXEC'],
    refKey: 'engineer_verification_ref',
    description: 'يصدره المهندس المشرف لإثبات نسبة الإنجاز. ينتقل لرئيس المالية ثم F-73 لاعتماد المدير التنفيذي.',
    triggers: ['F-73'],
  },

  /* 3. Supply Chain & Stock Ledger */
  {
    code: 'F-19', title: 'طلب شراء داخلي', titleEn: 'Internal Purchase Request',
    category: 'SUPPLY', ownerDept: 'SUPPORT',
    originRole: 'PROCUREMENT_OFFICER',
    approvalChain: ['PROCUREMENT_OFFICER', 'SUPPORT_MANAGER', 'FINANCE_HEAD'],
    bridgesTo: ['FINANCE'],
    refKey: 'TRM-PR-YYYY-NNNNN',
    description: 'يبدأه مسؤول المشتريات. يعتمد على مستوى القسم من مدير الخدمات المساندة، ثم لرئيس المالية لإجازة مالية.',
  },
  {
    code: 'F-20', title: 'خطة توريد المواد', titleEn: 'Material Supply Plan',
    category: 'SUPPLY', ownerDept: 'SUPPORT',
    originRole: 'PROJECTS_MANAGER',
    approvalChain: ['PROJECTS_MANAGER', 'SUPPORT_MANAGER'],
    refKey: 'supply_plan_ref',
    description: 'تُشتق من F-08 و F-13. القائمة الرئيسية للمواد المعتمدة التي يتابعها أمين المستودع ومسؤول المشتريات لمشروع محدد.',
  },
  {
    code: 'F-24', title: 'إشعار استلام بضاعة', titleEn: 'Goods Receipt Note',
    category: 'SUPPLY', ownerDept: 'SUPPORT',
    originRole: 'WAREHOUSE_CLERK',
    approvalChain: ['WAREHOUSE_CLERK', 'SUPPORT_MANAGER'],
    refKey: 'TRM-GRN-YYYY-NNNNN',
    description: 'يضيف صفّاً موجباً ثابتاً لسجل حركة المخزون (entity_stock_movement).',
  },
  {
    code: 'F-25', title: 'إشعار نقل مخزون', titleEn: 'Stock Transfer Note',
    category: 'SUPPLY', ownerDept: 'SUPPORT',
    originRole: 'WAREHOUSE_CLERK',
    approvalChain: ['WAREHOUSE_CLERK', 'SUPPORT_MANAGER'],
    refKey: 'transfer_ref',
    description: 'يسجّل حركة مواد داخلية. يضيف صفّاً سالباً للموقع المصدر وموجباً للموقع المستلِم.',
  },
  {
    code: 'F-87', title: 'بثّ نقص المواد (RFQ)', titleEn: 'Material Shortage Broadcast RFQ',
    category: 'SUPPLY', ownerDept: 'SUPPORT',
    originRole: 'PROCUREMENT_OFFICER',
    approvalChain: ['PROCUREMENT_OFFICER', 'SUPPORT_MANAGER'],
    refKey: 'TRM-SRFQ-YYYY-NNNNN',
    description: 'يُطلَق حين تنبّه عتبات التشغيل إلى انخفاض المخزون عن مستوى يفي بخطط F-20 القادمة.',
  },

  /* 4. IT Service & Governance */
  {
    code: 'F-64', title: 'تذكرة دعم فني', titleEn: 'Helpdesk Ticket',
    category: 'IT_GOV', ownerDept: 'IT',
    originRole: 'IT_HELPDESK', // أي مستخدم داخلي قادر على الإنشاء؛ والمسار للحلّ
    approvalChain: ['IT_HELPDESK', 'IT_MANAGER'],
    refKey: 'TRM-IT-YYYY-NNNNN',
    description: 'يمكن لأي مستخدم داخلي إنشاؤها. تُوجَّه لفني الدعم الفني للحل.',
  },
  {
    code: 'F-65', title: 'طلب جهاز / معدّة', titleEn: 'Device / Equipment Request',
    category: 'IT_GOV', ownerDept: 'IT',
    originRole: 'IT_MANAGER', // أي مستخدم داخلي
    approvalChain: ['IT_MANAGER'],
    refKey: 'request_ref',
    description: 'يُنشأ من أي مستخدم. يُرسل أولاً إلى مدير قسم الطالب للاعتماد المبدئي ثم لمدير تقنية المعلومات للتنفيذ.',
  },
  {
    code: 'F-66', title: 'طلب صلاحية / دخول نظام', titleEn: 'Software / System Access Request',
    category: 'IT_GOV', ownerDept: 'IT',
    originRole: 'IT_MANAGER',
    approvalChain: ['IT_MANAGER', 'DPO'],
    bridgesTo: ['GOVERNANCE'],
    refKey: 'request_ref',
    description: 'يُرسل لمدير تقنية المعلومات. إذا تضمّن النظام بيانات شخصية تحدد الدالة السحابية تلقائياً تحويله إلى مسؤول حماية البيانات.',
  },
  {
    code: 'F-53', title: 'طلب تعديل إجراء', titleEn: 'Procedure Amendment Request',
    category: 'IT_GOV', ownerDept: 'GOVERNANCE',
    originRole: ['EXEC_DIRECTOR', 'RESEARCH_MANAGER', 'PROJECTS_MANAGER', 'SUPPORT_MANAGER', 'IT_MANAGER', 'FINANCE_HEAD', 'MARKETING_OFFICER', 'PR_OFFICER'],
    approvalChain: ['IT_MANAGER', 'EXEC_DIRECTOR'],
    bridgesTo: ['IT', 'EXEC'],
    refKey: 'amendment_ref',
    description: 'مقترح رسمي لتعديل إجراء عمل قائم. يحوَّل لمدير تقنية المعلومات والمدير التنفيذي لمواءمة الأنظمة والسياسة.',
  },
  {
    code: 'F-52', title: 'طلب تغطية إعلامية', titleEn: 'Media Request',
    category: 'IT_GOV', ownerDept: 'COMMS',
    originRole: 'PR_OFFICER',
    approvalChain: ['PR_OFFICER'],
    refKey: 'request_ref',
    description: 'يتم إنشاؤه يدوياً من مدير قسم أو تلقائياً من F-07. يحوَّل مباشرة لمسؤول الإعلام لتنفيذ التغطية.',
  },
  {
    code: 'F-72', title: 'ملاحظة تدقيق جودة', titleEn: 'Quality Audit Finding',
    category: 'IT_GOV', ownerDept: 'GOVERNANCE',
    originRole: 'INTERNAL_AUDITOR',
    approvalChain: ['INTERNAL_AUDITOR'],
    refKey: 'finding_ref',
    description: 'يصدر حصراً عن المدقق الداخلي. يحوَّل مباشرة لرئيس الإدارة المعنية مع طلب إجراء تصحيحي موثّق.',
  },

  /* 5. The Executive Hub */
  {
    code: 'F-73', title: 'قرار اعتماد تنفيذي', titleEn: 'Executive Approval Decision',
    category: 'EXEC_HUB', ownerDept: 'EXEC',
    originRole: 'EXEC_DIRECTOR',
    approvalChain: ['EXEC_DIRECTOR'],
    refKey: 'decision_ref',
    description: 'صندوق وارد مركزي للمدير التنفيذي. يجمع تلقائياً النماذج الكبرى المعلّقة (F-03 الاستحقاق، F-84 الاستثناءات، F-15 الصرف، F-53 تعديل الإجراءات) لاعتمادها أو رفضها أو تأجيلها.',
  },
];

export const FORM_BY_CODE: Record<FormCode, FormDef> =
  FORMS.reduce((acc, f) => { acc[f.code] = f; return acc; }, {} as Record<FormCode, FormDef>);

export const formsByDepartment = (dept: DepartmentKey): FormDef[] =>
  FORMS.filter(f => f.ownerDept === dept || (f.bridgesTo || []).includes(dept));

export const formsForRole = (role: RoleKey): FormDef[] =>
  FORMS.filter(f => {
    const origins = Array.isArray(f.originRole) ? f.originRole : [f.originRole];
    return origins.includes(role) || f.approvalChain.includes(role);
  });

/* ──────────────────────────────────────────────────────────────────
   حالات النموذج (Form Status)
   ────────────────────────────────────────────────────────────────── */

export type FormStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'deferred' | 'completed';

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  draft: 'مسودة',
  pending: 'بانتظار الاعتماد',
  approved: 'معتمد',
  rejected: 'مرفوض',
  deferred: 'مؤجَّل',
  completed: 'مكتمل',
};

export const FORM_STATUS_COLORS: Record<FormStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  deferred: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

/* ──────────────────────────────────────────────────────────────────
   صلاحيات الإدارة (Portal Access)
   ────────────────────────────────────────────────────────────────── */

/** الإدارات التي يصلها الدور كحضور أساسي + جسوراً (read-only فيها بقدر ما يلزم) */
export const portalAccessForRole = (role: RoleKey): DepartmentKey[] => {
  const def = ROLE_BY_KEY[role];
  if (!def) return [];
  // المدير التنفيذي يرى جميع الإدارات
  if (role === 'EXEC_DIRECTOR' || role === 'BOARD_MEMBER') {
    return DEPARTMENTS.map(d => d.key);
  }
  // المدقق الداخلي يرى جميع الإدارات للتدقيق
  if (role === 'INTERNAL_AUDITOR') return DEPARTMENTS.map(d => d.key);
  // مدير النظام يرى جميع الإدارات للدعم
  if (role === 'SYSTEM_ADMIN') return DEPARTMENTS.map(d => d.key);
  // افتراضياً يرى الموظف بوابة قسمه فقط
  return [def.department];
};

/* ──────────────────────────────────────────────────────────────────
   حسابات إدارية (مساعدة بالوقت/التواريخ)
   ────────────────────────────────────────────────────────────────── */

export const REGION_LABELS: Record<string, string> = {
  'ALL': 'جميع المناطق', 'DAM': 'الدمام', 'KHB': 'الخبر',
  'RYD': 'الرياض', 'JED': 'جدة', 'MAK': 'مكة', 'MED': 'المدينة'
};

export const regionLabel = (r: string) => REGION_LABELS[r] || r;

export const formatRelativeTime = (date: Date | string) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const diffInSeconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);
  if (diffInSeconds < 0) return 'الآن';
  if (diffInSeconds < 60) return 'الآن';
  if (diffInSeconds < 3600) return `قبل ${Math.floor(diffInSeconds / 60)} دقيقة`;
  if (diffInSeconds < 86400) return `قبل ${Math.floor(diffInSeconds / 3600)} ساعة`;
  return `قبل ${Math.floor(diffInSeconds / 86400)} يوم`;
};

export const formatCurrency = (val: number | null | undefined) => {
  if (val === null || val === undefined) return '';
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ر.س';
};

export async function compressImage(file: File, maxWidth = 1280, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height;
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context failed')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ──────────────────────────────────────────────────────────────────
   قوائم منسدلة افتراضية (Editable Lists)
   ────────────────────────────────────────────────────────────────── */

export const DEFAULT_LISTS = {
  projectType: ['ترميم وتأثيث', 'صيانة', 'صيانة تكييف', 'صيانة كهرباء', 'استثماري'],
  referralChannel: ['جمعية شريكة', 'قنوات الاتصال', 'إحالة', 'أخرى'],
  evacuation: ['تم الإخلاء', 'قيد الإخلاء', 'لا يلزم إخلاء', 'غير محدد'],
  supplyMethod: ['شراء مباشر', 'عقد مع مورد', 'مستودع الجمعية'],
};

/* ──────────────────────────────────────────────────────────────────
   حقول النماذج التشغيلية (للحفاظ على ما هو موجود حالياً)
   سيُعاد تنظيمها لاحقاً مع تدقيق محتوى النماذج
   ────────────────────────────────────────────────────────────────── */

export const CIVIL_FIELDS = [
  { k: 'concrete', l: 'أعمال الخرسانة' }, { k: 'roof', l: 'أعمال الأسقف' }, { k: 'insulation', l: 'أعمال العزل' },
  { k: 'shinko', l: 'الشينكو والمعزولات' }, { k: 'ceramic', l: 'السيراميك والبلاط' }, { k: 'paint', l: 'الدهانات' },
  { k: 'plaster', l: 'المحارة والبياض' }, { k: 'wood', l: 'النجارة والأبواب' }, { k: 'aluminum', l: 'الألمنيوم والزجاج' },
  { k: 'steel', l: 'الحدادة' }
];

export const ELEC_FIELDS = [
  { k: 'panel', l: 'طبلون/لوحة توزيع' }, { k: 'ceilingLight', l: 'كشاف سقف' }, { k: 'concreteLight', l: 'سبوت الخرسانة' },
  { k: 'spotlight', l: 'سبوت موجه' }, { k: 'sockets', l: 'أفياش' }, { k: 'doubleSwitch', l: 'مفتاح مزدوج' },
  { k: 'acSwitch', l: 'مفتاح مكيف' }, { k: 'heaterSocket', l: 'فيش سخان' }
];

export const PLUMB_FIELDS = [
  { k: 'toiletFr', l: 'كرسي إفرنجي' }, { k: 'toiletAr', l: 'كرسي عربي' }, { k: 'heater', l: 'سخان مياه' },
  { k: 'bidet', l: 'شطاف' }, { k: 'showerMixer', l: 'خلاط دش' }, { k: 'sink', l: 'مغسلة' },
  { k: 'sinkMixer', l: 'خلاط مغسلة' }, { k: 'exhaust', l: 'شفاط' }
];

export const FURN_FIELDS = [
  { k: 'bed15', l: 'سرير نفر ونص' }, { k: 'mattress15', l: 'مرتبة نفر ونص' }, { k: 'bed1', l: 'سرير نفر' },
  { k: 'mattress1', l: 'مرتبة نفر' }, { k: 'bedDouble', l: 'سرير مزدوج' }, { k: 'mattressDouble', l: 'مرتبة مزدوج' },
  { k: 'carpet', l: 'سجاد/موكيت' }, { k: 'sofaSeats', l: 'كنب (مقاعد)' }, { k: 'sofaMeters', l: 'كنب (أمتار)' },
  { k: 'floorSeating', l: 'جلسة أرضية' }, { k: 'nightstand', l: 'كمدينة' }, { k: 'dresser', l: 'تسريحة' },
  { k: 'wardrobe2', l: 'دولاب (درفتين)' }, { k: 'wardrobe3', l: 'دولاب (3 درف)' }, { k: 'wardrobe4', l: 'دولاب (4 درف)' }
];

export const APP_FIELDS = [
  { k: 'acSplit1', l: 'مكيف سبليت 12' }, { k: 'acSplit15', l: 'مكيف سبليت 18' }, { k: 'acWindow15', l: 'مكيف شباك 18' },
  { k: 'washer', l: 'غسالة ملابس' }, { k: 'fridge', l: 'ثلاجة' }, { k: 'stove', l: 'طباخ/فرن' },
  { k: 'vacuum', l: 'مكنسة' }, { k: 'waterCooler', l: 'برادة مياه' }
];
