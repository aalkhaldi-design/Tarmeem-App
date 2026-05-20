/**
 * ProjectActionsMenu — admin / PROJECTS_MANAGER lifecycle controls.
 *
 * Hold / Resume / Cancel / Reject / Reopen / Archive — each writes a patch
 * via context.updateProject. Hold/Resume cooperate with src/lib/sla.ts:
 * status='on_hold' freezes SLA pills (tone:'frozen'); on Resume the
 * elapsed business days are accumulated into pastHoldDays so future SLAs
 * subtract paused time.
 */

import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical, Pause, Play, Ban, XCircle, RotateCcw, Archive } from 'lucide-react';
import { businessDaysBetween } from '../lib/sla';
import type { ProjectRecord, FormsContext } from './forms/FormRenderers';
import type { UserProfile } from './Auth';

/* Hold / lifecycle fields are written but not yet declared on the canonical
 * ProjectRecord (FormRenderers.tsx is protected). Firestore is schemaless so
 * the writes succeed; this local intersection gives us typed reads here. */
type ExtendedProject = ProjectRecord & {
  status?: 'active' | 'on_hold';
  holdedAt?: string | null;
  pastHoldDays?: number;
  lastActivePhase?: ProjectRecord['phase'];
  archived?: boolean;
};

const TERMINAL_PHASES = ['CLOSED', 'REJECTED', 'CANCELLED'] as const;
type TerminalPhase = (typeof TERMINAL_PHASES)[number];

interface Props {
  project: ProjectRecord;
  user: UserProfile;
  context: FormsContext;
}

export const ProjectActionsMenu: React.FC<Props> = ({ project, user, context }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDoc);
    return () => window.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!(user.isAdmin || user.role === 'PROJECTS_MANAGER')) return null;

  const p = project as ExtendedProject;
  const isTerminal = (TERMINAL_PHASES as readonly string[]).includes(project.phase);
  const isOnHold = p.status === 'on_hold';
  const isArchived = !!p.archived;

  const run = async (
    prompt: string,
    buildPatch: () => Partial<ProjectRecord>,
  ) => {
    if (!window.confirm(prompt)) return;
    setBusy(true);
    try {
      await context.updateProject(project.id, buildPatch());
      setOpen(false);
    } catch (e) {
      console.error('ProjectActionsMenu:', e);
      alert('تعذّر تنفيذ الإجراء. حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  const onHold = () =>
    run('سيتم تعليق المشروع وتجميد مؤقتات SLA. متابعة؟', () => ({
      status: 'on_hold',
      holdedAt: new Date().toISOString(),
    }) as Partial<ProjectRecord>);

  const onResume = () =>
    run('سيتم استئناف المشروع. متابعة؟', () => {
      const heldDays = p.holdedAt
        ? businessDaysBetween(new Date(p.holdedAt), new Date())
        : 0;
      return {
        status: 'active',
        holdedAt: null,
        pastHoldDays: (p.pastHoldDays || 0) + heldDays,
      } as Partial<ProjectRecord>;
    });

  const onCancel = () =>
    run('سيتم إلغاء المشروع نهائياً. متابعة؟', () => ({
      lastActivePhase: project.phase,
      phase: 'CANCELLED',
      progressPct: 0,
      cancelledAt: new Date().toISOString(),
      cancelledBy: user.id,
    }) as Partial<ProjectRecord>);

  const onReject = () =>
    run('سيتم وضع المشروع كمرفوض. متابعة؟', () => ({
      lastActivePhase: project.phase,
      phase: 'REJECTED',
      progressPct: 0,
    }) as Partial<ProjectRecord>);

  const onReopen = () => {
    const target = (p.lastActivePhase || 'RESEARCH') as ProjectRecord['phase'];
    return run(`سيتم إعادة فتح المشروع إلى المرحلة "${target}". متابعة؟`, () => ({
      phase: target,
    }) as Partial<ProjectRecord>);
  };

  const onArchive = () =>
    run('سيتم أرشفة المشروع. متابعة؟', () => ({ archived: true }) as Partial<ProjectRecord>);

  const items: { label: string; icon: React.ReactNode; onClick: () => void; tone: 'amber' | 'green' | 'red' | 'gray' }[] = [];
  if (!isTerminal && !isOnHold) items.push({ label: 'تعليق المشروع', icon: <Pause className="w-4 h-4" />, onClick: onHold, tone: 'amber' });
  if (isOnHold)                  items.push({ label: 'استئناف المشروع', icon: <Play className="w-4 h-4" />, onClick: onResume, tone: 'green' });
  if (!isTerminal)               items.push({ label: 'إلغاء المشروع', icon: <XCircle className="w-4 h-4" />, onClick: onCancel, tone: 'red' });
  if (!isTerminal)               items.push({ label: 'وضع كمرفوض', icon: <Ban className="w-4 h-4" />, onClick: onReject, tone: 'red' });
  if (isTerminal)                items.push({ label: 'إعادة فتح', icon: <RotateCcw className="w-4 h-4" />, onClick: onReopen, tone: 'gray' });
  if (isTerminal && !isArchived) items.push({ label: 'أرشفة', icon: <Archive className="w-4 h-4" />, onClick: onArchive, tone: 'gray' });

  if (items.length === 0) return null;

  const toneClass = (t: 'amber' | 'green' | 'red' | 'gray') =>
    t === 'amber' ? 'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30'
    : t === 'green' ? 'text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30'
    : t === 'red'   ? 'text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30'
    :                 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700';

  return (
    <div ref={rootRef} className="relative inline-block">
      <button onClick={() => setOpen(o => !o)} disabled={busy}
        className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition disabled:opacity-50"
        aria-label="إجراءات المشروع">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-56 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-30 overflow-hidden text-right" dir="rtl">
          {items.map((it, i) => (
            <button key={i} onClick={it.onClick} disabled={busy}
              className={`w-full px-3 py-2 text-sm flex items-center gap-2 disabled:opacity-50 transition ${toneClass(it.tone)}`}>
              {it.icon}
              <span className="font-bold">{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
