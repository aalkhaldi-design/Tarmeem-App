/**
 * _shared.ts
 * Common types & interfaces for all form renderers
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
 * Helper to check if current user can approve this form
 */
export function canApproveForm(rec: FormRecord, user: UserProfile): boolean {
  if (rec.status === 'approved' || rec.status === 'rejected') return false;
  const expectedRole = rec.approvalChain[rec.approvalIndex];
  if (user.role !== expectedRole && user.role !== 'ADMIN') return false;
  if (rec.assigneeId && rec.assigneeId !== user.id && user.role !== 'ADMIN') return false;
  return true;
}

/**
 * Helper to check if form is editable by current user
 */
export function isFormEditable(rec: FormRecord, user: UserProfile): boolean {
  if (rec.status === 'approved' || rec.status === 'rejected') return false;
  if (user.role === 'ADMIN') return true;
  if (rec.createdBy === user.id && rec.approvalIndex === 0) return true;
  if (rec.assigneeId === user.id) return true;
  return false;
}

/**
 * Helper to get current approval step name
 */
export function getCurrentApprovalStep(rec: FormRecord): { role: string; index: number } {
  const role = rec.approvalChain[rec.approvalIndex] || 'NONE';
  return { role, index: rec.approvalIndex };
}

/**
 * Helper to check if form requires specific department
 */
export function requiredDeptForApprovalStep(code: string, stepIndex: number): string | null {
  // Map form codes to required departments for each approval step
  const deptMap: Record<string, Record<number, string>> = {
    'F-03': {
      0: 'RESEARCH',        // Step 0: Research Manager
      1: 'EXECUTIVE',       // Step 1: Executive Director
      2: 'RESEARCH',        // Step 2: Back to Research Manager for final sign-off
    },
    'F-08': {
      0: 'DIAGNOSIS',       // Diagnosis Engineer
    },
    'F-14': {
      0: 'SUPERVISION',     // Supervising Engineer
    },
    'F-85': {
      0: 'PROCUREMENT',     // Procurement Manager
    },
  };

  return deptMap[code]?.[stepIndex] ?? null;
}
