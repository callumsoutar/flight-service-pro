"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileDown, Calendar, Plane, FileText, DollarSign, GraduationCap, Users, ChevronLeft, CalendarIcon } from "lucide-react";
import { format, subDays } from "date-fns";
import { createClient } from "@/lib/SupabaseBrowserClient";

interface Aircraft {
  id: string;
  registration: string;
  type: string;
}

interface TechLogReport {
  aircraft_id: string;
  registration: string;
  report_date: string;
  daily_hobbs_time: string;
  daily_tach_time: string;
  daily_credited_time: string;
  flight_count: number;
  total_time_method: string;
  total_hours_start_of_day: string;
  total_hours_end_of_day: string;
}

interface ReportsClientPageProps {
  aircraft: Aircraft[];
}

type ReportType = "selector" | "tech-log" | "flying-sheet" | "transactions" | "instructor" | "trial-flights";

const REPORT_TYPES = [
  {
    id: "tech-log" as const,
    title: "Aircraft Tech Log",
    description: "Daily aircraft hours, maintenance tracking, and flight logs",
    icon: Plane,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "flying-sheet" as const,
    title: "Daily Flying Sheet",
    description: "Daily flying activities, pilot hours, and aircraft utilization",
    icon: FileText,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    id: "transactions" as const,
    title: "Transaction Report",
    description: "Financial transactions, payments, and billing information",
    icon: DollarSign,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  {
    id: "instructor" as const,
    title: "Instructor Report",
    description: "Instructor activity, student progress, and instructional hours",
    icon: GraduationCap,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    id: "trial-flights" as const,
    title: "Trial Flights",
    description: "Trial flight bookings, conversion rates, and prospect engagement",
    icon: Users,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
  },
];

export default function ReportsClientPage({ aircraft }: ReportsClientPageProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>("selector");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedAircraft, setSelectedAircraft] = useState<string>("all");
  const [reportData, setReportData] = useState<TechLogReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof TechLogReport>("report_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const supabase = createClient();

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("get_tech_log_reports", {
        p_aircraft_id: selectedAircraft === "all" ? null : selectedAircraft,
        p_start_date: format(startDate, "yyyy-MM-dd"),
        p_end_date: format(endDate, "yyyy-MM-dd"),
      });

      if (rpcError) {
        throw rpcError;
      }

      setReportData(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch report data");
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: keyof TechLogReport) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedData = [...reportData].sort((a, b) => {
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    const multiplier = sortDirection === "asc" ? 1 : -1;

    if (typeof aValue === "string" && typeof bValue === "string") {
      return aValue.localeCompare(bValue) * multiplier;
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * multiplier;
    }

    return 0;
  });

  const exportToCSV = () => {
    if (reportData.length === 0) return;

    const headers = [
      "Date",
      "Aircraft",
      "Daily Hobbs",
      "Daily Tacho",
      "Credited Time",
      "Flight Count",
      "Method",
      "Total Hours Start",
      "Total Hours End",
    ];

    const rows = reportData.map((row) => [
      format(new Date(row.report_date), "yyyy-MM-dd"),
      row.registration,
      row.daily_hobbs_time,
      row.daily_tach_time,
      row.daily_credited_time,
      row.flight_count.toString(),
      row.total_time_method,
      row.total_hours_start_of_day,
      row.total_hours_end_of_day,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `tech-log-report-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Report Selector View
  if (selectedReport === "selector") {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-8">
          <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">REPORTS</p>
          <h1 className="text-3xl font-bold">All reports</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REPORT_TYPES.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className="text-left bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-150 group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg ${report.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${report.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                      {report.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {report.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Placeholder component for upcoming reports
  const PlaceholderReport = ({ title, description }: { title: string; description: string }) => (
    <Card>
      <CardContent className="py-12">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-500 text-sm">{description}</p>
        </div>
      </CardContent>
    </Card>
  );

  // Find current report details
  const currentReportType = REPORT_TYPES.find((r) => r.id === selectedReport);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedReport("selector")}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Reports
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentReportType && (
            <>
              <div className={`w-10 h-10 rounded-lg ${currentReportType.bgColor} flex items-center justify-center`}>
                <currentReportType.icon className={`w-5 h-5 ${currentReportType.color}`} />
              </div>
              <h1 className="text-2xl font-bold">{currentReportType.title}</h1>
            </>
          )}
        </div>
      </div>

      {selectedReport === "tech-log" ? (
        <div className="space-y-6">
      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "dd MMM yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, "dd MMM yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aircraft">Aircraft</Label>
              <Select value={selectedAircraft} onValueChange={setSelectedAircraft}>
                <SelectTrigger id="aircraft">
                  <SelectValue placeholder="Select aircraft" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Aircraft</SelectItem>
                  {aircraft.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.registration}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={fetchReportData}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Generating..." : "Generate Report"}
              </Button>
              <Button
                onClick={exportToCSV}
                variant="outline"
                disabled={reportData.length === 0}
                className="px-3"
              >
                <FileDown className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Plane className="w-5 h-5" />
              Report Results
            </span>
            {reportData.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {reportData.length} record{reportData.length !== 1 ? "s" : ""} found
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading report data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchReportData} variant="outline">
                Retry
              </Button>
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-12">
              <Plane className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No data found</p>
              <p className="text-gray-500 text-sm mt-1">
                Select filters and click &quot;Generate Report&quot; to view data
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => handleSort("report_date")}
                    >
                      Date {sortColumn === "report_date" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => handleSort("registration")}
                    >
                      Aircraft {sortColumn === "registration" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-50 text-right"
                      onClick={() => handleSort("daily_tach_time")}
                    >
                      Daily Tacho {sortColumn === "daily_tach_time" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-50 text-right"
                      onClick={() => handleSort("daily_credited_time")}
                    >
                      Credited Time {sortColumn === "daily_credited_time" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-50 text-right"
                      onClick={() => handleSort("total_hours_end_of_day")}
                    >
                      Total Hours {sortColumn === "total_hours_end_of_day" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((row, index) => (
                    <TableRow key={`${row.aircraft_id}-${row.report_date}-${index}`}>
                      <TableCell className="font-medium">
                        {format(new Date(row.report_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{row.registration}</TableCell>
                      <TableCell className="text-right">{parseFloat(row.daily_tach_time).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {parseFloat(row.daily_credited_time).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{parseFloat(row.total_hours_end_of_day).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      ) : selectedReport === "flying-sheet" ? (
        <PlaceholderReport
          title="Daily Flying Sheet"
          description="View and export daily flying activities including pilot hours, aircraft utilization, and flight details."
        />
      ) : selectedReport === "transactions" ? (
        <PlaceholderReport
          title="Transaction Report"
          description="Analyze financial transactions, payments, and billing information across all members and activities."
        />
      ) : selectedReport === "instructor" ? (
        <PlaceholderReport
          title="Instructor Report"
          description="Track instructor activity, student progress, and instructional hours logged by each instructor."
        />
      ) : selectedReport === "trial-flights" ? (
        <PlaceholderReport
          title="Trial Flights Report"
          description="Monitor trial flight bookings, conversion rates, and prospective member engagement."
        />
      ) : null}
    </div>
  );
}
