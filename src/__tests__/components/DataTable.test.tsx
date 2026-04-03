import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";

interface TestItem {
  id: string;
  name: string;
  score: number;
}

const testColumns: Column<TestItem>[] = [
  { key: "name", header: "Name", render: (item) => item.name },
  {
    key: "score",
    header: "Score",
    render: (item) => item.score.toFixed(2),
  },
];

const testData: TestItem[] = [
  { id: "1", name: "Alpha", score: 0.95 },
  { id: "2", name: "Beta", score: 0.72 },
  { id: "3", name: "Gamma", score: 0.43 },
];

describe("DataTable", () => {
  it("renders column headers", () => {
    render(<DataTable columns={testColumns} data={testData} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();
  });

  it("renders all data rows", () => {
    render(<DataTable columns={testColumns} data={testData} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  it("renders formatted values", () => {
    render(<DataTable columns={testColumns} data={testData} />);
    expect(screen.getByText("0.95")).toBeInTheDocument();
    expect(screen.getByText("0.72")).toBeInTheDocument();
  });

  it("shows empty message when data is empty", () => {
    render(<DataTable columns={testColumns} data={[]} />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("shows custom empty message", () => {
    render(
      <DataTable
        columns={testColumns}
        data={[]}
        emptyMessage="Nothing here"
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("calls onRowClick when a row is clicked", () => {
    const handleClick = vi.fn();
    render(
      <DataTable
        columns={testColumns}
        data={testData}
        onRowClick={handleClick}
      />,
    );
    fireEvent.click(screen.getByText("Alpha"));
    expect(handleClick).toHaveBeenCalledWith(testData[0]);
  });
});
