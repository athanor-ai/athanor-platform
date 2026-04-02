"use client";

import { useMemo } from "react";
import { useCalibrationProfiles } from "@/hooks/useCalibration";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import type { CalibrationProfile } from "@/types/database";

function sigmoid(x: number, center: number, steepness: number): number {
  return 1 / (1 + Math.exp(-steepness * (x - center)));
}

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

  // Generate the sigmoid curve path
  const points: string[] = [];
  const numPoints = 100;
  for (let i = 0; i <= numPoints; i++) {
    const x = i / numPoints; // 0 to 1
    const y = sigmoid(x, center, steepness);
    const px = padLeft + x * plotW;
    const py = padTop + (1 - y) * plotH;
    points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
  }
  const pathD = `M ${points.join(" L ")}`;

  // Grid lines at 0.25 intervals
  const gridSteps = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-[300px]"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect
        x={padLeft}
        y={padTop}
        width={plotW}
        height={plotH}
        fill="#141414"
        rx="2"
      />

      {/* Vertical grid lines */}
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

      {/* Horizontal grid lines */}
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

      {/* Sigmoid curve */}
      <path d={pathD} fill="none" stroke="#C7783E" strokeWidth="2" />

      {/* Center marker (dashed vertical line) */}
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

      {/* X-axis labels */}
      {gridSteps.map((v) => (
        <text
          key={`xl-${v}`}
          x={padLeft + v * plotW}
          y={height - 6}
          textAnchor="middle"
          className="fill-[#666] text-[9px]"
        >
          {v.toFixed(1) === "0.0" ? "0" : v.toFixed(1) === "1.0" ? "1" : v.toFixed(2)}
        </text>
      ))}

      {/* Y-axis labels */}
      {gridSteps.map((v) => (
        <text
          key={`yl-${v}`}
          x={padLeft - 6}
          y={padTop + (1 - v) * plotH + 3}
          textAnchor="end"
          className="fill-[#666] text-[9px]"
        >
          {v.toFixed(1) === "0.0" ? "0" : v.toFixed(1) === "1.0" ? "1" : v.toFixed(2)}
        </text>
      ))}

      {/* Axis labels */}
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

function ProfileCard({ profile }: { profile: CalibrationProfile }) {
  return (
    <Card hover className="mb-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {profile.name}
            </span>
            {profile.is_default && (
              <StatusBadge status="default" variant="accent" />
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

export default function CalibrationPage() {
  const calibration = useCalibrationProfiles();

  const profiles = useMemo(
    () => calibration.data ?? [],
    [calibration.data],
  );
  const defaultProfile = useMemo(
    () => profiles.find((p) => p.is_default) ?? profiles[0],
    [profiles],
  );

  if (calibration.isPending) {
    return (
      <>
        <PageHeader
          title="Calibration"
          description="Score calibration profiles for normalizing raw evaluation scores"
          actions={<Button variant="primary">New Profile</Button>}
        />
        <LoadingState message="Loading calibration profiles..." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Calibration"
        description="Score calibration profiles for normalizing raw evaluation scores"
        actions={<Button variant="primary">New Profile</Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: Profile list */}
        <div className="lg:col-span-3">
          <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
            Profiles ({profiles.length})
          </div>
          {profiles.length === 0 ? (
            <Card>
              <div className="py-8 text-center text-xs text-text-tertiary">
                No calibration profiles configured
              </div>
            </Card>
          ) : (
            profiles.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))
          )}
        </div>

        {/* Right: Sigmoid Preview */}
        <div className="lg:col-span-2">
          <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
            Sigmoid Preview
          </div>
          <Card>
            <CardHeader>
              <CardTitle>
                {defaultProfile?.name ?? "Sigmoid"} Curve
              </CardTitle>
              {defaultProfile && (
                <span className="text-[11px] text-text-tertiary">
                  center={defaultProfile.sigmoid_center} steepness=
                  {defaultProfile.sigmoid_steepness}
                </span>
              )}
            </CardHeader>
            {defaultProfile ? (
              <div className="flex justify-center">
                <SigmoidPreview
                  center={defaultProfile.sigmoid_center}
                  steepness={defaultProfile.sigmoid_steepness}
                />
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-xs text-text-tertiary">
                No profile selected
              </div>
            )}
            {defaultProfile && (
              <div className="mt-3 rounded-md bg-surface-overlay px-3 py-2 text-[11px] text-text-tertiary">
                <span className="font-mono">
                  y = 1 / (1 + exp(-{defaultProfile.sigmoid_steepness} * (x -{" "}
                  {defaultProfile.sigmoid_center})))
                </span>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
