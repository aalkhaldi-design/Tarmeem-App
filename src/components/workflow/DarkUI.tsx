/* ──────────────────────────────────────────────────────────────────
   Shared dark-theme primitives — extracted verbatim from the user's
   provided Phase 1-5 React codes. Used by every form inside the
   WorkflowDetailBody. DO NOT alter Tailwind classes.
   ────────────────────────────────────────────────────────────────── */

import React from 'react';

export const DarkCard = ({ title, icon: Icon, children, className = '' }: any) => (
  <div className={`bg-[#0c0c0c] rounded-xl border border-gray-800 overflow-hidden mb-6 shadow-sm transition-all duration-300 ${className}`}>
    <div className="bg-gradient-to-r from-[#1a0f2e] to-[#130a1c] border-b border-[#2c1545] px-4 py-3 flex items-center gap-2">
      {Icon && <Icon className="w-5 h-5 text-[#43bba1]" />}
      <h3 className="text-sm font-bold text-white">{title}</h3>
    </div>
    <div className="p-4 md:p-5">{children}</div>
  </div>
);

export const DarkInput = ({ label, type = 'text', value, onChange, placeholder, className = '', required = false, disabled = false, readOnly = false, min, max, maxLength }: any) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-xs font-semibold text-gray-400">{label} {required && <span className="text-[#a871f7]">*</span>}</label>
    <input disabled={disabled} readOnly={readOnly} type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder} min={min} max={max} maxLength={maxLength} className={`px-3 py-2 text-sm rounded-lg border focus:outline-none transition-colors ${readOnly || disabled ? 'bg-[#111] border-gray-800 text-gray-500 cursor-not-allowed' : 'border-gray-800 focus:border-[#43bba1] focus:ring-1 focus:ring-[#43bba1]/20 text-gray-200 bg-[#050505]'}`} />
  </div>
);

export const DarkSelect = ({ label, value, onChange, options, className = '', required = false, disabled = false }: any) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-xs font-semibold text-gray-400">{label} {required && <span className="text-[#a871f7]">*</span>}</label>
    <select disabled={disabled} value={value ?? ''} onChange={onChange} className="px-3 py-2 text-sm rounded-lg border border-gray-800 focus:border-[#43bba1] focus:ring-1 focus:ring-[#43bba1]/20 outline-none text-gray-200 bg-[#050505] disabled:opacity-50 transition-colors">
      <option value="">اختر...</option>
      {(options || []).map((opt: string | { id: number | string; name: string }) => (
        typeof opt === 'string'
          ? <option key={opt} value={opt}>{opt}</option>
          : <option key={opt.id} value={opt.id}>{opt.name}</option>
      ))}
    </select>
  </div>
);

export const DarkTextArea = ({ label, value, onChange, placeholder, rows = 2, className = '', required = false, disabled = false }: any) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-xs font-semibold text-gray-400">{label} {required && <span className="text-[#a871f7]">*</span>}</label>
    <textarea disabled={disabled} value={value ?? ''} onChange={onChange} placeholder={placeholder} rows={rows} className="px-3 py-2 text-sm rounded-lg border border-gray-800 focus:border-[#43bba1] focus:ring-1 focus:ring-[#43bba1]/20 outline-none text-gray-200 bg-[#050505] disabled:opacity-50 transition-colors resize-none" />
  </div>
);

export const DarkReadOnlyField = ({ label, value, highlight = false, className = '' }: any) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-xs font-semibold text-gray-500">{label}</label>
    <div className={`px-3 py-2.5 text-sm rounded-lg border font-medium ${highlight ? 'bg-[#05110e] border-[#43bba1]/30 text-[#43bba1]' : 'bg-[#111] border-gray-800 text-gray-300'}`}>{value || '-'}</div>
  </div>
);

export const DarkAmountToggle = ({ label, state, onChange, disabled = false, required = false }: any) => (
  <div className="flex flex-col gap-3 p-4 bg-[#0a0a0a] border border-gray-800 rounded-lg">
    <label className="text-xs font-semibold text-gray-300">{label} {required && <span className="text-[#a871f7]">*</span>}</label>
    <div className="flex gap-4">
      <label className="flex items-center gap-1.5 text-sm cursor-pointer text-gray-400 hover:text-white">
        <input disabled={disabled} type="radio" checked={state?.exists === true} onChange={() => onChange({ ...state, exists: true })} className="w-3.5 h-3.5 accent-[#43bba1]" /> يوجد
      </label>
      <label className="flex items-center gap-1.5 text-sm cursor-pointer text-gray-400 hover:text-white">
        <input disabled={disabled} type="radio" checked={state?.exists === false} onChange={() => onChange({ ...state, exists: false, amount: '' })} className="w-3.5 h-3.5 accent-[#43bba1]" /> لا يوجد
      </label>
    </div>
    {state?.exists && (
      <input disabled={disabled} type="number" placeholder="المبلغ (ريال)" value={state.amount ?? ''} onChange={e => onChange({ ...state, amount: e.target.value })} className="mt-1 px-3 py-1.5 text-sm rounded-md border border-gray-800 focus:border-[#43bba1] outline-none bg-[#050505] text-white" />
    )}
  </div>
);

export const DarkNumberCounter = ({ label, value, onChange, disabled = false }: any) => (
  <div className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${disabled ? 'bg-[#0a0a0a] border-gray-800 opacity-60' : 'bg-[#0f0f0f] border-gray-800'}`}>
    <span className="text-xs font-semibold text-gray-400 truncate mr-2">{label}</span>
    <div className="flex items-center gap-2 bg-[#050505] rounded-md border border-gray-800 shadow-sm p-0.5">
      <button disabled={disabled} type="button" onClick={() => onChange(Math.max(0, (Number(value) || 0) - 1))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#3a1515] hover:text-red-400 text-gray-400 disabled:opacity-50">-</button>
      <span className="w-5 text-center text-sm font-bold text-white">{value || 0}</span>
      <button disabled={disabled} type="button" onClick={() => onChange((Number(value) || 0) + 1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#05110e] hover:text-[#43bba1] text-gray-400 disabled:opacity-50">+</button>
    </div>
  </div>
);
