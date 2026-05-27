/**
 * _shared.ts
 * Common types, interfaces, and authoritative registries for all form renderers.
 */

import type { FormRecord } from '../Forms';
import type { UserProfile } from '../Auth';
import type { ProjectRecord } from './FormRenderers';

export interface SharedFormProps {
  rec: FormRecord;
  user: UserProfile;
  onClose: () => void;
  onApprove: (note?: string, dataPatch?: Record<string, any>) => Promise<void>;
  onReject: (note?: string) => Promise<void>;
  onDefer: (note?: string) => Promise<void>;
  onUpdateData: (patch: Record<string, any>) => Promise<void>;
  isBusy?: boolean;
  users: UserProfile[];
  context: FormContextType;
}

export interface FormContextType {
  projects: ProjectRecord[];
  generateProjectId: () => Promise<{ projectId: string; serial: number }>;
  createProject: (data: Partial<ProjectRecord>) => Promise<string | null>;
  updateProject: (projectRefId: string, patch: Partial<ProjectRecord>) => Promise<void>;
  findProjectForm: (projectRefId: string, code: string) => FormRecord | null;
  userById: (id: string) => UserProfile | undefined;
}

/**
 * Helper to check if form is at a specific approval step
 */
export function isFormAtStep(rec: FormRecord, step: number): boolean {
  return rec.approvalIndex === step;
}

/**
 * Thin shim — delegates to the canonical formAwaitsUser in src/lib/rbac.ts.
 * Form renderers that call canApproveForm() still work without a migration sweep.
 * @deprecated Import formAwaitsUser from '../../lib/rbac' in new renderers.
 */
export function canApproveForm(rec: FormRecord, user: UserProfile): boolean {
  if (rec.status !== 'pending') return false;
  if (user.isAdmin === true) return true;
  const expectedRole = rec.approvalChain[rec.approvalIndex];
  if (user.role !== expectedRole) return false;
  if (rec.assigneeId && rec.assigneeId !== user.id) return false;
  return true;
}

/**
 * Helper to get current approval step name
 */
export function getCurrentApprovalStep(rec: FormRecord): { role: string; index: number } {
  const role = rec.approvalChain[rec.approvalIndex] || 'NONE';
  return { role, index: rec.approvalIndex };
}

/* ──────────────────────────────────────────────────────────────────
   ACTIVATE_DATA_PROPAGATIONS — authoritative cross-form propagation registry
   When a trigger needs to seed downstream form data, the keys it propagates
   must be listed here. Add new keys here before adding them to a trigger.
   ────────────────────────────────────────────────────────────────── */
export const ACTIVATE_DATA_PROPAGATIONS = {
  'F-02 → F-03':   ['managerNotes', 'eligibilityVerdict'],
  'F-03 → F-03.1': ['managerNotes', 'eligibilityVerdict'],
  'F-84 → F-85':   ['f84_bids', 'f84_pricingNotes'],
  'F-33 → F-14':   ['f08_works', 'visitNumber'],
  'F-33 → F-34':   ['f20_items', 'f20_directNotes', 'f20_inkindNotes', 'f20_partnershipNotes'],
} as const;

/* ──────────────────────────────────────────────────────────────────
   RENDERER_CONTRACT — exact top-level keys each renderer must write to form.data
   Triggers read these keys. Renderers must not bury them under nested objects.
   ────────────────────────────────────────────────────────────────── */
export const RENDERER_CONTRACT = {
  'F-04': ['engineerId'],
  'F-08': ['noEvacuation'],     // TOP LEVEL only
  'F-85': ['winnerContractor', 'winnerPrice'],
  'F-32': ['engineerId'],
  'F-14': ['overallProgress', 'requestScopeChange'],
  'F-07': ['mediaRequested'],
} as const;

/** Maps form codes to the department that must act at a given approval step index. */
export function requiredDeptForApprovalStep(code: string, stepIndex: number): string | null {
  const deptMap: Record<string, Record<number, string>> = {
    'F-03':   { 0: 'RESEARCH' },
    'F-03.1': { 0: 'EXEC' },
    'F-03.2': { 0: 'RESEARCH' },
    'F-08':   { 0: 'PROJECTS', 1: 'PROJECTS' },
    'F-14':   { 0: 'PROJECTS', 1: 'PROJECTS' },
    'F-85':   { 0: 'PROJECTS' },
  };
  return deptMap[code]?.[stepIndex] ?? null;
}
