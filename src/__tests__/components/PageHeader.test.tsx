import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PageHeader } from "@/components/ui/PageHeader";

describe("PageHeader", () => {
  it("renders title", () => {
    render(<PageHeader title="Environments" />);
    expect(
      screen.getByRole("heading", { name: "Environments" }),
    ).toBeInTheDocument();
  });

  it("renders title and description", () => {
    render(
      <PageHeader
        title="Environments"
        description="Monitor all 6 Athanor environments"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Environments" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Monitor all 6 Athanor environments"),
    ).toBeInTheDocument();
  });

  it("renders without description when not provided", () => {
    render(<PageHeader title="Tasks" />);
    expect(
      screen.getByRole("heading", { name: "Tasks" }),
    ).toBeInTheDocument();
  });

  it("renders actions slot", () => {
    render(
      <PageHeader
        title="Runs"
        actions={<button>New Run</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "New Run" })).toBeInTheDocument();
  });
});
