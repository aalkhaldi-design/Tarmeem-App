import React, { useState, useEffect } from 'react';
import {
  UploadCloud, Lock, Plus, CheckCircle2, AlertTriangle, FileText, DollarSign, X,
  Sun, Moon, Search, ChevronDown,
} from 'lucide-react';
import { THEME } from '../lib/data';

/* ──────────────────────────────────────────────────────────────────
   Dark Mode Context
   ────────────────────────────────────────────────────────────────── */

type Theme = 'light' | 'dark';
interface ThemeCtxValue { theme: Theme; toggle: () => void; }
export const ThemeContext = React.createContext<ThemeCtxValue>({ theme: 'light', toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('tarmeem_theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    localStorage.setItem('tarmeem_theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme(t => t === 'light' ? 'dark' : 'light') }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return React.useContext(ThemeContext); }

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
      className={`p-1.5 rounded-lg transition-colors hover:bg-white/15 text-white ${className}`}>
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Tarmeem Logo & Splash (UNCHANGED — branded motion preserved)
   ────────────────────────────────────────────────────────────────── */

export const TarmeemLogo = ({ variant = 'icon', size = 32, color = 'auto', className = '', animated = false }: {
  variant?: 'icon' | 'horizontal' | 'stacked'; size?: number; color?: string; className?: string; animated?: boolean;
}) => {
  const purple = color === 'white' ? '#FFFFFF' : color === 'mono-teal' ? '#56B894' : '#4A1F66';
  const teal = color === 'white' ? '#FFFFFF' : color === 'mono-purple' ? '#4A1F66' : '#56B894';
  const brickClass = animated ? 'brick' : '';
  const diamondClass = animated ? 'diamond' : '';

  const Mark = () => (
    <svg viewBox="0 0 200 175" width={size * 1.14} height={size} className={className} aria-label="Tarmeem">
      <rect className={diamondClass} data-i="1" x="65" y="5" width="32" height="32" rx="3" fill={purple} transform="rotate(45 81 21)" />
      <rect className={diamondClass} data-i="2" x="103" y="5" width="32" height="32" rx="3" fill={purple} transform="rotate(45 119 21)" />
      <rect className={brickClass} data-i="8" x="10" y="65" width="28" height="26" rx="3" fill={purple} />
      <rect className={brickClass} data-i="9" x="44" y="65" width="34" height="26" rx="3" fill={teal} />
      <rect className={brickClass} data-i="10" x="84" y="65" width="32" height="26" rx="3" fill={teal} />
      <rect className={brickClass} data-i="11" x="122" y="65" width="32" height="26" rx="3" fill={teal} />
      <rect className={brickClass} data-i="12" x="160" y="65" width="30" height="26" rx="3" fill={purple} />
      <rect className={brickClass} data-i="5" x="10" y="97" width="34" height="26" rx="3" fill={purple} />
      <rect className={brickClass} data-i="6" x="50" y="97" width="100" height="26" rx="3" fill={teal} />
      <rect className={brickClass} data-i="7" x="156" y="97" width="34" height="26" rx="3" fill={purple} />
      <rect className={brickClass} data-i="1" x="10" y="129" width="32" height="26" rx="3" fill={teal} />
      <rect className={brickClass} data-i="2" x="48" y="129" width="46" height="26" rx="3" fill={purple} />
      <rect className={brickClass} data-i="3" x="100" y="129" width="60" height="26" rx="3" fill={purple} />
      <rect className={brickClass} data-i="4" x="166" y="129" width="24" height="26" rx="3" fill={teal} />
    </svg>
  );

  const Wordmark = () => (
    <div className="flex flex-col items-start leading-none" dir="rtl">
      <span className="font-bold text-[1.1em]" style={{ color: purple, fontFamily: 'Tajawal, sans-serif' }}>ترميم</span>
      <span className="text-[0.7em] tracking-wide" style={{ color: purple, fontFamily: 'Tajawal, sans-serif', marginTop: '0.1em' }}>Tarmeem</span>
    </div>
  );

  if (variant === 'icon') return <Mark />;
  if (variant === 'horizontal') return <div className="flex items-center gap-2"><Mark /><Wordmark /></div>;
  if (variant === 'stacked') return <div className="flex flex-col items-center gap-2"><Mark /><Wordmark /></div>;
  return <Mark />;
};

export const TarmeemSplash = ({ onComplete }: { onComplete: () => void }) => {
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 1700);
    const completeTimer = setTimeout(() => onComplete(), 2300);
    return () => { clearTimeout(exitTimer); clearTimeout(completeTimer); };
  }, [onComplete]);

  return (
    <div dir="ltr"
      className={`splash-overlay bg-white dark:bg-slate-950 ${exiting ? 'exiting' : ''}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center', gap: '24px',
      }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <TarmeemLogo variant="icon" size={200} animated={true} />
      </div>
      <div className="splash-tagline" style={{ fontSize: 'clamp(16px, 3vw, 22px)', fontWeight: 700, color: '#4A1F66', fontFamily: 'Tajawal, sans-serif' }}>جمعية ترميم</div>
      <div className="splash-tagline-en" style={{ fontSize: 'clamp(11px, 2vw, 14px)', color: '#56B894', fontWeight: 500, letterSpacing: '0.15em', marginTop: '-8px' }}>RENEWING HOMES, RESTORING LIVES</div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   Surface primitives (Card, Section, Pill) — dark-mode aware
   ────────────────────────────────────────────────────────────────── */

export const Card = ({
  title, icon: Icon, children, className = '', accent = 'purple',
}: {
  title?: string; icon?: React.ElementType; children: React.ReactNode; className?: string;
  accent?: 'purple' | 'teal' | 'gradient';
}) => {
  const headerClass =
    accent === 'teal' ? 'bg-gradient-to-l from-[#3F9B7A] to-[#56B894]' :
    accent === 'gradient' ? 'bg-gradient-to-l from-[#4A1F66] via-[#6B3D87] to-[#56B894]' :
    'bg-gradient-to-l from-[#4A1F66] to-[#6B3D87]';
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden mb-4 print:shadow-none ${className}`}>
      {title && (
        <div className={`${headerClass} px-4 py-2.5 flex items-center gap-2 text-white`}>
          {Icon && <Icon className="w-5 h-5 text-[#56B894]" />}
          <h3 className="text-base font-bold">{title}</h3>
        </div>
      )}
      <div className="p-4 md:p-5 text-gray-800 dark:text-slate-100">{children}</div>
    </div>
  );
};

export const Pill = ({ tone = 'gray', children, className = '' }: {
  tone?: 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'teal'; children: React.ReactNode; className?: string;
}) => {
  const map: Record<string, string> = {
    gray:   'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200',
    green:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
    amber:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    red:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
    teal:   'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${map[tone]} ${className}`}>{children}</span>;
};

/* ──────────────────────────────────────────────────────────────────
   Form Inputs (Input, Select, TextArea, NumberCounter)
   ────────────────────────────────────────────────────────────────── */

export const Input = ({
  label, type = 'text', value, onChange, placeholder, className = '', readOnly = false, required = false, dir,
}: {
  label?: React.ReactNode; type?: string; value?: string | number; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; className?: string; readOnly?: boolean; required?: boolean; dir?: 'ltr' | 'rtl';
}) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && (
      <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <input
      type={type} value={value === undefined || value === null ? '' : value as any}
      onChange={onChange} readOnly={readOnly} placeholder={placeholder} dir={dir}
      className={`px-3 py-2 border rounded-lg text-sm outline-none transition
        border-gray-300 dark:border-slate-600
        focus:ring-2 focus:ring-[#56B894] focus:border-[#56B894]
        ${readOnly ? 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
          : 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100'}`}
    />
  </div>
);

export const Select = ({
  label, value, onChange, options, placeholder = 'اختر...', className = '', required = false, readOnly = false,
}: {
  label?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[] | string[];
  placeholder?: string; className?: string; required?: boolean; readOnly?: boolean;
}) => {
  const opts = options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <select value={value || ''} onChange={onChange} disabled={readOnly}
          className={`w-full appearance-none px-3 py-2 pl-8 border rounded-lg text-sm outline-none transition
            border-gray-300 dark:border-slate-600
            focus:ring-2 focus:ring-[#56B894] focus:border-[#56B894]
            ${readOnly ? 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
              : 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100'}`}>
          <option value="">{placeholder}</option>
          {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
};

export const TextArea = ({
  label, value, onChange, placeholder, rows = 3, className = '', required = false, readOnly = false,
}: {
  label?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; rows?: number; className?: string; required?: boolean; readOnly?: boolean;
}) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && (
      <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <textarea value={value || ''} onChange={onChange} placeholder={placeholder} rows={rows} readOnly={readOnly}
      className={`px-3 py-2 border rounded-lg text-sm outline-none transition resize-y
        border-gray-300 dark:border-slate-600
        focus:ring-2 focus:ring-[#56B894] focus:border-[#56B894]
        ${readOnly ? 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
          : 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100'}`} />
  </div>
);

export const ReadOnlyField = ({ label, value, className = '' }: { label: string; value?: any; className?: string }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">{label}</label>
    <div className="px-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 min-h-[36px]">
      {value || <span className="text-gray-300 italic">—</span>}
    </div>
  </div>
);

export const NumberCounter = ({ label, value, onChange, min = 0, className = '' }: {
  label?: string; value?: number; onChange: (v: number) => void; min?: number; className?: string;
}) => (
  <div className={`flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg ${className}`}>
    {label && <span className="text-xs font-semibold text-gray-700 dark:text-slate-200 flex-1 truncate">{label}</span>}
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(Math.max(min, (value || 0) - 1))}
        className="w-7 h-7 rounded-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 flex items-center justify-center font-bold shadow-sm hover:bg-gray-100 dark:hover:bg-slate-800">-</button>
      <span className="w-6 text-center font-bold text-sm">{value || 0}</span>
      <button type="button" onClick={() => onChange((value || 0) + 1)}
        className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/50 border border-purple-200 dark:border-purple-700 text-[#4A1F66] dark:text-purple-200 flex items-center justify-center font-bold shadow-sm hover:bg-purple-200">+</button>
    </div>
  </div>
);

/* ──────────────────────────────────────────────────────────────────
   File Uploader (basic — Firebase Storage upload handled by parent)
   ────────────────────────────────────────────────────────────────── */

export const FileUploader = ({
  files, onAdd, onRemove, label = 'إرفاق ملفات', accept,
}: {
  files: { name: string; url?: string; size?: number; uploadedAt?: string }[];
  onAdd: (fileList: FileList) => void;
  onRemove: (idx: number) => void;
  label?: string;
  accept?: string;
}) => (
  <div className="space-y-3">
    <div className="border-2 border-dashed border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-5 text-center">
      <UploadCloud className="w-9 h-9 text-purple-500 mx-auto mb-2" />
      <p className="text-sm font-bold text-purple-900 dark:text-purple-200 mb-2">{label}</p>
      <label className="inline-block cursor-pointer bg-[#4A1F66] text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-[#3A1652] transition">
        تصفّح الملفات
        <input type="file" multiple accept={accept} className="hidden" onChange={e => e.target.files && onAdd(e.target.files)} />
      </label>
    </div>
    {files.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {files.map((f, i) => (
          <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-xs">
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="truncate font-semibold text-gray-700 dark:text-slate-200 hover:text-[#4A1F66]">
              <FileText className="w-4 h-4 inline ml-1 text-purple-500" />
              {f.name}
            </a>
            <button onClick={() => onRemove(i)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded"><X size={14} /></button>
          </div>
        ))}
      </div>
    )}
  </div>
);

/* ──────────────────────────────────────────────────────────────────
   Mandatory progress, charts (kept for dashboard reuse)
   ────────────────────────────────────────────────────────────────── */

export const MandatoryGauge = ({ filled, total, size = 'sm' }: { filled: number; total: number; size?: 'sm' | 'lg' }) => {
  const pct = Math.round((filled / total) * 100) || 0;
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#f97316' : '#ef4444';
  const radius = size === 'sm' ? 12 : 24;
  const stroke = size === 'sm' ? 3 : 5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (pct / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2}>
        <circle stroke="#e5e7eb" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
        <circle stroke={color} fill="transparent" strokeWidth={stroke} strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease 0s' }} r={normalizedRadius} cx={radius} cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`} />
      </svg>
      {size !== 'sm' && <span className="absolute text-xs font-bold" style={{ color }}>{pct}%</span>}
    </div>
  );
};

export const Sparkline = ({ values, color = '#56B894' }: { values: number[]; color?: string }) => {
  const w = 80, h = 24;
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  return <svg width={w} height={h} className="opacity-80"><polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
};

export const DonutChart = ({ segments, size = 160, label }: {
  segments: { label: string; value: number; color: string }[]; size?: number; label?: string;
}) => {
  const total = segments.reduce((a, s) => a + s.value, 0);
  let offset = 0; const r = (size - 24) / 2; const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F4F6" strokeWidth="14" />
        {segments.map((s, i) => {
          const portion = total ? (s.value / total) * c : 0;
          const dasharray = `${portion} ${c - portion}`;
          const dashoffset = -offset; offset += portion;
          return <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth="14"
            strokeDasharray={dasharray} strokeDashoffset={dashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-1000 ease-out" />;
        })}
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" className="font-bold text-2xl fill-[#4A1F66] dark:fill-purple-300">{total}</text>
      </svg>
      {label && <div className="text-xs font-bold text-gray-500 dark:text-slate-400 mt-2">{label}</div>}
      <div className="flex flex-wrap gap-3 mt-4 justify-center">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: s.color }}></span>
            <span className="text-[11px] font-bold text-gray-600 dark:text-slate-300">{s.label}: {s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const BarChart = ({ data, label }: { data: Record<string, number>; label?: string }) => {
  const entries = Object.entries(data || {});
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className="w-full">
      {label && <div className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-3 text-center">{label}</div>}
      <div className="flex flex-col gap-2">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="text-xs text-gray-600 dark:text-slate-300 w-24 text-right shrink-0">{key}</div>
            <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(val / max) * 100}%`, background: '#4A1F66' }} />
            </div>
            <div className="text-xs font-bold text-gray-700 dark:text-slate-200 w-6 shrink-0">{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ProgressBar = ({ value, total = 100, label }: { value: number; total?: number; label?: string }) => {
  const pct = Math.min(Math.max(Math.round((value / total) * 100) || 0, 0), 100);
  return (
    <div className="w-full">
      {label && <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-slate-300 mb-1"><span>{label}</span><span className="font-bold">{pct}%</span></div>}
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-l from-[#4A1F66] to-[#56B894] transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   Misc
   ────────────────────────────────────────────────────────────────── */

export const AccessDeniedCard = () => (
  <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
    <Lock className="w-12 h-12 text-red-300 mb-4" />
    <h2 className="text-xl font-bold text-gray-700 dark:text-slate-200">صلاحيات غير كافية</h2>
    <p className="text-xs text-gray-400 mt-1">تواصل مع مدير النظام لمنحك الصلاحية المناسبة.</p>
  </div>
);

export const EmptyState = ({ icon: Icon = FileText, title, hint }: { icon?: React.ElementType; title: string; hint?: string }) => (
  <div className="text-center py-10 text-gray-400 dark:text-slate-500">
    <Icon className="w-10 h-10 mx-auto mb-2 opacity-40" />
    <p className="text-sm font-semibold">{title}</p>
    {hint && <p className="text-[11px] mt-1">{hint}</p>}
  </div>
);

export const SearchBar = ({ value, onChange, placeholder = 'بحث...' }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) => (
  <div className="relative">
    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full pr-9 pl-3 py-2 border rounded-lg text-sm outline-none transition
        border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100
        focus:ring-2 focus:ring-[#56B894] focus:border-[#56B894]" />
  </div>
);

/* ──────────────────────────────────────────────────────────────────
   Reusable: Icons that decorate event types
   ────────────────────────────────────────────────────────────────── */

export const EventIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'form_pending': return <UploadCloud className="w-4 h-4 text-blue-500" />;
    case 'form_approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'form_rejected': return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'payment_released': return <DollarSign className="w-4 h-4 text-green-500" />;
    case 'project_created': return <Plus className="w-4 h-4 text-orange-500" />;
    case 'document_uploaded': return <FileText className="w-4 h-4 text-purple-500" />;
    default: return <CheckCircle2 className="w-4 h-4 text-gray-500" />;
  }
};

/* Note: THEME re-export to satisfy any legacy imports */
export const __THEME_REF = THEME;
