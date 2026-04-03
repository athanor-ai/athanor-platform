# Real Environment/Task/Run/Heatmap Ingestion Summary

## Overview

Replaced all seeded/mock dashboard data with real Athanor repo-derived data
across 6 environments, 154 tasks, 5 models, and 770 task-level scores.

## Data Sources

All data extracted from live GitHub repos via `gh api`:
- `athanor-ai/lean-theorem-proving` — 30 tasks
- `athanor-ai/cedar-policy-verification` — 20 tasks
- `athanor-ai/distributed-consensus` — 26 tasks
- `athanor-ai/congestion-control` — 24 tasks
- `athanor-ai/c-to-rust` — 28 tasks
- `athanor-ai/hw-cbmc` — 26 tasks

Task configs from `root_data/eval/configs/*.json`, run results from
`runs/<model>_run<n>.json` in each repo.

## New Files

| File | Description |
|------|-------------|
| `src/data/models.ts` | 5-model baseline lineup (Claude Sonnet 4.6, Mistral Large 3, Kimi K2.5, Gemini 3.1 Pro, Gemini 2.5 Flash) |
| `src/data/tasks.ts` | 154 real tasks with IDs, slugs, names, difficulty, categories |
| `src/data/heatmap.ts` | 770 task-level scores across all 6 envs x 5 models |
| `src/data/runs.ts` | 30 runs, 770 run results, 30 baselines |

## Modified Files

| File | Changes |
|------|---------|
| `src/data/mock.ts` | Re-exports real data from new modules; updated env versions |
| `src/app/calibration/page.tsx` | Added cross-env heatmap + per-env task-level heatmaps |

## Architecture

```
hooks (unchanged) → mock.ts (re-exports) → real data modules
                                            ├── models.ts
                                            ├── tasks.ts
                                            ├── runs.ts
                                            └── heatmap.ts
```

All existing hooks and pages work unchanged — mock.ts still exports the same
interface, just backed by real data now.

## Validation

- `bun run lint` — 0 errors, 0 warnings
- `tsc --noEmit` — clean
- `bun run build` — all 13 routes generated successfully
