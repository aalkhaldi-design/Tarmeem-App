/**
 * workflowState.ts
 * Central workflow state management and form metadata
 */

import type { FormCode } from '../../lib/data';
import type { FormRecord, ProjectRecord } from './FormRenderers';

/**
 * Form metadata mapping (Form ID → Meta)
 */
export const FORM_ID_TO_META: Record<FormCode, {
  code: FormCode;
  title: string;
  stepCount: number;
  isReadOnly?: boolean;
  triggersOnApproval?: FormCode[];
  requiresAssignee?: boolean;
}> = {
  'F-02': {
    code: 'F-02',
    title: 'البحث الاجتماعي، نموذج فتح مشروع',
    stepCount: 1,
    triggersOnApproval: [],
    requiresAssignee: false,
  },
  'F-03': {
    code: 'F-03',
    title: 'اعتماد مدير البحث الاجتماعي',
    stepCount: 3,
    triggersOnApproval: [],
    requiresAssignee: false,
  },
  'F-04': {
    code: 'F-04',
    title: 'تعيين مهندس التشخيص',
    stepCount: 1,
    triggersOnApproval: ['F-08'],
    requiresAssignee: true,
  },
  'F-07': {
    code: 'F-07',
    title: 'شهادة تسليم المنزل',
    stepCount: 1,
    triggersOnApproval: [],
    requiresAssignee: false,
  },
  'F-08': {
    code: 'F-08',
    title: 'التشخيص',
    stepCount: 4,
    triggersOnApproval: ['F-18', 'F-22'],
    requiresAssignee: true,
  },
  'F-09': {
    code: 'F-09',
    title: 'تعيين مهندس الإشراف',
    stepCount: 1,
    triggersOnApproval: ['F-14'],
    requiresAssignee: true,
  },
  'F-14': {
    code: 'F-14',
    title: 'تقرير المهندس المشرف',
    stepCount: 2,
    triggersOnApproval: ['F-15', 'F-23'],
    requiresAssignee: true,
  },
  'F-15': {
    code: 'F-15',
    title: 'طلب صرف دفعة',
    stepCount: 1,
    triggersOnApproval: [],
    requiresAssignee: false,
  },
  'F-18': {
    code: 'F-18',
    title: 'تعهد إخلاء المنزل',
    stepCount: 1,
    triggersOnApproval: ['F-22'],
    requiresAssignee: false,
  },
  'F-22': {
    code: 'F-22',
    title: 'طلب توفير سكن بديل',
    stepCount: 1,
    triggersOnApproval: [],
    requiresAssignee: false,
  },
  'F-23': {
    code: 'F-23',
    title: 'طلب بنود أعمال إضافية',
    stepCount: 1,
    triggersOnApproval: [],
    requiresAssignee: false,
  },
  'F-52': {
    code: 'F-52',
    title: 'طلب تصوير وتوثيق',
    stepCount: 1,
    triggersOnApproval: [],
    requiresAssignee: false,
  },
};

/**
 * Determines if a form is editable (not locked in read-only state)
 */
export function isFormEditable(rec: FormRecord, userId: string, userRole: string): boolean {
  // Approved or rejected forms are not editable
  if (rec.status === 'approved' || rec.status === 'rejected') {
    return false;
  }

  // Admin can always edit
  if (userRole === 'ADMIN') {
    return true;
  }

  // Creator can edit only at approval step 0 (before first approval)
  if (rec.createdBy === userId && rec.approvalIndex === 0) {
    return true;
  }

  // Assignee can edit while pending approval
  if (rec.assigneeId === userId && rec.status === 'pending') {
    return true;
  }

  return false;
}

/**
 * Determines if a user can approve the form
 */
export function canUserApproveForm(rec: FormRecord, userId: string, userRole: string): boolean {
  // Form must be pending
  if (rec.status !== 'pending') {
    return false;
  }

  // Check if user has the required role
  const expectedRole = rec.approvalChain[rec.approvalIndex];
  if (userRole !== expectedRole && userRole !== 'ADMIN') {
    return false;
  }

  // If form is assigned to someone, only that person (or admin) can approve
  if (rec.assigneeId && rec.assigneeId !== userId && userRole !== 'ADMIN') {
    return false;
  }

  return true;
}

/**
 * Get the next approval step info
 */
export function getNextApprovalStep(rec: FormRecord): {
  role: string | null;
  index: number;
  isLastStep: boolean;
} {
  const nextIndex = rec.approvalIndex + 1;
  const isLastStep = nextIndex >= rec.approvalChain.length;
  const nextRole = isLastStep ? null : rec.approvalChain[nextIndex];

  return { role: nextRole, index: nextIndex, isLastStep };
}

/**
 * Get all pending forms for a user (by role or assignment)
 */
export function getPendingFormsForUser(
  forms: FormRecord[],
  userId: string,
  userRole: string
): FormRecord[] {
  return forms.filter(f => {
    if (f.status !== 'pending') return false;
    if (userRole === 'ADMIN') return true;

    const expectedRole = f.approvalChain[f.approvalIndex];
    if (userRole === expectedRole) {
      // If assigned, only show if assigned to this user
      if (f.assigneeId) return f.assigneeId === userId;
      return true;
    }

    return false;
  });
}

/**
 * Derive dynamic Phase 4 forms (F-14 sequences)
 * When F-14 has triggersPayment=true and seq=N, creates F-14 (seq=N+1), F-15 (seq=N)
 */
export function deriveDynamicP4Forms(
  forms: FormRecord[],
  projectRefId: string
): FormRecord[] {
  const p4Forms = forms.filter(
    f =>
      f.projectRefId === projectRefId &&
      (f.code === 'F-14' || f.code === 'F-15') &&
      f.status === 'approved'
  );

  // Sort by seq (ascending)
  p4Forms.sort((a, b) => {
    const seqA = a.data?.seq ?? 0;
    const seqB = b.data?.seq ?? 0;
    return seqA - seqB;
  });

  return p4Forms;
}

/**
 * Check if a form should trigger child forms on approval
 */
export function getTriggeredFormCodes(code: FormCode): FormCode[] {
  const meta = FORM_ID_TO_META[code];
  return meta?.triggersOnApproval ?? [];
}

/**
 * Format approval chain for display
 */
export function formatApprovalChain(chain: string[]): string {
  return chain.join(' → ');
}

/**
 * Get approval status color
 */
export function getApprovalStatusColor(
  status: FormRecord['status']
): 'green' | 'yellow' | 'red' | 'gray' {
  switch (status) {
    case 'approved':
      return 'green';
    case 'rejected':
      return 'red';
    case 'deferred':
      return 'yellow';
    case 'pending':
    default:
      return 'gray';
  }
}
