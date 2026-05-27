import React, { useState, useMemo } from 'react';
import { Search, Check, ChevronDown } from 'lucide-react';
import type { UserProfile } from '../Auth';
import { roleName } from '../../lib/data';

export const SearchablePeoplePicker: React.FC<{
  people: UserProfile[];
  selected: string[];
  onChange: (ids: string[]) => void;
  multi: boolean;
  placeholder?: string;
  disabled?: boolean;
}> = ({ people, selected, onChange, multi, placeholder, disabled }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return people;
    return people.filter(p =>
      p.fullName.toLowerCase().includes(term) || p.email.toLowerCase().includes(term));
  }, [people, q]);

  const toggle = (id: string) => {
    if (multi) onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
    else { onChange([id]); setOpen(false); }
  };

  const selectedPeople = people.filter(p => selected.includes(p.id));

  return (
    <div className="relative">
      <button type="button" disabled={disabled} onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-subtle bg-surface-up text-sm disabled:opacity-60">
        <span className="truncate text-right flex-1">
          {selectedPeople.length === 0
            ? <span className="text-fg-faint">{placeholder || '— اختر —'}</span>
            : selectedPeople.map(p => p.fullName).join('، ')}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0 text-fg-muted" />
      </button>
      {open && !disabled && (
        <div className="mt-1 w-full rounded-lg border border-subtle bg-white dark:bg-slate-900 shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-subtle">
            <Search className="w-4 h-4 text-fg-muted" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="ابحث بالاسم أو البريد…" className="flex-1 bg-transparent text-sm outline-none" />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && <p className="px-3 py-3 text-xs text-fg-faint">لا نتائج</p>}
            {filtered.map(p => {
              const on = selected.includes(p.id);
              return (
                <button type="button" key={p.id} onClick={() => toggle(p.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-right hover:bg-surface-up ${on ? 'bg-[#43bba1]/10' : ''}`}>
                  <span className="min-w-0">
                    <span className="font-semibold text-fg truncate block">{p.fullName}</span>
                    <span className="text-[10px] text-fg-faint" dir="ltr">{p.email} · {roleName(p.role)}</span>
                  </span>
                  {on && <Check className="w-4 h-4 text-[#43bba1] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
