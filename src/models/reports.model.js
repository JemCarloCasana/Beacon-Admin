export const REPORT_CARD_CONFIG = [
  {
    reportKey: "daily_safety_report",
    range: "24h",
    title: "Daily Safety Report",
    description: "Combined incident and SOS report for the last 24 hours",
    icon: "FileText",
  },
  {
    reportKey: "weekly_safety_report",
    range: "7d",
    title: "Weekly Safety Report",
    description: "Combined incident and SOS report for the past 7 days",
    icon: "BarChart3",
  },
  {
    reportKey: "monthly_safety_report",
    range: "30d",
    title: "Monthly Safety Report",
    description: "Comprehensive combined incident and SOS report for the past 30 days",
    icon: "Calendar",
  },
];

const CATEGORY_FREQUENCY_LIMIT = 5;

function toFiniteNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toSeriesArray(value) {
  return Array.isArray(value) ? value : [];
}

function toCardMap(cards) {
  const map = new Map();
  for (const card of toSeriesArray(cards)) {
    const key = card?.report_key || card?.key;
    if (!key) continue;
    map.set(String(key), card);
  }
  return map;
}

function normalizeDistributionSeries(series) {
  return toSeriesArray(series).map((row) => ({
    label: String(row?.label || "Unknown"),
    value: toFiniteNumber(row?.value, 0),
  }));
}

function normalizeTopDistributionSeries(series, limit = CATEGORY_FREQUENCY_LIMIT) {
  return normalizeDistributionSeries(series)
    .sort((left, right) => right.value - left.value)
    .slice(0, limit);
}

function normalizeIncidentTrend(series) {
  return toSeriesArray(series).map((row) => ({
    bucket: String(row?.bucket || ""),
    incidents: toFiniteNumber(row?.incidents, 0),
    sos: toFiniteNumber(row?.sos, 0),
  }));
}

function normalizeResponseTrend(series) {
  return toSeriesArray(series).map((row) => ({
    bucket: String(row?.bucket || ""),
    avg_response_seconds: toFiniteNumber(row?.avg_response_seconds, 0),
    avg_resolution_seconds: toFiniteNumber(row?.avg_resolution_seconds, 0),
  }));
}

export function formatDurationSeconds(value) {
  const total = toFiniteNumber(value, 0);
  if (total <= 0) return "0s";

  const rounded = Math.round(total);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function toReportsOverviewModel(raw) {
  const payload = raw && typeof raw === "object" ? raw : {};
  const cardsMap = toCardMap(payload.cards);

  return {
    generatedAt: payload.generated_at || null,
    range: payload.range || "7d",
    timezone: payload.timezone || "Asia/Manila",
    cards: REPORT_CARD_CONFIG.map((config) => {
      const card = cardsMap.get(config.reportKey) || {};
      return {
        reportKey: config.reportKey,
        range: config.range,
        title: String(card.title || config.title),
        description: String(card.description || config.description),
        icon: config.icon,
        lastGeneratedAt: card.last_generated_at || null,
      };
    }),
    kpis: {
      totalIncidents: toFiniteNumber(payload?.kpis?.total_incidents, 0),
      activeIncidents: toFiniteNumber(payload?.kpis?.active_incidents, 0),
      resolvedIncidents: toFiniteNumber(payload?.kpis?.resolved_incidents, 0),
      activeSOS: toFiniteNumber(payload?.kpis?.active_sos, 0),
      avgResponseSeconds: toFiniteNumber(payload?.kpis?.avg_response_seconds, 0),
      avgResolutionSeconds: toFiniteNumber(payload?.kpis?.avg_resolution_seconds, 0),
    },
    charts: {
      incidentsByStatus: normalizeDistributionSeries(payload?.charts?.incidents_by_status),
      incidentsByPriority: normalizeDistributionSeries(payload?.charts?.incidents_by_priority),
      incidentsTrend: normalizeIncidentTrend(payload?.charts?.incidents_trend),
      responseTimeTrend: normalizeResponseTrend(payload?.charts?.response_time_trend),
      incidentCategoriesFrequency: normalizeTopDistributionSeries(payload?.charts?.incident_categories_frequency),
      sosCategoriesFrequency: normalizeTopDistributionSeries(payload?.charts?.sos_categories_frequency),
    },
  };
}
