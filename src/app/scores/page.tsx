"use client";

import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { useCalibrationProfiles } from "@/hooks/useCalibration";
import {
  REAL_HEATMAP_DATA,
} from "@/data/heatmap";
import { BASELINE_MODELS } from "@/data/models";
import { ATHANOR_ENVIRONMENTS } from "@/data/environments";
import {
  calibrateScore,
  calibrateHeatmapData,
  getCalibrationParamsFromIntensity,
  getCalibratedMeanScore,
  CALIBRATION_PRESETS,
  type CalibrationParams,
} from "@/lib/scoring";

/* ------------------------------------------------------------------ */
/*  Sigmoid preview (SVG)                                              */
/* ------------------------------------------------------------------ */

function SigmoidPreview({
  center,
  steepness,
}: {
  center: number;
  steepness: number;
}) {
  const width = 300;
  const height = 180;
  const padLeft = 36;
  const padRight = 12;
  const padTop = 12;
  const padBottom = 28;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const points: string[] = [];
  const numPoints = 100;
  for (let i = 0; i <= numPoints; i++) {
    const x = i / numPoints;
    const y = calibrateScore(x, {
      sigmoid_center: center,
      sigmoid_steepness: steepness,
      time_weight: 0,
      step_penalty: 0,
    });
    const px = padLeft + x * plotW;
    const py = padTop + (1 - y) * plotH;
    points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
  }
  const pathD = `M ${points.join(" L ")}`;

  const gridSteps = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-[300px]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x={padLeft}
        y={padTop}
        width={plotW}
        height={plotH}
        fill="#141414"
        rx="2"
      />
      {gridSteps.map((v) => (
        <line
          key={`vg-${v}`}
          x1={padLeft + v * plotW}
          y1={padTop}
          x2={padLeft + v * plotW}
          y2={padTop + plotH}
          stroke="#1e1e1e"
          strokeWidth="1"
        />
      ))}
      {gridSteps.map((v) => (
        <line
          key={`hg-${v}`}
          x1={padLeft}
          y1={padTop + (1 - v) * plotH}
          x2={padLeft + plotW}
          y2={padTop + (1 - v) * plotH}
          stroke="#1e1e1e"
          strokeWidth="1"
        />
      ))}
      <path d={pathD} fill="none" stroke="#C7783E" strokeWidth="2" />
      <line
        x1={padLeft + center * plotW}
        y1={padTop}
        x2={padLeft + center * plotW}
        y2={padTop + plotH}
        stroke="#C7783E"
        strokeWidth="1"
        strokeDasharray="3,3"
        opacity="0.5"
      />
      {gridSteps.map((v) => (
        <text
          key={`xl-${v}`}
          x={padLeft + v * plotW}
          y={height - 6}
          textAnchor="middle"
          className="fill-[#666] text-[9px]"
        >
          {v.toFixed(1) === "0.0"
            ? "0"
            : v.toFixed(1) === "1.0"
              ? "1"
              : v.toFixed(2)}
        </text>
      ))}
      {gridSteps.map((v) => (
        <text
          key={`yl-${v}`}
          x={padLeft - 6}
          y={padTop + (1 - v) * plotH + 3}
          textAnchor="end"
          className="fill-[#666] text-[9px]"
        >
          {v.toFixed(1) === "0.0"
            ? "0"
            : v.toFixed(1) === "1.0"
              ? "1"
              : v.toFixed(2)}
        </text>
      ))}
      <text
        x={padLeft + plotW / 2}
        y={height}
        textAnchor="middle"
        className="fill-[#888] text-[10px]"
      >
        Raw Score
      </text>
      <text
        x={10}
        y={padTop + plotH / 2}
        textAnchor="middle"
        className="fill-[#888] text-[10px]"
        transform={`rotate(-90, 10, ${padTop + plotH / 2})`}
      >
        Calibrated
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Score cell color utility                                           */
/* ------------------------------------------------------------------ */

function scoreBg(s: number | null): string {
  if (s === null) return "";
  if (s >= 0.7) return "bg-green-900/30";
  if (s >= 0.4) return "bg-yellow-900/20";
  return "bg-red-900/20";
}

/**
 * Per-row relative coloring: green = best model in row, red = worst.
 * All cells get a color (including 0.0).
 *
 * @param score - this cell's score
 * @param rowScores - all model scores for this task
 */
function relativeTaskCellClass(score: number | null, rowScores: (number | null)[]): string {
  if (score === null) return "text-text-tertiary";

  const valid = rowScores.filter((s): s is number => s !== null);
  if (valid.length === 0) return "text-text-tertiary";

  const maxScore = Math.max(...valid);
  const minScore = Math.min(...valid);
  const range = maxScore - minScore;

  // All same score (or only one model)
  if (range < 0.001) {
    if (score >= 0.5) return "bg-green-900/30 text-green-300";
    if (score > 0) return "bg-yellow-900/25 text-yellow-300";
    return "bg-red-900/30 text-red-400";
  }

  // Relative position: 0 = worst, 1 = best
  const pos = (score - minScore) / range;

  if (pos >= 0.8) return "bg-green-900/40 text-green-300";
  if (pos >= 0.5) return "bg-green-900/20 text-green-400";
  if (pos >= 0.2) return "bg-yellow-900/25 text-yellow-300";
  return "bg-red-900/30 text-red-400";
}


/* ------------------------------------------------------------------ */
/*  Slider gradient helper                                             */
/* ------------------------------------------------------------------ */

function sliderTrackStyle(intensity: number): React.CSSProperties {
  const pct = intensity;
  return {
    background: `linear-gradient(to right, #3d9970 0%, #C7783E ${Math.max(pct, 10)}%, #c0392b 100%)`,
  };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ScoresPage() {
  const calibration = useCalibrationProfiles();
  const [intensity, setIntensity] = useState(50);

  const params: CalibrationParams = useMemo(
    () => getCalibrationParamsFromIntensity(intensity),
    [intensity],
  );

  const activePreset = useMemo(
    () => CALIBRATION_PRESETS.find((p) => p.intensity === intensity) ?? null,
    [intensity],
  );

  /* Memoize the fully recalibrated heatmap so it only recalculates when
     the calibration params change. */
  const calibratedData = useMemo(
    () => calibrateHeatmapData(REAL_HEATMAP_DATA, params),
    [params],
  );

  /* Per-environment mean scores (calibrated) for the summary heatmap. */
  const meanScores = useMemo(() => {
    const result: Record<string, Record<string, number | null>> = {};
    for (const env of ATHANOR_ENVIRONMENTS) {
      result[env.slug] = {};
      for (const model of BASELINE_MODELS) {
        result[env.slug][model.slug] = getCalibratedMeanScore(
          env.slug,
          model.slug,
          params,
        );
      }
    }
    return result;
  }, [params]);

  const handlePreset = useCallback((presetIntensity: number) => {
    setIntensity(presetIntensity);
  }, []);

  if (calibration.isPending) {
    return (
      <>
        <PageHeader
          title="Scores"
          description="Live score calibration across all environments and models"
        />
        <LoadingState message="Loading calibration data..." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Scores"
        description="Live score calibration across all environments and models"
      />

      {/* ---- Calibration Controls ---- */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Calibration Controls</CardTitle>
          <span className="text-[11px] text-text-tertiary">
            Drag the slider or select a preset to recalibrate all scores live
          </span>
        </CardHeader>

        <div className="space-y-4">
          {/* Slider */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-text-secondary">
                Generous (Training)
              </span>
              <span className="font-mono text-sm font-semibold text-accent">
                {intensity}
              </span>
              <span className="text-xs text-text-secondary">
                Strict (Evaluation)
              </span>
            </div>
            <div className="relative">
              <div
                className="pointer-events-none absolute inset-0 h-2 rounded-full"
                style={{
                  ...sliderTrackStyle(intensity),
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="relative z-10 h-2 w-full cursor-pointer appearance-none rounded-full bg-transparent
                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
                  [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(199,120,62,0.5)]
                  [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150
                  [&::-webkit-slider-thumb]:hover:scale-125
                  [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none
                  [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent
                  [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(199,120,62,0.5)]
                  [&::-moz-range-track]:bg-transparent"
              />
            </div>
          </div>

          {/* Preset buttons */}
          <div className="flex items-center gap-3">
            {CALIBRATION_PRESETS.map((preset) => {
              const isActive = activePreset?.label === preset.label;
              return (
                <Button
                  key={preset.label}
                  variant={isActive ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => handlePreset(preset.intensity)}
                >
                  {preset.label}
                </Button>
              );
            })}
            <span className="ml-3 text-[11px] text-text-tertiary">
              {activePreset
                ? activePreset.description
                : `Custom calibration (intensity ${intensity})`}
            </span>
          </div>

          {/* Current params + curve */}
          <div className="flex items-start gap-6 rounded-md border border-border/50 bg-surface-overlay p-3">
            <div className="flex-1 space-y-1.5">
              <div className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                Active Parameters
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <ParamRow
                  label="sigmoid_center"
                  value={params.sigmoid_center.toFixed(3)}
                />
                <ParamRow
                  label="sigmoid_steepness"
                  value={params.sigmoid_steepness.toFixed(2)}
                />
                <ParamRow
                  label="time_weight"
                  value={params.time_weight.toFixed(2)}
                />
                <ParamRow
                  label="step_penalty"
                  value={params.step_penalty.toFixed(3)}
                />
              </div>
              <div className="mt-2 rounded-md bg-background px-2 py-1 font-mono text-[10px] text-text-tertiary">
                y = 1 / (1 + exp(-{params.sigmoid_steepness.toFixed(1)} * (x
                {" - "}
                {params.sigmoid_center.toFixed(2)})))
              </div>
            </div>
            <div className="shrink-0">
              <SigmoidPreview
                center={params.sigmoid_center}
                steepness={params.sigmoid_steepness}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* ---- Cross-Environment Heatmap ---- */}
      <div className="mt-6">
        <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          Environment &times; Model Score Heatmap &mdash; calibrated live
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Cross-Environment Heatmap</CardTitle>
            <span className="text-[11px] text-text-tertiary">
              Mean calibrated scores across all environments and 5 models
            </span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-text-tertiary">
                    Environment
                  </th>
                  {BASELINE_MODELS.map((m) => (
                    <th
                      key={m.slug}
                      className="px-3 py-2 text-center text-[11px] font-medium text-text-tertiary"
                    >
                      {m.displayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ATHANOR_ENVIRONMENTS.map((env) => (
                  <tr key={env.id} className="border-b border-border/50">
                    <td className="px-3 py-2 font-medium text-text-primary">
                      {env.name}
                    </td>
                    {BASELINE_MODELS.map((m) => {
                      const score = meanScores[env.slug]?.[m.slug] ?? null;
                      return (
                        <td
                          key={m.slug}
                          className={`px-3 py-2 text-center font-mono ${scoreBg(score)}`}
                        >
                          {score !== null ? score.toFixed(3) : "\u2014"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ---- Per-environment task-level heatmaps ---- */}
      {ATHANOR_ENVIRONMENTS.map((env) => {
        const envData = calibratedData[env.slug];
        if (!envData) return null;
        const firstModel = BASELINE_MODELS[0];
        const rawTaskList = envData[firstModel.slug] ?? [];

        // Build task list with mean scores for sorting
        const taskList = rawTaskList.map((cell) => {
          const scores = BASELINE_MODELS.map((m) => {
            const entry = (envData[m.slug] ?? []).find((t) => t.task === cell.task);
            return entry?.score ?? null;
          });
          const valid = scores.filter((s): s is number => s !== null);
          const mean = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
          return { ...cell, allScores: scores, mean };
        });
        // Sort: easy (high score) on top, hard (low score) at bottom
        taskList.sort((a, b) => b.mean - a.mean);

        return (
          <div key={env.id} className="mt-6">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
              {env.name} — {taskList.length} tasks (calibrated)
            </div>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] table-fixed">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="w-[220px] px-2 py-1.5 text-left font-medium text-text-tertiary">
                        Task
                      </th>
                      {BASELINE_MODELS.map((m) => (
                        <th
                          key={m.slug}
                          className="px-2 py-1.5 text-center font-medium text-text-tertiary"
                        >
                          {m.displayName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {taskList.map((cell) => (
                      <tr
                        key={cell.task}
                        className="border-b border-border/30"
                      >
                        <td className="w-[220px] px-2 py-1 font-mono text-text-secondary truncate">
                          {cell.task}
                        </td>
                        {BASELINE_MODELS.map((m, mi) => {
                          const s = cell.allScores[mi];
                          return (
                            <td
                              key={m.slug}
                              className={`px-2 py-1 text-center font-mono ${relativeTaskCellClass(s, cell.allScores)}`}
                            >
                              {s !== null ? s.toFixed(3) : "\u2014"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
/* ------------------------------------------------------------------ */

function ParamRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-text-tertiary">{label}</span>
      <span className="font-mono text-xs text-text-primary">{value}</span>
    </div>
  );
}
