/**
 * GlobalSearch.tsx — بحث عالمي ⌘K
 * Searches projects, forms, and users from already-loaded App state.
 * No new Firestore queries. Results capped at 5 per group.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Building2, FileText, Users, X, ArrowLeft } from 'lucide-react';
import { FORM_STATUS_LABELS, FORM_STATUS_COLORS, roleName, ROLE_BY_KEY } from '../lib/data';
import type { RoleKey } from '../lib/data';
import type { FormRecord } from './Forms';
import type { UserProfile } from './Auth';
import type { ProjectRecord } from './forms/FormRenderers';

/* ─── Props ──────────────────────────────────────────────────────── */

interface GlobalSearchProps {
  projects: ProjectRecord[];
  forms: FormRecord[];
  users: UserProfile[];
  user: UserProfile;
  onOpenProject: (id: string) => void;
  onOpenForm: (id: string) => void;
  onOpenProfile: (id: string) => void;
  onClose: () => void;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

const PHASE_LABELS: Record<string, string> = {
  RESEARCH: 'البحث', DIAGNOSIS: 'التشخيص', EVACUATION: 'الإخلاء',
  TENDERING: 'الترسية', EXECUTION: 'التنفيذ', HANDOVER: 'التسليم',
  CLOSED: 'مغلق', REJECTED: 'مرفوض', CANCELLED: 'ملغى',
};

function match(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.toLowerCase();
  return fields.some(f => f?.toLowerCase().includes(q));
}

/* ═══════════════════════════════════════════════════════════════════
   GlobalSearch
   ═══════════════════════════════════════════════════════════════════ */

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  projects, forms, user, users, onOpenProject, onOpenForm, onOpenProfile, onClose,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const canSearchUsers = user.isAdmin || (ROLE_BY_KEY[user.role as RoleKey]?.isManager === true);

  /* ── Close on Escape ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  /* ── Focus input on mount ── */
  useEffect(() => { inputRef.current?.focus(); }, []);

  /* ── Results ── */
  const { matchedProjects, matchedForms, matchedUsers } = useMemo(() => {
    if (!query.trim()) return { matchedProjects: [], matchedForms: [], matchedUsers: [] };
    const q = query.trim();

    const matchedProjects = projects
      .filter(p => match(q, p.projectId, p.beneficiaryName, p.city, PHASE_LABELS[p.phase]))
      .slice(0, 5);

    const matchedForms = forms
      .filter(f => match(q, f.code, f.title, f.beneficiaryName, f.projectId))
      .slice(0, 5);

    const matchedUsers = canSearchUsers
      ? users
          .filter(u => u.status === 'active' && match(q, u.fullName, roleName(u.role), u.department))
          .slice(0, 5)
      : [];

    return { matchedProjects, matchedForms, matchedUsers };
  }, [query, projects, forms, users, canSearchUsers]);

  const totalResults = matchedProjects.length + matchedForms.length + matchedUsers.length;
  const hasQuery = query.trim().length > 0;

  const handleProject = (id: string) => { onOpenProject(id); onClose(); };
  const handleForm = (id: string) => { onOpenForm(id); onClose(); };
  const handleUser = (id: string) => { onOpenProfile(id); onClose(); };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-black/60 backdrop-blur-sm"
      dir="rtl"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl bg-surface rounded-2xl shadow-card-hover border border-subtle overflow-hidden flex flex-col max-h-[75vh]">

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-subtle">
          <Search className="w-5 h-5 text-fg-faint shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ابحث في المشاريع والنماذج والموظفين…"
            className="flex-1 bg-transparent text-fg text-sm outline-none placeholder:text-fg-faint"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-fg-faint hover:text-fg transition">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose}
            className="text-xs text-fg-faint hover:text-fg border border-subtle rounded px-1.5 py-0.5 transition">
            Esc
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1">

          {!hasQuery && (
            <div className="py-10 text-center text-fg-faint text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              ابدأ بالكتابة للبحث في المشاريع والنماذج
            </div>
          )}

          {hasQuery && totalResults === 0 && (
            <div className="py-10 text-center text-fg-faint text-sm">
              لا توجد نتائج لـ «{query}»
            </div>
          )}

          {/* Projects */}
          {matchedProjects.length > 0 && (
            <section className="px-2 pt-3 pb-1">
              <p className="px-2 pb-1.5 text-[10px] font-bold text-fg-faint uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3 h-3" /> المشاريع
              </p>
              {matchedProjects.map(p => (
                <button key={p.id} onClick={() => handleProject(p.id)}
                  className="w-full text-right px-3 py-2.5 rounded-lg hover:bg-surface-up transition flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-[#4A1F66]/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-[#4A1F66] dark:text-purple-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-fg truncate">{p.beneficiaryName}</p>
                    <p className="text-[10px] text-fg-muted">{p.projectId} · {PHASE_LABELS[p.phase] || p.phase} · {p.city}</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-fg-faint opacity-0 group-hover:opacity-100 transition" />
                </button>
              ))}
            </section>
          )}

          {/* Forms */}
          {matchedForms.length > 0 && (
            <section className="px-2 pt-3 pb-1">
              <p className="px-2 pb-1.5 text-[10px] font-bold text-fg-faint uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> النماذج
              </p>
              {matchedForms.map(f => (
                <button key={f.id} onClick={() => handleForm(f.id)}
                  className="w-full text-right px-3 py-2.5 rounded-lg hover:bg-surface-up transition flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-[#43bba1]/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#43bba1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-fg truncate">{f.title}</p>
                    <p className="text-[10px] text-fg-muted">{f.code} · {f.beneficiaryName || f.projectId || '—'}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${FORM_STATUS_COLORS[f.status]}`}>
                    {FORM_STATUS_LABELS[f.status]}
                  </span>
                  <ArrowLeft className="w-4 h-4 text-fg-faint opacity-0 group-hover:opacity-100 transition" />
                </button>
              ))}
            </section>
          )}

          {/* Users (managers/admins only) */}
          {matchedUsers.length > 0 && (
            <section className="px-2 pt-3 pb-1">
              <p className="px-2 pb-1.5 text-[10px] font-bold text-fg-faint uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3 h-3" /> الموظفون
              </p>
              {matchedUsers.map(u => (
                <button key={u.id} onClick={() => handleUser(u.id)}
                  className="w-full text-right px-3 py-2.5 rounded-lg hover:bg-surface-up transition flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-[#4A1F66]/20 flex items-center justify-center shrink-0 text-[#4A1F66] dark:text-purple-300 font-bold text-sm">
                    {u.fullName?.[0] || '؟'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-fg truncate">{u.fullName}</p>
                    <p className="text-[10px] text-fg-muted">{roleName(u.role)}</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-fg-faint opacity-0 group-hover:opacity-100 transition" />
                </button>
              ))}
            </section>
          )}

          {/* Bottom padding */}
          {hasQuery && totalResults > 0 && <div className="h-3" />}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-subtle flex items-center gap-3 text-[10px] text-fg-faint">
          <span>↵ فتح</span>
          <span>Esc إغلاق</span>
          <span className="mr-auto">{hasQuery && totalResults > 0 ? `${totalResults} نتيجة` : ''}</span>
        </div>

      </div>
    </div>
  );
};
