import { describe, it, expect } from "vitest";
import {
  mockOrganization,
  mockEnvironments,
  mockTasks,
  mockRuns,
  mockRunResults,
  mockBaselineRuns,
  mockCredentials,
  mockDocsPages,
  mockCalibrationProfiles,
  mockEnvironmentVersions,
} from "@/data/mock";

/**
 * Integration tests for the mock data aggregator — verifies the
 * mock layer correctly re-exports and combines all real data sources.
 */

describe("mock data aggregator", () => {
  it("organization is Athanor", () => {
    expect(mockOrganization.slug).toBe("athanor-labs");
    expect(mockOrganization.name).toMatch(/Athanor/i);
  });

  it("environments match expected count", () => {
    expect(mockEnvironments).toHaveLength(6);
  });

  it("tasks match expected count", () => {
    expect(mockTasks).toHaveLength(154);
  });

  it("runs match expected count", () => {
    expect(mockRuns).toHaveLength(30);
  });

  it("run results match expected count", () => {
    expect(mockRunResults).toHaveLength(770);
  });

  it("baseline runs match expected count", () => {
    expect(mockBaselineRuns).toHaveLength(30);
  });

  it("credentials are present", () => {
    expect(mockCredentials.length).toBeGreaterThan(0);
  });

  it("docs pages are present", () => {
    expect(mockDocsPages.length).toBeGreaterThan(0);
  });

  it("calibration profiles are present", () => {
    expect(mockCalibrationProfiles.length).toBeGreaterThan(0);
  });

  it("environment versions are present", () => {
    expect(mockEnvironmentVersions.length).toBeGreaterThan(0);
  });
});
