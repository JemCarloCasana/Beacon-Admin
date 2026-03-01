import { formatDurationSeconds, toReportsOverviewModel } from "@/models/reports.model";

describe("reports.model", () => {
  it("returns safe defaults for empty payload", () => {
    const result = toReportsOverviewModel(null);

    expect(result.cards).toHaveLength(3);
    expect(result.kpis).toEqual({
      totalIncidents: 0,
      activeIncidents: 0,
      resolvedIncidents: 0,
      activeSOS: 0,
      avgResponseSeconds: 0,
      avgResolutionSeconds: 0,
    });
    expect(result.charts.incidentsByStatus).toEqual([]);
    expect(result.charts.incidentsByPriority).toEqual([]);
    expect(result.charts.incidentsTrend).toEqual([]);
    expect(result.charts.responseTimeTrend).toEqual([]);
  });

  it("coerces kpis and maps cards/charts from backend payload", () => {
    const result = toReportsOverviewModel({
      generated_at: "2026-03-01T08:00:00.000Z",
      cards: [
        {
          report_key: "daily_incident_summary",
          last_generated_at: "2026-03-01T07:00:00.000Z",
        },
      ],
      kpis: {
        total_incidents: "10",
        active_incidents: 3,
        resolved_incidents: "5",
        active_sos: "2",
        avg_response_seconds: "61",
        avg_resolution_seconds: "3600",
      },
      charts: {
        incidents_by_status: [{ label: "pending", value: "4" }],
        incidents_by_priority: [{ label: "high", value: 2 }],
        incidents_trend: [{ bucket: "2026-03-01T00:00:00.000Z", incidents: "1", sos: "2" }],
        response_time_trend: [
          {
            bucket: "2026-03-01T00:00:00.000Z",
            avg_response_seconds: "45",
            avg_resolution_seconds: "90",
          },
        ],
      },
    });

    expect(result.cards[0].reportKey).toBe("daily_incident_summary");
    expect(result.cards[0].lastGeneratedAt).toBe("2026-03-01T07:00:00.000Z");
    expect(result.kpis.totalIncidents).toBe(10);
    expect(result.kpis.avgResponseSeconds).toBe(61);
    expect(result.charts.incidentsByStatus[0]).toEqual({ label: "pending", value: 4 });
    expect(result.charts.responseTimeTrend[0].avg_resolution_seconds).toBe(90);
  });

  it("formats seconds to compact human-readable text", () => {
    expect(formatDurationSeconds(0)).toBe("0s");
    expect(formatDurationSeconds(75)).toBe("1m 15s");
    expect(formatDurationSeconds(5400)).toBe("1h 30m");
  });
});
