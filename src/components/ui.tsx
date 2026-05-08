import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Lock, Plus, CheckCircle2, AlertTriangle, FileText, DollarSign } from 'lucide-react';
import { THEME } from '../lib/data';

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
    const exitTimer = setTimeout(() => setExiting(true), 2700);
    const completeTimer = setTimeout(() => onComplete(), 3300);
    return () => { clearTimeout(exitTimer); clearTimeout(completeTimer); };
  }, [onComplete]);

  return (
    <div dir="ltr" className={`splash-overlay ${exiting ? 'exiting' : ''}`} style={{
      position: 'fixed', inset: 0, background: 'white', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center', gap: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <TarmeemLogo variant="icon" size={200} animated={true} />
      </div>
      <div className="splash-tagline" style={{ fontSize: 'clamp(16px, 3vw, 22px)', fontWeight: 700, color: '#4A1F66', fontFamily: 'Tajawal, sans-serif' }}>جمعية ترميم</div>
      <div className="splash-tagline-en" style={{ fontSize: 'clamp(11px, 2vw, 14px)', color: '#56B894', fontWeight: 500, letterSpacing: '0.15em', marginTop: '-8px' }}>RENEWING HOMES, RESTORING LIVES</div>
    </div>
  );
};

export const Card = ({ title, icon: Icon, children, className = '' }: {
  title: string; icon?: React.ElementType; children: React.ReactNode; className?: string;
}) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4 transition-all duration-300 print:shadow-none print:border-gray-200 print:mb-6 print:break-inside-avoid ${className}`}>
    <div className="bg-gradient-to-r from-[#4A1F66] to-[#6B3D87] px-4 py-2.5 flex items-center gap-2 text-white">
      {Icon && <Icon className="w-5 h-5 text-[#56B894] print:hidden" />}
      <h3 className="text-base font-bold">{title}</h3>
    </div>
    <div className="p-4 md:p-5">{children}</div>
  </div>
);

export const Input = ({ label, type = 'text', value, onChange, placeholder, className = '', readOnly = false }: {
  label: string; type?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; className?: string; readOnly?: boolean;
}) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label className="text-xs font-semibold text-gray-700">{label}</label>
    <input type={type} value={value || ''} onChange={onChange} readOnly={readOnly} placeholder={placeholder}
      className={`px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] transition-shadow ${readOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`} />
  </div>
);

export const TextArea = ({ label, value, onChange, placeholder, rows = 3, className = '' }: {
  label: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder?: string; rows?: number; className?: string;
}) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label className="text-xs font-semibold text-gray-700">{label}</label>
    <textarea value={value || ''} onChange={onChange} placeholder={placeholder} rows={rows}
      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1F66] transition-shadow bg-white resize-y" />
  </div>
);

export const NumberCounter = ({ label, value, onChange, className = '' }: {
  label: string; value?: number; onChange: (v: number) => void; className?: string;
}) => (
  <div className={`flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg print:border-none print:bg-transparent print:p-0 ${className}`}>
    <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{label}</span>
    <div className="flex items-center gap-3 print:gap-1">
      <button type="button" onClick={() => onChange(Math.max(0, (value || 0) - 1))} className="w-7 h-7 shrink-0 rounded-full bg-white border border-gray-300 text-gray-600 flex items-center justify-center font-bold shadow-sm hover:bg-gray-100 active:bg-gray-200 print:hidden">-</button>
      <span className="w-6 text-center font-bold text-sm">{value || 0}</span>
      <button type="button" onClick={() => onChange((value || 0) + 1)} className="w-7 h-7 shrink-0 rounded-full bg-purple-100 border border-purple-200 text-[#4A1F66] flex items-center justify-center font-bold shadow-sm hover:bg-purple-200 active:bg-purple-300 print:hidden">+</button>
    </div>
  </div>
);

export const DrawingCanvas = ({ onSave, onClear }: { onSave: (data: string) => void; onClear?: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
      for (let y = 0; y <= canvas.height; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
    }
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.strokeStyle = '#4A1F66'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y); ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y <= canvas.height; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
    onClear?.();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden touch-none bg-white">
        <canvas ref={canvasRef} width={800} height={600} className="w-full h-[300px] object-contain cursor-crosshair"
          onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
          onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
      </div>
      <div className="flex justify-between print:hidden">
        <button type="button" onClick={clearCanvas} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">مسح اللوحة</button>
        <button type="button" onClick={() => { if (canvasRef.current) onSave(canvasRef.current.toDataURL('image/png')); }} className="px-4 py-2 bg-[#56B894] hover:bg-[#3F9B7A] text-white rounded-lg text-sm font-bold">حفظ الرسمة</button>
      </div>
    </div>
  );
};

export const MandatoryGauge = ({ filled, total, size = 'sm' }: { filled: number; total: number; size?: 'sm' | 'lg' }) => {
  const pct = Math.round((filled / total) * 100) || 0;
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#f97316' : '#ef4444';
  const radius = size === 'sm' ? 12 : 24;
  const stroke = size === 'sm' ? 3 : 5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center group" title={`اكتملت ${filled} من ${total} حقول إلزامية`}>
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

export const FormField = ({ label, type = "text", reqType = "optional", options = [], placeholder, value, onChange, readOnly = false, helperText, triggerCond, stub = false }: {
  label: string; type?: string; reqType?: string; options?: string[]; placeholder?: string;
  value?: string; onChange?: (v: string) => void; readOnly?: boolean; helperText?: string;
  triggerCond?: string; stub?: boolean;
}) => {
  const [isFocused, setIsFocused] = useState(false);

  if (stub) return (
    <div className="flex border-b border-gray-100 last:border-0 opacity-50 bg-gray-50">
      <div className="w-1/3 p-3 flex flex-col justify-center border-l border-gray-200"><span className="text-xs text-gray-500">{label}</span></div>
      <div className="w-2/3 p-3 flex items-center"><span className="text-[10px] text-gray-400 italic">حقل مخصص (يتم ربطه لاحقاً)</span></div>
    </div>
  );

  let borderClass = 'border-l-4 border-white';
  if (!value && !isFocused) {
    if (reqType === 'mandatory') borderClass = 'border-l-4 border-red-500';
    if (reqType === 'conditional') borderClass = 'border-l-4 border-orange-500';
  }

  return (
    <div className="flex flex-col md:flex-row border-b border-gray-100 last:border-0 group">
      <div className="w-full md:w-1/3 p-3 flex flex-col justify-center border-l border-gray-100" style={{ backgroundColor: THEME.form.labelBg }}>
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          {reqType === 'mandatory' && <span className="text-red-500 font-bold">*</span>}
          {reqType === 'conditional' && (
            <div className="relative group/tooltip flex items-center">
              <span className="text-orange-500 font-bold cursor-help">*</span>
              <div className="absolute right-0 bottom-full mb-1 hidden group-hover/tooltip:block bg-gray-800 text-white text-[10px] p-2 rounded w-48 z-10 shadow-lg">
                هذا الحقل يصبح إلزامياً عندما: {triggerCond}
                <div className="absolute w-2 h-2 bg-gray-800 transform rotate-45 -bottom-1 right-2"></div>
              </div>
            </div>
          )}
        </div>
        {helperText && <span className="text-[10px] text-gray-500 mt-1">{helperText}</span>}
      </div>
      <div className="w-full md:w-2/3 p-3 flex items-center gap-3 bg-white">
        {readOnly ? (
          <div className="flex-1 p-2 text-sm bg-gray-50 text-gray-500 rounded border cursor-not-allowed">{value || <span className="opacity-50">للتعديل، تحتاج صلاحية مخصصة</span>}</div>
        ) : type === 'select' ? (
          <select value={value || ''} onChange={e => onChange?.(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
            className={`flex-1 p-2 rounded border text-sm outline-none transition ${borderClass}`}
            style={{ backgroundColor: isFocused ? THEME.form.inputBg : '#fff' }}>
            <option value="">اختر...</option>
            {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input type={type} value={value || ''} onChange={e => onChange?.(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
            placeholder={placeholder} className={`flex-1 p-2 rounded border text-sm outline-none transition ${borderClass}`}
            style={{ backgroundColor: isFocused ? THEME.form.inputBg : '#fff' }} />
        )}
      </div>
    </div>
  );
};

export const Sparkline = ({ values, color = '#E67A18' }: { values: number[]; color?: string }) => {
  const w = 50, h = 20;
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  return <svg width={w} height={h} className="opacity-70 mt-2"><polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
};

export const DonutChart = ({ segments, size = 160, label }: {
  segments: { label: string; value: number; color: string }[]; size?: number; label?: string;
}) => {
  const total = segments.reduce((a, s) => a + s.value, 0);
  let offset = 0; const r = (size - 24) / 2; const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="drop-shadow-sm">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F4F6" strokeWidth="14" />
        {segments.map((s, i) => {
          const portion = total ? (s.value / total) * c : 0;
          const dasharray = `${portion} ${c - portion}`;
          const dashoffset = -offset; offset += portion;
          return <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth="14"
            strokeDasharray={dasharray} strokeDashoffset={dashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-1000 ease-out" />;
        })}
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" className="font-bold text-2xl fill-[#1F4E79]">{total}</text>
      </svg>
      {label && <div className="text-xs font-bold text-gray-500 mt-2">{label}</div>}
      <div className="flex flex-wrap gap-3 mt-4 justify-center">
        {segments.map((s, i) => <div key={i} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: s.color }}></span><span className="text-[11px] font-bold text-gray-600">{s.label}: {s.value}</span></div>)}
      </div>
    </div>
  );
};

export const BarChart = ({ data, label }: { data: Record<string, number>; label?: string }) => {
  const entries = Object.entries(data || {});
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className="w-full">
      {label && <div className="text-xs font-bold text-gray-500 mb-3 text-center">{label}</div>}
      <div className="flex flex-col gap-2">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="text-xs text-gray-600 w-24 text-right shrink-0">{key}</div>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(val / max) * 100}%`, background: '#4A1F66' }} />
            </div>
            <div className="text-xs font-bold text-gray-700 w-6 shrink-0">{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AccessDeniedCard = () => (
  <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <Lock className="w-12 h-12 text-red-300 mb-4" />
    <h2 className="text-xl font-bold text-gray-700">صلاحيات غير كافية</h2>
  </div>
);

export const EventIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'assessment_submitted': return <UploadCloud className="w-4 h-4 text-blue-500" />;
    case 'payment_released': return <DollarSign className="w-4 h-4 text-green-500" />;
    case 'stage_late': return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'project_created': return <Plus className="w-4 h-4 text-orange-500" />;
    case 'document_uploaded': return <FileText className="w-4 h-4 text-purple-500" />;
    default: return <CheckCircle2 className="w-4 h-4 text-gray-500" />;
  }
};
