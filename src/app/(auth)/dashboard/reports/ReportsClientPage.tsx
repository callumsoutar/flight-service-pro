"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileDown, Calendar, Plane, FileText, DollarSign, GraduationCap, Users, ChevronLeft, CalendarIcon, Wrench, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/SupabaseBrowserClient";

interface Aircraft {
  id: string;
  registration: string;
  type: string;
}

interface MaintenanceCostReport {
  aircraft_id: string;
  registration: string;
  aircraft_type: string;
  total_maintenance_cost: number;
  visit_count: number;
  avg_cost_per_visit: number;
  cost_per_hour: number;
  total_hours: number;
  last_maintenance_date: string;
  cost_by_type: Record<string, number>;
}

interface MaintenanceFrequencyReport {
  aircraft_id: string;
  registration: string;
  visit_count: number;
  avg_days_between_visits: number;
  avg_maintenance_duration_hours: number;
  total_days_in_maintenance: number;
  first_visit_date: string;
  last_visit_date: string;
  visit_details: Array<{
    visit_date: string;
    duration_hours: number;
    days_since_last: number | null;
  }>;
}

interface ComponentTimingReport {
  aircraft_id: string;
  registration: string;
  component_id: string;
  component_name: string;
  component_type: string;
  visit_date: string;
  hours_at_service: number;
  hours_due_at_service: number;
  timing_difference_hours: number;
  timing_status: 'EARLY' | 'LATE' | 'ON_TIME';
  visit_type: string;
  description: string;
}

interface ReportsClientPageProps {
  aircraft: Aircraft[];
}

type ReportType = "selector" | "tech-log" | "flying-sheet" | "transactions" | "instructor" | "trial-flights" | "maintenance-cost" | "maintenance-frequency" | "component-timing";

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
    color: "text-[#6564db]",
    bgColor: "bg-[#89d2dc]/10",
  },
  {
    id: "trial-flights" as const,
    title: "Trial Flights",
    description: "Trial flight bookings, conversion rates, and prospect engagement",
    icon: Users,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
  },
  {
    id: "maintenance-cost" as const,
    title: "Maintenance Cost Analysis",
    description: "Compare maintenance costs across aircraft with detailed breakdown",
    icon: Wrench,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    id: "maintenance-frequency" as const,
    title: "Maintenance Frequency",
    description: "Analyze how often aircraft visit maintenance and duration",
    icon: Clock,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    id: "component-timing" as const,
    title: "Component Timing Analysis",
    description: "Track component service timing vs due dates (early/late)",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
];

export default function ReportsClientPage({ aircraft }: ReportsClientPageProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>("selector");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedAircraft, setSelectedAircraft] = useState<string>("all");
  const [reportData, setReportData] = useState<Array<MaintenanceCostReport | MaintenanceFrequencyReport | ComponentTimingReport | Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>("report_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const supabase = createClient();

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Convert local date selections to UTC timestamp range
      const startOfDayLocal = new Date(startDate);
      startOfDayLocal.setHours(0, 0, 0, 0);

      const endOfDayLocal = new Date(endDate);
      endOfDayLocal.setHours(23, 59, 59, 999);

      let rpcFunction = "";
      switch (selectedReport) {
        case "tech-log":
          rpcFunction = "get_tech_log_reports";
          break;
        case "maintenance-cost":
          rpcFunction = "get_aircraft_maintenance_cost_report";
          break;
        case "maintenance-frequency":
          rpcFunction = "get_maintenance_frequency_report";
          break;
        case "component-timing":
          rpcFunction = "get_component_timing_report";
          break;
        default:
          throw new Error("Unknown report type");
      }

      const { data, error: rpcError } = await supabase.rpc(rpcFunction, {
        p_aircraft_id: selectedAircraft === "all" ? null : selectedAircraft,
        p_start_date: startOfDayLocal.toISOString(),
        p_end_date: endOfDayLocal.toISOString(),
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

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedData = [...reportData].sort((a, b) => {
    const aData = a as Record<string, unknown>;
    const bData = b as Record<string, unknown>;
    const aValue = aData[sortColumn];
    const bValue = bData[sortColumn];

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

    let headers: string[] = [];
    let rows: Array<Array<string>> = [];
    let filename = "";

    switch (selectedReport) {
      case "tech-log":
        headers = [
          "Date", "Aircraft", "Daily Hobbs", "Daily Tacho", "Credited Time",
          "Flight Count", "Method", "Total Hours Start", "Total Hours End", "End of Day Tach"
        ];
        rows = reportData.map((row) => {
          const data = row as Record<string, unknown>;
          return [
            format(new Date(data.report_date as string), "yyyy-MM-dd"),
            String(data.registration || ''),
            String(data.daily_hobbs_time || ''),
            String(data.daily_tach_time || ''),
            String(data.daily_credited_time || ''),
            String(data.flight_count || '0'),
            String(data.total_time_method || ''),
            String(data.total_hours_start_of_day || ''),
            String(data.total_hours_end_of_day || ''),
            String(data.end_of_day_tach || ''),
          ];
        });
        filename = `tech-log-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
        break;

      case "maintenance-cost":
        headers = [
          "Aircraft", "Type", "Total Cost", "Visit Count", "Avg Cost/Visit",
          "Cost/Hour", "Total Hours", "Last Maintenance", "Cost Breakdown"
        ];
        rows = (reportData as MaintenanceCostReport[]).map((row) => [
          row.registration,
          row.aircraft_type,
          row.total_maintenance_cost ? row.total_maintenance_cost.toFixed(2) : '0.00',
          row.visit_count ? row.visit_count.toString() : '0',
          row.avg_cost_per_visit ? row.avg_cost_per_visit.toFixed(2) : '0.00',
          row.cost_per_hour ? row.cost_per_hour.toFixed(4) : '0.0000',
          row.total_hours ? row.total_hours.toFixed(1) : '0.0',
          row.last_maintenance_date ? format(new Date(row.last_maintenance_date), "yyyy-MM-dd") : "N/A",
          JSON.stringify(row.cost_by_type || {})
        ]);
        filename = `maintenance-cost-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
        break;

      case "maintenance-frequency":
        headers = [
          "Aircraft", "Visit Count", "Avg Days Between", "Avg Duration (hrs)",
          "Total Days in Maintenance", "First Visit", "Last Visit"
        ];
        rows = (reportData as MaintenanceFrequencyReport[]).map((row) => [
          row.registration,
          row.visit_count.toString(),
          row.avg_days_between_visits ? row.avg_days_between_visits.toFixed(1) : '0.0',
          row.avg_maintenance_duration_hours ? row.avg_maintenance_duration_hours.toFixed(1) : '0.0',
          row.total_days_in_maintenance ? row.total_days_in_maintenance.toFixed(1) : '0.0',
          row.first_visit_date ? format(new Date(row.first_visit_date), "yyyy-MM-dd") : "N/A",
          row.last_visit_date ? format(new Date(row.last_visit_date), "yyyy-MM-dd") : "N/A"
        ]);
        filename = `maintenance-frequency-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
        break;

      case "component-timing":
        headers = [
          "Aircraft", "Component", "Type", "Visit Date", "Hours at Service",
          "Hours Due", "Difference", "Status", "Visit Type", "Description"
        ];
        rows = (reportData as ComponentTimingReport[]).map((row) => [
          row.registration,
          row.component_name,
          row.component_type,
          format(new Date(row.visit_date), "yyyy-MM-dd"),
          row.hours_at_service ? row.hours_at_service.toFixed(1) : '0.0',
          row.hours_due_at_service ? row.hours_due_at_service.toFixed(1) : '0.0',
          row.timing_difference_hours ? row.timing_difference_hours.toFixed(1) : '0.0',
          row.timing_status,
          row.visit_type,
          row.description
        ]);
        filename = `component-timing-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
        break;

      default:
        return;
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
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
                    <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-[#6564db] transition-colors">
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6564db] mx-auto"></div>
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
                    <TableHead
                      className="cursor-pointer hover:bg-slate-50 text-right"
                      onClick={() => handleSort("end_of_day_tach")}
                    >
                      End Tach {sortColumn === "end_of_day_tach" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((row, index) => {
                    const data = row as Record<string, unknown>;
                    return (
                      <TableRow key={`${data.aircraft_id}-${data.report_date}-${index}`}>
                        <TableCell className="font-medium">
                          {format(new Date(data.report_date as string), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{String(data.registration || '')}</TableCell>
                        <TableCell className="text-right">{parseFloat(String(data.daily_tach_time || 0)).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {parseFloat(String(data.daily_credited_time || 0)).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">{parseFloat(String(data.total_hours_end_of_day || 0)).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{parseFloat(String(data.end_of_day_tach || 0)).toFixed(1)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      ) : selectedReport === "maintenance-cost" ? (
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
                        onSelect={(date) => date && setStartDate(date)}
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
                  <Wrench className="w-5 h-5" />
                  Maintenance Cost Analysis
                </span>
                {reportData.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {reportData.length} aircraft analyzed
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6564db] mx-auto"></div>
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
                  <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
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
                          onClick={() => handleSort("registration")}
                        >
                          Aircraft {sortColumn === "registration" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => handleSort("aircraft_type")}
                        >
                          Type {sortColumn === "aircraft_type" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50 text-right"
                          onClick={() => handleSort("total_maintenance_cost")}
                        >
                          Total Cost {sortColumn === "total_maintenance_cost" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50 text-right"
                          onClick={() => handleSort("visit_count")}
                        >
                          Visits {sortColumn === "visit_count" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50 text-right"
                          onClick={() => handleSort("avg_cost_per_visit")}
                        >
                          Avg Cost/Visit {sortColumn === "avg_cost_per_visit" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50 text-right"
                          onClick={() => handleSort("cost_per_hour")}
                        >
                          Cost/Hour {sortColumn === "cost_per_hour" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50 text-right"
                          onClick={() => handleSort("total_hours")}
                        >
                          Total Hours {sortColumn === "total_hours" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedData.map((item, index) => {
                        const row = item as MaintenanceCostReport;
                        return (
                          <TableRow key={`${row.aircraft_id}-${index}`}>
                            <TableCell className="font-medium">{row.registration}</TableCell>
                            <TableCell>{row.aircraft_type}</TableCell>
                            <TableCell className="text-right font-medium">
                              ${row.total_maintenance_cost ? row.total_maintenance_cost.toFixed(2) : '0.00'}
                            </TableCell>
                            <TableCell className="text-right">{row.visit_count || 0}</TableCell>
                            <TableCell className="text-right">
                              ${row.avg_cost_per_visit ? row.avg_cost_per_visit.toFixed(2) : '0.00'}
                            </TableCell>
                            <TableCell className="text-right">
                              ${row.cost_per_hour ? row.cost_per_hour.toFixed(4) : '0.0000'}
                            </TableCell>
                            <TableCell className="text-right">{row.total_hours ? row.total_hours.toFixed(1) : '0.0'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : selectedReport === "maintenance-frequency" ? (
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
                        onSelect={(date) => date && setStartDate(date)}
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
                  <Clock className="w-5 h-5" />
                  Maintenance Frequency Analysis
                </span>
                {reportData.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {reportData.length} aircraft analyzed
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6564db] mx-auto"></div>
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
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
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
                          onClick={() => handleSort("registration")}
                        >
                          Aircraft {sortColumn === "registration" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50 text-right"
                          onClick={() => handleSort("visit_count")}
                        >
                          Visit Count {sortColumn === "visit_count" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50 text-right"
                          onClick={() => handleSort("avg_days_between_visits")}
                        >
                          Avg Days Between {sortColumn === "avg_days_between_visits" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50 text-right"
                          onClick={() => handleSort("avg_maintenance_duration_hours")}
                        >
                          Avg Duration (hrs) {sortColumn === "avg_maintenance_duration_hours" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50 text-right"
                          onClick={() => handleSort("total_days_in_maintenance")}
                        >
                          Total Days in Maintenance {sortColumn === "total_days_in_maintenance" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => handleSort("first_visit_date")}
                        >
                          First Visit {sortColumn === "first_visit_date" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => handleSort("last_visit_date")}
                        >
                          Last Visit {sortColumn === "last_visit_date" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedData.map((item, index) => {
                        const row = item as MaintenanceFrequencyReport;
                        return (
                          <TableRow key={`${row.aircraft_id}-${index}`}>
                            <TableCell className="font-medium">{row.registration}</TableCell>
                            <TableCell className="text-right">{row.visit_count}</TableCell>
                            <TableCell className="text-right">
                              {row.avg_days_between_visits ? row.avg_days_between_visits.toFixed(1) : '0.0'}
                            </TableCell>
                            <TableCell className="text-right">
                              {row.avg_maintenance_duration_hours ? row.avg_maintenance_duration_hours.toFixed(1) : '0.0'}
                            </TableCell>
                            <TableCell className="text-right">
                              {row.total_days_in_maintenance ? row.total_days_in_maintenance.toFixed(1) : '0.0'}
                            </TableCell>
                            <TableCell>
                              {row.first_visit_date ? format(new Date(row.first_visit_date), "MMM d, yyyy") : "N/A"}
                            </TableCell>
                            <TableCell>
                              {row.last_visit_date ? format(new Date(row.last_visit_date), "MMM d, yyyy") : "N/A"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : selectedReport === "component-timing" ? (
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
                        onSelect={(date) => date && setStartDate(date)}
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
                  <AlertTriangle className="w-5 h-5" />
                  Component Timing Analysis
                </span>
                {reportData.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {reportData.length} component services analyzed
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6564db] mx-auto"></div>
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
                  <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
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
                          onClick={() => handleSort("registration")}
                        >
                          Aircraft {sortColumn === "registration" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => handleSort("component_name")}
                        >
                          Component {sortColumn === "component_name" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => handleSort("component_type")}
                        >
                          Type {sortColumn === "component_type" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => handleSort("visit_date")}
                        >
                          Visit Date {sortColumn === "visit_date" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50 text-right"
                          onClick={() => handleSort("hours_at_service")}
                        >
                          Hours at Service {sortColumn === "hours_at_service" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50 text-right"
                          onClick={() => handleSort("hours_due_at_service")}
                        >
                          Hours Due {sortColumn === "hours_due_at_service" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50 text-right"
                          onClick={() => handleSort("timing_difference_hours")}
                        >
                          Difference {sortColumn === "timing_difference_hours" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => handleSort("timing_status")}
                        >
                          Status {sortColumn === "timing_status" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedData.map((item, index) => {
                        const row = item as ComponentTimingReport;
                        return (
                          <TableRow key={`${row.component_id}-${row.visit_date}-${index}`}>
                            <TableCell className="font-medium">{row.registration}</TableCell>
                            <TableCell>{row.component_name}</TableCell>
                            <TableCell className="capitalize">{row.component_type}</TableCell>
                            <TableCell>
                              {format(new Date(row.visit_date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-right">{row.hours_at_service ? row.hours_at_service.toFixed(1) : '0.0'}</TableCell>
                            <TableCell className="text-right">{row.hours_due_at_service ? row.hours_due_at_service.toFixed(1) : '0.0'}</TableCell>
                            <TableCell className="text-right font-medium">
                              <span className={`${
                                row.timing_status === 'EARLY' ? 'text-green-600' :
                                row.timing_status === 'LATE' ? 'text-red-600' :
                                'text-blue-600'
                              }`}>
                                {row.timing_difference_hours > 0 ? '+' : ''}{row.timing_difference_hours ? row.timing_difference_hours.toFixed(1) : '0.0'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                row.timing_status === 'EARLY' ? 'bg-green-100 text-green-800' :
                                row.timing_status === 'LATE' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {row.timing_status}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
