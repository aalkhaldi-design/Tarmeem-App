/**
 * rbac.ts — Canonical RBAC helpers for Tarmeem.
 * Single source of truth for formAwaitsUser, portal access, and form routing constants.
 * Import from here — do not duplicate logic in components.
 */

import type { FormRecord } from '../components/Forms';
import type { UserProfile } from '../components/Auth';
import { ROLES_DEF, type RoleKey, type DepartmentKey, type FormCode } from './data';

/**
 * Canonical gate: can this user act on this form right now?
 *
 * Decision 2: isAdmin flag is the super-override — admins bypass role + assignee checks.
 * Manager override: a manager in the same department as the expected role may act on
 * behalf of a subordinate (covers sick-day / recovery scenarios).
 */
export function formAwaitsUser(rec: FormRecord, user: UserProfile): boolean {
  if (rec.status !== 'pending') return false;
  if (user.isAdmin === true) return true;

  const nextRole = rec.approvalChain[rec.approvalIndex];
  if (!nextRole) return false;

  if (nextRole === user.role) {
    if (rec.assigneeId && rec.assigneeId !== user.id) return false;
    return true;
  }

  // Manager override: user is a manager in the same department as the next role
  const nextRoleDef = ROLES_DEF.find(r => r.key === nextRole);
  const userRoleDef  = ROLES_DEF.find(r => r.key === user.role);
  if (
    userRoleDef?.isManager &&
    nextRoleDef?.department &&
    userRoleDef.department === nextRoleDef.department
  ) {
    if (rec.assigneeId && rec.assigneeId !== user.id) return false;
    return true;
  }

  return false;
}

/**
 * Returns the department keys a given role has visibility into.
 * Used to build the sidebar navigation allowedDepts list.
 */
export function portalAccessForRole(role: RoleKey | 'PENDING' | 'SYSTEM'): DepartmentKey[] {
  if (role === 'PENDING' || role === 'SYSTEM') return [];
  const def = ROLES_DEF.find(r => r.key === role);
  if (!def) return [];
  // Every role sees its own department; executives see all
  if (def.isExecutive) {
    return ['EXEC', 'RESEARCH', 'PROJECTS', 'FINANCE', 'SUPPORT', 'VOLUNTEER', 'MARKETING', 'PARTNERSHIP', 'COMMS'];
  }
  return [def.department];
}

/**
 * Edit-access gate — broader than formAwaitsUser (approve gate).
 *
 * Returns true when a user may edit form.data fields without necessarily being
 * the approver. Covers: creator at step 0, helpers listed in form.data.helpers[],
 * and the approver (who can always edit what they're about to approve).
 * Blocked for terminal states: approved, rejected, declined.
 */
export function formIsEditableByUser(rec: FormRecord, user: UserProfile): boolean {
  if (rec.status === 'approved' || rec.status === 'rejected' || rec.status === 'declined') return false;
  if (user.isAdmin === true) return true;
  if (formAwaitsUser(rec, user)) return true;
  if (rec.createdBy === user.id && rec.approvalIndex === 0) return true;
  const helpers = (rec.data?.helpers as string[] | undefined) || [];
  if (helpers.includes(user.id)) return true;
  return false;
}

/**
 * FORM_REJECT_TARGET — who owns the resubmit after rejection.
 * Single-stage forms bounce to the role listed here.
 * Multi-stage forms ignore this map (they reset to approvalIndex=0 and notify the first chain role).
 */
export const FORM_REJECT_TARGET: Partial<Record<FormCode, RoleKey>> = {
  'F-02':   'SOCIAL_RESEARCHER',
  'F-03':   'SOCIAL_RESEARCHER',
  'F-03.1': 'RESEARCH_MANAGER',
  'F-03.2': 'RESEARCH_MANAGER',
  'F-04':   'HEAD_DIAGNOSIS',
  'F-08':   'DIAGNOSIS_ENGINEER',
  'F-18':   'SOCIAL_RESEARCHER',
  'F-22':   'SOCIAL_RESEARCHER',
  'F-21':   'DIAGNOSIS_ENGINEER',
  'F-84':   'DIAGNOSIS_ENGINEER',
  'F-85':   'PROJECTS_MANAGER',
  'F-32':   'HEAD_SUPERVISION',
  'F-33':   'DIAGNOSIS_ENGINEER',
  'F-34':   'DIAGNOSIS_ENGINEER',
  'F-07':   'RESEARCH_MANAGER',
  // F-14, F-15, F-23, F-35 are multi-stage — reset to stage 0
};

/**
 * REASSIGNABLE_FORMS — Admin may change assigneeId on these forms mid-workflow.
 */
export const REASSIGNABLE_FORMS: FormCode[] = ['F-04', 'F-08', 'F-32', 'F-33', 'F-14'];
