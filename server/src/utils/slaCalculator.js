/**
 * Print Bazzar — SLA & Delay Calculation Engine
 * 
 * Deterministic and timezone-safe operational delay status:
 * - ON_TIME: Current time is comfortably before delivery deadline.
 * - AT_RISK: Job is within 6 hours of deadline or due today and not near completion.
 * - DELAYED: Current time exceeds deadline and order/job is not completed.
 */

export function calculateJobSLA(job, order = null) {
  const effectiveOrder = order || job?.order;

  // Completed or Delivered states are always ON_TIME / COMPLETED
  const isCompleted =
    ['COMPLETED', 'DELIVERED'].includes(job?.status) ||
    ['COMPLETED', 'DELIVERED'].includes(effectiveOrder?.orderStatus);

  if (isCompleted) {
    return {
      status: 'ON_TIME',
      isCompleted: true,
      label: 'Completed',
      color: 'green',
      hoursRemaining: 0,
      hoursDelayed: 0,
    };
  }

  // Determine deadline: productionJob deadline -> order estimatedDeliveryDate -> fallback
  let deadline = null;
  if (job?.deadline) {
    deadline = new Date(job.deadline);
  } else if (job?.estimatedCompletionTime) {
    deadline = new Date(job.estimatedCompletionTime);
  } else if (effectiveOrder?.estimatedDeliveryDate) {
    deadline = new Date(effectiveOrder.estimatedDeliveryDate);
  } else if (job?.createdAt) {
    // Default 48h turnaround from creation
    const created = new Date(job.createdAt);
    deadline = new Date(created.getTime() + 48 * 60 * 60 * 1000);
  } else {
    deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) {
    const hoursDelayed = Math.abs(Math.round(diffHours * 10) / 10);
    return {
      status: 'DELAYED',
      isCompleted: false,
      label: `Delayed by ${hoursDelayed}h`,
      color: 'red',
      hoursRemaining: 0,
      hoursDelayed,
      deadlineIso: deadline.toISOString(),
    };
  }

  if (diffHours <= 6) {
    const hoursRemaining = Math.max(0.1, Math.round(diffHours * 10) / 10);
    return {
      status: 'AT_RISK',
      isCompleted: false,
      label: `Due in ${hoursRemaining}h (At Risk)`,
      color: 'amber',
      hoursRemaining,
      hoursDelayed: 0,
      deadlineIso: deadline.toISOString(),
    };
  }

  const hoursRemaining = Math.round(diffHours * 10) / 10;
  return {
    status: 'ON_TIME',
    isCompleted: false,
    label: `On Time (${hoursRemaining}h left)`,
    color: 'green',
    hoursRemaining,
    hoursDelayed: 0,
    deadlineIso: deadline.toISOString(),
  };
}
