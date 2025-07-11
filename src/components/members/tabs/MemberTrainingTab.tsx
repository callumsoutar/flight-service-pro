import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

// Type for exam result with joined exam and syllabus
interface ExamResultWithExamSyllabus {
  id: string;
  exam_id: string;
  user_id: string;
  score?: number | null;
  result: 'PASS' | 'FAIL';
  date_completed?: string | null;
  kdrs_completed?: boolean | null;
  kdrs_signed_by?: string | null;
  organization_id: string;
  created_at: string;
  exam?: {
    id: string;
    name: string;
    syllabus_id: string;
    syllabus?: {
      id: string;
      name: string;
    };
  };
}

export default function MemberTrainingTab({ memberId }: { memberId: string }) {
  const [examResults, setExamResults] = useState<ExamResultWithExamSyllabus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/exam_results?user_id=${memberId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch");
        }
        return res.json();
      })
      .then((data) => {
        setExamResults(data.exam_results || []);
      })
      .catch((err) => {
        setError(err.message || "Unknown error");
      })
      .finally(() => setLoading(false));
  }, [memberId]);

  return (
    <Card className="w-full">
      <CardContent className="py-4 px-2 sm:px-6 w-full">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Results</h3>
          <div className="mb-2">
            {loading ? (
              <div className="text-muted-foreground py-8 text-center">Loading exam results...</div>
            ) : error ? (
              <div className="text-destructive py-8 text-center">{error}</div>
            ) : examResults.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">No exam results found for this member.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam</TableHead>
                      <TableHead>Syllabus</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Date Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examResults.map((row, i) => (
                      <TableRow key={row.id || i} className={row.result === "FAIL" ? "bg-red-50" : ""}>
                        <TableCell>{row.exam?.name || "-"}</TableCell>
                        <TableCell>{row.exam?.syllabus?.name || "-"}</TableCell>
                        <TableCell>{row.score != null ? `${row.score}%` : "-"}</TableCell>
                        <TableCell>
                          <span className={row.result === "PASS" ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
                            {row.result}
                          </span>
                        </TableCell>
                        <TableCell>{row.date_completed || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
