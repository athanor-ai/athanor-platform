import { useQuery, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { mockCalibrationProfiles, mockCalibrationHeatmaps } from "@/data/mock";
import type { CalibrationProfile } from "@/types/database";
import type { EnvironmentHeatmap } from "@/data/mock";

async function fetchCalibrationProfiles(): Promise<CalibrationProfile[]> {
  await new Promise((r) => setTimeout(r, 200));
  return mockCalibrationProfiles;
}

async function fetchCalibrationHeatmaps(): Promise<EnvironmentHeatmap[]> {
  await new Promise((r) => setTimeout(r, 250));
  return mockCalibrationHeatmaps;
}

export const calibrationProfilesQueryOptions = queryOptions({
  queryKey: queryKeys.calibration.profiles,
  queryFn: fetchCalibrationProfiles,
  staleTime: 1000 * 60 * 10,
});

export const calibrationHeatmapsQueryOptions = queryOptions({
  queryKey: queryKeys.calibration.heatmaps,
  queryFn: fetchCalibrationHeatmaps,
  staleTime: 1000 * 60 * 10,
});

export function useCalibrationProfiles() {
  return useQuery(calibrationProfilesQueryOptions);
}

export function useCalibrationHeatmaps() {
  return useQuery(calibrationHeatmapsQueryOptions);
}
