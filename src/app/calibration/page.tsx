"use client";

import { useMemo, useState } from "react";
import {
  useCalibrationProfiles,
  useCalibrationHeatmaps,
} from "@/hooks/useCalibration";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import type { CalibrationProfile } from "@/types/database";
import type { EnvironmentHeatmap, HeatmapModel } from "@/data/mock";

/* ------------------------------------------------------------------ */
/*  Sigmoid helpers                                                    */
/* ------------------------------------------------------------------ */

function sigmoid(x: number, center: number, steepness: number): number {
  return 1 / (1 + Math.exp(-steepness * (x - center)));
}

/* ------------------------------------------------------------------ */
/*  Score → colour interpolation for the heatmap                       */
/* ------------------------------------------------------------------ */

function scoreToColor(score: number): string {
  const clamped = Math.max(0, Math.min(1, score));

  if (clamped < 0.35) {
    const t = clamped / 0.35;
    const r = Math.round(30 + t * 50);
    const g = Math.round(15 + t * 20);
    const b = Math.round(15 + t * 10);
    return `rgb(${r}, ${g}, ${b})`;
  }
  if (clamped < 0.55) {
    const t = (clamped - 0.35) / 0.2;
    const r = Math.round(80 + t * 100);
    const g = Math.round(35 + t * 50);
    const b = Math.round(25 - t * 5);
    return `rgb(${r}, ${g}, ${b})`;
  }
  if (clamped < 0.75) {
    const t = (clamped - 0.55) / 0.2;
    const r = Math.round(180 + t * 19);
    const g = Math.round(85 + t * 35);
    const b = Math.round(20 + t * 22);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const t = (clamped - 0.75) / 0.25;
  const r = Math.round(199 + t * 36);
  const g = Math.round(120 + t * 60);
  const b = Math.round(42 + t * 18);
  return `rgb(${r}, ${g}, ${b})`;
}

function scoreTextColor(score: number): string {
  return score >= 0.5 ? "#000000" : "#e8e4e0";
}

/* ------------------------------------------------------------------ */
/*  Sigmoid Preview SVG                                                */
/* ------------------------------------------------------------------ */

function SigmoidPreview({
  center,
  steepness,
}: {
  center: number;
  steepness: number;
}) {
  const width = 300;
  const height = 200;
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
    const y = sigmoid(x, center, steepness);
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
      {gridSteps.map((v) => {
        const x = padLeft + v * plotW;
        return (
          <line
            key={`vg-${v}`}
            x1={x}
            y1={padTop}
            x2={x}
            y2={padTop + plotH}
            stroke="#1e1e1e"
            strokeWidth="1"
          />
        );
      })}
      {gridSteps.map((v) => {
        const y = padTop + (1 - v) * plotH;
        return (
          <line
            key={`hg-${v}`}
            x1={padLeft}
            y1={y}
            x2={padLeft + plotW}
            y2={y}
            stroke="#1e1e1e"
            strokeWidth="1"
          />
        );
      })}
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
/*  Profile Card                                                       */
/* ------------------------------------------------------------------ */

function ProfileCard({
  profile,
  isSelected,
  onSelect,
}: {
  profile: CalibrationProfile;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      hover
      className={`mb-3 cursor-pointer transition-colors ${isSelected ? "ring-1 ring-accent" : ""}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {profile.name}
            </span>
            {profile.is_default && (
              <StatusBadge status="default" variant="accent" />
            )}
            {isSelected && !profile.is_default && (
              <StatusBadge status="viewing" variant="accent" />
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            {profile.description}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-tertiary">
            sigmoid_center
          </span>
          <span className="font-mono text-xs text-text-primary">
            {profile.sigmoid_center}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-tertiary">
            sigmoid_steepness
          </span>
          <span className="font-mono text-xs text-text-primary">
            {profile.sigmoid_steepness}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-tertiary">time_weight</span>
          <span className="font-mono text-xs text-text-primary">
            {profile.time_weight}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-tertiary">step_penalty</span>
          <span className="font-mono text-xs text-text-primary">
            {profile.step_penalty}
          </span>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Heatmap for a single environment                                   */
/* ------------------------------------------------------------------ */

function EnvironmentHeatmapCard({
  heatmap,
}: {
  heatmap: EnvironmentHeatmap;
}) {
  const cellMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const cell of heatmap.cells) {
      map.set(`${cell.model}::${cell.task}`, cell.score);
    }
    return map;
  }, [heatmap.cells]);

  const modelAverages = useMemo(() => {
    const avgs = new Map<HeatmapModel, number>();
    for (const model of heatmap.models) {
      const scores = heatmap.tasks.map(
        (task) => cellMap.get(`${model}::${task}`) ?? 0,
      );
      const avg =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
      avgs.set(model, avg);
    }
    return avgs;
  }, [heatmap.models, heatmap.tasks, cellMap]);

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-sm font-medium text-text-primary">
            {heatmap.environmentName}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-text-tertiary">
          Calibrated scores by model and task family
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr>
              <th className="border-b border-border/50 px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                Model
              </th>
              {heatmap.tasks.map((task) => (
                <th
                  key={task}
                  className="border-b border-border/50 px-2 py-2.5 text-center text-[10px] font-medium uppercase tracking-wider text-text-tertiary"
                >
                  {task}
                </th>
              ))}
              <th className="border-b border-border/50 px-3 py-2.5 text-center text-[10px] font-medium uppercase tracking-wider text-accent">
                Avg
              </th>
            </tr>
          </thead>
          <tbody>
            {heatmap.models.map((model) => {
              const avg = modelAverages.get(model) ?? 0;
              return (
                <tr
                  key={model}
                  className="transition-colors hover:bg-surface-overlay/30"
                >
                  <td className="border-b border-border/30 px-4 py-2 text-xs font-medium text-text-primary">
                    {model}
                  </td>
                  {heatmap.tasks.map((task) => {
                    const score = cellMap.get(`${model}::${task}`) ?? 0;
                    return (
                      <td
                        key={task}
                        className="border-b border-border/30 px-1 py-1.5 text-center"
                      >
                        <div
                          className="mx-auto flex h-9 w-full max-w-[72px] items-center justify-center rounded-sm font-mono text-xs font-semibold transition-transform hover:scale-105"
                          style={{
                            backgroundColor: scoreToColor(score),
                            color: scoreTextColor(score),
                          }}
                          title={`${model} \u00b7 ${task}: ${score.toFixed(3)}`}
                        >
                          {score.toFixed(2)}
                        </div>
                      </td>
                    );
                  })}
                  <td className="border-b border-border/30 px-2 py-1.5 text-center">
                    <div
                      className="mx-auto flex h-9 w-full max-w-[72px] items-center justify-center rounded-sm border border-accent/30 font-mono text-xs font-bold"
                      style={{
                        backgroundColor: scoreToColor(avg),
                        color: scoreTextColor(avg),
                      }}
                    >
                      {avg.toFixed(2)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend bar */}
      <div className="flex items-center gap-3 border-t border-border/50 px-4 py-2.5">
        <span className="text-[10px] text-text-tertiary">Score</span>
        <div className="flex h-2.5 flex-1 overflow-hidden rounded-full">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex-1"
              style={{ backgroundColor: scoreToColor(i / 19) }}
            />
          ))}
        </div>
        <div className="flex gap-3">
          <span className="text-[10px] text-text-tertiary">0.0</span>
          <span className="text-[10px] text-text-tertiary">1.0</span>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

type CalibrationTab = "heatmaps" | "profiles";

export default function CalibrationPage() {
  const calibration = useCalibrationProfiles();
  const heatmaps = useCalibrationHeatmaps();

  const [activeTab, setActiveTab] = useState<CalibrationTab>("heatmaps");

  const profiles = useMemo(() => calibration.data ?? [], [calibration.data]);

  const heatmapList = useMemo(() => heatmaps.data ?? [], [heatmaps.data]);

  const defaultIdx = useMemo(() => {
    const idx = profiles.findIndex((p) => p.is_default);
    return idx >= 0 ? idx : 0;
  }, [profiles]);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const activeIdx = selectedIdx ?? defaultIdx;
  const activeProfile = profiles[activeIdx];

  const isPending = calibration.isPending || heatmaps.isPending;

  if (isPending) {
    return (
      <>
        <PageHeader
          title="Calibration"
          description="Score calibration heatmaps and profiles across all environments"
        />
        <LoadingState message="Loading calibration data..." />
      </>
    );
  }

  const tabs: { key: CalibrationTab; label: string }[] = [
    { key: "heatmaps", label: "Score Heatmaps" },
    { key: "profiles", label: "Scoring Profiles" },
  ];

  return (
    <>
      <PageHeader
        title="Calibration"
        description="Score calibration heatmaps and profiles across all environments"
      />

      {/* Tab navigation */}
      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-accent text-accent"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Heatmaps tab */}
      {activeTab === "heatmaps" && (
        <div className="space-y-6">
          <div className="rounded-md border border-border/50 bg-surface px-4 py-3">
            <p className="text-xs leading-relaxed text-text-secondary">
              Calibrated score heatmaps for every shipped environment. Each cell
              represents the mean calibrated score for a model on a specific task
              family. Scores are normalized through the active sigmoid profile.
            </p>
          </div>

          {heatmapList.map((hm) => (
            <EnvironmentHeatmapCard key={hm.environmentId} heatmap={hm} />
          ))}
        </div>
      )}

      {/* Profiles tab */}
      {activeTab === "profiles" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
              Profiles ({profiles.length}) — click to preview
            </div>
            {profiles.length === 0 ? (
              <Card>
                <div className="py-8 text-center text-xs text-text-tertiary">
                  No calibration profiles configured
                </div>
              </Card>
            ) : (
              profiles.map((profile, idx) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  isSelected={idx === activeIdx}
                  onSelect={() => setSelectedIdx(idx)}
                />
              ))
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
              Sigmoid Preview
            </div>
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeProfile?.name ?? "Sigmoid"} Curve
                </CardTitle>
                {activeProfile && (
                  <span className="text-[11px] text-text-tertiary">
                    center={activeProfile.sigmoid_center} steepness=
                    {activeProfile.sigmoid_steepness}
                  </span>
                )}
              </CardHeader>
              {activeProfile ? (
                <div className="flex justify-center">
                  <SigmoidPreview
                    center={activeProfile.sigmoid_center}
                    steepness={activeProfile.sigmoid_steepness}
                  />
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-xs text-text-tertiary">
                  No profile selected
                </div>
              )}
              {activeProfile && (
                <div className="mt-3 rounded-md bg-surface-overlay px-3 py-2 text-[11px] text-text-tertiary">
                  <span className="font-mono">
                    y = 1 / (1 + exp(-{activeProfile.sigmoid_steepness} * (x -{" "}
                    {activeProfile.sigmoid_center})))
                  </span>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
