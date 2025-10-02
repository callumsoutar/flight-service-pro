"use client";

import { useInstructorCompliance, useUserCompliance } from "@/hooks/use-checkout";

interface ComplianceWarningsProps {
  instructorId: string | null;
  userId: string | null;
}

interface ComplianceWarning {
  type: 'instructor' | 'user';
  field: string;
  status: 'expired' | 'due_soon';
  message: string;
  daysRemaining: number;
}

// Calculate days remaining from a date string
function getDaysRemaining(dateString: string | null): number | null {
  if (!dateString) return null;

  try {
    const targetDate = new Date(dateString);
    const now = new Date();
    // Set both dates to start of day for accurate day calculation
    targetDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch {
    return null;
  }
}

// Check a single compliance field
function checkComplianceField(
  value: string | null,
  fieldName: string,
  type: 'instructor' | 'user'
): ComplianceWarning | null {
  if (!value) return null;

  const daysRemaining = getDaysRemaining(value);
  if (daysRemaining === null) return null;

  // Expired (0 or negative days)
  if (daysRemaining <= 0) {
    return {
      type,
      field: fieldName,
      status: 'expired',
      message: `${fieldName} expired ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? 'day' : 'days'} ago`,
      daysRemaining,
    };
  }

  // Due soon (within 30 days)
  if (daysRemaining <= 30) {
    return {
      type,
      field: fieldName,
      status: 'due_soon',
      message: `${fieldName} due in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`,
      daysRemaining,
    };
  }

  return null;
}

export default function ComplianceWarnings({ instructorId, userId }: ComplianceWarningsProps) {
  const { data: instructorCompliance, isLoading: isLoadingInstructor } = useInstructorCompliance(instructorId);
  const { data: userCompliance, isLoading: isLoadingUser } = useUserCompliance(userId);

  // Don't render while loading
  if (isLoadingInstructor || isLoadingUser) return null;

  const warnings: ComplianceWarning[] = [];

  // Check instructor compliance
  if (instructorCompliance && instructorId) {
    const instructorCheckWarning = checkComplianceField(
      instructorCompliance.instructor_check_due_date,
      'Instructor Check',
      'instructor'
    );
    if (instructorCheckWarning) warnings.push(instructorCheckWarning);

    const class1MedicalWarning = checkComplianceField(
      instructorCompliance.class_1_medical_due_date,
      'Instructor Class 1 Medical',
      'instructor'
    );
    if (class1MedicalWarning) warnings.push(class1MedicalWarning);
  }

  // Check user compliance
  if (userCompliance && userId) {
    const userClass1Warning = checkComplianceField(
      userCompliance.class_1_medical_due,
      'Student Class 1 Medical',
      'user'
    );
    if (userClass1Warning) warnings.push(userClass1Warning);

    const userClass2Warning = checkComplianceField(
      userCompliance.class_2_medical_due,
      'Student Class 2 Medical',
      'user'
    );
    if (userClass2Warning) warnings.push(userClass2Warning);

    const dl9Warning = checkComplianceField(
      userCompliance.DL9_due,
      'Student DL9',
      'user'
    );
    if (dl9Warning) warnings.push(dl9Warning);

    const bfrWarning = checkComplianceField(
      userCompliance.BFR_due,
      'Student BFR',
      'user'
    );
    if (bfrWarning) warnings.push(bfrWarning);

    const licenseWarning = checkComplianceField(
      userCompliance.pilot_license_expiry,
      'License Expires',
      'user'
    );
    if (licenseWarning) warnings.push(licenseWarning);
  }

  // Don't render if no warnings
  if (warnings.length === 0) return null;

  // Sort by severity: expired > due_soon, then by days remaining
  const sortedWarnings = warnings.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'expired' ? -1 : 1;
    }
    return a.daysRemaining - b.daysRemaining;
  });

  // Separate expired and due soon warnings
  const expiredWarnings = sortedWarnings.filter(w => w.status === 'expired');
  const dueSoonWarnings = sortedWarnings.filter(w => w.status === 'due_soon');

  return (
    <div className={`border-l-4 p-2 rounded ${
      expiredWarnings.length > 0 ? 'bg-red-50 border-red-600' : 'bg-amber-50 border-amber-600'
    }`}>
      <div className="flex items-start gap-2">
        <span className="text-sm mt-0.5">⚠️</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <span className={`font-semibold text-xs ${
              expiredWarnings.length > 0 ? 'text-red-900' : 'text-amber-900'
            }`}>
              Compliance:
            </span>
            {expiredWarnings.map((warning, idx) => (
              <span key={`expired-${idx}`} className="text-xs text-red-800">
                {warning.message}
                <span className="ml-1 px-1 py-0.5 rounded text-[9px] font-semibold bg-red-200 text-red-900">
                  EXPIRED
                </span>
              </span>
            ))}
            {dueSoonWarnings.map((warning, idx) => (
              <span key={`due-${idx}`} className="text-xs text-amber-800">
                {expiredWarnings.length > 0 || idx > 0 ? ' • ' : ''}
                {warning.message}
                <span className="ml-1 px-1 py-0.5 rounded text-[9px] font-semibold bg-amber-200 text-amber-900">
                  DUE SOON
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
