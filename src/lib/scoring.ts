/**
 * Live scoring engine for Tahoe Scores page.
 *
 * Pure computation -- no React dependencies. Provides calibration functions
 * that allow heatmap scores to be recomputed on the fly when calibration
 * parameters change (e.g. via a slider or preset selector).
 */

import {
  REAL_HEATMAP_DATA,
  type HeatmapCell,
  type EnvironmentHeatmap,
} from "@/data/heatmap";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Parameters that control how raw scores are mapped to calibrated scores. */
export interface CalibrationParams {
  /** Center of the sigmoid curve (0-1). Scores near this value map to ~0.5. */
  sigmoid_center: number;
  /** Steepness of the sigmoid transition. Higher = sharper. */
  sigmoid_steepness: number;
  /** Weight applied to time-based scoring components (reserved for future use). */
  time_weight: number;
  /** Penalty applied per extra step taken (reserved for future use). */
  step_penalty: number;
}

/** A named calibration preset selectable from the UI. */
export interface CalibrationPreset {
  label: string;
  intensity: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export const CALIBRATION_PRESETS: readonly CalibrationPreset[] = [
  {
    label: "Training",
    intensity: 10,
    description: "Generous partial credit for RL training",
  },
  {
    label: "Default",
    intensity: 50,
    description: "Balanced calibration",
  },
  {
    label: "Evaluation",
    intensity: 85,
    description: "Strict pass/fail for evaluation",
  },
] as const;

// ---------------------------------------------------------------------------
// Core math
// ---------------------------------------------------------------------------

/**
 * Standard logistic sigmoid.
 *
 *   sigmoid(x, c, k) = 1 / (1 + exp(-k * (x - c)))
 *
 * @param x - Input value (raw score, typically 0-1).
 * @param center - Sigmoid midpoint. sigmoid(center) = 0.5.
 * @param steepness - Controls transition sharpness. Higher = steeper.
 * @returns A value in (0, 1).
 */
function sigmoid(x: number, center: number, steepness: number): number {
  return 1 / (1 + Math.exp(-steepness * (x - center)));
}

/**
 * Clamp a number to the [min, max] range.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Linearly interpolate between `a` and `b` at fraction `t` (0-1).
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

/**
 * Calibrate a single raw score using the given parameters.
 *
 * The raw score is first clamped to [0, 1], then passed through the sigmoid
 * defined by `sigmoid_center` and `sigmoid_steepness`. The result is
 * re-normalized so that sigmoid(0) maps to 0 and sigmoid(1) maps to 1,
 * ensuring the full [0, 1] output range is used.
 *
 * `time_weight` and `step_penalty` are accepted for API completeness but do
 * not affect the output in the current implementation (they require per-run
 * trace data that is not available at the heatmap level).
 */
export function calibrateScore(
  rawScore: number,
  params: CalibrationParams,
): number {
  const { sigmoid_center, sigmoid_steepness } = params;
  const clamped = clamp(rawScore, 0, 1);

  // Compute the raw sigmoid value and the values at the endpoints so we can
  // re-normalize the output to [0, 1].
  const sRaw = sigmoid(clamped, sigmoid_center, sigmoid_steepness);
  const sMin = sigmoid(0, sigmoid_center, sigmoid_steepness);
  const sMax = sigmoid(1, sigmoid_center, sigmoid_steepness);

  // Guard against degenerate parameters where sMin === sMax.
  if (sMax - sMin < 1e-12) {
    return clamped;
  }

  return (sRaw - sMin) / (sMax - sMin);
}

// ---------------------------------------------------------------------------
// Heatmap recalibration
// ---------------------------------------------------------------------------

/**
 * Recalibrate every score in the full heatmap dataset.
 *
 * Returns a **new** object with the same shape as `REAL_HEATMAP_DATA` but
 * with every `score` value replaced by its calibrated counterpart.
 * The original data is never mutated.
 */
export function calibrateHeatmapData(
  data: Record<string, EnvironmentHeatmap>,
  params: CalibrationParams,
): Record<string, EnvironmentHeatmap> {
  const result: Record<string, EnvironmentHeatmap> = {};

  for (const envSlug of Object.keys(data)) {
    const envData = data[envSlug];
    const calibratedEnv: EnvironmentHeatmap = {};

    for (const modelSlug of Object.keys(envData)) {
      calibratedEnv[modelSlug] = envData[modelSlug].map(
        (cell: HeatmapCell): HeatmapCell => ({
          task: cell.task,
          score: calibrateScore(cell.score, params),
        }),
      );
    }

    result[envSlug] = calibratedEnv;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Intensity -> CalibrationParams mapping
// ---------------------------------------------------------------------------

/**
 * Anchor points for the intensity-to-params interpolation.
 *
 * The three anchors define a piecewise-linear mapping from the slider's
 * 0-100 range to sigmoid parameters:
 *
 *   0-20  : generous / training  (low center, low steepness)
 *   ~50   : default / balanced   (mid center, moderate steepness)
 *   80-100: strict / evaluation  (mid center, high steepness)
 */
interface IntensityAnchor {
  intensity: number;
  center: number;
  steepness: number;
}

const ANCHORS: readonly IntensityAnchor[] = [
  { intensity: 0, center: 0.3, steepness: 3 },
  { intensity: 20, center: 0.3, steepness: 5 },
  { intensity: 50, center: 0.5, steepness: 10 },
  { intensity: 80, center: 0.5, steepness: 40 },
  { intensity: 100, center: 0.5, steepness: 50 },
] as const;

/**
 * Map a slider intensity value (0-100) to a full set of calibration params.
 *
 * Uses piecewise-linear interpolation between the anchors defined above.
 * Values outside [0, 100] are clamped.
 */
export function getCalibrationParamsFromIntensity(
  intensity: number,
): CalibrationParams {
  const t = clamp(intensity, 0, 100);

  // Find the two anchors that bracket `t`.
  let lower = ANCHORS[0];
  let upper = ANCHORS[ANCHORS.length - 1];

  for (let i = 0; i < ANCHORS.length - 1; i++) {
    if (t >= ANCHORS[i].intensity && t <= ANCHORS[i + 1].intensity) {
      lower = ANCHORS[i];
      upper = ANCHORS[i + 1];
      break;
    }
  }

  // Fraction between the two anchors (0 = lower, 1 = upper).
  const span = upper.intensity - lower.intensity;
  const frac = span > 0 ? (t - lower.intensity) / span : 0;

  return {
    sigmoid_center: lerp(lower.center, upper.center, frac),
    sigmoid_steepness: lerp(lower.steepness, upper.steepness, frac),
    time_weight: 0,
    step_penalty: 0,
  };
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

/**
 * Compute the mean calibrated score for a given (environment, model) pair.
 *
 * Looks up the raw heatmap cells from `REAL_HEATMAP_DATA`, calibrates each
 * one, and returns the arithmetic mean. Returns `null` if no data exists for
 * the requested combination.
 */
export function getCalibratedMeanScore(
  envSlug: string,
  modelSlug: string,
  params: CalibrationParams,
): number | null {
  const envData = REAL_HEATMAP_DATA[envSlug];
  if (!envData) return null;

  const cells = envData[modelSlug];
  if (!cells || cells.length === 0) return null;

  const sum = cells.reduce(
    (acc, cell) => acc + calibrateScore(cell.score, params),
    0,
  );

  return sum / cells.length;
}
