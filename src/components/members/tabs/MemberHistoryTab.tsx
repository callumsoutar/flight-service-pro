"use client";
import { useEffect, useState } from "react";
import { User } from "@/types/users";
import { Card } from "@/components/ui/card";
import { Table, TableHead, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  user_id?: string | null;
  created_at: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  column_changes?: Record<string, { old: unknown; new: unknown }> | null;
}

interface UserInfo {
  id: string;
  first_name: string;
  last_name: string;
}

interface MemberHistoryTabProps {
  member: User;
}

// Field labels for user fields
const FIELD_LABELS: Record<string, string> = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  phone: 'Phone',
  date_of_birth: 'Date of Birth',
  gender: 'Gender',
  street_address: 'Street Address',
  city: 'City',
  state: 'State',
  postal_code: 'Postal Code',
  country: 'Country',
  next_of_kin_name: 'Next of Kin',
  next_of_kin_phone: 'Next of Kin Phone',
  emergency_contact_relationship: 'Emergency Contact Relationship',
  medical_certificate_expiry: 'Medical Certificate Expiry',
  pilot_license_number: 'License Number',
  pilot_license_type: 'License Type',
  pilot_license_expiry: 'License Expiry',
  is_active: 'Account Status',
  company_name: 'Company Name',
  occupation: 'Occupation',
  employer: 'Employer',
  notes: 'Notes',
  // account_balance removed - now calculated from transactions
  public_directory_opt_in: 'Public Directory',
  class_1_medical_due: 'Class 1 Medical Due',
  class_2_medical_due: 'Class 2 Medical Due',
  DL9_due: 'DL9 Due',
  BFR_due: 'BFR Due',
};

// Fields to ignore in audit display
const IGNORED_FIELDS = ['updated_at', 'created_at', 'id', 'password', 'avatar_url', 'profile_image_url'];

// Priority order for displaying changes
const FIELD_PRIORITY = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'is_active',
  'medical_certificate_expiry',
  'pilot_license_number',
  'pilot_license_expiry',
  'date_of_birth',
];

export default function MemberHistoryTab({ member }: MemberHistoryTabProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const logsToShow = showAll ? logs : logs.slice(0, 10);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // Fetch audit logs using the corrected API endpoint
    fetch(`/api/audit_logs?table_name=users&row_id=${member.id}&include_users=true`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch audit logs');
        }
        return res.json();
      })
      .then((data: { logs: AuditLog[]; users: Record<string, UserInfo> } | { error: string }) => {
        if ('error' in data) {
          throw new Error(data.error);
        }
        setLogs(data.logs || []);
        setUsers(data.users || {});
      })
      .catch((e) => {
        console.error('Error fetching audit logs:', e);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [member.id]);

  function formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string' && value === '') return '—';
    return String(value);
  }

  function formatDateValue(value: unknown): string {
    if (!value || typeof value !== 'string') return '—';
    try {
      return new Date(value).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' });
    } catch {
      return String(value);
    }
  }

  function formatCurrencyValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    const numValue = parseFloat(String(value));
    if (isNaN(numValue)) return '—';
    return `$${numValue.toFixed(2)}`;
  }

  function renderDescription(log: AuditLog): string {
    if (log.action === "INSERT") return "Member Account Created";
    if (log.action === "DELETE") return "Member Account Deleted";
    
    if (log.action === "UPDATE" && log.column_changes) {
      const changes: string[] = [];
      
      // Process changes in priority order
      for (const field of FIELD_PRIORITY) {
        if (log.column_changes[field] && !IGNORED_FIELDS.includes(field)) {
          const label = FIELD_LABELS[field] || field.replace(/_/g, ' ');
          const value = log.column_changes[field];
          
          if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
            let oldDisplay: string;
            let newDisplay: string;
            
            // Special formatting for different field types
            if (field === 'is_active') {
              oldDisplay = value.old ? 'Active' : 'Inactive';
              newDisplay = value.new ? 'Active' : 'Inactive';
              changes.push(`${label}: ${oldDisplay} → ${newDisplay}`);
              continue;
            } else if (field === 'public_directory_opt_in') {
              oldDisplay = value.old ? 'Visible' : 'Hidden';
              newDisplay = value.new ? 'Visible' : 'Hidden';
              changes.push(`${label}: ${oldDisplay} → ${newDisplay}`);
              continue;
            } else if (field === 'account_balance') {
              oldDisplay = formatCurrencyValue(value.old);
              newDisplay = formatCurrencyValue(value.new);
            } else if (field.includes('_date') || field.includes('_expiry') || field.includes('_due') || field === 'date_of_birth') {
              oldDisplay = formatDateValue(value.old);
              newDisplay = formatDateValue(value.new);
            } else {
              oldDisplay = formatValue(value.old);
              newDisplay = formatValue(value.new);
            }
            
            // Skip if no meaningful change
            if (oldDisplay === newDisplay || (oldDisplay === '—' && newDisplay === '—')) {
              continue;
            }
            
            changes.push(`${label}: ${oldDisplay} → ${newDisplay}`);
          }
        }
      }
      
      // If no priority fields changed, check other fields
      if (changes.length === 0) {
        const changedFields = Object.keys(log.column_changes).filter(
          (field) => !IGNORED_FIELDS.includes(field)
        );
        for (const field of changedFields) {
          const label = FIELD_LABELS[field] || field.replace(/_/g, ' ');
          const value = log.column_changes[field];
          
          if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
            let oldDisplay: string;
            let newDisplay: string;
            
            if (field.includes('_date') || field.includes('_expiry') || field.includes('_due')) {
              oldDisplay = formatDateValue(value.old);
              newDisplay = formatDateValue(value.new);
            } else {
              oldDisplay = formatValue(value.old);
              newDisplay = formatValue(value.new);
            }
            
            if (oldDisplay !== newDisplay && !(oldDisplay === '—' && newDisplay === '—')) {
              changes.push(`${label}: ${oldDisplay} → ${newDisplay}`);
            }
          }
        }
      }
      
      if (changes.length > 0) {
        return changes.join('; ');
      }
      
      return "Member Profile Updated";
    }
    
    // Fallback for logs without column_changes
    if (log.action === "UPDATE") {
      return "Member Profile Updated";
    }
    
    return log.action;
  }

  return (
    <Card className="mt-4 rounded-md p-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">History / Audit Log</h2>
      </div>
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading audit logs...</div>
      ) : error ? (
        <div className="py-8 text-center text-destructive">
          Error loading audit logs: {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No audit log entries found for this member.
        </div>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHead className="bg-muted/60">
                <TableRow>
                  <TableCell className="w-56 text-xs font-semibold text-muted-foreground">
                    Date & Time
                  </TableCell>
                  <TableCell className="w-48 text-xs font-semibold text-muted-foreground">
                    Changed By
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-muted-foreground">
                    Description
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logsToShow.map((log, i) => (
                  <TableRow key={log.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <TableCell className="align-top text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </TableCell>
                    <TableCell className="align-top text-xs font-medium text-primary whitespace-nowrap">
                      {log.user_id && users[log.user_id] ? (
                        `${users[log.user_id].first_name} ${users[log.user_id].last_name}`
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top text-xs text-gray-900">
                      {renderDescription(log)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {logs.length > 10 && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="text-xs"
              >
                {showAll ? "Show Less" : `View All (${logs.length} total)`}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
} 