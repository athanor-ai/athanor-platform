/**
 * Data-shape regression tests for the mock data re-export layer.
 *
 * These tests verify that the mock module correctly re-exports and
 * assembles data from the underlying real data modules, maintaining
 * expected counts, statuses, and key properties.
 */

import {
  mockOrganization,
  mockEnvironments,
  mockEnvironmentVersions,
  mockTasks,
  mockRuns,
  mockRunResults,
  mockBaselineRuns,
  mockCalibrationProfiles,
  mockCredentials,
  mockDocsPages,
} from "@/data/mock";

/* ------------------------------------------------------------------ */
/*  Organization                                                        */
/* ------------------------------------------------------------------ */

describe("mockOrganization", () => {
  it("has id 'org-athanor'", () => {
    expect(mockOrganization.id).toBe("org-athanor");
  });

  it("has plan 'enterprise'", () => {
    expect(mockOrganization.plan).toBe("enterprise");
  });
});

/* ------------------------------------------------------------------ */
/*  Environments                                                        */
/* ------------------------------------------------------------------ */

describe("mockEnvironments", () => {
  it("has 6 entries", () => {
    expect(mockEnvironments).toHaveLength(6);
  });

  it("all environments are active", () => {
    for (const env of mockEnvironments) {
      expect(env.status).toBe("active");
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Environment versions                                                */
/* ------------------------------------------------------------------ */

describe("mockEnvironmentVersions", () => {
  it("has 6 entries (one per environment)", () => {
    expect(mockEnvironmentVersions).toHaveLength(6);
  });

  it("all versions are published", () => {
    for (const version of mockEnvironmentVersions) {
      expect(version.status).toBe("published");
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Tasks                                                               */
/* ------------------------------------------------------------------ */

describe("mockTasks", () => {
  it("has 154 entries (same as realTasks)", () => {
    expect(mockTasks).toHaveLength(154);
  });
});

/* ------------------------------------------------------------------ */
/*  Runs                                                                */
/* ------------------------------------------------------------------ */

describe("mockRuns", () => {
  it("has 30 entries", () => {
    expect(mockRuns).toHaveLength(30);
  });
});

/* ------------------------------------------------------------------ */
/*  Run results                                                         */
/* ------------------------------------------------------------------ */

describe("mockRunResults", () => {
  it("has 770 entries", () => {
    expect(mockRunResults).toHaveLength(770);
  });
});

/* ------------------------------------------------------------------ */
/*  Baseline runs                                                       */
/* ------------------------------------------------------------------ */

describe("mockBaselineRuns", () => {
  it("has 30 entries", () => {
    expect(mockBaselineRuns).toHaveLength(30);
  });
});

/* ------------------------------------------------------------------ */
/*  Calibration profiles                                                */
/* ------------------------------------------------------------------ */

describe("mockCalibrationProfiles", () => {
  it("has 3 entries", () => {
    expect(mockCalibrationProfiles).toHaveLength(3);
  });

  it("exactly one profile is_default", () => {
    const defaults = mockCalibrationProfiles.filter((p) => p.is_default);
    expect(defaults).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/*  Credentials                                                         */
/* ------------------------------------------------------------------ */

describe("mockCredentials", () => {
  it("has at least 1 entry", () => {
    expect(mockCredentials.length).toBeGreaterThanOrEqual(1);
  });
});

/* ------------------------------------------------------------------ */
/*  Docs pages                                                          */
/* ------------------------------------------------------------------ */

describe("mockDocsPages", () => {
  it("has at least 1 entry", () => {
    expect(mockDocsPages.length).toBeGreaterThanOrEqual(1);
  });
});
