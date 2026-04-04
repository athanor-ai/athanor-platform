#!/usr/bin/env python3
"""
Generate the updated src/data/tasks.ts with:
- github_url per task
- Detailed 2-3 sentence descriptions per task
"""

import json
import os

# Environment ID -> slug mapping (from src/data/environments.ts)
ENV_SLUGS = {
    "env-lean": "lean-theorem-proving",
    "env-cedar": "cedar-policy-verification",
    "env-consensus": "distributed-consensus",
    "env-congestion": "congestion-control",
    "env-c2rust": "c-to-rust",
    "env-hwcbmc": "hw-cbmc",
    "env-protein": "protein-synthesis",
}

# All 174 tasks with their properties
# Format: (id, env_id, name, slug, difficulty, category, description)
TASKS = [
    # --- Lean Theorem Proving (30 tasks) ---
    ("task-lean-001", "env-lean", "Ackermann Level3", "ackermann-level3", "expert", "recursion",
     "Prove termination and correctness properties of the Ackermann function at recursion level 3 in Lean 4. The agent must construct a well-founded recursion proof using structural induction over nested recursive calls."),
    ("task-lean-002", "env-lean", "Binary Search", "binary-search", "medium", "algorithms",
     "Implement and formally verify a binary search algorithm in Lean 4 with correctness guarantees. The agent must prove that the returned index satisfies the search predicate and that the algorithm terminates on all sorted inputs."),
    ("task-lean-003", "env-lean", "Church Rosser", "church-rosser", "expert", "lambda-calculus",
     "Prove the Church-Rosser confluence theorem for untyped lambda calculus in Lean 4. The agent must formalize beta-reduction, establish the diamond property for parallel reduction, and derive confluence as a corollary."),
    ("task-lean-004", "env-lean", "Compiler Correctness", "compiler-correctness", "expert", "compiler-verification",
     "Verify end-to-end correctness of a small compiler from arithmetic expressions to a stack machine in Lean 4. The agent must prove a simulation relation showing that compiled code preserves the denotational semantics of the source language."),
    ("task-lean-005", "env-lean", "Fib Add Formula", "fib-add-formula", "expert", "arithmetic",
     "Prove the Fibonacci addition formula fib(m+n) = fib(m)*fib(n-1) + fib(m+1)*fib(n) in Lean 4. The agent must handle base cases and the inductive step using properties of Fibonacci recurrence."),
    ("task-lean-006", "env-lean", "First Duplicate", "first-duplicate", "easy", "algorithms",
     "Implement a function that finds the first duplicate element in a list and prove its correctness in Lean 4. The agent must show the returned element appears at least twice and no earlier element is duplicated."),
    ("task-lean-007", "env-lean", "Fix Proof Errors", "fix-proof-errors", "easy", "proof-repair",
     "Diagnose and repair broken tactic proofs in a Lean 4 file containing intentionally introduced errors. The agent must identify the failing tactics and replace them with correct alternatives that discharge all proof obligations."),
    ("task-lean-008", "env-lean", "Fix Wrong Lemma", "fix-wrong-lemma", "easy", "proof-repair",
     "Identify and correct an incorrectly stated lemma in a Lean 4 formalization so that the downstream proofs compile. The agent must fix the lemma statement while preserving the intended mathematical meaning and update dependent proofs."),
    ("task-lean-009", "env-lean", "Increasing Triplet", "increasing-triplet", "easy", "algorithms",
     "Implement a verified function that detects whether a list contains an increasing triplet subsequence in Lean 4. The agent must prove that a positive result implies three indices i < j < k where a[i] < a[j] < a[k]."),
    ("task-lean-010", "env-lean", "Last Digit Squares", "last-digit-squares", "easy", "number-theory",
     "Prove that the last digit of a perfect square is always in the set {0, 1, 4, 5, 6, 9} in Lean 4. The agent must use modular arithmetic to exhaustively verify the property for all residues modulo 10."),
    ("task-lean-011", "env-lean", "List Advanced", "list-advanced", "easy", "data-structures",
     "Prove advanced list properties such as reverse involution and map-filter commutativity in Lean 4. The agent must build proofs using structural induction and the standard Lean 4 list library."),
    ("task-lean-012", "env-lean", "List Filter", "list-filter", "easy", "data-structures",
     "Verify properties of list filtering operations in Lean 4 including length bounds and element membership. The agent must prove that filtered lists are sublists and that all retained elements satisfy the predicate."),
    ("task-lean-013", "env-lean", "Longest Streak", "longest-streak", "easy", "algorithms",
     "Implement and verify an algorithm that computes the longest consecutive streak of equal elements in a list. The agent must prove the returned length is maximal and corresponds to an actual contiguous run in the input."),
    ("task-lean-014", "env-lean", "Majority Element", "majority-element", "expert", "algorithms",
     "Verify the Boyer-Moore majority vote algorithm in Lean 4 with a full correctness proof. The agent must prove that if a majority element exists the algorithm finds it, using a loop invariant relating the candidate count to element frequencies."),
    ("task-lean-015", "env-lean", "Max Subarray", "max-subarray", "easy", "algorithms",
     "Implement Kadane's algorithm for maximum subarray sum and prove its correctness in Lean 4. The agent must show the returned sum equals the maximum over all contiguous subarrays of the input."),
    ("task-lean-016", "env-lean", "Merge Sorted", "merge-sorted", "medium", "algorithms",
     "Implement a merge function for two sorted lists and prove the output is sorted and a permutation of the inputs in Lean 4. The agent must establish sortedness preservation through the merge invariant."),
    ("task-lean-017", "env-lean", "Nat Arith Combined", "nat-arith-combined", "expert", "arithmetic",
     "Prove a collection of combined natural number arithmetic identities in Lean 4 involving addition, multiplication, and exponentiation. The agent must chain together induction, commutativity, and distributivity lemmas."),
    ("task-lean-018", "env-lean", "Nat Divisibility", "nat-divisibility", "expert", "arithmetic",
     "Prove key divisibility properties of natural numbers in Lean 4 such as transitivity and the relationship between divisibility and ordering. The agent must formalize the divides relation and derive non-trivial consequences."),
    ("task-lean-019", "env-lean", "Nat Induction Hard", "nat-induction-hard", "expert", "arithmetic",
     "Complete challenging natural number induction proofs in Lean 4 that require strong induction or well-founded recursion. The agent must select appropriate induction principles and handle complex step cases."),
    ("task-lean-020", "env-lean", "Partition Evens Odds", "partition-evens-odds", "easy", "algorithms",
     "Implement and verify a function that partitions a list into even and odd elements in Lean 4. The agent must prove that the two output lists together form a permutation of the input and satisfy their respective parity predicates."),
    ("task-lean-021", "env-lean", "Prime Factor Exists", "prime-factor-exists", "easy", "number-theory",
     "Prove that every natural number greater than 1 has a prime factor in Lean 4. The agent must use strong induction and the well-ordering principle to construct the proof."),
    ("task-lean-022", "env-lean", "Pythagorean Div3", "pythagorean-div3", "easy", "number-theory",
     "Prove that in any Pythagorean triple at least one element is divisible by 3 in Lean 4. The agent must use modular arithmetic, analyzing all possible residues of squares modulo 3."),
    ("task-lean-023", "env-lean", "Red Black Invariant", "red-black-invariant", "expert", "data-structures",
     "Verify the red-black tree invariants (color constraints and balanced black-height) are preserved through insertion in Lean 4. The agent must formalize the invariants and prove they hold after rebalancing rotations."),
    ("task-lean-024", "env-lean", "Regex Derivative", "regex-derivative", "expert", "automata",
     "Implement Brzozowski regex derivatives in Lean 4 and prove that the derivative operation preserves language semantics. The agent must formalize regular expressions, their denotation, and prove the fundamental derivative theorem."),
    ("task-lean-025", "env-lean", "Sqrt2 Irrational", "sqrt2-irrational", "expert", "number-theory",
     "Prove that the square root of 2 is irrational in Lean 4 using a proof by contradiction. The agent must formalize rationality, derive the contradiction from parity arguments, and handle the coprimality assumption."),
    ("task-lean-026", "env-lean", "Sqrt3 Irrational", "sqrt3-irrational", "expert", "number-theory",
     "Prove the irrationality of the square root of 3 in Lean 4 via a proof by infinite descent or contradiction. The agent must adapt the classic argument using divisibility-by-3 properties of squared integers."),
    ("task-lean-027", "env-lean", "Squares Mod Arith", "squares-mod-arith", "expert", "number-theory",
     "Prove properties of perfect squares under modular arithmetic in Lean 4, including quadratic residue characterizations. The agent must work with the ring structure of integers modulo n and case-split over residue classes."),
    ("task-lean-028", "env-lean", "Stock Profit", "stock-profit", "easy", "algorithms",
     "Implement and verify the best-time-to-buy-and-sell-stock algorithm in Lean 4. The agent must prove the returned profit equals the maximum difference a[j] - a[i] for j > i across the input price array."),
    ("task-lean-029", "env-lean", "Two Sum", "two-sum", "easy", "algorithms",
     "Implement and verify the two-sum algorithm in Lean 4, proving that the returned pair of indices sums to the target. The agent must handle the specification that the two indices are distinct and the sum is exact."),
    ("task-lean-030", "env-lean", "Well Founded Order", "well-founded-order", "expert", "order-theory",
     "Construct and verify a well-founded ordering in Lean 4, proving that it admits no infinite descending chains. The agent must formalize accessibility predicates and demonstrate well-foundedness through structural reasoning."),

    # --- Cedar Policy Verification (20 tasks) ---
    ("task-cedar-031", "env-cedar", "Adversarial Policy Audit", "adversarial_policy_audit", "expert", "security-audit",
     "Audit a set of Cedar authorization policies for adversarial bypass vulnerabilities and produce a detailed findings report. The agent must identify privilege escalation paths, overly permissive rules, and shadow policy conflicts across multiple policy files."),
    ("task-cedar-032", "env-cedar", "Debug Healthcare Records", "debug_healthcare_records", "medium", "policy-debugging",
     "Debug Cedar policies governing access to electronic healthcare records that are incorrectly denying authorized clinicians. The agent must trace the authorization decision path and fix the policy conditions while maintaining HIPAA compliance constraints."),
    ("task-cedar-033", "env-cedar", "Debug Multi Tenant Authorization", "debug_multi_tenant_authorization", "easy", "policy-debugging",
     "Fix broken multi-tenant authorization policies in Cedar where tenant isolation is not enforced correctly. The agent must identify cross-tenant data leaks in the policy set and add proper tenant scoping conditions."),
    ("task-cedar-034", "env-cedar", "Debug Recursive Hierarchy Access", "debug_recursive_hierarchy_access", "hard", "policy-debugging",
     "Debug Cedar policies for a recursive organizational hierarchy where inherited permissions are not propagating correctly. The agent must trace the hierarchy traversal logic and fix entity relationship definitions in the Cedar schema."),
    ("task-cedar-035", "env-cedar", "Find Authorization Bypass", "find_authorization_bypass", "expert", "security-audit",
     "Discover and document an authorization bypass in a complex Cedar policy set that allows unauthorized resource access. The agent must construct a concrete attack scenario demonstrating the bypass and propose a minimal policy fix."),
    ("task-cedar-036", "env-cedar", "Fix Action Group Conflicts", "fix_action_group_conflicts", "easy", "policy-repair",
     "Resolve conflicts between overlapping Cedar action groups that cause unexpected permit/forbid decisions. The agent must refactor the action group hierarchy to eliminate ambiguity while preserving intended authorization behavior."),
    ("task-cedar-037", "env-cedar", "Fix Ip Time Geo Policies", "fix_ip_time_geo_policies", "hard", "policy-repair",
     "Fix Cedar policies that combine IP range, time window, and geolocation conditions where the compound constraints produce incorrect authorization results. The agent must correct the boolean logic of multi-condition Cedar expressions."),
    ("task-cedar-038", "env-cedar", "Fix Photo Sharing Bugs", "fix_photo_sharing_bugs", "expert", "policy-repair",
     "Fix authorization bugs in a Cedar-based photo sharing application where album sharing, friend access, and privacy settings interact incorrectly. The agent must repair multiple interdependent policies while preserving the owner's privacy intent."),
    ("task-cedar-039", "env-cedar", "Fix Schema Type Errors", "fix_schema_type_errors", "easy", "policy-repair",
     "Correct Cedar schema type errors that prevent policies from validating against the entity model. The agent must fix attribute types, entity relationship declarations, and action definitions to match the intended authorization model."),
    ("task-cedar-040", "env-cedar", "Fix Scope And Condition Bugs", "fix_scope_and_condition_bugs", "easy", "policy-repair",
     "Fix Cedar policies with incorrect scope clauses and malformed condition expressions that cause validation failures. The agent must correct principal/action/resource scoping and repair when-clause boolean expressions."),
    ("task-cedar-041", "env-cedar", "Fix Template Instantiation Bugs", "fix_template_instantiation_bugs", "easy", "policy-repair",
     "Debug and fix Cedar policy template instantiation errors where template slots are not bound correctly to entity values. The agent must correct the template definitions and their instantiation parameters."),
    ("task-cedar-042", "env-cedar", "Fix Unsafe Attribute Access", "fix_unsafe_attribute_access", "medium", "policy-repair",
     "Fix Cedar policies that perform unsafe attribute access on entities that may not have the referenced attributes. The agent must add appropriate has-attribute guards or restructure policies to avoid runtime type errors."),
    ("task-cedar-043", "env-cedar", "Full Hospital Authorization System", "full_hospital_authorization_system", "easy", "system-design",
     "Design and implement a complete Cedar authorization system for a hospital including roles for doctors, nurses, admins, and patients. The agent must create the entity schema, define role hierarchies, and write policies enforcing separation of duties."),
    ("task-cedar-044", "env-cedar", "Implement And Verify Refactoring", "implement_and_verify_refactoring", "hard", "policy-authoring",
     "Refactor a large Cedar policy set to reduce redundancy and improve maintainability while proving behavioral equivalence. The agent must restructure policies using templates and action groups and verify that the refactored set produces identical authorization decisions."),
    ("task-cedar-045", "env-cedar", "Policy Equivalence Analysis", "policy_equivalence_analysis", "easy", "policy-analysis",
     "Analyze two alternative Cedar policy sets and determine whether they are semantically equivalent for all possible authorization requests. The agent must systematically compare policy scopes and conditions to find any divergent decisions."),
    ("task-cedar-046", "env-cedar", "Prove Emergency Override Safety", "prove_emergency_override_safety", "expert", "policy-verification",
     "Formally verify that an emergency override mechanism in Cedar policies cannot be abused to bypass regular access controls outside emergency conditions. The agent must construct a proof that the override policy is strictly bounded by the emergency context."),
    ("task-cedar-047", "env-cedar", "Prove Forbid Overrides Permit", "prove_forbid_overrides_permit", "expert", "policy-verification",
     "Prove that forbid policies correctly override permit policies in a Cedar policy set following Cedar's default deny-overrides semantics. The agent must verify the property holds across all possible principal-action-resource combinations."),
    ("task-cedar-048", "env-cedar", "Prove Policy Slicing Soundness", "prove_policy_slicing_soundness", "expert", "policy-verification",
     "Prove that a policy slicing optimization — extracting a subset of policies relevant to a query — is sound and does not change authorization outcomes. The agent must formalize the slicing criterion and prove that the slice is a conservative approximation."),
    ("task-cedar-049", "env-cedar", "Prove Schema Validation Soundness", "prove_schema_validation_soundness", "expert", "policy-verification",
     "Prove that Cedar's schema validation procedure is sound, meaning any policy that passes validation will not encounter type errors at runtime. The agent must formalize the type system and show that well-typed policies evaluate without attribute errors."),
    ("task-cedar-050", "env-cedar", "Schema Evolution Migration", "schema_evolution_migration", "easy", "schema-management",
     "Migrate a Cedar authorization schema to a new version while preserving backward compatibility with existing policies. The agent must update entity types and attributes and verify that all existing policies still validate against the new schema."),

    # --- Distributed Consensus (26 tasks) ---
    ("task-consensus-051", "env-consensus", "Fix Consistent Hash Replication", "fix_consistent_hash_replication", "easy", "bug-fixing",
     "Fix a bug in a consistent hashing implementation that causes incorrect replica placement during node join/leave events. The agent must identify the ring partitioning error and ensure replicas are distributed according to the replication factor."),
    ("task-consensus-052", "env-consensus", "Fix Distributed Lock", "fix_distributed_lock", "medium", "bug-fixing",
     "Debug a distributed lock service where lock acquisition fails under contention due to a race condition in the consensus protocol. The agent must fix the compare-and-swap logic and ensure mutual exclusion across all nodes."),
    ("task-consensus-053", "env-consensus", "Fix Distributed Snapshot", "fix_distributed_snapshot", "easy", "bug-fixing",
     "Fix a Chandy-Lamport distributed snapshot algorithm implementation that produces inconsistent global state captures. The agent must correct the marker propagation logic to ensure the recorded state represents a valid consistent cut."),
    ("task-consensus-054", "env-consensus", "Fix Raft Safety", "fix_raft_safety", "medium", "bug-fixing",
     "Fix a safety violation in a Raft consensus implementation where split-brain scenarios allow divergent committed log entries. The agent must correct the leader election term comparison and log matching logic to restore the Raft safety guarantee."),
    ("task-consensus-055", "env-consensus", "Fix Raft Snapshot Crdt", "fix_raft_snapshot_crdt", "hard", "bug-fixing",
     "Fix a Raft implementation extended with CRDT state snapshots where snapshot transfers corrupt the CRDT merge invariant. The agent must repair the snapshot serialization and ensure CRDT convergence properties are maintained after snapshot installation."),
    ("task-consensus-056", "env-consensus", "Fix Snapshot Replication", "fix_snapshot_replication", "hard", "bug-fixing",
     "Debug a log-based replication system where followers fall behind and snapshot transfers fail to bring them up to date. The agent must fix the snapshot truncation point calculation and the follower state machine reset procedure."),
    ("task-consensus-057", "env-consensus", "Fix Txn Coordinator", "fix_txn_coordinator", "easy", "bug-fixing",
     "Fix a distributed transaction coordinator that deadlocks under concurrent cross-shard transactions. The agent must identify the lock ordering violation and implement a consistent global ordering to prevent circular wait conditions."),
    ("task-consensus-058", "env-consensus", "Hybrid Clock", "hybrid_clock", "easy", "clocks",
     "Implement a hybrid logical clock (HLC) that combines physical timestamps with logical counters for causal ordering. The agent must ensure the clock maintains the causality invariant and handles clock skew correctly on message send/receive."),
    ("task-consensus-059", "env-consensus", "Implement Bft Kv Store", "implement_bft_kv_store", "hard", "implementation",
     "Implement a Byzantine fault-tolerant key-value store that tolerates up to f Byzantine nodes out of 3f+1 total. The agent must implement the BFT consensus protocol, state machine replication, and client request linearization."),
    ("task-consensus-060", "env-consensus", "Implement Chain Replication", "implement_chain_replication", "hard", "implementation",
     "Implement the chain replication protocol for high-throughput fault-tolerant storage with strong consistency. The agent must handle chain configuration, write propagation along the chain, and read handling at the tail node."),
    ("task-consensus-061", "env-consensus", "Implement Consistent Broadcast", "implement_consistent_broadcast", "easy", "implementation",
     "Implement a consistent broadcast primitive that guarantees all correct processes deliver the same set of messages. The agent must implement the echo-broadcast protocol and prove it satisfies validity, integrity, and consistency properties."),
    ("task-consensus-062", "env-consensus", "Implement Crdt Raft", "implement_crdt_raft", "medium", "implementation",
     "Extend a Raft consensus implementation to replicate CRDT state instead of a traditional log. The agent must integrate CRDT merge operations with Raft's log commitment and ensure convergence after network partitions heal."),
    ("task-consensus-063", "env-consensus", "Implement Epidemic Broadcast", "implement_epidemic_broadcast", "expert", "implementation",
     "Implement a probabilistic epidemic broadcast protocol that disseminates messages to all nodes with high probability. The agent must implement gossip-based fanout, handle message deduplication, and tune parameters for reliable delivery under churn."),
    ("task-consensus-064", "env-consensus", "Implement Lsm Compaction", "implement_lsm_compaction", "easy", "implementation",
     "Implement the compaction strategy for a log-structured merge-tree (LSM-tree) storage engine. The agent must implement size-tiered or leveled compaction, handle tombstone garbage collection, and maintain read performance during compaction."),
    ("task-consensus-065", "env-consensus", "Implement Pbft", "implement_pbft", "expert", "implementation",
     "Implement the Practical Byzantine Fault Tolerance (PBFT) protocol with pre-prepare, prepare, and commit phases. The agent must handle view changes, checkpoint garbage collection, and ensure safety and liveness under Byzantine failures."),
    ("task-consensus-066", "env-consensus", "Implement Raft Log", "implement_raft_log", "easy", "implementation",
     "Implement the core Raft replicated log module including log append, commit index advancement, and log compaction. The agent must ensure the log matching property and handle truncation of conflicting entries on followers."),
    ("task-consensus-067", "env-consensus", "Implement Read Repair", "implement_read_repair", "expert", "implementation",
     "Implement a read-repair mechanism for an eventually consistent replicated store that heals stale replicas on read. The agent must detect version conflicts using vector clocks, perform conflict resolution, and propagate repairs asynchronously."),
    ("task-consensus-068", "env-consensus", "Implement Shard Migration", "implement_shard_migration", "easy", "implementation",
     "Implement online shard migration that moves data between nodes without blocking reads or writes during the transfer. The agent must implement a dual-write phase, catch-up synchronization, and an atomic switchover mechanism."),
    ("task-consensus-069", "env-consensus", "Paxos Prepare", "paxos_prepare", "easy", "paxos",
     "Implement the prepare phase of the Paxos consensus protocol including proposal number generation and promise handling. The agent must handle duplicate proposals, reject stale prepare messages, and return the highest accepted value."),
    ("task-consensus-070", "env-consensus", "Swim Protocol", "swim_protocol", "easy", "membership",
     "Implement the SWIM failure detector protocol for decentralized membership management in a distributed cluster. The agent must implement ping, ping-req, and suspicion subprotocols to detect and disseminate node failure information."),
    ("task-consensus-071", "env-consensus", "Twopc Crash", "twopc_crash", "easy", "transactions",
     "Implement crash recovery for a two-phase commit coordinator that must resume incomplete transactions after a crash. The agent must implement write-ahead logging for the coordinator and handle participant timeout recovery."),
    ("task-consensus-072", "env-consensus", "Verify Distributed Lock", "verify_distributed_lock", "easy", "formal-verification",
     "Formally verify the mutual exclusion and deadlock-freedom properties of a distributed lock service. The agent must write invariants over the lock state and prove they hold across all reachable states of the protocol."),
    ("task-consensus-073", "env-consensus", "Verify Log Compaction", "verify_log_compaction", "medium", "formal-verification",
     "Formally verify that log compaction in a replicated state machine preserves the committed prefix invariant. The agent must prove that no committed entry is lost during compaction and that snapshot installation is safe."),
    ("task-consensus-074", "env-consensus", "Verify Replicated Kv", "verify_replicated_kv", "easy", "formal-verification",
     "Formally verify linearizability of a replicated key-value store by constructing a simulation relation to a sequential specification. The agent must prove that every concurrent history of the distributed store can be linearized."),
    ("task-consensus-075", "env-consensus", "Verify Two Phase Commit", "verify_two_phase_commit", "easy", "formal-verification",
     "Formally verify the atomicity property of the two-phase commit protocol, proving that all participants reach the same commit/abort decision. The agent must model the protocol states and prove safety under crash failures."),
    ("task-consensus-076", "env-consensus", "Virtual Nodes", "virtual_nodes", "medium", "partitioning",
     "Implement virtual nodes for consistent hashing to improve load balancing across heterogeneous cluster nodes. The agent must map physical nodes to multiple virtual positions on the hash ring and handle rebalancing when nodes join or leave."),

    # --- Congestion Control (24 tasks) ---
    ("task-congestion-077", "env-congestion", "Fix Aimd", "fix_aimd", "hard", "bug-fixing",
     "Fix a broken AIMD (Additive Increase / Multiplicative Decrease) congestion controller where the multiplicative decrease factor is applied incorrectly. The agent must repair the cwnd update logic and verify convergence to fair bandwidth allocation."),
    ("task-congestion-078", "env-congestion", "Fix Competing Flows", "fix_competing_flows", "hard", "bug-fixing",
     "Fix fairness issues in a congestion control scenario with multiple competing TCP flows on a shared bottleneck link. The agent must diagnose why one flow starves and adjust the algorithm to achieve Jain's fairness index above the threshold."),
    ("task-congestion-079", "env-congestion", "Fix Cubic Slow Start", "fix_cubic_slow_start", "hard", "bug-fixing",
     "Fix the slow start phase of a CUBIC congestion control implementation where cwnd grows too aggressively and causes burst losses. The agent must correct the hybrid slow start exit condition and smooth the transition to congestion avoidance."),
    ("task-congestion-080", "env-congestion", "Fix Cubic Units", "fix_cubic_units", "hard", "bug-fixing",
     "Fix unit conversion errors in a CUBIC congestion control implementation where RTT is mixed between seconds and milliseconds. The agent must normalize all time-dependent calculations to consistent units and verify the CUBIC growth function."),
    ("task-congestion-081", "env-congestion", "Fix Fairness Under Competition", "fix_fairness_under_competition", "hard", "bug-fixing",
     "Fix a congestion control algorithm that achieves poor fairness when competing with standard TCP Reno flows on a shared link. The agent must adjust the response to congestion signals to be TCP-friendly while maintaining throughput."),
    ("task-congestion-082", "env-congestion", "Fix Recovery Deadlock", "fix_recovery_deadlock", "hard", "bug-fixing",
     "Fix a deadlock condition in the fast recovery state machine where the congestion controller stalls after a retransmission timeout. The agent must repair the state transition logic to ensure the controller exits recovery and resumes normal operation."),
    ("task-congestion-083", "env-congestion", "Fix Slow Convergence", "fix_slow_convergence", "hard", "bug-fixing",
     "Fix a congestion control algorithm that converges too slowly to the available bandwidth after a capacity change. The agent must tune the probing rate and increase aggressiveness during bandwidth discovery without causing excessive loss."),
    ("task-congestion-084", "env-congestion", "Fix Stale Ssthresh", "fix_stale_ssthresh", "hard", "bug-fixing",
     "Fix a bug where ssthresh retains a stale value from a previous congestion episode, causing the controller to exit slow start prematurely. The agent must update ssthresh reset logic based on the current bandwidth-delay product estimate."),
    ("task-congestion-085", "env-congestion", "Fix Three Bugs", "fix_three_bugs", "hard", "bug-fixing",
     "Fix three independent bugs in a congestion control implementation related to RTT sampling, cwnd inflation during recovery, and ACK processing. The agent must isolate each bug, apply targeted fixes, and verify the combined fix passes all test scenarios."),
    ("task-congestion-086", "env-congestion", "Fix Timeout Handling", "fix_timeout_handling", "hard", "bug-fixing",
     "Fix incorrect retransmission timeout (RTO) handling that causes spurious timeouts on high-latency paths and excessive backoff on lossy links. The agent must correct the RTO estimation using Jacobson/Karels algorithm and handle timer granularity."),
    ("task-congestion-087", "env-congestion", "Implement Bbr", "implement_bbr", "hard", "implementation",
     "Implement Google's BBR (Bottleneck Bandwidth and Round-trip propagation time) congestion control algorithm. The agent must implement the BBR state machine with Startup, Drain, ProbeBW, and ProbeRTT phases and bandwidth/RTT model estimation."),
    ("task-congestion-088", "env-congestion", "Implement Compound", "implement_compound", "hard", "implementation",
     "Implement Compound TCP which combines both delay-based and loss-based congestion signals for improved performance. The agent must implement the scalable component alongside the traditional loss-based component and merge their cwnd contributions."),
    ("task-congestion-089", "env-congestion", "Implement Cubic", "implement_cubic", "hard", "implementation",
     "Implement the CUBIC congestion control algorithm with its characteristic cubic growth function and TCP-friendliness region. The agent must implement the W_cubic(t) window growth function, handle the concave/convex regions, and ensure Reno-friendliness."),
    ("task-congestion-090", "env-congestion", "Implement Fast Recovery", "implement_fast_recovery", "hard", "implementation",
     "Implement TCP fast recovery (RFC 5681) that allows the sender to continue transmitting during loss recovery using duplicate ACKs. The agent must implement cwnd inflation during recovery, partial ACK handling, and the exit condition."),
    ("task-congestion-091", "env-congestion", "Implement Ledbat", "implement_ledbat", "hard", "implementation",
     "Implement the LEDBAT (Low Extra Delay Background Transport) congestion control algorithm for delay-sensitive background transfers. The agent must implement one-way delay estimation, the target delay controller, and ensure LEDBAT yields to competing TCP flows."),
    ("task-congestion-092", "env-congestion", "Implement Loss Differentiated", "implement_loss_differentiated", "hard", "implementation",
     "Implement a loss-differentiated congestion control algorithm that distinguishes between congestion loss and random wireless loss. The agent must use packet reordering metrics and RTT variance to classify losses and adjust cwnd accordingly."),
    ("task-congestion-093", "env-congestion", "Implement Mult Decrease", "implement_mult_decrease", "hard", "implementation",
     "Implement a multiplicative-decrease variant of congestion control with configurable decrease ratios for different congestion signals. The agent must support separate decrease factors for timeout, triple-dup-ACK, and ECN-marked events."),
    ("task-congestion-094", "env-congestion", "Implement Pcc", "implement_pcc", "hard", "implementation",
     "Implement Performance-oriented Congestion Control (PCC) that uses online learning to optimize sending rate based on measured utility. The agent must implement the rate-control state machine and the utility function that balances throughput and loss."),
    ("task-congestion-095", "env-congestion", "Implement Vegas", "implement_vegas", "hard", "implementation",
     "Implement TCP Vegas delay-based congestion control that adjusts cwnd based on the difference between expected and actual throughput. The agent must implement BaseRTT tracking, the alpha/beta threshold comparison, and cwnd adjustment logic."),
    ("task-congestion-096", "env-congestion", "Implement Westwood", "implement_westwood", "hard", "implementation",
     "Implement TCP Westwood+ which uses bandwidth estimation to set ssthresh after a loss event for improved performance on lossy links. The agent must implement the eligible rate estimation filter and modify the loss response to use the bandwidth estimate."),
    ("task-congestion-097", "env-congestion", "Tune High Bdp", "tune_high_bdp", "hard", "parameter-tuning",
     "Tune congestion control parameters for a high bandwidth-delay product network path to achieve near-link-capacity utilization. The agent must adjust initial cwnd, slow start thresholds, and CUBIC/BBR parameters for a satellite or long-haul link."),
    ("task-congestion-098", "env-congestion", "Verify Aimd Safety", "verify_aimd_safety", "hard", "formal-verification",
     "Formally verify that an AIMD congestion controller maintains the safety invariant that cwnd never exceeds the bandwidth-delay product plus buffer. The agent must construct a model and prove the invariant holds under all loss and ACK event sequences."),
    ("task-congestion-099", "env-congestion", "Verify Flow Fairness", "verify_flow_fairness", "hard", "formal-verification",
     "Formally verify that a congestion control algorithm converges to max-min fairness when multiple flows share a bottleneck link. The agent must model the multi-flow system and prove convergence using a Lyapunov function argument."),
    ("task-congestion-100", "env-congestion", "Verify Sliding Window", "verify_sliding_window", "hard", "formal-verification",
     "Formally verify the correctness of a sliding window flow control mechanism including in-order delivery and buffer bounds. The agent must prove that the receiver window prevents buffer overflow and that all data is delivered reliably."),

    # --- C-to-Rust (28 tasks) ---
    ("task-c2rust-101", "env-c2rust", "Csc Col Norm", "csc-col-norm", "hard", "sparse-matrix",
     "Translate a C implementation of CSC (Compressed Sparse Column) column norm computation to safe, idiomatic Rust. The agent must eliminate pointer arithmetic, use Rust slices for column pointer traversal, and ensure memory safety without unsafe blocks."),
    ("task-c2rust-102", "env-c2rust", "Csc Filter", "csc-filter", "hard", "sparse-matrix",
     "Port a C-based CSC sparse matrix filtering routine to safe Rust, replacing manual index management with iterators. The agent must handle the column pointer indirection and value predicate evaluation while preserving the CSC structural invariants."),
    ("task-c2rust-103", "env-c2rust", "Csc Matvec", "csc-matvec", "hard", "sparse-matrix",
     "Translate a CSC sparse matrix-vector multiplication kernel from C to idiomatic Rust with safe abstractions. The agent must convert the double-loop over column pointers and row indices to Rust slice iteration without unsafe pointer dereferences."),
    ("task-c2rust-104", "env-c2rust", "Csc Nnz", "csc-nnz", "hard", "sparse-matrix",
     "Translate a C function that counts non-zero elements in a CSC sparse matrix to safe Rust. The agent must replace raw pointer arithmetic with Rust slice operations and ensure the implementation handles empty columns and matrices correctly."),
    ("task-c2rust-105", "env-c2rust", "Csparse Cumsum", "csparse-cumsum", "hard", "sparse-matrix",
     "Port the CSparse cumulative sum utility from C to Rust, converting pointer-based array scanning to idiomatic slice operations. The agent must handle the in-place prefix sum computation and preserve numerical stability for large matrices."),
    ("task-c2rust-106", "env-c2rust", "Csparse Dfs", "csparse-dfs", "hard", "sparse-matrix",
     "Translate the CSparse depth-first search routine from C to safe Rust, replacing the explicit stack using raw pointers with Rust's Vec-based stack. The agent must handle the graph traversal of sparse matrix column structures without unsafe code."),
    ("task-c2rust-107", "env-c2rust", "Csparse Gaxpy", "csparse-gaxpy", "hard", "sparse-matrix",
     "Port the CSparse generalized sparse Ax+y (gaxpy) operation from C to Rust with safe memory access patterns. The agent must translate the column-wise accumulation loop from pointer arithmetic to Rust slice indexing."),
    ("task-c2rust-108", "env-c2rust", "Csparse Ipvec", "csparse-ipvec", "hard", "sparse-matrix",
     "Translate the CSparse inverse permutation vector application from C to safe Rust. The agent must convert raw pointer indexing to Rust slice access, handle the permutation inversion correctly, and add bounds checking."),
    ("task-c2rust-109", "env-c2rust", "Csparse Lsolve", "csparse-lsolve", "hard", "sparse-matrix",
     "Port the CSparse sparse lower-triangular solve from C to Rust, eliminating unsafe pointer manipulation in the column-access loop. The agent must preserve the sparse forward substitution algorithm while using safe Rust abstractions."),
    ("task-c2rust-110", "env-c2rust", "Csparse Lu", "csparse-lu", "hard", "sparse-matrix",
     "Translate the CSparse LU factorization from C to Rust, replacing all raw pointer operations with safe Rust constructs. The agent must handle the pivot selection, symbolic and numeric factorization phases, and sparse column operations."),
    ("task-c2rust-111", "env-c2rust", "Csparse Multiply", "csparse-multiply", "hard", "sparse-matrix",
     "Port the CSparse sparse matrix multiplication routine from C to safe Rust. The agent must convert the triple-nested loop with column pointer arithmetic to Rust iterators while maintaining the O(nnz) workspace allocation pattern."),
    ("task-c2rust-112", "env-c2rust", "Csparse Norm", "csparse-norm", "hard", "sparse-matrix",
     "Translate the CSparse 1-norm computation from C to idiomatic Rust using safe slice iteration over column structures. The agent must accumulate absolute values per column and return the maximum, replacing pointer arithmetic with Rust abstractions."),
    ("task-c2rust-113", "env-c2rust", "Csparse Pvec", "csparse-pvec", "hard", "sparse-matrix",
     "Port the CSparse permutation vector application from C to safe Rust, converting raw index-pointer operations to bounds-checked slice access. The agent must ensure the permutation is applied correctly in both forward and inverse directions."),
    ("task-c2rust-114", "env-c2rust", "Csparse Reach", "csparse-reach", "hard", "sparse-matrix",
     "Translate the CSparse reachability computation from C to Rust, converting the DFS-based graph traversal from pointer-based to safe Rust stack operations. The agent must handle the sparse matrix graph interpretation and topological ordering."),
    ("task-c2rust-115", "env-c2rust", "Csparse Scatter", "csparse-scatter", "hard", "sparse-matrix",
     "Port the CSparse scatter operation from C to safe Rust, replacing the pointer-based workspace accumulation with Rust slice operations. The agent must handle the sparse-to-dense scatter pattern used in matrix multiplication and factorization."),
    ("task-c2rust-116", "env-c2rust", "Csparse Spsolve", "csparse-spsolve", "hard", "sparse-matrix",
     "Translate the CSparse sparse triangular solve from C to safe Rust with proper memory management. The agent must convert the reach-based symbolic analysis and numeric solve from raw pointer operations to idiomatic Rust patterns."),
    ("task-c2rust-117", "env-c2rust", "Csparse Symperm", "csparse-symperm", "hard", "sparse-matrix",
     "Port the CSparse symmetric permutation routine from C to Rust, eliminating unsafe pointer arithmetic in the matrix reordering. The agent must handle the symmetric fill-reducing permutation and ensure the output preserves matrix symmetry."),
    ("task-c2rust-118", "env-c2rust", "Csparse Transpose", "csparse-transpose", "hard", "sparse-matrix",
     "Translate the CSparse matrix transpose from C to safe Rust, converting the column-pointer manipulation to Rust slice operations. The agent must implement the counting-sort based transpose algorithm without raw pointer arithmetic."),
    ("task-c2rust-119", "env-c2rust", "Csparse Usolve", "csparse-usolve", "hard", "sparse-matrix",
     "Port the CSparse sparse upper-triangular solve from C to safe Rust. The agent must translate the backward substitution loop from pointer-based column access to safe Rust slice indexing while preserving sparsity exploitation."),
    ("task-c2rust-120", "env-c2rust", "Dense To Csc", "dense-to-csc", "hard", "matrix-ops",
     "Translate a C function that converts a dense matrix to CSC sparse format to safe Rust. The agent must replace pointer-based row/column scanning with Rust iterators and correctly build the column pointer, row index, and value arrays."),
    ("task-c2rust-121", "env-c2rust", "Mat Diag", "mat-diag", "hard", "matrix-ops",
     "Port a C matrix diagonal extraction routine to safe Rust, removing raw pointer indexing for row-major matrix access. The agent must handle rectangular matrices and produce a Rust Vec of diagonal elements with proper bounds checking."),
    ("task-c2rust-122", "env-c2rust", "Vec Add", "vec-add", "hard", "vector-ops",
     "Translate a C vector addition function to idiomatic Rust, replacing pointer arithmetic with safe slice operations. The agent must handle mismatched lengths gracefully and produce a Rust implementation that compiles without unsafe blocks."),
    ("task-c2rust-123", "env-c2rust", "Vec Dot", "vec-dot", "hard", "vector-ops",
     "Port a C dot product implementation to safe Rust using iterator-based zip and fold patterns. The agent must eliminate pointer arithmetic and ensure numerical accuracy is preserved in the Rust translation."),
    ("task-c2rust-124", "env-c2rust", "Vec Max", "vec-max", "hard", "vector-ops",
     "Translate a C function that finds the maximum element and its index in a vector to safe Rust. The agent must use Rust iterator methods and handle the empty-vector edge case that the C code ignores."),
    ("task-c2rust-125", "env-c2rust", "Vec Scale", "vec-scale", "hard", "vector-ops",
     "Port a C vector scaling function to idiomatic Rust, replacing in-place pointer mutation with safe mutable slice iteration. The agent must ensure the Rust version handles edge cases and compiles without unsafe code."),
    ("task-c2rust-126", "env-c2rust", "Verus Cumsum Proof", "verus-cumsum-proof", "hard", "formal-verification",
     "Write a Verus proof verifying the correctness of a Rust cumulative sum implementation, showing the output array satisfies the prefix sum specification. The agent must express loop invariants relating partial sums to the input array."),
    ("task-c2rust-127", "env-c2rust", "Verus Perm Proof", "verus-perm-proof", "hard", "formal-verification",
     "Write a Verus proof that a Rust permutation application function correctly permutes an input array according to a given permutation vector. The agent must prove bijectivity of the permutation and element preservation using Verus specifications."),
    ("task-c2rust-128", "env-c2rust", "Verus Vec Add Proof", "verus-vec-add-proof", "hard", "formal-verification",
     "Write a Verus proof verifying the correctness of a Rust element-wise vector addition function. The agent must specify the postcondition relating output elements to input sums and prove the loop invariant preserves the property."),

    # --- Hardware Verification EBMC (26 tasks) ---
    ("task-hwcbmc-129", "env-hwcbmc", "Fix Arb Lock", "fix-arb-lock", "easy", "bug-fixing",
     "Fix a bug in an arbiter lock module where the lock grant signal is not deasserted correctly after the requesting agent releases. The agent must trace the FSM transitions and correct the lock state logic to prevent grant starvation."),
    ("task-hwcbmc-130", "env-hwcbmc", "Fix Booth Mul", "fix-booth-mul", "easy", "bug-fixing",
     "Fix a Booth multiplier Verilog implementation that produces incorrect results for negative operands due to sign-extension errors. The agent must correct the partial product generation and accumulation to handle two's complement correctly."),
    ("task-hwcbmc-131", "env-hwcbmc", "Fix Branch Pred", "fix-branch-pred", "expert", "bug-fixing",
     "Fix a branch predictor module that causes pipeline stalls due to incorrect branch target buffer updates on mispredictions. The agent must repair the BTB update logic and ensure the prediction state machine recovers correctly after a flush."),
    ("task-hwcbmc-132", "env-hwcbmc", "Fix Cache Ctrl", "fix-cache-ctrl", "hard", "bug-fixing",
     "Fix a cache controller FSM that violates the coherence protocol by not properly handling write-back on eviction. The agent must trace the state transitions and fix the dirty-bit handling and bus transaction sequencing."),
    ("task-hwcbmc-133", "env-hwcbmc", "Fix Dma Engine", "fix-dma-engine", "expert", "bug-fixing",
     "Fix a DMA engine that corrupts data during burst transfers across clock domain boundaries. The agent must identify the CDC synchronization failure and fix the handshake protocol between the DMA controller and the target interface."),
    ("task-hwcbmc-134", "env-hwcbmc", "Fix Fifo Async", "fix-fifo-async", "expert", "bug-fixing",
     "Fix an asynchronous FIFO design where gray-code pointer synchronization fails under certain read/write frequency ratios. The agent must correct the gray-code conversion and multi-flop synchronizer to prevent data corruption across clock domains."),
    ("task-hwcbmc-135", "env-hwcbmc", "Fix Fifo Credit", "fix-fifo-credit", "easy", "bug-fixing",
     "Fix a credit-based flow control FIFO where credit return is miscounted, causing the sender to stall permanently. The agent must correct the credit counter update logic on both producer and consumer sides of the FIFO."),
    ("task-hwcbmc-136", "env-hwcbmc", "Fix Fifo Ptrs", "fix-fifo-ptrs", "easy", "bug-fixing",
     "Fix a synchronous FIFO implementation where read and write pointer wrap-around logic is incorrect, causing data loss at FIFO boundaries. The agent must fix the pointer comparison for full/empty detection and the address generation."),
    ("task-hwcbmc-137", "env-hwcbmc", "Fix I2C Ctrl", "fix-i2c-ctrl", "easy", "bug-fixing",
     "Fix an I2C controller that fails to generate proper ACK/NACK signals during multi-byte read transactions. The agent must correct the bit counter and state machine to properly handle the acknowledge phase timing."),
    ("task-hwcbmc-138", "env-hwcbmc", "Fix Lfsr", "fix-lfsr", "easy", "bug-fixing",
     "Fix a linear-feedback shift register implementation with incorrect tap positions that produces a non-maximal-length sequence. The agent must select the correct feedback polynomial taps for the register width to achieve maximum-length cycling."),
    ("task-hwcbmc-139", "env-hwcbmc", "Fix Mem Ctrl", "fix-mem-ctrl", "expert", "bug-fixing",
     "Fix a memory controller that violates DDR timing constraints on back-to-back read-to-write turnaround. The agent must correct the command scheduler's timing parameter enforcement and insert proper bus turnaround cycles."),
    ("task-hwcbmc-140", "env-hwcbmc", "Fix Regfile Fwd", "fix-regfile-fwd", "expert", "bug-fixing",
     "Fix a register file with operand forwarding that produces stale data when a write-back and read occur simultaneously to the same register. The agent must fix the forwarding mux priority and ensure write-through semantics."),
    ("task-hwcbmc-141", "env-hwcbmc", "Fix Restoring Div", "fix-restoring-div", "easy", "bug-fixing",
     "Fix a restoring division hardware module that produces incorrect quotient bits for certain dividend/divisor combinations. The agent must correct the subtract-and-compare logic and the quotient bit shift-in operation."),
    ("task-hwcbmc-142", "env-hwcbmc", "Fix Smv Ring3", "fix-smv-ring3", "easy", "bug-fixing",
     "Fix a three-node token ring protocol modeled in SMV where the token can be duplicated under certain interleavings. The agent must add mutual exclusion constraints to the token passing logic to ensure exactly one token circulates."),
    ("task-hwcbmc-143", "env-hwcbmc", "Fix Spi Slave", "fix-spi-slave", "expert", "bug-fixing",
     "Fix an SPI slave controller that drops the first bit of each transaction due to incorrect clock edge detection on CPOL/CPHA mode configuration. The agent must fix the sampling and shifting logic for all four SPI modes."),
    ("task-hwcbmc-144", "env-hwcbmc", "Fix Timer Irq", "fix-timer-irq", "easy", "bug-fixing",
     "Fix a hardware timer module that fails to clear its interrupt request after the ISR writes to the acknowledge register. The agent must correct the IRQ clear logic and ensure the timer reloads properly after each period."),
    ("task-hwcbmc-145", "env-hwcbmc", "Fix Tlb Ctrl", "fix-tlb-ctrl", "easy", "bug-fixing",
     "Fix a TLB controller that mishandles page table walks on TLB misses, returning stale translations from a previous address space. The agent must fix the ASID tag comparison and the TLB flush logic on context switches."),
    ("task-hwcbmc-146", "env-hwcbmc", "Fix Uart Rx", "fix-uart-rx", "easy", "bug-fixing",
     "Fix a UART receiver that produces framing errors due to incorrect baud rate sampling of the start bit. The agent must fix the oversampling counter to center the sample point within each bit period and detect the start bit edge."),
    ("task-hwcbmc-147", "env-hwcbmc", "Implement Arb3", "implement-arb3", "easy", "implementation",
     "Implement a three-input round-robin arbiter with configurable priority and grant hold capability. The agent must design the arbitration FSM, implement the rotating priority encoder, and ensure fairness across all three request ports."),
    ("task-hwcbmc-148", "env-hwcbmc", "Write Assertions Irqctrl", "write-assertions-irqctrl", "easy", "assertion-synthesis",
     "Write SystemVerilog assertions (SVA) for an interrupt controller verifying priority encoding, mask behavior, and acknowledge handshake. The agent must cover liveness (every unmasked IRQ eventually gets serviced) and safety (no spurious interrupts) properties."),
    ("task-hwcbmc-149", "env-hwcbmc", "Write Assertions Liveness Arbiter", "write-assertions-liveness-arbiter", "easy", "liveness-checking",
     "Write liveness assertions for an arbiter module proving that every persistent request is eventually granted. The agent must express the liveness property in SVA and handle the fairness assumptions needed to prevent starvation."),
    ("task-hwcbmc-150", "env-hwcbmc", "Write Assertions Liveness Dma", "write-assertions-liveness-dma", "easy", "liveness-checking",
     "Write liveness assertions for a DMA engine proving that every initiated transfer eventually completes. The agent must express progress conditions for the DMA state machine and handle burst boundaries and error recovery paths."),
    ("task-hwcbmc-151", "env-hwcbmc", "Write Assertions Liveness Fifo", "write-assertions-liveness-fifo", "easy", "liveness-checking",
     "Write liveness assertions for a FIFO module proving that data written is eventually read when the consumer is active. The agent must express the liveness property considering the full/empty conditions and clock domain crossings."),
    ("task-hwcbmc-152", "env-hwcbmc", "Write Assertions Tasksched", "write-assertions-tasksched", "easy", "assertion-synthesis",
     "Write SVA assertions for a hardware task scheduler verifying that task dispatch respects priority ordering and deadline constraints. The agent must cover the scheduling invariants and prove that no task misses its deadline when the scheduler is not overloaded."),
    ("task-hwcbmc-153", "env-hwcbmc", "Write Assertions Txnmon", "write-assertions-txnmon", "easy", "assertion-synthesis",
     "Write SVA assertions for a bus transaction monitor verifying protocol compliance including request-grant handshake and data phase timing. The agent must check that every request receives a response and that data is valid during the acknowledged cycle."),
    ("task-hwcbmc-154", "env-hwcbmc", "Write Assertions Wdogtimer", "write-assertions-wdogtimer", "easy", "assertion-synthesis",
     "Write SVA assertions for a watchdog timer module verifying timeout detection and reset behavior. The agent must prove that the watchdog fires within the configured interval if not refreshed and that a refresh correctly resets the countdown."),

    # --- Protein Synthesis & Computational Neuroscience (20 tasks) ---
    ("task-protein-155", "env-protein", "Protein Folding Stability", "protein-folding-stability", "hard", "protein",
     "Predict the thermodynamic stability of a mutant protein by computing the change in folding free energy (ΔΔG) using molecular simulation. The agent must set up the force field, run equilibrium sampling, and apply free energy perturbation methods."),
    ("task-protein-156", "env-protein", "Binding Affinity Prediction", "binding-affinity-prediction", "hard", "protein",
     "Estimate the binding affinity of a small-molecule ligand to a target protein using molecular docking and scoring functions. The agent must prepare receptor and ligand structures, run docking simulations, and rank poses by predicted binding energy."),
    ("task-protein-157", "env-protein", "Membrane Protein Insertion", "membrane-protein-insertion", "expert", "protein",
     "Simulate the insertion of a transmembrane helix into a lipid bilayer using coarse-grained molecular dynamics. The agent must build the bilayer system, parameterize the protein, and analyze insertion orientation and depth."),
    ("task-protein-158", "env-protein", "Enzyme Kinetics Fitting", "enzyme-kinetics-fitting", "medium", "protein",
     "Fit Michaelis-Menten kinetic parameters to experimental enzyme assay data using nonlinear regression. The agent must handle substrate inhibition, estimate Km and Vmax, and compute confidence intervals for the fitted parameters."),
    ("task-protein-159", "env-protein", "Hodgkin Huxley Simulation", "hodgkin-huxley-simulation", "medium", "neuroscience",
     "Simulate action potential generation using the Hodgkin-Huxley model of neuronal membrane dynamics. The agent must implement the differential equations for sodium and potassium conductances and reproduce the characteristic spike waveform."),
    ("task-protein-160", "env-protein", "Neural Circuit Oscillation", "neural-circuit-oscillation", "hard", "neuroscience",
     "Model oscillatory dynamics in a recurrent inhibitory neural circuit using conductance-based neuron models. The agent must tune synaptic weights and time constants to produce gamma-band oscillations and analyze the power spectrum."),
    ("task-protein-161", "env-protein", "Synaptic Plasticity STDP", "synaptic-plasticity-stdp", "hard", "neuroscience",
     "Implement a spike-timing-dependent plasticity (STDP) learning rule in a network simulation and demonstrate its effect on receptive field development. The agent must model pre- and post-synaptic spike timing windows and weight update dynamics."),
    ("task-protein-162", "env-protein", "Calcium Signaling Cascade", "calcium-signaling-cascade", "medium", "neuroscience",
     "Model intracellular calcium signaling cascades involving IP3 receptors and SERCA pumps. The agent must implement the De Young-Bhalla model, simulate calcium oscillations, and analyze the frequency dependence on IP3 concentration."),
    ("task-protein-163", "env-protein", "Gene Regulatory Network", "gene-regulatory-network", "hard", "systems_biology",
     "Infer the topology of a gene regulatory network from time-series gene expression data using dynamic Bayesian networks. The agent must preprocess expression profiles, fit the network model, and validate inferred edges against known interactions."),
    ("task-protein-164", "env-protein", "Metabolic Flux Analysis", "metabolic-flux-analysis", "medium", "systems_biology",
     "Perform flux balance analysis on a genome-scale metabolic model to predict optimal growth rates under nutrient constraints. The agent must formulate the linear program, apply stoichiometric constraints, and identify flux distributions."),
    ("task-protein-165", "env-protein", "Cell Cycle Modeling", "cell-cycle-modeling", "hard", "systems_biology",
     "Simulate the mammalian cell cycle using an ODE model of cyclin-CDK interactions and checkpoint controls. The agent must parameterize the model from literature values and reproduce the sequential activation of G1/S and G2/M phase transitions."),
    ("task-protein-166", "env-protein", "Epidemic SIR Fitting", "epidemic-sir-fitting", "easy", "systems_biology",
     "Fit a compartmental SIR epidemiological model to time-series infection data and estimate the basic reproduction number R0. The agent must solve the ODEs numerically, optimize parameters against observed data, and quantify uncertainty."),
    ("task-protein-167", "env-protein", "Population Genetics Drift", "population-genetics-drift", "medium", "population_genetics",
     "Simulate genetic drift in a finite population using the Wright-Fisher model and compute fixation probabilities for neutral alleles. The agent must implement the stochastic simulation, run ensemble replicates, and compare with theoretical predictions."),
    ("task-protein-168", "env-protein", "Selection Sweep Detection", "selection-sweep-detection", "hard", "population_genetics",
     "Detect signatures of positive selection in genomic sequence data using composite likelihood ratio tests. The agent must compute site frequency spectra, calculate CLR statistics along the genome, and identify candidate sweep regions."),
    ("task-protein-169", "env-protein", "Coalescent Tree Inference", "coalescent-tree-inference", "expert", "population_genetics",
     "Infer a coalescent genealogy from population genetic samples using Markov chain Monte Carlo methods. The agent must implement the coalescent likelihood, propose tree topology changes, and estimate effective population size from the posterior."),
    ("task-protein-170", "env-protein", "Connectome Path Analysis", "connectome-path-analysis", "medium", "connectomics",
     "Analyze shortest paths and communication efficiency in a connectome graph derived from diffusion MRI tractography. The agent must construct the structural connectivity matrix, compute graph-theoretic measures, and identify hub regions."),
    ("task-protein-171", "env-protein", "Cortical Column Simulation", "cortical-column-simulation", "expert", "connectomics",
     "Simulate a cortical microcolumn with excitatory and inhibitory neuron populations using a mean-field neural mass model. The agent must implement the Jansen-Rit equations, tune parameters to produce alpha rhythms, and analyze the resulting EEG-like signals."),
    ("task-protein-172", "env-protein", "Drug Dose Response", "drug-dose-response", "easy", "pharmacology",
     "Fit a four-parameter logistic dose-response curve to pharmacological assay data and estimate the EC50. The agent must handle Hill coefficient estimation, compute goodness-of-fit statistics, and generate the dose-response plot data."),
    ("task-protein-173", "env-protein", "PK Compartment Model", "pk-compartment-model", "medium", "pharmacology",
     "Build and simulate a two-compartment pharmacokinetic model to predict drug concentration time profiles after oral administration. The agent must estimate absorption, distribution, and elimination rate constants from clinical trial data."),
    ("task-protein-174", "env-protein", "Drug Interaction Prediction", "drug-interaction-prediction", "hard", "pharmacology",
     "Predict potential drug-drug interactions using a physiologically-based pharmacokinetic model with CYP enzyme inhibition. The agent must parameterize the PBPK model, simulate co-administration scenarios, and quantify changes in drug exposure."),
]


def generate_github_url(env_id: str, task_slug: str) -> str:
    """Generate a GitHub URL for a task."""
    env_slug = ENV_SLUGS[env_id]
    return f"https://github.com/athanor-ai/athanor-tasks/tree/main/{env_slug}/{task_slug}"


def escape_ts_string(s: str) -> str:
    """Escape a string for use inside TypeScript double-quoted strings."""
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def generate_tasks_ts() -> str:
    """Generate the full tasks.ts file content."""
    lines = []

    lines.append('/**')
    lines.append(' * Real task definitions — derived from actual task configs in the 7 Athanor repos.')
    lines.append(' *')
    lines.append(' * Source: root_data/eval/configs/*.json in each athanor-ai/* repo.')
    lines.append(' * Task names derived from config file slugs.')
    lines.append(' * Difficulty inferred from Claude Sonnet 4.6 run-1 scores.')
    lines.append(' * Categories derived from task-name prefix patterns + repo conventions.')
    lines.append(' *')
    lines.append(' * Total: 174 tasks across 7 environments.')
    lines.append(' */')
    lines.append('')
    lines.append('import type { Task } from "@/types/database";')
    lines.append('')
    lines.append('const now = new Date().toISOString();')
    lines.append('const weekAgo = new Date(Date.now() - 604800000).toISOString();')
    lines.append('')
    lines.append('/**')
    lines.append(' * All 174 real tasks sourced from Athanor environment repos.')
    lines.append(' */')
    lines.append('export const realTasks: Task[] = [')

    for i, task in enumerate(TASKS):
        task_id, env_id, name, slug, difficulty, category, description = task
        github_url = generate_github_url(env_id, slug)

        lines.append('  {')
        lines.append(f'    id: "{task_id}",')
        lines.append(f'    environment_id: "{env_id}",')
        lines.append(f'    name: "{escape_ts_string(name)}",')
        lines.append(f'    slug: "{escape_ts_string(slug)}",')
        lines.append(f'    description:')
        lines.append(f'      "{escape_ts_string(description)}",')
        lines.append(f'    difficulty: "{difficulty}",')
        lines.append(f'    category: "{escape_ts_string(category)}",')
        lines.append(f'    max_steps: 100,')
        lines.append(f'    reward_range: {{ min: 0, max: 1 }},')
        lines.append(f'    metadata: {{ source: "repo-config" }},')
        lines.append(f'    github_url:')
        lines.append(f'      "{github_url}",')
        lines.append(f'    created_at: weekAgo,')
        lines.append(f'    updated_at: now,')
        lines.append('  },')

    lines.append('];')
    lines.append('')
    lines.append('/** Tasks grouped by environment ID. */')
    lines.append('export const tasksByEnvironment = new Map<string, Task[]>();')
    lines.append('for (const task of realTasks) {')
    lines.append('  const list = tasksByEnvironment.get(task.environment_id) ?? [];')
    lines.append('  list.push(task);')
    lines.append('  tasksByEnvironment.set(task.environment_id, list);')
    lines.append('}')
    lines.append('')

    return '\n'.join(lines)


if __name__ == "__main__":
    output_path = os.path.join(os.path.dirname(__file__), "..", "src", "data", "tasks.ts")
    content = generate_tasks_ts()
    with open(output_path, "w") as f:
        f.write(content)
    print(f"Generated {output_path} with {len(TASKS)} tasks")
