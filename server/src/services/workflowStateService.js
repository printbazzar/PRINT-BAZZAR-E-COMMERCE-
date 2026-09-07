/**
 * Print Bazzar Internal Workflow State Machine Service
 * Enforces strict transition validation, Order-to-ProductionJob synchronization,
 * mandatory Pre-Production QC checklist verification, and department role authorization.
 */

// Explicitly allowed transitions for Order.orderStatus
export const ALLOWED_ORDER_TRANSITIONS = {
  ORDER_CREATED: ['PAYMENT_PENDING', 'ORDER_REVIEW', 'DESIGN_QUEUE', 'CANCELLED'],
  PAYMENT_PENDING: ['ORDER_REVIEW', 'DESIGN_QUEUE', 'CANCELLED'],
  ORDER_REVIEW: ['ARTWORK_REVIEW', 'PRE_PRODUCTION_QC', 'DESIGN_QUEUE', 'CANCELLED', 'ON_HOLD'],
  ARTWORK_REVIEW: ['PRE_PRODUCTION_QC', 'DESIGN_IN_PROGRESS', 'ORDER_REVIEW', 'CANCELLED', 'ON_HOLD'],
  DESIGN_QUEUE: ['DESIGN_IN_PROGRESS', 'DESIGNER_ASSIGNED', 'CANCELLED', 'ON_HOLD'],
  DESIGNER_ASSIGNED: ['DESIGN_IN_PROGRESS', 'CANCELLED', 'ON_HOLD'],
  DESIGN_IN_PROGRESS: ['DRAFT_READY', 'SENT_TO_CUSTOMER', 'PRE_PRODUCTION_QC', 'REVISION', 'REVISION_REQUESTED', 'CANCELLED', 'ON_HOLD'],
  DRAFT_READY: ['SENT_TO_CUSTOMER', 'DESIGN_IN_PROGRESS', 'PRE_PRODUCTION_QC', 'REVISION', 'REVISION_REQUESTED', 'CANCELLED', 'ON_HOLD'],
  SENT_TO_CUSTOMER: ['PRE_PRODUCTION_QC', 'DESIGN_IN_PROGRESS', 'REVISION', 'REVISION_REQUESTED', 'CANCELLED', 'ON_HOLD'],
  CUSTOMER_APPROVAL: ['PRE_PRODUCTION_QC', 'DESIGN_IN_PROGRESS', 'CANCELLED', 'ON_HOLD'],
  CUSTOMER_APPROVAL_REQUIRED: ['PRE_PRODUCTION_QC', 'DESIGN_IN_PROGRESS', 'CANCELLED', 'ON_HOLD'],
  REVISION: ['DESIGN_IN_PROGRESS', 'DRAFT_READY', 'SENT_TO_CUSTOMER', 'CANCELLED', 'ON_HOLD'],
  REVISION_REQUESTED: ['DESIGN_IN_PROGRESS', 'DRAFT_READY', 'SENT_TO_CUSTOMER', 'CANCELLED', 'ON_HOLD'],
  PRE_PRODUCTION_QC: ['PRODUCTION_QUEUE', 'DESIGN_QUEUE', 'ORDER_REVIEW', 'ARTWORK_REVIEW', 'DESIGN_IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  PRODUCTION_QUEUE: ['MACHINE_ASSIGNED', 'PRINTING', 'ON_HOLD', 'CANCELLED'],
  MACHINE_ASSIGNED: ['PRINTING', 'PRODUCTION_QUEUE', 'ON_HOLD', 'CANCELLED'],
  PRINTING: ['FINISHING', 'PRINTING_COMPLETED', 'ON_HOLD', 'CANCELLED'],
  PRINTING_COMPLETED: ['FINISHING', 'ON_HOLD', 'CANCELLED'],
  FINISHING: ['QUALITY_CHECK', 'QC', 'FINISHING_COMPLETED', 'ON_HOLD', 'CANCELLED'],
  FINISHING_COMPLETED: ['QUALITY_CHECK', 'QC', 'ON_HOLD', 'CANCELLED'],
  QUALITY_CHECK: ['PACKING', 'PACKED', 'PRINTING', 'FINISHING', 'PRODUCTION_QUEUE', 'DESIGN_QUEUE', 'ARTWORK_REQUIRED', 'ON_HOLD', 'CANCELLED'],
  QC: ['PACKING', 'PACKED', 'PRINTING', 'FINISHING', 'PRODUCTION_QUEUE', 'DESIGN_QUEUE', 'ARTWORK_REQUIRED', 'ON_HOLD', 'CANCELLED'],
  PACKING: ['PACKED', 'READY_FOR_DELIVERY', 'READY_FOR_DISPATCH', 'READY_FOR_PICKUP', 'ON_HOLD', 'CANCELLED'],
  PACKED: ['READY_FOR_DELIVERY', 'READY_FOR_DISPATCH', 'READY_FOR_PICKUP', 'ON_HOLD', 'CANCELLED'],
  READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY', 'DISPATCHED', 'DELIVERED', 'ON_HOLD', 'CANCELLED'],
  READY_FOR_DISPATCH: ['OUT_FOR_DELIVERY', 'DISPATCHED', 'DELIVERED', 'ON_HOLD', 'CANCELLED'],
  READY_FOR_PICKUP: ['DELIVERED', 'PICKED_UP', 'ON_HOLD', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'ON_HOLD', 'CANCELLED'],
  DISPATCHED: ['DELIVERED', 'ON_HOLD', 'CANCELLED'],
  DELIVERED: ['COMPLETED'],
  PICKED_UP: ['COMPLETED', 'DELIVERED'],
  COMPLETED: [],
  CANCELLED: [],
  ON_HOLD: [
    'ORDER_REVIEW',
    'ARTWORK_REVIEW',
    'DESIGN_IN_PROGRESS',
    'PRE_PRODUCTION_QC',
    'PRODUCTION_QUEUE',
    'PRINTING',
    'FINISHING',
    'QUALITY_CHECK',
    'PACKING',
    'CANCELLED',
  ],
};

// Explicitly allowed transitions for ProductionJob.status
export const ALLOWED_JOB_TRANSITIONS = {
  WAITING_FOR_PAYMENT: ['WAITING_FOR_DESIGN_APPROVAL', 'ARTWORK_REVIEW', 'PRE_PRODUCTION_QC', 'QC_PENDING', 'QUEUED'],
  WAITING_FOR_DESIGN_APPROVAL: ['PRE_PRODUCTION_QC', 'QC_PENDING', 'QUEUED', 'ON_HOLD'],
  ARTWORK_REVIEW: ['PRE_PRODUCTION_QC', 'QC_PENDING', 'WAITING_FOR_DESIGN_APPROVAL', 'ON_HOLD'],
  PRE_PRODUCTION_QC: ['QUEUED', 'QC_PENDING', 'ARTWORK_REVIEW', 'WAITING_FOR_DESIGN_APPROVAL', 'ON_HOLD'],
  QC_PENDING: ['QUEUED', 'PRE_PRODUCTION_QC', 'ARTWORK_REVIEW', 'WAITING_FOR_DESIGN_APPROVAL', 'ON_HOLD'],
  QUEUED: ['ASSIGNED', 'MACHINE_ASSIGNED', 'PRINTING', 'ON_HOLD'],
  ASSIGNED: ['PRINTING', 'QUEUED', 'ON_HOLD'],
  MACHINE_ASSIGNED: ['PRINTING', 'QUEUED', 'ON_HOLD'],
  PRINTING: ['PRINTING_COMPLETED', 'FINISHING', 'ON_HOLD'],
  PRINTING_COMPLETED: ['FINISHING', 'ON_HOLD'],
  FINISHING: ['FINISHING_COMPLETED', 'SENT_TO_QC', 'ON_HOLD'],
  FINISHING_COMPLETED: ['SENT_TO_QC', 'ON_HOLD'],
  SENT_TO_QC: ['COMPLETED', 'PRINTING', 'FINISHING', 'QUEUED', 'REJECTED', 'ON_HOLD'],
  REJECTED: ['QUEUED', 'PRE_PRODUCTION_QC', 'WAITING_FOR_DESIGN_APPROVAL', 'ON_HOLD'],
  COMPLETED: [],
  ON_HOLD: ['PRE_PRODUCTION_QC', 'QC_PENDING', 'QUEUED', 'PRINTING', 'FINISHING', 'SENT_TO_QC'],
};

// 12 mandatory checklist keys for Pre-Production QC
export const MANDATORY_PRE_PRODUCTION_CHECKLIST = [
  'correctArtworkVersion',
  'customerApprovedArtwork',
  'correctSize',
  'correctQuantity',
  'correctMaterial',
  'correctGsm',
  'colorModeCmyk',
  'resolutionVerification',
  'bleedMarginVerification',
  'laminationVerification',
  'cuttingFinishingVerification',
  'specialInstructionsVerification',
];

// Pre-Production QC Verification Requirement Groups (supports both 9-point canonical list and 12-point keys)
export const PRE_PRODUCTION_QC_GROUPS = [
  { name: 'correctArtwork', keys: ['correctArtwork', 'correctArtworkVersion'] },
  { name: 'correctSize', keys: ['correctSize'] },
  { name: 'correctQuantity', keys: ['correctQuantity'] },
  { name: 'correctMaterial', keys: ['correctMaterial', 'correctGsm'] },
  { name: 'colorModeCmyk', keys: ['colorModeCmyk', 'cmykColorVerification', 'cmykColor'] },
  { name: 'bleedMarginVerification', keys: ['bleedMarginVerification', 'bleedSafeMargin'] },
  { name: 'spellingContentVerification', keys: ['spellingContentVerification', 'spellingContent', 'resolutionVerification'] },
  { name: 'finishingVerification', keys: ['finishingVerification', 'cuttingFinishingVerification', 'laminationVerification'] },
  { name: 'customerApprovedArtwork', keys: ['customerApprovedArtwork', 'customerApprovalVerification', 'customerApproval', 'specialInstructionsVerification'] },
];

/**
 * Validates Order Status transition
 * Returns: { isValid: boolean, isDuplicate: boolean, error?: string }
 */
export function validateOrderTransition(currentStatus, targetStatus) {
  if (!targetStatus) {
    return { isValid: false, isDuplicate: false, error: 'Target status is required.' };
  }

  // Idempotency check: Same status is valid and treated as idempotent no-op
  if (currentStatus === targetStatus) {
    return { isValid: true, isDuplicate: true };
  }

  const allowed = ALLOWED_ORDER_TRANSITIONS[currentStatus];
  if (!allowed) {
    return {
      isValid: false,
      isDuplicate: false,
      error: `Unknown current order status '${currentStatus}'.`,
    };
  }

  if (!allowed.includes(targetStatus)) {
    return {
      isValid: false,
      isDuplicate: false,
      error: `ILLEGAL STATUS JUMP: Cannot transition order from '${currentStatus}' directly to '${targetStatus}'. Allowed next states: [${allowed.join(', ')}].`,
    };
  }

  return { isValid: true, isDuplicate: false };
}

/**
 * Validates ProductionJob Status transition
 * Returns: { isValid: boolean, isDuplicate: boolean, error?: string }
 */
export function validateJobTransition(currentStatus, targetStatus) {
  if (!targetStatus) {
    return { isValid: false, isDuplicate: false, error: 'Target job status is required.' };
  }

  if (currentStatus === targetStatus) {
    return { isValid: true, isDuplicate: true };
  }

  const allowed = ALLOWED_JOB_TRANSITIONS[currentStatus];
  if (!allowed) {
    return {
      isValid: false,
      isDuplicate: false,
      error: `Unknown current production job status '${currentStatus}'.`,
    };
  }

  if (!allowed.includes(targetStatus)) {
    return {
      isValid: false,
      isDuplicate: false,
      error: `ILLEGAL JOB STATUS JUMP: Cannot transition job from '${currentStatus}' directly to '${targetStatus}'. Allowed next states: [${allowed.join(', ')}].`,
    };
  }

  return { isValid: true, isDuplicate: false };
}

/**
 * Validates Pre-Production QC Checklist
 * Returns: { isValid: boolean, missingKeys: string[] }
 */
export function validatePreProductionChecklist(checklist = {}) {
  const missingKeys = [];

  for (const group of PRE_PRODUCTION_QC_GROUPS) {
    const isGroupSatisfied = group.keys.some((k) => checklist[k] === true);
    if (!isGroupSatisfied) {
      missingKeys.push(group.name);
    }
  }

  return {
    isValid: missingKeys.length === 0,
    missingKeys,
  };
}

/**
 * Validates User Department Authorization for Workflow Action
 * Returns: { authorized: boolean, error?: string }
 */
export function validateDepartmentAuthorization(user, targetDepartment, action = 'TRANSITION') {
  if (!user) {
    return { authorized: false, error: 'User authentication required.' };
  }

  const userRole = user.role?.name || user.role || '';
  const userDept = (user.department || 'ALL').toUpperCase();

  // Super Admin has global access to all departments
  if (userRole.toLowerCase().includes('super') || userDept === 'ALL') {
    return { authorized: true };
  }

  // Pre-Production QC can be passed by authorized Prepress (DESIGN) or Production staff
  if (action === 'PRE_PRODUCTION_QC') {
    if (['DESIGN', 'PRODUCTION'].includes(userDept)) {
      return { authorized: true };
    }
    return {
      authorized: false,
      error: `FORBIDDEN: Pre-Production QC can only be performed by Prepress (DESIGN) or Production staff. Current user department is '${userDept}'.`,
    };
  }

  // Design/Prepress Actions
  if (['DESIGN'].includes(targetDepartment)) {
    if (userDept === 'DESIGN') return { authorized: true };
    return {
      authorized: false,
      error: `FORBIDDEN: Only Prepress/Design staff can execute actions in the DESIGN department. Current user department is '${userDept}'.`,
    };
  }

  // Press Production Actions
  if (['PRODUCTION'].includes(targetDepartment)) {
    if (['DESIGN', 'PRODUCTION'].includes(userDept)) return { authorized: true };
    return {
      authorized: false,
      error: `FORBIDDEN: Press production actions require PRODUCTION department authorization. Current user department is '${userDept}'.`,
    };
  }

  // Finishing & QC Actions
  if (['FINISHING_QC'].includes(targetDepartment)) {
    if (['PRODUCTION', 'FINISHING_QC'].includes(userDept)) return { authorized: true };
    return {
      authorized: false,
      error: `FORBIDDEN: Finishing & QC actions require FINISHING_QC department authorization. Current user department is '${userDept}'.`,
    };
  }

  // Packing Actions
  if (['PACKING'].includes(targetDepartment)) {
    if (['PACKING'].includes(userDept)) return { authorized: true };
    return {
      authorized: false,
      error: `FORBIDDEN: Packaging desk actions require PACKING department authorization. Current user department is '${userDept}'.`,
    };
  }

  // Delivery Actions
  if (['DELIVERY', 'COMPLETED'].includes(targetDepartment)) {
    if (['DELIVERY'].includes(userDept)) return { authorized: true };
    return {
      authorized: false,
      error: `FORBIDDEN: Logistics actions require DELIVERY department authorization. Current user department is '${userDept}'.`,
    };
  }

  // Front Office staff cannot perform factory floor transitions
  if (userDept === 'FRONT_OFFICE') {
    if (['PRODUCTION', 'FINISHING_QC', 'PACKING', 'DELIVERY'].includes(targetDepartment) || action === 'PRE_PRODUCTION_QC') {
      return {
        authorized: false,
        error: `FORBIDDEN: Front Office staff cannot execute actions in the ${targetDepartment} department or approve QC gates.`,
      };
    }
  }

  return { authorized: true };
}
