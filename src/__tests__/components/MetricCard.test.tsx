import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MetricCard } from "@/components/ui/MetricCard";

describe("MetricCard", () => {
  it("renders label and string value", () => {
    render(<MetricCard label="Environments" value="6" />);
    expect(screen.getByText("Environments")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("renders label and numeric value", () => {
    render(<MetricCard label="Tasks" value={154} />);
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("154")).toBeInTheDocument();
  });

  it("renders subtext when provided", () => {
    render(
      <MetricCard label="Score" value="0.85" subtext="across all envs" />,
    );
    expect(screen.getByText("across all envs")).toBeInTheDocument();
  });

  it("renders trend with up arrow", () => {
    render(
      <MetricCard
        label="Score"
        value="0.85"
        trend={{ direction: "up", label: "+5%" }}
      />,
    );
    expect(screen.getByText(/\+5%/)).toBeInTheDocument();
  });

  it("renders trend with down arrow", () => {
    render(
      <MetricCard
        label="Score"
        value="0.85"
        trend={{ direction: "down", label: "-3%" }}
      />,
    );
    expect(screen.getByText(/-3%/)).toBeInTheDocument();
  });

  it("renders without subtext or trend", () => {
    render(<MetricCard label="Runs" value={30} />);
    expect(screen.getByText("Runs")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });
});
