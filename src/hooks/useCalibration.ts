import { useQuery, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { mockCalibrationProfiles } from "@/data/mock";
import type { CalibrationProfile } from "@/types/database";

async function fetchCalibrationProfiles(): Promise<CalibrationProfile[]> {
  await new Promise((r) => setTimeout(r, 200));
  return mockCalibrationProfiles;
}

export const calibrationProfilesQueryOptions = queryOptions({
  queryKey: queryKeys.calibration.profiles,
  queryFn: fetchCalibrationProfiles,
  staleTime: 1000 * 60 * 10,
});

export function useCalibrationProfiles() {
  return useQuery(calibrationProfilesQueryOptions);
}
