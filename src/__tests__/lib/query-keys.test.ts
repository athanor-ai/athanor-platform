import { describe, it, expect } from "vitest";
import { queryKeys } from "@/lib/query-keys";

describe("queryKeys", () => {
  it("has all expected top-level namespaces", () => {
    const namespaces = Object.keys(queryKeys);
    expect(namespaces).toContain("organizations");
    expect(namespaces).toContain("environments");
    expect(namespaces).toContain("tasks");
    expect(namespaces).toContain("runs");
    expect(namespaces).toContain("calibration");
    expect(namespaces).toContain("baselines");
    expect(namespaces).toContain("credentials");
    expect(namespaces).toContain("docs");
  });

  it("environments keys produce unique arrays", () => {
    const all = queryKeys.environments.all;
    const list = queryKeys.environments.list();
    const detail = queryKeys.environments.detail("env-lean");
    const versions = queryKeys.environments.versions("env-lean");

    expect(all).toEqual(["environments"]);
    expect(list).toEqual(["environments", "list", undefined]);
    expect(detail).toEqual(["environments", "env-lean"]);
    expect(versions).toEqual(["environments", "env-lean", "versions"]);
  });

  it("tasks keys produce unique arrays", () => {
    expect(queryKeys.tasks.all).toEqual(["tasks"]);
    expect(queryKeys.tasks.byEnvironment("env-cedar")).toEqual([
      "tasks",
      "environment",
      "env-cedar",
    ]);
  });

  it("runs keys produce unique arrays", () => {
    expect(queryKeys.runs.all).toEqual(["runs"]);
    expect(queryKeys.runs.results("run-001")).toEqual([
      "runs",
      "run-001",
      "results",
    ]);
  });

  it("calibration keys produce expected arrays", () => {
    expect(queryKeys.calibration.profiles).toEqual([
      "calibration",
      "profiles",
    ]);
    expect(queryKeys.calibration.detail("cal-001")).toEqual([
      "calibration",
      "cal-001",
    ]);
  });

  it("baselines keys produce expected arrays", () => {
    expect(queryKeys.baselines.all).toEqual(["baselines"]);
    expect(queryKeys.baselines.results("bl-001")).toEqual([
      "baselines",
      "bl-001",
      "results",
    ]);
  });

  it("docs keys produce expected arrays", () => {
    expect(queryKeys.docs.all).toEqual(["docs"]);
    expect(queryKeys.docs.page("getting-started")).toEqual([
      "docs",
      "getting-started",
    ]);
  });
});
