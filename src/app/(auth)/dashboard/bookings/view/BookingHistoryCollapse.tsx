"use client";
import * as React from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

interface BookingHistoryCollapseProps {
  bookingId: string;
  lessons: { id: string; name: string }[];
}

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string; // Fixed: was row_id, now matches DB column
  action: string;
  user_id?: string | null; // Fixed: was changed_by, now matches DB column
  created_at: string; // Fixed: was changed_at, now matches DB column
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  column_changes?: Record<string, { old: unknown; new: unknown }> | null;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
}

// Field label and ignore lists
const FIELD_LABELS: Record<string, string> = {
  aircraft_id: 'Aircraft',
  instructor_id: 'Instructor',
  lesson_id: 'Lesson',
  start_time: 'Start Time',
  end_time: 'End Time',
  status: 'Status',
  remarks: 'Remarks',
  purpose: 'Description',
  booking_type: 'Booking Type',
  notes: 'Notes',
  cancellation_reason: 'Cancellation Reason',
  cancelled_notes: 'Cancellation Notes',
  authorization_override: 'Authorization Override',
  authorization_override_reason: 'Override Reason',
  voucher_number: 'Voucher Number',
};
const IGNORED_FIELDS = ['updated_at', 'created_at', 'id', 'user_id'];
const FIELD_PRIORITY = [
  'status',
  'start_time',
  'end_time',
  'aircraft_id',
  'instructor_id',
  'lesson_id',
  'booking_type',
  'purpose',
  'remarks',
  'notes',
  'cancellation_reason',
  'cancelled_notes',
  'authorization_override',
  'authorization_override_reason',
  'voucher_number',
];

export default function BookingHistoryCollapse({ bookingId, lessons }: BookingHistoryCollapseProps) {
  const [open, setOpen] = React.useState(false);
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [users, setUsers] = React.useState<Record<string, User>>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showAll, setShowAll] = React.useState(false);

  const logsToShow = showAll ? logs : logs.slice(0, 10);

  React.useEffect(() => {
    if (open && logs.length === 0 && !loading) {
      setLoading(true);
      // Fetch audit logs with user data in a single query
      fetch(`/api/audit_logs?row_id=${bookingId}&include_users=true`)
        .then(res => res.json())
        .then((data: { logs: AuditLog[]; users: Record<string, User> } | { error: string }) => {
          if ('error' in data) throw new Error(data.error);
          setLogs(data.logs || []);
          setUsers(data.users || {});
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [open, bookingId, logs.length, loading]);

  function formatValue(value: unknown, field: string): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string' && value === '') return '—';
    return String(value);
  }

  function formatTimeValue(value: unknown): string {
    if (!value || typeof value !== 'string') return '—';
    try {
      return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(value);
    }
  }

  function formatDateValue(value: unknown): string {
    if (!value || typeof value !== 'string') return '—';
    try {
      return new Date(value).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' });
    } catch {
      return String(value);
    }
  }

  function renderDescription(log: AuditLog): string {
    if (log.action === "INSERT") return "Booking Created";
    if (log.action === "DELETE") return "Booking Deleted";
    
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
            if (field === 'start_time' || field === 'end_time') {
              oldDisplay = formatTimeValue(value.old);
              newDisplay = formatTimeValue(value.new);
            } else if (field === 'status') {
              // Status changes are most important - format them nicely
              oldDisplay = formatValue(value.old, field);
              newDisplay = formatValue(value.new, field);
              changes.push(`${label}: ${oldDisplay} → ${newDisplay}`);
              continue;
            } else if (field === 'lesson_id') {
              const oldLesson = lessons.find((l: { id: string; name: string }) => l.id === value.old);
              const newLesson = lessons.find((l: { id: string; name: string }) => l.id === value.new);
              oldDisplay = oldLesson ? oldLesson.name : formatValue(value.old, field);
              newDisplay = newLesson ? newLesson.name : formatValue(value.new, field);
            } else if (field === 'authorization_override') {
              oldDisplay = formatValue(value.old, field);
              newDisplay = formatValue(value.new, field);
              if (newDisplay === 'Yes') {
                changes.push(`Authorization override enabled`);
                continue;
              } else {
                changes.push(`Authorization override disabled`);
                continue;
              }
            } else {
              oldDisplay = formatValue(value.old, field);
              newDisplay = formatValue(value.new, field);
            }
            
            // Skip if no meaningful change
            if (oldDisplay === newDisplay || (oldDisplay === '—' && newDisplay === '—')) {
              continue;
            }
            
            changes.push(`${label}: ${oldDisplay} → ${newDisplay}`);
          }
        }
      }
      
      if (changes.length > 0) {
        return changes.join('; ');
      }
      
      return "Booking Updated";
    }
    
    // Fallback for logs without column_changes
    if (log.action === "UPDATE") {
      return "Booking Updated";
    }
    
    return log.action;
  }

  return (
    <div className="w-full max-w-6xl mx-auto mt-2">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2 mb-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Booking History
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="rounded-xl border bg-muted/50 overflow-x-auto p-4">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading…</div>
            ) : error ? (
              <div className="py-8 text-center text-destructive">{error}</div>
            ) : logs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No history found.</div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow>
                      <TableHead className="w-56 text-xs font-semibold text-muted-foreground">Date</TableHead>
                      <TableHead className="w-56 text-xs font-semibold text-muted-foreground">User</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsToShow.map((log, i) => (
                      <TableRow key={log.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <TableCell className="align-top text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
                        </TableCell>
                        <TableCell className="align-top text-xs font-medium text-primary whitespace-nowrap">
                          {log.user_id && users[log.user_id] ? `${users[log.user_id].first_name} ${users[log.user_id].last_name}` : <span className="text-muted-foreground">Unknown</span>}
                        </TableCell>
                        <TableCell className="align-top text-xs text-gray-900 whitespace-pre-line">{renderDescription(log)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {logs.length > 10 && !showAll && (
                  <button
                    className="mt-2 text-xs text-blue-600 hover:underline font-medium"
                    onClick={() => setShowAll(true)}
                  >
                    View More
                  </button>
                )}
                {logs.length > 10 && showAll && (
                  <button
                    className="mt-2 text-xs text-blue-600 hover:underline font-medium"
                    onClick={() => setShowAll(false)}
                  >
                    Show Less
                  </button>
                )}
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
} 