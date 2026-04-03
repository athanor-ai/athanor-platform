import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "@/components/ui/StatusBadge";

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("renders with explicit variant override", () => {
    render(<StatusBadge status="custom" variant="error" />);
    expect(screen.getByText("custom")).toBeInTheDocument();
  });

  it("maps known statuses to correct variants", () => {
    const knownStatuses = [
      "active",
      "completed",
      "published",
      "running",
      "pending",
      "draft",
      "failed",
      "cancelled",
      "deprecated",
      "archived",
    ];
    for (const status of knownStatuses) {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(screen.getByText(status)).toBeInTheDocument();
      unmount();
    }
  });

  it("maps difficulty levels to correct variants", () => {
    const difficulties = ["trivial", "easy", "medium", "hard", "expert"];
    for (const diff of difficulties) {
      const { unmount } = render(<StatusBadge status={diff} />);
      expect(screen.getByText(diff)).toBeInTheDocument();
      unmount();
    }
  });

  it("falls back to neutral for unknown statuses", () => {
    render(<StatusBadge status="unknown-status" />);
    const badge = screen.getByText("unknown-status");
    expect(badge).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<StatusBadge status="active" className="custom-class" />);
    const badge = screen.getByText("active");
    expect(badge.className).toContain("custom-class");
  });
});
