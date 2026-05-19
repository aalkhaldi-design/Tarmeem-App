/**
 * audit.ts — Project and user lifecycle audit trail.
 *
 * Per-form decisions (approve/reject/defer) are recorded in form.approvals[] by
 * the workflow engine. This file handles org-level events that don't map to a
 * single form: project phase changes, user status changes, admin overrides.
 */

import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export type AuditAction =
  // Project lifecycle
  | 'project_created'
  | 'project_phase_changed'
  | 'project_on_hold'
  | 'project_resumed'
  | 'project_cancelled'
  | 'project_rejected'
  | 'project_closed'
  // User lifecycle
  | 'user_created'
  | 'user_activated'
  | 'user_deactivated'
  | 'user_role_changed'
  | 'user_admin_granted'
  | 'user_admin_revoked'
  // Form overrides (admin actions outside normal flow)
  | 'form_reassigned'
  | 'form_data_patched_by_admin';

export interface AuditEntry {
  action: AuditAction;
  actorId: string;
  actorName: string;
  targetId: string;       // projectId, userId, or formId depending on action
  targetType: 'project' | 'user' | 'form';
  note?: string;
  meta?: Record<string, unknown>;
  timestamp: string;      // ISO 8601
}

export async function writeAuditEntry(entry: AuditEntry): Promise<void> {
  await addDoc(collection(db, 'audit_log'), entry);
}
