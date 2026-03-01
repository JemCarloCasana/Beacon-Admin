import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/services/api";

const DEFAULT_RANGE = "7d";
const DEFAULT_TIMEZONE = "Asia/Manila";

function buildOverviewUrl({ range = DEFAULT_RANGE, timezone = DEFAULT_TIMEZONE } = {}) {
  const params = new URLSearchParams();
  params.set("range", range);
  params.set("timezone", timezone);
  return `/admin/reports/overview?${params.toString()}`;
}

function buildCsvExportUrl({ range = DEFAULT_RANGE, timezone = DEFAULT_TIMEZONE } = {}) {
  const params = new URLSearchParams();
  params.set("range", range);
  params.set("timezone", timezone);
  return `/admin/reports/export.csv?${params.toString()}`;
}

function normalizeOverviewPayload(payload) {
  if (payload && typeof payload === "object") return payload;
  return {};
}

function normalizeCsvPayload(payload) {
  if (typeof payload === "string") return payload;
  if (payload && typeof payload.csv === "string") return payload.csv;
  if (payload && typeof payload.content === "string") return payload.content;
  return "";
}

export const useReportsOverview = (
  { range = DEFAULT_RANGE, timezone = DEFAULT_TIMEZONE } = {},
  options = {}
) =>
  useQuery({
    queryKey: ["reports", "overview", { range, timezone }],
    queryFn: async () => {
      const response = await apiGet(buildOverviewUrl({ range, timezone }));
      return normalizeOverviewPayload(response);
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    retry: 2,
    ...options,
  });

export const useGenerateReport = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportKey, timezone = DEFAULT_TIMEZONE }) =>
      apiPost("/admin/reports/generate", {
        report_key: reportKey,
        timezone,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports", "overview"] });
    },
    ...options,
  });
};

export const useExportReportCsv = (options = {}) =>
  useMutation({
    mutationFn: async ({ range = DEFAULT_RANGE, timezone = DEFAULT_TIMEZONE }) => {
      const response = await apiGet(buildCsvExportUrl({ range, timezone }));
      return normalizeCsvPayload(response);
    },
    ...options,
  });

export default useReportsOverview;
