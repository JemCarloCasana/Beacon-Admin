import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useExportReportCsv, useGenerateReport, useReportsOverview } from "@/api/useReportsAPI";
import { REPORT_CARD_CONFIG, formatDurationSeconds, toReportsOverviewModel } from "@/models/reports.model";
import { Download, Calendar, FileText, BarChart3 } from "lucide-react";
import {
  Bar as RechartsBar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Line as RechartsLine,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
} from "recharts";

const DEFAULT_RANGE = "7d";
const REPORT_TIMEZONE = "Asia/Manila";

const ICONS = {
  FileText,
  Calendar,
  BarChart3,
};

const CHART_CONFIG = {
  incidents: { label: "Incidents", color: "hsl(var(--primary))" },
  sos: { label: "SOS", color: "hsl(var(--warning))" },
  avg_response_seconds: { label: "Avg Response (s)", color: "hsl(var(--info))" },
  avg_resolution_seconds: { label: "Avg Resolution (s)", color: "hsl(var(--success))" },
  value: { label: "Count", color: "hsl(var(--primary))" },
};

function formatLastGenerated(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return formatDistanceToNow(date, { addSuffix: true });
}

function formatChartBucket(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

function buildCsvFilename(range) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `beacon-report-${range}-${y}${m}${d}-${hh}${mm}.csv`;
}

function downloadCsv(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function ReportsLoadingState() {
  return (
    <div className="space-y-6">
      <p className="sr-only">Loading reports...</p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {REPORT_CARD_CONFIG.map((item) => (
          <Card key={item.reportKey}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function Reports() {
  const { toast } = useToast();
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [generatingKey, setGeneratingKey] = useState(null);
  const [downloadingKey, setDownloadingKey] = useState(null);

  const overviewQuery = useReportsOverview({ range, timezone: REPORT_TIMEZONE });
  const generateMutation = useGenerateReport();
  const exportMutation = useExportReportCsv();

  const model = useMemo(() => toReportsOverviewModel(overviewQuery.data), [overviewQuery.data]);

  const hasChartData =
    model.charts.incidentsTrend.length > 0 ||
    model.charts.responseTimeTrend.length > 0 ||
    model.charts.incidentsByStatus.length > 0 ||
    model.charts.incidentsByPriority.length > 0;

  const handleGenerate = async (card) => {
    try {
      setGeneratingKey(card.reportKey);
      await generateMutation.mutateAsync({
        reportKey: card.reportKey,
        timezone: REPORT_TIMEZONE,
      });
      if (card.range !== range) {
        setRange(card.range);
      } else {
        await overviewQuery.refetch();
      }
      toast({
        title: "Report generated",
        description: `${card.title} has been refreshed.`,
      });
    } catch (error) {
      toast({
        title: "Failed to generate report",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingKey(null);
    }
  };

  const handleDownload = async (card) => {
    try {
      setDownloadingKey(card.reportKey);
      const csvContent = await exportMutation.mutateAsync({
        range: card.range,
        timezone: REPORT_TIMEZONE,
      });
      downloadCsv(csvContent, buildCsvFilename(card.range));
      toast({
        title: "CSV downloaded",
        description: `${card.title} was exported successfully.`,
      });
    } catch (error) {
      toast({
        title: "Failed to download CSV",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <DashboardLayout title="Reports" subtitle="Generate and export operational reports">
      {overviewQuery.isLoading ? (
        <ReportsLoadingState />
      ) : (
        <div className="space-y-6">
          {overviewQuery.isError && (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>{overviewQuery.error?.message || "Failed to load reports."}</span>
                <Button size="sm" variant="outline" onClick={() => overviewQuery.refetch()}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {model.cards.map((card) => {
              const Icon = ICONS[card.icon] || FileText;
              const isGenerating = generatingKey === card.reportKey;
              const isDownloading = downloadingKey === card.reportKey;

              return (
                <Card key={card.reportKey}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{card.title}</CardTitle>
                        <CardDescription className="text-xs">
                          Last generated: {formatLastGenerated(card.lastGeneratedAt)}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-sm text-muted-foreground">{card.description}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={isGenerating}
                        onClick={() => handleGenerate(card)}
                      >
                        {isGenerating ? "Generating..." : "Generate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Download ${card.title}`}
                        disabled={isDownloading}
                        onClick={() => handleDownload(card)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Incidents</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{model.kpis.totalIncidents}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Incidents</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{model.kpis.activeIncidents}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Resolved Incidents</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{model.kpis.resolvedIncidents}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active SOS</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{model.kpis.activeSOS}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {formatDurationSeconds(model.kpis.avgResponseSeconds)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Resolution</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {formatDurationSeconds(model.kpis.avgResolutionSeconds)}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>
                Incident and SOS trends for range <span className="font-medium">{range}</span> ({REPORT_TIMEZONE})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!hasChartData && !overviewQuery.isError && (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No analytics data available for selected range.
                </div>
              )}

              {hasChartData && (
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Incidents vs SOS Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={CHART_CONFIG} className="h-[260px] w-full">
                        <RechartsLineChart data={model.charts.incidentsTrend}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="bucket" tickFormatter={formatChartBucket} />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <RechartsLine type="monotone" dataKey="incidents" stroke="var(--color-incidents)" strokeWidth={2} />
                          <RechartsLine type="monotone" dataKey="sos" stroke="var(--color-sos)" strokeWidth={2} />
                        </RechartsLineChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Response and Resolution Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={CHART_CONFIG} className="h-[260px] w-full">
                        <RechartsLineChart data={model.charts.responseTimeTrend}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="bucket" tickFormatter={formatChartBucket} />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <RechartsLine
                            type="monotone"
                            dataKey="avg_response_seconds"
                            stroke="var(--color-avg_response_seconds)"
                            strokeWidth={2}
                          />
                          <RechartsLine
                            type="monotone"
                            dataKey="avg_resolution_seconds"
                            stroke="var(--color-avg_resolution_seconds)"
                            strokeWidth={2}
                          />
                        </RechartsLineChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Incidents by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={CHART_CONFIG} className="h-[260px] w-full">
                        <RechartsBarChart data={model.charts.incidentsByStatus}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <RechartsBar dataKey="value" fill="var(--color-value)" radius={4} />
                        </RechartsBarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Incidents by Priority</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={CHART_CONFIG} className="h-[260px] w-full">
                        <RechartsBarChart data={model.charts.incidentsByPriority}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <RechartsBar dataKey="value" fill="var(--color-value)" radius={4} />
                        </RechartsBarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
