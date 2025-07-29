import { MembershipStatus, Membership, MembershipType } from "@/types/memberships";

/**
 * Calculate the status of a membership based on dates and payment status
 */
export function calculateMembershipStatus(membership: Membership): MembershipStatus {
  const now = new Date();
  const expiryDate = new Date(membership.expiry_date);
  const gracePeriodEnd = new Date(expiryDate.getTime() + (membership.grace_period_days * 24 * 60 * 60 * 1000));
  
  if (!membership.fee_paid) {
    return "unpaid";
  }
  
  if (now <= expiryDate) {
    return "active";
  }
  
  if (now <= gracePeriodEnd) {
    return "grace";
  }
  
  return "expired";
}

/**
 * Calculate days until expiry for an active membership
 */
export function getDaysUntilExpiry(membership: Membership): number | null {
  const status = calculateMembershipStatus(membership);
  if (status !== "active") return null;
  
  const now = new Date();
  const expiryDate = new Date(membership.expiry_date);
  return Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Calculate remaining grace period days
 */
export function getGracePeriodRemaining(membership: Membership): number | null {
  const status = calculateMembershipStatus(membership);
  if (status !== "grace") return null;
  
  const now = new Date();
  const expiryDate = new Date(membership.expiry_date);
  const gracePeriodEnd = new Date(expiryDate.getTime() + (membership.grace_period_days * 24 * 60 * 60 * 1000));
  return Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Check if a membership is eligible for renewal
 */
export function canRenewMembership(membership: Membership): boolean {
  const status = calculateMembershipStatus(membership);
  return status === "active" || status === "grace";
}

/**
 * Get status badge color classes
 */
export function getStatusBadgeClasses(status: MembershipStatus): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 border-green-200";
    case "grace":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "expired":
      return "bg-red-100 text-red-800 border-red-200";
    case "unpaid":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "none":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

/**
 * Get human-readable status text
 */
export function getStatusText(status: MembershipStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "grace":
      return "Grace Period";
    case "expired":
      return "Expired";
    case "unpaid":
      return "Payment Due";
    case "none":
      return "No Membership";
    default:
      return "Unknown";
  }
}

/**
 * Calculate renewal date and expiry date for a membership
 */
export function calculateRenewalDates(membershipType: MembershipType, startDate?: Date): {
  startDate: Date;
  expiryDate: Date;
} {
  const start = startDate || new Date();
  const expiry = new Date(start);
  expiry.setMonth(expiry.getMonth() + membershipType.duration_months);
  
  return {
    startDate: start,
    expiryDate: expiry,
  };
}

/**
 * Create invoice data for membership payment
 */
export function createMembershipInvoiceData(
  membership: Membership,
  membershipType: MembershipType,
  userId: string
) {
  return {
    user_id: userId,
    status: "pending" as const,
    issue_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    subtotal: membershipType.price,
    tax_total: 0, // Membership fees typically aren't taxed
    total_amount: membershipType.price,
    notes: `Membership fee for ${membershipType.name}`,
    reference: `MEMBERSHIP-${membership.id.substring(0, 8)}`,
  };
}

/**
 * Check if membership is about to expire (within warning threshold)
 */
export function isMembershipExpiringSoon(membership: Membership, warningDays: number = 30): boolean {
  const daysUntilExpiry = getDaysUntilExpiry(membership);
  return daysUntilExpiry !== null && daysUntilExpiry <= warningDays;
}

/**
 * Format membership benefits for display
 */
export function formatMembershipBenefits(benefits: string[]): string {
  if (!benefits || benefits.length === 0) return "No benefits listed";
  return benefits.join(" • ");
} 