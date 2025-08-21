import { useEffect, useState } from "react";
import { User } from "@/types/users";
import { Card } from "@/components/ui/card";
import { Table, TableHead, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { Clock } from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  changed_by: string;
  changed_at: string;
  details: string;
}

interface MemberHistoryTabProps {
  member: User;
}

export default function MemberHistoryTab({ member }: MemberHistoryTabProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/members/${member.id}/audit-log`)
      .then((res) => res.json())
      .then((data) => setLogs(data.logs || []))
      .finally(() => setLoading(false));
  }, [member.id]);

  return (
    <Card className="mt-4 rounded-md">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">History / Audit Log</h2>
      </div>
      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-muted-foreground">No audit log entries found for this member.</div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Details</TableCell>
              <TableCell>By</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{new Date(log.changed_at).toLocaleString()}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.details}</TableCell>
                <TableCell>{log.changed_by}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
} 