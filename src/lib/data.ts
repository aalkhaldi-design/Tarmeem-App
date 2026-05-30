/* ──────────────────────────────────────────────────────────────────
   ترميم — البنية الأساسية للبيانات
   9 إدارات | روابط الأدوار الكاملة | 14 نموذجاً للمسار السريع
   ────────────────────────────────────────────────────────────────── */

export const TARMEEM_BRAND = {
  purple: '#4A1F66', purpleLight: '#6B3D87', purpleDark: '#3A1652',
  teal: '#43bba1', tealLight: '#7AC8AD', tealDark: '#3F9B7A', cream: '#FFF8E7',
};

export const THEME = {
  primary: TARMEEM_BRAND.purple,
  primaryLight: TARMEEM_BRAND.purpleLight,
  primaryDark: TARMEEM_BRAND.purpleDark,
  accent: TARMEEM_BRAND.teal,
  accentLight: TARMEEM_BRAND.tealLight,
  success: '#16a34a', warning: '#f59e0b', danger: '#dc2626',
  form: { headerBg: TARMEEM_BRAND.purple, labelBg: '#F2F2F2', inputBg: '#FFF2CC', alertBg: '#FFFF00' },
};

/* ──────────────────────────────────────────────────────────────────
   الإدارات التسع (Departments)
   ────────────────────────────────────────────────────────────────── */

export type DepartmentKey =
  | 'EXEC'        // الإدارة التنفيذية والأمانة العامة
  | 'RESEARCH'    // البحث الاجتماعي
  | 'PROJECTS'    // إدارة المشاريع والترميم
  | 'FINANCE'     // المالية
  | 'SUPPORT'     // الخدمات المساندة
  | 'VOLUNTEER'   // التطوع
  | 'MARKETING'   // التسويق والاستدامة
  | 'PARTNERSHIP' // الشراكات
  | 'COMMS';      // الاتصال المؤسسي

export interface DepartmentDef {
  key: DepartmentKey;
  name: string; nameEn: string;
  shortName: string;
  color: string; accent: string;
  description: string;
}

export const DEPARTMENTS: DepartmentDef[] = [
  { key: 'EXEC',        name: 'الإدارة التنفيذية',                  shortName: 'تنفيذية', nameEn: 'Executive Management & Secretariate', color: '#4A1F66', accent: '#43bba1', description: 'القيادة التنفيذية، الأمانة العامة، والاعتمادات الكبرى.' },
  { key: 'RESEARCH',    name: 'البحث الاجتماعي',                   shortName: 'البحث',    nameEn: 'Social Research',                    color: '#0EA5E9', accent: '#0284C7', description: 'دراسة الحالات وتحديد الاستحقاق.' },
  { key: 'PROJECTS',    name: 'إدارة المشاريع',                     shortName: 'المشاريع', nameEn: 'Projects & Renovation',              color: '#7C3AED', accent: '#8B5CF6', description: 'التشخيص الهندسي، الإشراف والتنفيذ، ولجنة إتقان.' },
  { key: 'FINANCE',     name: 'الشؤون المالية',                    shortName: 'المالية',  nameEn: 'Finance',                            color: '#16A34A', accent: '#22C55E', description: 'الميزانية والصرف والمحاسبة.' },
  { key: 'SUPPORT',     name: 'الخدمات المساندة',                  shortName: 'الخدمات',  nameEn: 'Support Services',                   color: '#F97316', accent: '#FB923C', description: 'سلسلة التوريد والمشتريات والمستودعات.' },
  { key: 'VOLUNTEER',   name: 'التطوع - مركز سمايا',                shortName: 'التطوع',   nameEn: 'Volunteering / Samaya',              color: '#EA580C', accent: '#FB923C', description: 'إدارة التطوع وتنسيق الأعمال الإضافية.' },
  { key: 'MARKETING',   name: 'التسويق والاستدامة',                shortName: 'التسويق',  nameEn: 'Marketing & Sustainability',         color: '#DB2777', accent: '#EC4899', description: 'الحملات، الموارد، التسويق الرقمي.' },
  { key: 'PARTNERSHIP', name: 'الشراكات',                          shortName: 'الشراكات', nameEn: 'Partnerships',                       color: '#0891B2', accent: '#06B6D4', description: 'إدارة العلاقات مع الجهات الشريكة.' },
  { key: 'COMMS',       name: 'الاتصال المؤسسي',                   shortName: 'الاتصال',  nameEn: 'Corporate Communications',            color: '#9333EA', accent: '#A855F7', description: 'العلاقات العامة، الإعلام، التغطية.' },
];

export const DEPT_BY_KEY: Record<DepartmentKey, DepartmentDef> =
  DEPARTMENTS.reduce((acc, d) => { acc[d.key] = d; return acc; }, {} as Record<DepartmentKey, DepartmentDef>);

export const departmentName = (key: string) => DEPT_BY_KEY[key as DepartmentKey]?.name || key;

/* ──────────────────────────────────────────────────────────────────
   الأدوار (Roles) — العناوين العربية الرسمية كما وردت
   ────────────────────────────────────────────────────────────────── */

export type RoleKey =
  // 1. Executive Management & Secretariate
  | 'SECRETARY_GENERAL'      // الأمين العام
  | 'EXEC_DIRECTOR'           // المدير التنفيذي
  | 'BOARD_MEMBER'            // عضو مجلس الإدارة / اللجنة التوجيهية
  | 'EXEC_SECRETARY'          // السكرتير التنفيذي
  // 2. Social Research
  | 'RESEARCH_MANAGER'        // مدير البحث الاجتماعي
  | 'SOCIAL_RESEARCHER'       // باحث اجتماعي / باحثة
  | 'COMPLAINTS_OFFICER'      // مسؤولة الشكاوى
  // 3. Projects & Renovation
  | 'PROJECTS_MANAGER'        // مدير المشاريع
  | 'HEAD_DIAGNOSIS'          // رئيس قسم التشخيص
  | 'HEAD_SUPERVISION'        // رئيس قسم الإشراف
  | 'DIAGNOSIS_ENGINEER'      // المهندس المشرف / مهندس التشخيص
  | 'ITQAN_HEAD'              // رئيس لجنة إتقان
  | 'ITQAN_MEMBER'            // عضو لجنة إتقان
  // 4. Finance
  | 'FINANCE_HEAD'            // رئيسة الشؤون المالية / المدير المالي
  | 'ACCOUNTANT'              // محاسب
  // 5. Support Services
  | 'SUPPORT_MANAGER'         // مدير الخدمات المساندة
  | 'PROCUREMENT_OFFICER'     // مسؤول المشتريات
  | 'WAREHOUSE_CLERK'         // أمين المستودع
  // 6. Volunteering
  | 'VOLUNTEER_MANAGER'       // مدير التطوع / رئيس مركز سمايا
  // 7. Marketing & Sustainability
  | 'MARKETING_MANAGER'       // مدير الاستدامة والتسويق
  | 'DIGITAL_MARKETING'       // مسؤول التسويق الرقمي
  // 8. Partnerships
  | 'PARTNERSHIP_MANAGER'     // مدير/مسؤول الشراكات
  // 9. Corporate Communications
  | 'PR_OFFICER';             // مسؤول الإعلام / الاتصال المؤسسي

export interface RoleDef {
  key: RoleKey;
  name: string;     // العنوان الرسمي
  membershipTitle: string; // عنوان العضوية الكامل (e.g. عضو إدارة المشاريع: مدير المشاريع)
  nameEn: string;
  department: DepartmentKey;
  isManager?: boolean;  // مدير قسم — يحقّ له اعتماد طلبات داخل قسمه
  isExecutive?: boolean; // ضمن الإدارة التنفيذية
}

export const ROLES_DEF: RoleDef[] = [
  // 1. Executive
  { key: 'SECRETARY_GENERAL', name: 'الأمين العام',                    nameEn: 'Secretary General',          department: 'EXEC',        isExecutive: true,  isManager: true,  membershipTitle: 'عضو الإدارة التنفيذية: الأمين العام' },
  { key: 'EXEC_DIRECTOR',     name: 'المدير التنفيذي',                  nameEn: 'Executive Director',         department: 'EXEC',        isExecutive: true,  isManager: true,  membershipTitle: 'عضو الإدارة التنفيذية: المدير التنفيذي' },
  { key: 'BOARD_MEMBER',      name: 'عضو مجلس الإدارة / اللجنة التوجيهية', nameEn: 'Board / Steering Member',  department: 'EXEC',        isExecutive: true,  membershipTitle: 'عضو مجلس الإدارة / اللجنة التوجيهية' },
  { key: 'EXEC_SECRETARY',    name: 'السكرتير التنفيذي',                nameEn: 'Executive Secretary',        department: 'EXEC',        membershipTitle: 'عضو الإدارة التنفيذية: السكرتير التنفيذي' },
  // 2. Social Research
  { key: 'RESEARCH_MANAGER',  name: 'مدير البحث الاجتماعي',             nameEn: 'Social Research Manager',    department: 'RESEARCH',    isManager: true, membershipTitle: 'مدير البحث الاجتماعي' },
  { key: 'SOCIAL_RESEARCHER', name: 'باحث اجتماعي / باحثة',             nameEn: 'Social Researcher',          department: 'RESEARCH',    membershipTitle: 'عضو إدارة البحث الاجتماعي: باحث اجتماعي / باحثة' },
  { key: 'COMPLAINTS_OFFICER',name: 'مسؤولة الشكاوى',                   nameEn: 'Complaints Officer',         department: 'RESEARCH',    membershipTitle: 'عضو إدارة البحث الاجتماعي: مسؤولة الشكاوى' },
  // 3. Projects & Renovation
  { key: 'PROJECTS_MANAGER',  name: 'مدير المشاريع',                    nameEn: 'Projects Manager',           department: 'PROJECTS',    isManager: true, membershipTitle: 'عضو إدارة المشاريع: مدير المشاريع' },
  { key: 'HEAD_DIAGNOSIS',    name: 'رئيس قسم التشخيص',                  nameEn: 'Head of Diagnosis',          department: 'PROJECTS',    membershipTitle: 'عضو إدارة المشاريع: رئيس قسم التشخيص' },
  { key: 'HEAD_SUPERVISION',  name: 'رئيس قسم الإشراف',                  nameEn: 'Head of Supervision',        department: 'PROJECTS',    membershipTitle: 'عضو إدارة المشاريع: رئيس قسم الإشراف' },
  { key: 'DIAGNOSIS_ENGINEER',name: 'المهندس المشرف / مهندس التشخيص',     nameEn: 'Supervising / Diagnosis Engineer', department: 'PROJECTS', membershipTitle: 'عضو إدارة المشاريع: مهندس ومشرف التشخيص' },
  { key: 'ITQAN_HEAD',        name: 'رئيس لجنة إتقان',                  nameEn: 'Itqan Committee Head',       department: 'PROJECTS',    membershipTitle: 'عضو إدارة المشاريع: رئيس لجنة إتقان' },
  { key: 'ITQAN_MEMBER',      name: 'عضو لجنة إتقان',                   nameEn: 'Itqan Committee Member',     department: 'PROJECTS',    membershipTitle: 'عضو إدارة المشاريع: عضو لجنة إتقان' },
  // 4. Finance
  { key: 'FINANCE_HEAD',      name: 'رئيسة الشؤون المالية / المدير المالي', nameEn: 'Head of Finance',         department: 'FINANCE',     isManager: true, membershipTitle: 'عضو الشؤون المالية: رئيسة الشؤون المالية / المدير المالي' },
  { key: 'ACCOUNTANT',        name: 'محاسب',                            nameEn: 'Accountant',                 department: 'FINANCE',     membershipTitle: 'عضو الشؤون المالية: محاسب' },
  // 5. Support Services
  { key: 'SUPPORT_MANAGER',   name: 'مدير الخدمات المساندة',             nameEn: 'Support Services Manager',   department: 'SUPPORT',     isManager: true, membershipTitle: 'عضو الخدمات المساندة: مدير الخدمات المساندة' },
  { key: 'PROCUREMENT_OFFICER', name: 'مسؤول المشتريات',                nameEn: 'Procurement Officer',        department: 'SUPPORT',     membershipTitle: 'عضو الخدمات المساندة: مسؤول المشتريات' },
  { key: 'WAREHOUSE_CLERK',   name: 'أمين المستودع',                    nameEn: 'Warehouse Clerk',            department: 'SUPPORT',     membershipTitle: 'عضو الخدمات المساندة: أمين المستودع' },
  // 6. Volunteering
  { key: 'VOLUNTEER_MANAGER', name: 'مدير التطوع / رئيس مركز سمايا',    nameEn: 'Volunteering Manager',       department: 'VOLUNTEER',   isManager: true, membershipTitle: 'مدير التطوع - رئيس مركز سمايا' },
  // 7. Marketing & Sustainability
  { key: 'MARKETING_MANAGER', name: 'مدير الاستدامة والتسويق',           nameEn: 'Marketing & Sustainability Manager', department: 'MARKETING', isManager: true, membershipTitle: 'مدير التسويق والاستدامة' },
  { key: 'DIGITAL_MARKETING', name: 'مسؤول التسويق الرقمي',              nameEn: 'Digital Marketing Officer',  department: 'MARKETING',   membershipTitle: 'عضو إدارة التسويق: مسؤول التسويق الرقمي' },
  // 8. Partnerships
  { key: 'PARTNERSHIP_MANAGER', name: 'مدير/مسؤول الشراكات',             nameEn: 'Partnerships Manager',       department: 'PARTNERSHIP', isManager: true, membershipTitle: 'مدير/مسؤول الشراكات' },
  // 9. Corporate Communications
  { key: 'PR_OFFICER',        name: 'مسؤول الإعلام / الاتصال المؤسسي',    nameEn: 'PR / Media Officer',         department: 'COMMS',       isManager: true, membershipTitle: 'عضو الاتصال المؤسسي: مسؤول الإعلام' },
];

export const ROLE_BY_KEY: Record<RoleKey, RoleDef> =
  ROLES_DEF.reduce((acc, r) => { acc[r.key] = r; return acc; }, {} as Record<RoleKey, RoleDef>);

export const roleName = (key: string) => ROLE_BY_KEY[key as RoleKey]?.name || key;
export const roleMembershipTitle = (key: string) => ROLE_BY_KEY[key as RoleKey]?.membershipTitle || key;
export const roleDepartment = (key: string): DepartmentKey | null =>
  ROLE_BY_KEY[key as RoleKey]?.department || null;

/* ──────────────────────────────────────────────────────────────────
   البريد الإلكتروني للمسؤولين الافتراضيين (الأدمنز)
   ────────────────────────────────────────────────────────────────── */
// Admin status is determined by the isAdmin boolean flag on UserProfile, not by email.
// Seeding isAdmin on a specific account is a one-time Firestore write, not a runtime check.

/* ──────────────────────────────────────────────────────────────────
   النماذج (14 نموذجاً للمسار السريع)
   ────────────────────────────────────────────────────────────────── */

export type FormCode =
  | 'F-02' | 'F-03' | 'F-03.1' | 'F-03.2'
  | 'F-04' | 'F-08' | 'F-18' | 'F-22' | 'F-21' | 'F-20'
  | 'F-84' | 'F-85' | 'F-32' | 'F-33' | 'F-33.1' | 'F-35' | 'F-34'
  | 'F-19' | 'F-14' | 'F-23' | 'F-15' | 'F-15.1' | 'F-15.2'
  | 'F-07' | 'F-52';

export type FormStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'deferred' | 'completed' | 'declined';

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  draft: 'مسودة',
  pending: 'بانتظار الاعتماد',
  approved: 'معتمد',
  rejected: 'مرفوض',
  deferred: 'مؤجَّل',
  completed: 'مكتمل',
  declined: 'مرفوض نهائياً',
};

export const FORM_STATUS_COLORS: Record<FormStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  deferred: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-200 text-red-800',
};

export interface FormDef {
  code: FormCode;
  title: string;
  titleEn: string;
  category: 'BENEFICIARY' | 'EXECUTION' | 'SUPPLY' | 'COMMS' | 'PROJECT';
  ownerDept: DepartmentKey;
  /** أدوار يحقّ لها إنشاء النموذج */
  originRoles: RoleKey[];
  /** سلسلة الاعتماد بالترتيب — يبدأ من أول دور اعتماد بعد الإنشاء */
  approvalChain: RoleKey[];
  /** إدارات تستلم نسخة كجسر */
  bridgesTo?: DepartmentKey[];
  /** نماذج تنطلق تلقائياً عند الاعتماد */
  triggers?: FormCode[];
  /** المدة المتوقعة (بالأيام) لكل خطوة قبل تأخر SLA */
  slaDays?: number;
  description: string;
}

export const FORMS: FormDef[] = [
  /* F-02 */
  {
    code: 'F-02', title: 'استمارة البحث الاجتماعي', titleEn: 'Social Research Form',
    category: 'BENEFICIARY', ownerDept: 'RESEARCH',
    originRoles: ['SOCIAL_RESEARCHER'],
    approvalChain: ['SOCIAL_RESEARCHER', 'RESEARCH_MANAGER', 'EXEC_DIRECTOR', 'RESEARCH_MANAGER'],
    triggers: ['F-04'],
    slaDays: 5,
    description: 'يعبّئها الباحث الاجتماعي ميدانياً ثم تنتقل إلى مدير البحث الاجتماعي للمراجعة.',
  },
  /* F-03 — eligibility w/ EXEC review then back to RESEARCH_MANAGER for transfer */
  {
    code: 'F-03', title: 'اعتماد استحقاق الخدمة', titleEn: 'Eligibility Decision',
    category: 'BENEFICIARY', ownerDept: 'RESEARCH',
    originRoles: ['RESEARCH_MANAGER'],
    approvalChain: ['RESEARCH_MANAGER'],
    slaDays: 3,
    description: 'مدير البحث الاجتماعي يعتمد قرار الاستحقاق. يُطلق F-03.1 لاعتماد المدير التنفيذي.',
  },
  /* F-08 */
  {
    code: 'F-08', title: 'كراسة التشخيص', titleEn: 'Building Diagnosis Report',
    category: 'BENEFICIARY', ownerDept: 'PROJECTS',
    originRoles: ['DIAGNOSIS_ENGINEER'],
    approvalChain: ['DIAGNOSIS_ENGINEER'],
    triggers: ['F-20'],
    slaDays: 7,
    description: 'يعبّئها مهندس التشخيص ويقدّمها. عند التقديم تُفتح خطة التوريد والحصر وتعهد الإخلاء (F-18) ما لم يُحدَّد أن المبنى لا يحتاج إخلاء، وطلب السكن البديل الاختياري (F-22).',
  },
  /* F-18 */
  {
    code: 'F-18', title: 'تعهد إخلاء المنزل', titleEn: 'Evacuation Pledge',
    category: 'BENEFICIARY', ownerDept: 'RESEARCH',
    originRoles: ['SOCIAL_RESEARCHER', 'RESEARCH_MANAGER'],
    approvalChain: ['SOCIAL_RESEARCHER'],
    slaDays: 5,
    description: 'يدخل الموظف تواريخ الإخلاء ويرفع التعهد الموقّع.',
  },
  /* F-22 */
  {
    code: 'F-22', title: 'طلب توفير سكن بديل', titleEn: 'Alternative Housing Request',
    category: 'BENEFICIARY', ownerDept: 'RESEARCH',
    originRoles: ['SOCIAL_RESEARCHER'],
    approvalChain: ['SOCIAL_RESEARCHER'],
    bridgesTo: ['PARTNERSHIP'],
    slaDays: 3,
    description: 'يُفتح اختيارياً عند تقديم كراسة التشخيص. خطاب رسمي للجهة الشريكة لتأمين السكن البديل. تقديمه اختياري ولا يؤثر على سير العمل.',
  },
  /* F-21 */
  {
    code: 'F-21', title: 'حصر الأثاث والأجهزة والمواد', titleEn: 'Furniture, Appliances & Materials Inventory',
    category: 'BENEFICIARY', ownerDept: 'PROJECTS',
    originRoles: ['DIAGNOSIS_ENGINEER', 'ITQAN_HEAD', 'ITQAN_MEMBER'],
    approvalChain: ['DIAGNOSIS_ENGINEER'],
    bridgesTo: ['MARKETING', 'SUPPORT', 'FINANCE'],
    slaDays: 7,
    description: 'تُعبأ الكميات من F-08 ولجنة إتقان. يراجعها التسويق/المشاريع ثم تُرسل لسلسلة التوريد والمالية.',
  },
  /* F-20 */
  {
    code: 'F-20', title: 'خطة التوريد', titleEn: 'Material Supply Plan',
    category: 'SUPPLY', ownerDept: 'PROJECTS',
    originRoles: ['DIAGNOSIS_ENGINEER'],
    approvalChain: ['DIAGNOSIS_ENGINEER', 'SUPPORT_MANAGER'],
    bridgesTo: ['SUPPORT'],
    triggers: ['F-19'],
    slaDays: 5,
    description: 'المهندس المشرف يرصد المواد ➡️ الخدمات المساندة تُسند المورد والتواريخ.',
  },
  /* F-19 */
  {
    code: 'F-19', title: 'تعميد المقاول بالتوريد', titleEn: 'Contractor Supply Assignment',
    category: 'SUPPLY', ownerDept: 'SUPPORT',
    originRoles: ['PROCUREMENT_OFFICER'],
    approvalChain: ['PROCUREMENT_OFFICER'],
    bridgesTo: ['FINANCE', 'EXEC'],
    slaDays: 5,
    description: 'مسؤول المشتريات ➡️ مدير الخدمات المساندة ➡️ المالية ➡️ المدير التنفيذي.',
  },
  /* F-85 */
  {
    code: 'F-85', title: 'الترسية', titleEn: 'Pricing & Award Approval',
    category: 'EXECUTION', ownerDept: 'PROJECTS',
    originRoles: ['PROJECTS_MANAGER'],
    approvalChain: ['PROJECTS_MANAGER'],
    bridgesTo: ['FINANCE', 'EXEC'],
    triggers: ['F-14'],
    slaDays: 5,
    description: 'مدير المشاريع يدخل المقاولين والمتفائز ➡️ المالية ➡️ المدير التنفيذي. يفتح F-14 لتقارير الإشراف.',
  },
  /* F-14 */
  {
    code: 'F-14', title: 'تقرير الإشراف', titleEn: 'Supervision Report',
    category: 'EXECUTION', ownerDept: 'PROJECTS',
    originRoles: ['DIAGNOSIS_ENGINEER'],
    approvalChain: ['DIAGNOSIS_ENGINEER'],
    slaDays: 2,
    description: 'يُسجِّل المهندس التقدم الميداني. كل محطة (30/60/90/100%) تطلق F-15. تغيير النطاق يطلق F-23. عند 100% يُفتح F-07.',
  },
  /* F-23 */
  {
    code: 'F-23', title: 'تحديث بنود الأعمال', titleEn: 'Works Items Update',
    category: 'EXECUTION', ownerDept: 'PROJECTS',
    originRoles: ['DIAGNOSIS_ENGINEER', 'PROJECTS_MANAGER'],
    approvalChain: ['PROJECTS_MANAGER'],
    bridgesTo: ['VOLUNTEER', 'FINANCE', 'EXEC'],
    slaDays: 3,
    description: 'مدير المشاريع ➡️ مركز سمايا (التطوع) ➡️ المالية ➡️ المدير التنفيذي.',
  },
  /* F-15 */
  {
    code: 'F-15', title: 'طلب صرف دفعة', titleEn: 'Installment Disbursement Request',
    category: 'EXECUTION', ownerDept: 'FINANCE',
    originRoles: [],
    approvalChain: ['ACCOUNTANT', 'EXEC_DIRECTOR', 'ACCOUNTANT'],
    slaDays: 4,
    description: 'يُولَّد آلياً عند بلوغ نسب التقدم (60%/90%/100%) في F-14. محاسب ➡️ مدير تنفيذي ➡️ محاسب (تحويل).',
  },
  {
    code: 'F-15.1', title: 'طلب صرف مشتريات', titleEn: 'Purchase Disbursement Request',
    category: 'EXECUTION', ownerDept: 'SUPPORT',
    originRoles: [],
    approvalChain: ['SUPPORT_MANAGER', 'ACCOUNTANT', 'EXEC_DIRECTOR', 'ACCOUNTANT'],
    slaDays: 4,
    description: 'يُولَّد من F-34 لصرف المشتريات الداخلية. مدير الخدمات المساندة (مراجعة) ➡️ محاسب ➡️ مدير تنفيذي ➡️ محاسب (تحويل).',
  },
  {
    code: 'F-15.2', title: 'طلب صرف تعميد المقاول', titleEn: 'Contractor Assignment Disbursement',
    category: 'EXECUTION', ownerDept: 'FINANCE',
    originRoles: [],
    approvalChain: ['ACCOUNTANT', 'EXEC_DIRECTOR', 'ACCOUNTANT'],
    slaDays: 4,
    description: 'يُولَّد من F-19 لدفع تكاليف تعميد المقاول بالتوريد. محاسب ➡️ مدير تنفيذي ➡️ محاسب (تحويل).',
  },
  /* F-07 */
  {
    code: 'F-07', title: 'شهادة تسليم المنزل', titleEn: 'Home Handover Certificate',
    category: 'BENEFICIARY', ownerDept: 'RESEARCH',
    originRoles: ['RESEARCH_MANAGER'],
    approvalChain: ['RESEARCH_MANAGER'],
    slaDays: 2,
    description: 'مدير البحث الاجتماعي يرفع شهادة التسليم. تُغلق المشروع. عند mediaRequested=true يُطلق F-52.',
  },
  /* F-52 */
  {
    code: 'F-52', title: 'طلب تصوير وتوثيق', titleEn: 'Media Coverage Request',
    category: 'COMMS', ownerDept: 'COMMS',
    originRoles: ['PROJECTS_MANAGER', 'PR_OFFICER'],
    approvalChain: ['PR_OFFICER'],
    slaDays: 7,
    description: 'يطلبه فريق المشاريع ➡️ ينفّذه الاتصال المؤسسي ويرفع الروابط/المخرجات.',
  },
  /* F-03.1 */
  {
    code: 'F-03.1', title: 'اعتماد المدير التنفيذي', titleEn: 'Executive Director Approval',
    category: 'BENEFICIARY', ownerDept: 'EXEC',
    originRoles: ['EXEC_DIRECTOR'],
    approvalChain: ['EXEC_DIRECTOR'],
    bridgesTo: ['RESEARCH'],
    slaDays: 3,
    description: 'المدير التنفيذي يعتمد قرار استحقاق الخدمة. يُطلق F-03.2 للإحالة النهائية.',
  },
  /* F-03.2 */
  {
    code: 'F-03.2', title: 'الاعتماد النهائي للإحالة', titleEn: 'Final Transfer Approval',
    category: 'BENEFICIARY', ownerDept: 'RESEARCH',
    originRoles: ['RESEARCH_MANAGER'],
    approvalChain: ['RESEARCH_MANAGER'],
    bridgesTo: ['PROJECTS'],
    slaDays: 2,
    description: 'مدير البحث يُحيل المشروع رسمياً إلى إدارة المشاريع. يُطلق F-04 لتعيين مهندس التشخيص.',
  },
  /* F-04 */
  {
    code: 'F-04', title: 'تعيين مهندس التشخيص', titleEn: 'Assign Diagnosis Engineer',
    category: 'BENEFICIARY', ownerDept: 'PROJECTS',
    originRoles: ['HEAD_DIAGNOSIS'],
    approvalChain: ['HEAD_DIAGNOSIS'],
    slaDays: 2,
    description: 'رئيس قسم التشخيص يعيّن المهندس المختص. يُطلق F-08 (كراسة التشخيص) مسنداً للمهندس.',
  },
  /* F-32 */
  {
    code: 'F-32', title: 'تعيين المهندس المشرف', titleEn: 'Assign Supervising Engineer',
    category: 'EXECUTION', ownerDept: 'PROJECTS',
    originRoles: ['HEAD_SUPERVISION'],
    approvalChain: ['HEAD_SUPERVISION'],
    slaDays: 2,
    description: 'رئيس قسم الإشراف يعيّن المهندس المشرف. يُطلق F-33 (توثيق البدء) مسنداً للمشرف.',
  },
  /* F-33 */
  {
    code: 'F-33', title: 'توثيق البدء', titleEn: 'Start Documentation',
    category: 'EXECUTION', ownerDept: 'PROJECTS',
    originRoles: ['DIAGNOSIS_ENGINEER'],
    approvalChain: ['DIAGNOSIS_ENGINEER'],
    slaDays: 2,
    description: 'المهندس المشرف يوثّق بدء التنفيذ. يُطلق F-14 (أول تقرير إشراف) وF-19 وF-34.',
  },
  /* F-34 */
  {
    code: 'F-34', title: 'حصر التوريد الداخلي', titleEn: 'Internal Supply Inventory',
    category: 'EXECUTION', ownerDept: 'PROJECTS',
    originRoles: ['DIAGNOSIS_ENGINEER', 'HEAD_SUPERVISION'],
    approvalChain: ['DIAGNOSIS_ENGINEER'],
    slaDays: 3,
    description: 'يُولَّد آلياً من F-33 بنقل بيانات F-20. المهندس يوثّق إحالة حصر المواد للمقاول.',
  },
  /* F-84 */
  {
    code: 'F-84', title: 'تسعيرات المقاولين', titleEn: 'Contractor Pricing',
    category: 'EXECUTION', ownerDept: 'PROJECTS',
    originRoles: ['HEAD_DIAGNOSIS', 'DIAGNOSIS_ENGINEER'],
    approvalChain: ['DIAGNOSIS_ENGINEER'],
    slaDays: 4,
    description: 'المهندس يجمع عروض الأسعار من المقاولين. عند الاعتماد يُطلق F-85 لقرار الترسية.',
  },
  /* F-33.1 */
  {
    code: 'F-33.1', title: 'توقيع العقد', titleEn: 'Contract Signing',
    category: 'PROJECT', ownerDept: 'PROJECTS',
    originRoles: ['PROJECTS_MANAGER'],
    approvalChain: ['PROJECTS_MANAGER'],
    slaDays: 2,
    description: 'توقيع العقد بين الجمعية والمقاول الفائز.',
  },
  /* F-35 */
  {
    code: 'F-35', title: 'طلب صرف دفعة اولى', titleEn: 'First Payment Request (30%)',
    category: 'EXECUTION', ownerDept: 'FINANCE',
    originRoles: ['ACCOUNTANT'],
    approvalChain: ['ACCOUNTANT', 'EXEC_DIRECTOR', 'ACCOUNTANT'],
    slaDays: 4,
    description: 'يُطلق آلياً عند ترسية F-85. محاسب يُعدّ الدفعة الأولى ➡️ مدير تنفيذي ➡️ محاسب (تحويل).',
  },
];

export const FORM_BY_CODE: Record<FormCode, FormDef> =
  FORMS.reduce((acc, f) => { acc[f.code] = f; return acc; }, {} as Record<FormCode, FormDef>);

export const formsByDepartment = (dept: DepartmentKey): FormDef[] =>
  FORMS.filter(f => f.ownerDept === dept || (f.bridgesTo || []).includes(dept));

/* ──────────────────────────────────────────────────────────────────
   صلاحيات بوابات الإدارات (Portal Access)
   ────────────────────────────────────────────────────────────────── */

export const portalAccessForRole = (role: RoleKey): DepartmentKey[] => {
  const def = ROLE_BY_KEY[role];
  if (!def) return [];
  // الإدارة التنفيذية وأعضاء مجلس الإدارة يرون الجميع
  if (def.isExecutive) return DEPARTMENTS.map(d => d.key);
  // افتراضياً يرى الموظف بوابة قسمه
  return [def.department];
};

/* ──────────────────────────────────────────────────────────────────
   مساعدة: أرقام المشاريع المخصصة (TRM-YYYY-NNN)
   ────────────────────────────────────────────────────────────────── */

export const formatProjectId = (year: number, serial: number) =>
  `TRM-${year}-${String(serial).padStart(3, '0')}`;

/* ──────────────────────────────────────────────────────────────────
   Helpers (Time / Currency / Region)
   ────────────────────────────────────────────────────────────────── */

export const REGION_LABELS: Record<string, string> = {
  'ALL': 'جميع المناطق', 'DAM': 'الدمام', 'KHB': 'الخبر', 'AHS': 'الأحساء',
  'JBL': 'الجبيل', 'QTF': 'القطيف', 'RYD': 'الرياض', 'JED': 'جدة', 'MAK': 'مكة', 'MED': 'المدينة',
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

// slaStatus lives in src/lib/sla.ts (Decision 4 — Saudi business-day calculator).
// Re-exported here so existing callers (Forms.tsx, etc.) need no import-path change.
export { slaStatus } from './sla';
export type { SlaStatus, SlaTone } from './sla';

/* ──────────────────────────────────────────────────────────────────
   قوائم منسدلة افتراضية
   ────────────────────────────────────────────────────────────────── */

export const DEFAULT_LISTS = {
  cities: [
    'الدمام', 'الخبر', 'الأحساء', 'الجبيل', 'بقيق', 'حفر الباطن', 'الخفجي',
    'القطيف', 'الظهران', 'رأس تنورة', 'صفوى', 'سيهات', 'النعيرية', 'الرياض',
    'جدة', 'مكة', 'المدينة', 'أخرى',
  ],
  housings: [
    'ملك للمستفيد/ـة', 'ملك للزوج/ة', 'ملك للزوج/ة (المتوفى/ة)', 'ملك للأب/الأم',
    'ملك للأب/الأم (متوفى/ة)', 'ملك للأبن/الابنة', 'ملك للأبن/الابنة (متوفى/ة)',
    'ملك أقارب درجة أولى/ورثة', 'ملك أقارب درجة ثانية/ثالثة', 'إيجار', 'سكن خيري',
  ],
  needs: ['رش', 'تنظيف', 'ترميم كلي', 'ترميم جزئي'],
  housingTypes: ['شعبي قديم', 'فلة', 'دور', 'شقة'],
  socialStatus: ['متزوج/ة', 'مطلق/ة', 'أرمل/ة', 'أعزب/عزباء', 'مهجورة'],
  educationLevels: ['لا يوجد تعليم', 'ابتدائية', 'متوسطه', 'ثانوية العامة', 'دبلوم', 'بكالوريوس', 'ماجستير', 'دكتوراه'],
  furnitureCondition: ['جيد', 'سيئ', 'يحتاج صيانة', 'يحتاج إضافة'],
};

/* SaudiRiyalGlassIcon lives in ./icons.tsx (JSX requires .tsx file extension).
   Re-exported here so existing callers `from '../../lib/data'` keep working. */
export { SaudiRiyalGlassIcon } from './icons';
