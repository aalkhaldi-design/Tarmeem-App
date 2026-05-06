export const TARMEEM_BRAND = {
  purple: '#4A1F66', purpleLight: '#6B3D87', purpleDark: '#3A1652',
  teal: '#56B894', tealLight: '#7AC8AD', tealDark: '#3F9B7A', cream: '#FFF8E7'
};

export const THEME = {
  shared: { fontFamily: 'sans-serif', radius: 'rounded-xl' },
  erp: {
    primary: TARMEEM_BRAND.purple, primaryLight: TARMEEM_BRAND.purpleLight, primaryDark: TARMEEM_BRAND.purpleDark,
    accent: TARMEEM_BRAND.teal, accentLight: TARMEEM_BRAND.tealLight,
    success: '#16a34a', warning: '#f59e0b', danger: '#dc2626'
  },
  field: {
    primary: '#6B21A8', primaryLight: '#8B5CF6', accent: '#14B8A6', accentLight: '#5EEAD4',
    success: '#0d9488', warning: '#d97706', danger: '#dc2626'
  },
  form: { headerBg: TARMEEM_BRAND.purple, labelBg: '#F2F2F2', inputBg: '#FFF2CC', alertBg: '#FFFF00' }
};

export const DEPT_COLORS: Record<string, string> = {
  'البحث': 'ring-teal-200 border-teal-500', 'المشاريع': 'ring-blue-200 border-blue-500',
  'المالية': 'ring-green-200 border-green-500', 'الاتصال': 'ring-purple-200 border-purple-500',
  'العقود': 'ring-amber-200 border-amber-500', 'تنمية الموارد': 'ring-indigo-200 border-indigo-500',
  'الشراكات': 'ring-pink-200 border-pink-500', 'المحاسبة': 'ring-emerald-200 border-emerald-500',
  'التطوع': 'ring-yellow-200 border-yellow-500', 'التصميم الداخلي': 'ring-rose-200 border-rose-500',
  'الإدارة التنفيذية': 'ring-slate-200 border-slate-500', 'الجميع': 'ring-gray-200 border-gray-500'
};

export const ROLES = [
  'Admin', 'المدير التنفيذي', 'مدير المشاريع', 'المهندس المشرف', 'مهندس التشخيص', 'الفني المساعد للتشخيص',
  'البحث الاجتماعي', 'المحاسب / المالية', 'العقود والمشتريات', 'الخدمات المساندة', 'الاتصال المؤسسي',
  'سكرتير فريق إتقان', 'لجنة الترسية', 'مسؤول التطوع', 'ممثل التصميم الداخلي'
];

export const STAGES_CONFIG = [
  { id: '1', type: 'num', name: 'توقيع اتفاقية', dept: 'الشراكات', duration: '5 أيام عمل', action: 'رفع مسودة الاتفاقية والاعتماد' },
  { id: '2', type: 'num', name: 'استقبال الحالة', dept: 'البحث', duration: '5 أيام عمل', action: 'تسجيل بيانات المستفيد الأولية' },
  { id: '3', type: 'num', name: 'اعتماد الاستحقاق', dept: 'الإدارة التنفيذية', duration: 'يومان عمل', action: 'الاعتماد النهائي لاستحقاق الخدمة' },
  { id: '4', type: 'num', name: 'طلب تشخيص منزل', dept: 'البحث', duration: '5 أيام عمل', action: 'تحويل الملف للميدان' },
  { id: '5', type: 'num', name: 'تشخيص المنزل', dept: 'المشاريع', duration: '5 أيام عمل', action: 'زيارة الموقع ورفع تقرير القابلية' },
  { id: '6', type: 'num', name: 'تكليف فريق المشروع', dept: 'المشاريع', duration: 'يوم عمل', action: 'إسناد المهام للمهندسين والتطوع والتصميم' },
  { id: '7', type: 'num', name: 'زيارة المقاولين وحصر الأثاث', dept: 'المشاريع', duration: 'يومان عمل', action: 'وقوف المقاولين، حصر الأثاث، وفرص التطوع' },
  { id: '8', type: 'num', name: 'اعتماد جدول الكميات', dept: 'المشاريع', duration: 'يومان عمل', action: 'اعتماد البنود النهائية' },
  { id: '9', type: 'num', name: 'توقيع اتفاقية الأسرة', dept: 'البحث', duration: '3 أيام عمل', action: 'توقيع الأسرة وإقرار الإخلاء' },
  { id: '10', type: 'num', name: 'استلام التسعيرات', dept: 'المحاسبة', duration: '5 أيام عمل', action: 'استقبال العروض من المقاولين' },
  { id: '11', type: 'num', name: 'فتح المظاريف والترسية', dept: 'المحاسبة', duration: 'يومان عمل', action: 'لجنة الترسية واختيار الفائز' },
  { id: '12', type: 'num', name: 'توقيع عقد المقاول', dept: 'المحاسبة', duration: '3 أيام عمل', action: 'اعتماد العقد' },
  { id: '13', type: 'num', name: 'صرف الدفعة الأولى', dept: 'المالية', duration: 'يوم عمل', action: 'اعتماد الدفعة 1 للمقاول' },
  { id: '14', type: 'num', name: 'استلام الخطة الزمنية', dept: 'المشاريع', duration: 'يومان عمل', action: 'اعتماد خطة المقاول' },
  { id: '15', type: 'num', name: 'خطة التوريد', dept: 'الخدمات المساندة', duration: '3 أيام عمل', action: 'تأمين المواد الأولية' },
  { id: '16', type: 'num', name: 'إخلاء المنزل', dept: 'البحث', duration: '10 أيام عمل', action: 'توفير السكن البديل ونقل الأسرة' },
  { id: '17', type: 'num', name: 'تسليم الموقع', dept: 'المشاريع', duration: '5 أيام عمل', action: 'تسليم المنزل للمقاول لبدء العمل' },
  { id: '18', type: 'num', name: 'توثيق مرحلة قبل', dept: 'الاتصال', duration: 'يومان عمل', action: 'تصوير المنزل قبل البدء' },
  { id: '19', type: 'num', name: 'أعمال الترميم', dept: 'المشاريع', duration: '5 أيام عمل', action: 'متابعة التنفيذ' },
  { id: '20', type: 'num', name: 'تقرير إنجاز 40%', dept: 'المشاريع', duration: 'حسب البنود', action: 'رفع تقرير الإنجاز الأول' },
  { id: '21', type: 'num', name: 'صرف الدفعة الثانية', dept: 'المالية', duration: 'يوم عمل', action: 'اعتماد دفعة 40%' },
  { id: '22', type: 'num', name: 'تقرير إنجاز 80%', dept: 'المشاريع', duration: 'حسب البنود', action: 'رفع تقرير الإنجاز الثاني' },
  { id: '23', type: 'num', name: 'صرف الدفعة الثالثة', dept: 'المالية', duration: 'يوم عمل', action: 'اعتماد دفعة 80%' },
  { id: '24', type: 'num', name: 'تأثيث وتجهيز', dept: 'الخدمات المساندة', duration: 'يوم عمل', action: 'توريد الأثاث' },
  { id: '25', type: 'num', name: 'تنظيف المنزل', dept: 'الخدمات المساندة', duration: 'يومان عمل', action: 'التنظيف النهائي' },
  { id: '26', type: 'num', name: 'لجنة إتقان', dept: 'سكرتير فريق إتقان', duration: '3 أيام عمل', action: 'الجولة التفتيشية للجودة' },
  { id: '27', type: 'num', name: 'الاستلام المبدئي', dept: 'المشاريع', duration: '3 أيام عمل', action: 'الاعتماد النهائي الفني' },
  { id: '28', type: 'num', name: 'تسليم المنزل', dept: 'البحث', duration: '5 أيام عمل', action: 'تسليم المفاتيح للأسرة' },
  { id: '29', type: 'num', name: 'توثيق مرحلة بعد', dept: 'الاتصال', duration: '7 أيام عمل', action: 'النشر الإعلامي الختامي' },
  { id: '30', type: 'num', name: 'المخالصة', dept: 'المشاريع', duration: 'يومان عمل', action: 'إنهاء متعلقات المقاول' },
  { id: '31', type: 'num', name: 'الدفعة النهائية', dept: 'المالية', duration: '3 أيام عمل', action: 'تصرف بعد 3 أشهر من التسليم' },
  { id: '32', type: 'num', name: 'قياس الأثر المستدام', dept: 'البحث', duration: 'مستمر', action: 'استبيان الرضا بعد 6 أشهر' },
  { id: '33', type: 'num', name: 'إغلاق المشروع', dept: 'الجميع', duration: 'مستمر', action: 'الأرشفة' }
];

export const REQUIRED_DOCS = [
  { code: 'بحث-01-01', name: 'استمارة دراسة الحالة الاجتماعية' }, { code: 'بحث-01-02', name: 'صك الملكية / عقد الإيجار' },
  { code: 'مشاريع-01-03', name: 'نموذج التشخيص الفني' }, { code: 'مشاريع-01-04', name: 'جدول الكميات المعتمد' },
  { code: 'محاسبة-01-05', name: 'عروض أسعار المقاولين (3)' }, { code: 'محاسبة-01-06', name: 'محضر الترسية' },
  { code: 'محاسبة-01-07', name: 'عقد المقاول الموقع' }, { code: 'مشاريع-01-08', name: 'الخطة الزمنية للمشروع' },
  { code: 'بحث-01-09', name: 'وثيقة اتفاقية الأسرة' }, { code: 'مشاريع-01-10', name: 'محضر تسليم الموقع للمقاول' },
  { code: 'مشاريع-01-11', name: 'تقرير إنجاز 40%' }, { code: 'مشاريع-01-12', name: 'تقرير إنجاز 80%' },
  { code: 'إتقان-01-13', name: 'تقرير فريق إتقان للجودة' }, { code: 'مشاريع-01-14', name: 'شهادة الاستلام المبدئي' },
  { code: 'بحث-01-15', name: 'محضر تسليم المنزل للأسرة' }, { code: 'مالية-01-16', name: 'مخالصة المقاول' },
  { code: 'اتصال-01-17', name: 'تقرير الأثر المرحلي' }, { code: 'بحث-01-18', name: 'استبيان رضا المستفيد' }
];

export const CIVIL_FIELDS = [
  { k: 'concrete', l: 'أعمال الخرسانة' }, { k: 'roof', l: 'أعمال الأسقف' }, { k: 'insulation', l: 'أعمال العزل' },
  { k: 'shinko', l: 'الشينكو والمعزولات' }, { k: 'ceramic', l: 'السيراميك والبلاط' }, { k: 'paint', l: 'الدهانات' },
  { k: 'plaster', l: 'المحارة والبياض' }, { k: 'wood', l: 'النجارة والأبواب' }, { k: 'aluminum', l: 'الألمنيوم والزجاج' },
  { k: 'steel', l: 'الحدادة' }
];

export const ELEC_FIELDS = [
  { k: 'panel', l: 'طبلون/لوحة توزيع' }, { k: 'ceilingLight', l: 'كشاف سقف' }, { k: 'concreteLight', l: 'سبوت الخرسانة' },
  { k: 'spotlight', l: 'سبوت موجه' }, { k: 'sockets', l: 'أفياش' }, { k: 'doubleSwitch', l: 'م مفتاح مزدوج' },
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

export const computeSlaStatus = (durationStr: string, enteredAtStr: string) => {
  if (!enteredAtStr) return { text: 'غير محدد', color: 'gray', ring: 'ring-gray-400' };
  if (durationStr.includes('مستمر') || durationStr.includes('حسب')) return { text: durationStr, color: 'blue', ring: 'ring-blue-400' };
  const daysAllowed = parseInt(durationStr.match(/\d+/)?.[0] || (durationStr.includes('يومان') ? '2' : '1'), 10);
  const diffDays = Math.floor((new Date().getTime() - new Date(enteredAtStr).getTime()) / (1000 * 60 * 60 * 24));
  const remaining = daysAllowed - diffDays;
  if (remaining < 0) return { text: `متأخر ${Math.abs(remaining)} يوم`, color: 'red', ring: 'ring-red-500 animate-pulse' };
  if (remaining === 0) return { text: 'اليوم الأخير', color: 'orange', ring: 'ring-orange-500' };
  return { text: `متبقي ${remaining} يوم`, color: 'green', ring: 'ring-green-500' };
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

export const ALL_DEPTS = [
  'المشاريع', 'البحث', 'المالية', 'العقود', 'الخدمات المساندة', 'الاتصال',
  'سكرتير فريق إتقان', 'Admin', 'الجميع', 'الإدارة التنفيذية', 'المحاسبة', 'التطوع', 'التصميم الداخلي'
];

export const DEFAULT_LISTS = {
  projectType: ['ترميم وتأثيث', 'صيانة', 'صيانة تكييف', 'صيانة كهرباء', 'استثماري'],
  referralChannel: ['جمعية شريكة', 'قنوات الاتصال', 'إحالة', 'أخرى'],
  evacuation: ['تم الإخلاء', 'قيد الإخلاء', 'لا يلزم إخلاء', 'غير محدد'],
  supplyMethod: ['شراء مباشر', 'عقد مع مورد', 'مستودع الجمعية']
};
