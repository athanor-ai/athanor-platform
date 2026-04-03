/**
 * Deterministic synthetic trace generation for RunResult records.
 *
 * Produces realistic-looking agent tool-use trajectories based on run
 * metadata (task slug, environment slug, score, steps, duration, error).
 * Uses a simple seeded PRNG so identical inputs always yield identical output.
 *
 * No React or browser dependencies -- pure TypeScript utility.
 */

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export interface TraceEntry {
  step: number;
  timestamp_ms: number;
  action: "tool_call" | "observation" | "reasoning" | "edit" | "terminal";
  tool?: string;
  input_summary: string;
  output_summary: string;
  duration_ms: number;
  success: boolean;
}

/* ------------------------------------------------------------------ */
/*  Seeded PRNG (Mulberry32)                                           */
/* ------------------------------------------------------------------ */

/** Hash a string into a 32-bit unsigned integer (djb2). */
function hashSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** Mulberry32 -- simple, fast, well-distributed 32-bit PRNG. */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/*  Environment tool palettes                                          */
/* ------------------------------------------------------------------ */

interface ToolDef {
  tool: string;
  inputs: string[];
  successOutputs: string[];
  failureOutputs: string[];
}

interface EnvPalette {
  tools: ToolDef[];
  reasoningPhrases: string[];
  editPhrases: string[];
}

const ENV_PALETTES: Record<string, EnvPalette> = {
  "lean-theorem-proving": {
    tools: [
      {
        tool: "lean_check",
        inputs: [
          "Type-check current proof state",
          "Verify goal after simp application",
          "Check term elaboration for inductive case",
          "Validate universe levels in declaration",
        ],
        successOutputs: [
          "No errors. Goals remaining: 0",
          "Type-check passed, 1 goal remaining",
          "Proof state consistent; subgoals reduced to 2",
          "Elaboration succeeded with inferred universe u",
        ],
        failureOutputs: [
          "type mismatch: expected `Nat`, got `Int`",
          "unknown identifier `List.map_cons`",
          "unsolved goals: |- a + b = b + a",
          "maximum recursion depth exceeded",
        ],
      },
      {
        tool: "tactic_suggest",
        inputs: [
          "Request tactic suggestions for current goal",
          "Suggest closing tactic for |- P -> P",
          "Find applicable lemma for Nat.add_comm",
          "Search for rewrite candidates in Mathlib",
        ],
        successOutputs: [
          "Suggestions: [simp, ring, omega]",
          "Try: exact fun h => h",
          "Applicable: Nat.add_comm, Nat.add_assoc",
          "Found 3 matching lemmas in Mathlib.Tactic",
        ],
        failureOutputs: [
          "No applicable tactics found for this goal",
          "Tactic search timed out after 5000ms",
          "Goal is not in normal form; try `simp` first",
          "Ambiguous match: 12 candidates, none definitively applicable",
        ],
      },
      {
        tool: "proof_search",
        inputs: [
          "Automated proof search for associativity lemma",
          "Search for proof of list length preservation",
          "Attempt omega on arithmetic subgoal",
          "Run `decide` on decidable proposition",
        ],
        successOutputs: [
          "Proof found in 120ms: by omega",
          "Proof term: Nat.add_assoc a b c",
          "Closed goal via `decide` in 15ms",
          "Found proof path: intro, cases, simp_all",
        ],
        failureOutputs: [
          "proof search exhausted (depth 50, 2048 nodes)",
          "omega failed: nonlinear arithmetic detected",
          "`decide` timed out on complex proposition",
          "No proof found within resource limits",
        ],
      },
      {
        tool: "lean_build",
        inputs: [
          "Build project to verify all declarations",
          "Rebuild module after tactic edit",
          "Compile Lean file with updated imports",
          "Full build check after proof modification",
        ],
        successOutputs: [
          "Build succeeded. 0 errors, 0 warnings",
          "Module compiled successfully in 3200ms",
          "All 14 declarations type-checked",
          "Build passed; proof obligations discharged",
        ],
        failureOutputs: [
          "Build failed: 2 errors in Proofs.lean:45",
          "Import cycle detected: A -> B -> A",
          "Declaration has sorry: proof incomplete",
          "Timeout: build exceeded 30s limit",
        ],
      },
    ],
    reasoningPhrases: [
      "Analyzing proof state: goal is to show commutativity of addition over Nat",
      "The current approach using induction on n seems stalled; pivoting to structural recursion",
      "After simp, two subgoals remain. The base case should close with rfl",
      "Reviewing Mathlib for relevant lemmas about List.filter and decidability",
      "Need to unfold the recursive definition before applying the induction hypothesis",
      "The goal requires showing termination; considering well-founded recursion",
    ],
    editPhrases: [
      "Replacing `sorry` with derived tactic sequence: simp [Nat.add_comm]",
      "Inserting `have h := Nat.succ_pred_eq_of_pos hpos` before the rewrite",
      "Updating proof to use `cases` instead of `match` for better goal display",
      "Adding auxiliary lemma `helper_add_zero` to simplify main proof",
    ],
  },

  "cedar-policy-verification": {
    tools: [
      {
        tool: "cedar_validate",
        inputs: [
          "Validate policy syntax against Cedar grammar",
          "Check policy well-formedness for entity types",
          "Validate action constraints in updated policy",
          "Run schema validation on policy set",
        ],
        successOutputs: [
          "Validation passed: policy is well-formed",
          "All entity types resolve against schema",
          "Policy syntax valid; 3 rules parsed",
          "Schema validation succeeded for 5 policies",
        ],
        failureOutputs: [
          "Validation error: unknown entity type `App::Admin`",
          "Parse error at line 4: unexpected token `when`",
          "Schema mismatch: action `viewPhoto` not declared",
          "Policy references undefined attribute `department`",
        ],
      },
      {
        tool: "policy_check",
        inputs: [
          "Evaluate authorization request against policy set",
          "Check if principal Admin can perform deleteUser",
          "Test deny-override behavior for conflicting rules",
          "Verify policy evaluation order for cascading permits",
        ],
        successOutputs: [
          "Decision: ALLOW (matched rule: admin-full-access)",
          "Decision: DENY (explicit deny on deleteUser for non-owner)",
          "Evaluation: 3 rules matched, final decision ALLOW",
          "Authorization check passed for all 12 test requests",
        ],
        failureOutputs: [
          "Decision: DENY (no matching permit rule)",
          "Unexpected ALLOW: overly permissive rule `permit-all-read`",
          "Evaluation error: condition references missing context key",
          "Conflict detected: 2 permits and 1 deny with no resolution",
        ],
      },
      {
        tool: "schema_verify",
        inputs: [
          "Verify entity hierarchy consistency",
          "Check that all actions have declared principal types",
          "Validate attribute types across entity definitions",
          "Confirm schema completeness for new entity `Document`",
        ],
        successOutputs: [
          "Schema consistent: 8 entity types, 15 actions",
          "All actions have valid principal/resource types",
          "Attribute type-check passed for 23 attributes",
          "Entity `Document` correctly integrated into hierarchy",
        ],
        failureOutputs: [
          "Inconsistency: `Team` has no parent in entity hierarchy",
          "Action `shareDoc` missing resource type declaration",
          "Attribute `age` declared as String but used as Long",
          "Orphaned entity type: `TempUser` not referenced by any action",
        ],
      },
      {
        tool: "authorization_test",
        inputs: [
          "Run test suite: basic RBAC scenarios",
          "Execute ABAC test cases for time-based policies",
          "Test cross-tenant isolation policy enforcement",
          "Run regression tests after policy edit",
        ],
        successOutputs: [
          "12/12 test cases passed",
          "All 8 ABAC scenarios produced expected decisions",
          "Cross-tenant isolation verified: 0 leaks in 20 cases",
          "Regression suite: 15/15 passed after edit",
        ],
        failureOutputs: [
          "3/12 test cases failed (cases 4, 7, 11)",
          "ABAC test #3 failed: expected DENY, got ALLOW",
          "Tenant leak detected in case 14: principal from Org-B accessed Org-A resource",
          "Regression failure: case 9 now returns ALLOW (was DENY)",
        ],
      },
    ],
    reasoningPhrases: [
      "The deny rule needs to be more specific; currently it blocks legitimate admin access",
      "Examining the entity hierarchy to determine if `Team::Engineering` inherits from `Group`",
      "The test failure suggests the `when` clause condition is too broad for the ABAC policy",
      "Need to add an explicit forbid rule for cross-tenant access before the general permit",
      "Reviewing the action definitions to ensure `createDocument` has correct principal constraints",
      "The policy set has overlapping permit rules; analyzing which takes precedence",
    ],
    editPhrases: [
      "Adding `unless { resource.owner != principal }` guard to the permit rule",
      "Narrowing action scope from `Action::*` to `Action::\"readDocument\"`",
      "Inserting forbid rule for cross-tenant access before the catch-all permit",
      "Updating entity schema to add `department` attribute to `User` entity type",
    ],
  },

  "distributed-consensus": {
    tools: [
      {
        tool: "network_sim",
        inputs: [
          "Simulate 5-node Raft cluster with default partition profile",
          "Run Paxos round with 3 acceptors and 1 proposer failure",
          "Simulate network partition isolating node-2 from majority",
          "Execute 100-round consensus with variable latency (50-200ms)",
        ],
        successOutputs: [
          "Simulation complete: consensus reached in 3 rounds (12ms avg)",
          "Leader elected: node-0 after 2 election rounds",
          "Partition healed; cluster re-converged in 340ms",
          "100 rounds completed: 98 committed, 2 retried, 0 lost",
        ],
        failureOutputs: [
          "Split-brain detected: nodes {0,1} and {3,4} both claim leadership",
          "Consensus not reached after 50 rounds; livelock suspected",
          "Message loss rate 45% -- exceeds fault tolerance threshold",
          "Simulation diverged: state hashes differ across nodes after round 30",
        ],
      },
      {
        tool: "inject_fault",
        inputs: [
          "Kill leader node during commit phase",
          "Inject 200ms latency spike on link node-1 <-> node-3",
          "Simulate Byzantine fault: node-4 sends conflicting votes",
          "Drop 30% of AppendEntries RPCs for 10 seconds",
        ],
        successOutputs: [
          "Fault injected; new leader elected in 150ms",
          "Latency spike applied; cluster remained operational",
          "Byzantine node isolated by honest majority; consensus maintained",
          "Message drop applied; cluster recovered after leader retry",
        ],
        failureOutputs: [
          "Fault caused permanent split: no leader after 60s timeout",
          "Latency spike caused cascading election timeouts",
          "Byzantine node corrupted 2 followers before detection",
          "Message loss triggered log divergence on nodes 1 and 4",
        ],
      },
      {
        tool: "verify_safety",
        inputs: [
          "Check single-leader invariant across all terms",
          "Verify log consistency: no conflicting entries at same index",
          "Assert state machine safety: all committed entries applied",
          "Validate that no two nodes commit different values for same slot",
        ],
        successOutputs: [
          "Safety check passed: unique leader per term across 200 terms",
          "Log consistency verified: 0 conflicts in 5000 entries",
          "All 150 committed entries correctly applied to state machine",
          "No conflicting commits detected across 5 nodes",
        ],
        failureOutputs: [
          "SAFETY VIOLATION: term 14 has two leaders (node-0, node-3)",
          "Log conflict at index 42: node-1 has 'x=5', node-2 has 'x=7'",
          "Committed entry at index 88 not applied on node-4",
          "Conflicting values committed for slot 23 on nodes 0 and 2",
        ],
      },
      {
        tool: "check_liveness",
        inputs: [
          "Verify progress: cluster must commit within 500ms of proposal",
          "Check that leader election completes within 2 heartbeat intervals",
          "Assert that client requests are not starved under normal load",
          "Verify cluster recovers liveness after partition heals",
        ],
        successOutputs: [
          "Liveness confirmed: avg commit latency 45ms, max 210ms",
          "Election completes within 2 heartbeats in 100/100 trials",
          "No starvation detected: all 50 clients received responses",
          "Cluster resumed committing within 200ms of partition heal",
        ],
        failureOutputs: [
          "Liveness violation: 3 proposals pending > 500ms",
          "Election took 8 heartbeat intervals in trial 47",
          "Client 12 starved: 0 responses in 10-second window",
          "Cluster failed to resume after partition heal (30s timeout)",
        ],
      },
    ],
    reasoningPhrases: [
      "The split-brain scenario suggests the election timeout is too aggressive for this network profile",
      "Analyzing the commit log to see where node-2 diverged after the partition",
      "The safety violation in term 14 implies the vote-granting logic has a race condition",
      "Need to increase the heartbeat interval to prevent unnecessary re-elections under high latency",
      "The liveness issue points to a starvation problem in the proposal queue during leader transition",
      "Reviewing the AppendEntries handler to check if log truncation is handled correctly on rejoin",
    ],
    editPhrases: [
      "Increasing election timeout from 150ms to 300ms to reduce spurious elections",
      "Adding pre-vote phase to prevent disruptive elections from partitioned nodes",
      "Fixing vote-granting logic to reject votes from nodes with stale terms",
      "Updating log replication to include leader commit index in heartbeat messages",
    ],
  },

  "congestion-control": {
    tools: [
      {
        tool: "ns3_run",
        inputs: [
          "Run ns-3 simulation: 10Mbps bottleneck, 50ms RTT, 60s duration",
          "Simulate dumbbell topology with 5 competing flows",
          "Execute 30-second ramp-up scenario with cross-traffic",
          "Run simulation with 1% random packet loss on bottleneck link",
        ],
        successOutputs: [
          "Simulation complete: avg throughput 9.2Mbps, loss rate 0.3%",
          "5-flow simulation done: Jain's fairness index 0.97",
          "Ramp-up complete: steady state reached at t=12s",
          "Simulation finished: 8.1Mbps avg throughput with 1% loss",
        ],
        failureOutputs: [
          "Throughput collapsed to 0.8Mbps at t=25s (buffer overflow)",
          "Fairness index 0.42: flow-3 starved by aggressive flow-1",
          "Simulation unstable: oscillating between 1Mbps and 10Mbps",
          "Timeout: simulation did not converge within 120s",
        ],
      },
      {
        tool: "measure_throughput",
        inputs: [
          "Measure goodput over last 5-second window",
          "Calculate per-flow throughput breakdown",
          "Sample instantaneous throughput at 100ms intervals",
          "Measure throughput during slow-start phase",
        ],
        successOutputs: [
          "5s window: 9.4Mbps goodput (94% utilization)",
          "Flow breakdown: [2.1, 1.9, 2.0, 2.1, 1.9] Mbps -- balanced",
          "Throughput samples: stable at 9.1-9.5Mbps over 60 intervals",
          "Slow-start: reached 8Mbps in 4.2s (exponential growth confirmed)",
        ],
        failureOutputs: [
          "5s window: 2.1Mbps goodput (21% utilization -- severe underuse)",
          "Flow breakdown: [7.2, 0.3, 0.4, 0.1, 0.0] -- extreme unfairness",
          "Throughput oscillating: min 1.2Mbps, max 9.8Mbps, CV=0.6",
          "Slow-start overshoot: reached 15Mbps, triggered massive loss",
        ],
      },
      {
        tool: "adjust_params",
        inputs: [
          "Set cwnd initial value to 10 segments",
          "Update AIMD parameters: alpha=1, beta=0.5",
          "Configure BBR-like pacing rate to 1.25x BtlBw",
          "Set loss-based threshold to 2% before multiplicative decrease",
        ],
        successOutputs: [
          "Parameters updated: initial cwnd = 10 segments",
          "AIMD configured: additive increase 1 MSS/RTT, halve on loss",
          "Pacing rate set to 1.25 * estimated bandwidth",
          "Loss threshold updated to 2%; applying on next detection",
        ],
        failureOutputs: [
          "Invalid parameter: initial cwnd must be >= 1",
          "AIMD configuration rejected: beta must be in (0, 1)",
          "Pacing rate too aggressive: exceeds link capacity estimate",
          "Threshold 2% conflicts with minimum congestion window constraint",
        ],
      },
      {
        tool: "fairness_check",
        inputs: [
          "Calculate Jain's fairness index across all flows",
          "Check max-min fairness allocation",
          "Evaluate flow completion time variance",
          "Compare throughput CDF against ideal equal-share",
        ],
        successOutputs: [
          "Jain's index: 0.98 (near-perfect fairness)",
          "Max-min fair: all flows within 5% of equal share",
          "FCT variance: 0.02s^2 across 5 flows (low dispersion)",
          "CDF within 3% of ideal at all percentiles",
        ],
        failureOutputs: [
          "Jain's index: 0.61 (significant unfairness detected)",
          "Max-min violation: flow-0 gets 3.2x the fair share",
          "FCT variance: 4.8s^2 -- some flows finishing 10x slower",
          "CDF deviation > 20% at p50; tail flows severely penalized",
        ],
      },
    ],
    reasoningPhrases: [
      "The throughput collapse at t=25s indicates the congestion window is growing too aggressively in slow-start",
      "Jain's index of 0.61 suggests flow-1 is not backing off properly on loss events",
      "The oscillation pattern is characteristic of a poorly tuned AIMD ratio -- beta may be too low",
      "Need to implement pacing to smooth out burst transmissions that overwhelm the bottleneck buffer",
      "Analyzing the RTT samples to determine if the delay-based signal is being used correctly",
      "The unfairness is likely caused by RTT bias: shorter-RTT flows ramp up faster",
    ],
    editPhrases: [
      "Implementing hybrid loss-delay detection to trigger multiplicative decrease earlier",
      "Adding pacing logic to spread segment transmissions across the RTT interval",
      "Updating the AIMD beta from 0.7 to 0.5 for more conservative backoff",
      "Adding RTT-fairness compensation: scaling additive increase inversely with base RTT",
    ],
  },

  "c-to-rust": {
    tools: [
      {
        tool: "cargo_build",
        inputs: [
          "Build translated Rust crate with --release",
          "Compile FFI bridge module",
          "Build with all features enabled",
          "Incremental build after translation edit",
        ],
        successOutputs: [
          "Compiling ported_lib v0.1.0 -- Finished release in 4.2s",
          "FFI bridge compiled successfully; 0 warnings",
          "Build succeeded with features: [ffi, serde, validation]",
          "Incremental build: 1 crate recompiled in 0.8s",
        ],
        failureOutputs: [
          "error[E0308]: mismatched types -- expected `*mut c_void`, found `&str`",
          "error[E0106]: missing lifetime specifier in FFI return type",
          "error[E0277]: `*mut Node` cannot be sent between threads safely",
          "Build failed: 3 errors, 2 warnings",
        ],
      },
      {
        tool: "cargo_test",
        inputs: [
          "Run full test suite for translated module",
          "Execute FFI round-trip tests",
          "Run memory safety regression tests",
          "Test edge cases for pointer-to-reference conversions",
        ],
        successOutputs: [
          "test result: ok. 24 passed; 0 failed; 0 ignored",
          "FFI round-trip: 8/8 passed -- data integrity verified",
          "Memory safety suite: 12/12 passed (no UB detected by Miri)",
          "Edge cases: 6/6 passed including null pointer handling",
        ],
        failureOutputs: [
          "test result: FAILED. 20 passed; 4 failed; 0 ignored",
          "FFI test #3 FAILED: data corruption across boundary",
          "Miri detected UB: accessing dangling pointer in `translate_node`",
          "Edge case #2 panicked: 'called unwrap() on a None value'",
        ],
      },
      {
        tool: "clippy_check",
        inputs: [
          "Run clippy with pedantic lints enabled",
          "Check for unsafe usage patterns",
          "Lint translated code for idiomatic Rust style",
          "Run clippy on FFI module with allow(improper_ctypes) audit",
        ],
        successOutputs: [
          "Clippy: 0 warnings (pedantic mode)",
          "Unsafe audit: 3 blocks, all justified with SAFETY comments",
          "Idiomatic check: code follows Rust conventions",
          "FFI module: improper_ctypes suppressed with documented rationale",
        ],
        failureOutputs: [
          "warning: unnecessary `unsafe` block (clippy::needless_unsafe)",
          "warning: transmute from `*mut T` to `&T` without null check",
          "warning: C-style for loop should use iterator with `.enumerate()`",
          "error: `#[allow(improper_ctypes)]` used without SAFETY justification",
        ],
      },
      {
        tool: "unsafe_audit",
        inputs: [
          "Audit all unsafe blocks in translated code",
          "Verify SAFETY comments for each unsafe usage",
          "Check that raw pointer dereferences have null guards",
          "Review FFI boundary for undefined behavior risks",
        ],
        successOutputs: [
          "Audit complete: 5 unsafe blocks, all with valid SAFETY docs",
          "All 5 SAFETY comments reference specific invariants",
          "Null guards present for all 8 raw pointer dereferences",
          "FFI boundary review: no UB risks identified",
        ],
        failureOutputs: [
          "Audit: 3/7 unsafe blocks missing SAFETY documentation",
          "SAFETY comment on line 142 does not justify the transmute",
          "Missing null check before dereference at lib.rs:88",
          "Potential UB: aliasing `&mut` and `*const` in FFI callback",
        ],
      },
      {
        tool: "translate_fn",
        inputs: [
          "Translate `parse_header()` from C to safe Rust",
          "Convert `linked_list_insert()` to idiomatic Rust",
          "Port `calculate_checksum()` preserving C ABI compatibility",
          "Translate `handle_signal()` with proper error handling",
        ],
        successOutputs: [
          "Translated `parse_header` to safe Rust with Result<Header, ParseError>",
          "Converted linked list to Rust `VecDeque` with O(1) insert",
          "Ported `calculate_checksum` with #[no_mangle] extern \"C\" wrapper",
          "Translated signal handler using Rust's signal-hook crate",
        ],
        failureOutputs: [
          "Translation incomplete: `goto cleanup` pattern requires restructuring",
          "Cannot safely translate: `void*` cast chain has no Rust equivalent",
          "ABI mismatch: C struct padding differs from Rust repr(C) layout",
          "Signal handler translation failed: async-signal-safety violation",
        ],
      },
    ],
    reasoningPhrases: [
      "The C function uses a goto-based error cleanup pattern; need to restructure as Rust drop guards",
      "This void pointer cast chain represents a tagged union -- translating to Rust enum",
      "The raw pointer arithmetic in the original C can be replaced with safe slice indexing",
      "Need to determine if the C global mutable state can be wrapped in a Mutex or atomics",
      "The FFI boundary requires careful lifetime management for the borrowed buffer",
      "Analyzing whether the C macro can be replaced with a Rust const generic parameter",
    ],
    editPhrases: [
      "Replacing raw pointer arithmetic with safe `get_unchecked` behind a bounds check",
      "Wrapping C global in `lazy_static! { static ref STATE: Mutex<T> }`",
      "Adding #[repr(C)] to ensure struct layout matches C ABI expectations",
      "Converting `malloc/free` pair to `Box::new` with proper Drop implementation",
    ],
  },

  "hw-cbmc": {
    tools: [
      {
        tool: "ebmc_check",
        inputs: [
          "Run EBMC bounded model check on ALU module (depth 20)",
          "Verify FIFO properties with k-induction (k=10)",
          "Check safety assertions on FSM state transitions",
          "Run BMC on arbiter module with 4 requestors",
        ],
        successOutputs: [
          "EBMC: PASSED -- all 8 properties hold at depth 20",
          "k-induction: all FIFO invariants verified at k=10",
          "FSM safety: 12/12 assertions hold across all reachable states",
          "Arbiter BMC: mutual exclusion and starvation freedom verified",
        ],
        failureOutputs: [
          "EBMC: FAILED -- property p3 violated at cycle 14",
          "k-induction inconclusive: base case failed at k=3",
          "FSM safety violation: assertion `no_deadlock` fails in state S5",
          "Arbiter: starvation detected for requestor 2 at cycle 45",
        ],
      },
      {
        tool: "verilog_parse",
        inputs: [
          "Parse updated ALU module definition",
          "Syntax-check testbench file after assertion edit",
          "Parse module hierarchy for formal verification setup",
          "Validate port declarations and parameter consistency",
        ],
        successOutputs: [
          "Parsed ALU: 4 inputs, 2 outputs, 3 internal wires",
          "Testbench syntax valid; 6 assertions extracted",
          "Module hierarchy: top -> alu, fifo, arbiter (3 levels)",
          "Port declarations consistent across 4 modules",
        ],
        failureOutputs: [
          "Parse error: line 23: unexpected token `always_ff`",
          "Syntax error: missing semicolon after assertion at line 45",
          "Hierarchy error: unresolved module instance `counter_v2`",
          "Port mismatch: `data_in` width 8 in parent, 16 in child",
        ],
      },
      {
        tool: "assert_property",
        inputs: [
          "Add SVA property: req implies eventually grant within 5 cycles",
          "Insert assertion: FIFO never overflows",
          "Define cover property for FSM reaching state S7",
          "Add fairness constraint: each requestor granted within 10 cycles",
        ],
        successOutputs: [
          "Property added: `p_req_grant` -- req |-> ##[1:5] grant",
          "Assertion inserted: `a_fifo_no_overflow` at line 67",
          "Cover property `c_reach_s7` successfully defined",
          "Fairness constraint added for 4 requestors with bound 10",
        ],
        failureOutputs: [
          "Property syntax error: sequence operator `|->` requires antecedent",
          "Assertion conflicts with existing property on same signal",
          "Cover property unreachable: state S7 is dead code",
          "Fairness bound 10 is insufficient; requestor 3 needs >=15 cycles",
        ],
      },
      {
        tool: "counterexample_trace",
        inputs: [
          "Generate waveform for property p3 violation",
          "Extract minimal counterexample for deadlock assertion",
          "Trace signal values leading to FIFO overflow",
          "Produce VCD file for failing arbiter property",
        ],
        successOutputs: [
          "Counterexample trace: 14 cycles, key signals: clk, req, state",
          "Minimal trace: 6 cycles to reach deadlock from initial state",
          "FIFO overflow trace: wr_en high for 17 consecutive cycles",
          "VCD generated: arbiter_fail.vcd (2.1KB, 45 cycles)",
        ],
        failureOutputs: [
          "Trace generation failed: SAT solver timeout at depth 20",
          "No minimal counterexample found within simplification budget",
          "Signal `wr_en` not observable at module boundary",
          "VCD generation failed: counterexample too deep (>1000 cycles)",
        ],
      },
    ],
    reasoningPhrases: [
      "The property violation at cycle 14 suggests the state machine misses a reset condition",
      "Need to strengthen the induction hypothesis to make k-induction succeed at lower k",
      "The FIFO overflow happens because the read-side has no backpressure mechanism",
      "Analyzing the counterexample to determine if the deadlock is reachable from reset state",
      "The arbiter starvation issue indicates the priority encoder favors low-numbered requestors",
      "Reviewing the assertion to check if the liveness bound accounts for pipeline latency",
    ],
    editPhrases: [
      "Adding reset guard to FSM transition from S3 to S5 to prevent deadlock",
      "Inserting FIFO almost-full signal to enable backpressure before overflow",
      "Updating arbiter to round-robin scheme instead of fixed-priority",
      "Strengthening induction invariant with helper property on counter bounds",
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Helper: pick from array using PRNG                                 */
/* ------------------------------------------------------------------ */

function pick<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

/* ------------------------------------------------------------------ */
/*  Resolve environment slug from a possible short form                */
/* ------------------------------------------------------------------ */

/**
 * Map the envSlug parameter (which may be a short env-id like "env-lean")
 * to the canonical palette key used in ENV_PALETTES.
 */
const ENV_ID_TO_SLUG: Record<string, string> = {
  "env-lean": "lean-theorem-proving",
  "env-cedar": "cedar-policy-verification",
  "env-consensus": "distributed-consensus",
  "env-congestion": "congestion-control",
  "env-c2rust": "c-to-rust",
  "env-hwcbmc": "hw-cbmc",
};

function resolvePaletteKey(envSlug: string): string {
  return ENV_ID_TO_SLUG[envSlug] ?? envSlug;
}

/* ------------------------------------------------------------------ */
/*  Core synthesis                                                     */
/* ------------------------------------------------------------------ */

/**
 * Generate a deterministic, realistic trace for a single run result.
 *
 * The same combination of inputs always produces the same output (seeded
 * from the taskSlug). The trace structure and content reflect the
 * environment domain and adapt to the score / error status.
 */
export function synthesizeTrace(
  taskSlug: string,
  envSlug: string,
  rawScore: number,
  stepsUsed: number,
  durationMs: number,
  error: string | null,
): TraceEntry[] {
  const paletteKey = resolvePaletteKey(envSlug);
  const palette = ENV_PALETTES[paletteKey];
  if (!palette) {
    return [];
  }

  const rand = mulberry32(hashSeed(taskSlug));

  /* ---- decide how many trace entries to produce ---- */
  const entriesPerStep = 1 + rand() * 2; // 1-3
  const rawCount = Math.round(stepsUsed * entriesPerStep);
  // Clamp to a reasonable range: at least 2 entries, at most 120.
  const entryCount = Math.max(2, Math.min(120, rawCount));

  /* ---- distribute the total duration across entries ---- */
  const durations = allocateDurations(entryCount, durationMs, rand);

  /* ---- decide how many entries succeed ---- */
  // Higher scores -> more successes. Score of 0 -> ~20-40% success rate.
  // Score of 1 -> ~90-100% success rate.
  const baseSuccessRate = 0.2 + rawScore * 0.7;
  // If there's an error, reduce success rate slightly.
  const successRate = error ? Math.max(0.1, baseSuccessRate - 0.1) : baseSuccessRate;

  /* ---- build the trace ---- */
  const trace: TraceEntry[] = [];
  let timestamp = 0;
  let stepCounter = 1;

  for (let i = 0; i < entryCount; i++) {
    const isFirst = i === 0;
    const isLast = i === entryCount - 1;
    const progress = entryCount > 1 ? i / (entryCount - 1) : 1;

    /* Determine action type based on position and randomness. */
    const action = chooseAction(isFirst, isLast, progress, rand, error);

    /* Determine success for this entry. */
    let success: boolean;
    if (isLast && error) {
      success = false;
    } else if (isFirst) {
      // First entry (reasoning) is almost always "successful".
      success = true;
    } else {
      // Later entries have a success probability influenced by score.
      // Also, entries later in a failing trace are more likely to fail.
      const adjustedRate = error
        ? successRate * (1 - progress * 0.4)
        : successRate;
      success = rand() < adjustedRate;
    }

    const entry = buildEntry(
      action,
      stepCounter,
      timestamp,
      durations[i],
      success,
      palette,
      rand,
      isLast,
      error,
    );

    trace.push(entry);
    timestamp += durations[i];

    // Increment step counter roughly every 1-3 entries.
    if (rand() < 0.5 || action === "observation") {
      stepCounter++;
    }
  }

  return trace;
}

/* ------------------------------------------------------------------ */
/*  Action selection                                                   */
/* ------------------------------------------------------------------ */

type Action = TraceEntry["action"];

function chooseAction(
  isFirst: boolean,
  isLast: boolean,
  progress: number,
  rand: () => number,
  error: string | null,
): Action {
  if (isFirst) return "reasoning";

  if (isLast) {
    if (error) return "terminal";
    // Final entry is usually an observation confirming the result.
    return rand() < 0.8 ? "observation" : "tool_call";
  }

  const r = rand();

  // Early in the trace: more reasoning and tool calls.
  if (progress < 0.3) {
    if (r < 0.3) return "reasoning";
    if (r < 0.75) return "tool_call";
    if (r < 0.9) return "observation";
    return "edit";
  }

  // Middle: balanced mix.
  if (progress < 0.7) {
    if (r < 0.15) return "reasoning";
    if (r < 0.50) return "tool_call";
    if (r < 0.75) return "observation";
    return "edit";
  }

  // Late: more observations, edits, and tool calls to wrap up.
  if (r < 0.10) return "reasoning";
  if (r < 0.40) return "tool_call";
  if (r < 0.65) return "observation";
  if (r < 0.90) return "edit";
  return "terminal";
}

/* ------------------------------------------------------------------ */
/*  Entry builder                                                      */
/* ------------------------------------------------------------------ */

function buildEntry(
  action: Action,
  step: number,
  timestamp_ms: number,
  duration_ms: number,
  success: boolean,
  palette: EnvPalette,
  rand: () => number,
  isLast: boolean,
  error: string | null,
): TraceEntry {
  switch (action) {
    case "reasoning":
      return {
        step,
        timestamp_ms,
        action: "reasoning",
        input_summary: "Analyzing current state and planning next action",
        output_summary: pick(palette.reasoningPhrases, rand),
        duration_ms,
        success: true, // reasoning always "succeeds"
      };

    case "tool_call": {
      const toolDef = pick(palette.tools, rand);
      return {
        step,
        timestamp_ms,
        action: "tool_call",
        tool: toolDef.tool,
        input_summary: pick(toolDef.inputs, rand),
        output_summary: success
          ? pick(toolDef.successOutputs, rand)
          : pick(toolDef.failureOutputs, rand),
        duration_ms,
        success,
      };
    }

    case "observation": {
      const toolDef = pick(palette.tools, rand);
      const inputSummary = success
        ? "Reviewing output from previous tool call"
        : "Examining failure output for diagnostic information";
      const outputSummary = success
        ? pick(toolDef.successOutputs, rand)
        : pick(toolDef.failureOutputs, rand);
      return {
        step,
        timestamp_ms,
        action: "observation",
        input_summary: inputSummary,
        output_summary: outputSummary,
        duration_ms,
        success,
      };
    }

    case "edit":
      return {
        step,
        timestamp_ms,
        action: "edit",
        input_summary: "Modifying source based on analysis",
        output_summary: pick(palette.editPhrases, rand),
        duration_ms,
        success,
      };

    case "terminal": {
      if (isLast && error) {
        return {
          step,
          timestamp_ms,
          action: "terminal",
          input_summary: "Task execution terminated",
          output_summary: `Error: ${error}`,
          duration_ms,
          success: false,
        };
      }
      return {
        step,
        timestamp_ms,
        action: "terminal",
        input_summary: "Finalizing task execution",
        output_summary: success
          ? "Task completed successfully"
          : "Task terminated with partial progress",
        duration_ms,
        success,
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Duration allocation                                                */
/* ------------------------------------------------------------------ */

/**
 * Distribute `totalMs` across `count` entries with plausible variance.
 *
 * The distribution is slightly right-skewed (tool calls tend to take more
 * time than reasoning steps) and sums exactly to `totalMs`.
 */
function allocateDurations(
  count: number,
  totalMs: number,
  rand: () => number,
): number[] {
  if (count <= 0) return [];
  if (count === 1) return [totalMs];

  // Generate raw weights with some variance.
  const weights: number[] = [];
  let sum = 0;
  for (let i = 0; i < count; i++) {
    // Exponential-ish distribution: most entries are short, some are long.
    const w = 0.3 + rand() * 1.7;
    weights.push(w);
    sum += w;
  }

  // Normalize to totalMs and round to integers.
  const durations = weights.map((w) => Math.max(1, Math.round((w / sum) * totalMs)));

  // Fix rounding error by adjusting the largest entry.
  const allocated = durations.reduce((a, b) => a + b, 0);
  const diff = totalMs - allocated;
  if (diff !== 0) {
    // Find the largest duration and adjust it.
    let maxIdx = 0;
    for (let i = 1; i < durations.length; i++) {
      if (durations[i] > durations[maxIdx]) maxIdx = i;
    }
    durations[maxIdx] = Math.max(1, durations[maxIdx] + diff);
  }

  return durations;
}
