"use client";
import * as React from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

interface BookingHistoryCollapseProps {
  bookingId: string;
  organizationId: string;
  lessons: { id: string; name: string }[];
}

interface AuditLog {
  id: string;
  table_name: string;
  row_id: string;
  action: string;
  changed_by?: string | null;
  changed_at: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  column_changes?: Record<string, { old: unknown; new: unknown }> | null;
  organization_id?: string | null;
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
};
const IGNORED_FIELDS = ['updated_at', 'created_at', 'organization_id', 'id', 'user_id'];
const FIELD_PRIORITY = [
  'start_time',
  'end_time',
  'status',
  'lesson_id',
  'aircraft_id',
  'instructor_id',
  'remarks',
  'purpose',
];

export default function BookingHistoryCollapse({ bookingId, organizationId, lessons }: BookingHistoryCollapseProps) {
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
      fetch(`/api/audit_logs?row_id=${bookingId}&organization_id=${organizationId}`)
        .then(res => res.json())
        .then(async (data: AuditLog[] | { error: string }) => {
          if (!Array.isArray(data) && data.error) throw new Error(data.error);
          if (!Array.isArray(data)) return;
          setLogs(data);
          // Fetch user names for changed_by
          const userIds = Array.from(new Set(data.map((log: AuditLog) => log.changed_by).filter(Boolean)));
          if (userIds.length > 0) {
            const usersRes = await fetch(`/api/members?ids=${userIds.join(",")}`);
            const usersData: User[] = await usersRes.json();
            const userMap: Record<string, User> = {};
            usersData.forEach((u: User) => {
              userMap[u.id] = u;
            });
            setUsers(userMap);
          }
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [open, bookingId, organizationId, logs.length, loading]);

  function renderDescription(log: AuditLog) {
    if (log.action === "INSERT") return "Booking Created";
    if (log.action === "DELETE") return "Booking Deleted";
    if (log.action === "UPDATE" && log.column_changes) {
      for (const field of FIELD_PRIORITY) {
        if (log.column_changes[field] && !IGNORED_FIELDS.includes(field)) {
          const label = FIELD_LABELS[field] || field.replace(/_/g, ' ');
          let oldDisplay = '—';
          let newDisplay = '—';
          const value = log.column_changes[field];
          if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
            oldDisplay = value.old as string;
            newDisplay = value.new as string;
            // Format times
            if ((field === 'start_time' || field === 'end_time') && typeof oldDisplay === 'string' && typeof newDisplay === 'string') {
              oldDisplay = new Date(oldDisplay).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              newDisplay = new Date(newDisplay).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            // Map lesson_id to lesson name
            if (field === 'lesson_id') {
              const oldLesson = lessons.find((l: { id: string; name: string }) => l.id === value.old);
              const newLesson = lessons.find((l: { id: string; name: string }) => l.id === value.new);
              oldDisplay = oldLesson ? oldLesson.name : oldDisplay;
              newDisplay = newLesson ? newLesson.name : newDisplay;
            }
          }
          return `${label} changed from "${oldDisplay}" to "${newDisplay}"`;
        }
      }
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
                          {new Date(log.changed_at).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
                        </TableCell>
                        <TableCell className="align-top text-xs font-medium text-primary whitespace-nowrap">
                          {log.changed_by && users[log.changed_by] ? `${users[log.changed_by].first_name} ${users[log.changed_by].last_name}` : <span className="text-muted-foreground">Unknown</span>}
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