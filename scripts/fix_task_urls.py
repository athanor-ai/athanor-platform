#!/usr/bin/env python3
"""Fix github_url fields in tasks.ts to point to student_data files/dirs.

Correct URL pattern:
  Files: https://github.com/athanor-ai/{repo}/blob/{branch}/student_data/{filename}
  Dirs:  https://github.com/athanor-ai/{repo}/tree/{branch}/student_data/{dirname}

For distributed-consensus, files are under student_data/consensus/{filename}.
"""

import re
import json

# ── Repo config: repo name, default branch, student_data entries ──────────

REPOS = {
    "env-lean": {
        "repo": "lean-theorem-proving",
        "branch": "main",
        "entries": {
            # filename -> type (file or dir)
            "AckermannLevel3.lean": "file",
            "BinarySearch.lean": "file",
            "ChurchRosser.lean": "file",
            "CompilerCorrectness.lean": "file",
            "FibAddFormula.lean": "file",
            "FirstDuplicate.lean": "file",
            "FixProofErrors.lean": "file",
            "FixWrongLemma.lean": "file",
            "IncreasingTriplet.lean": "file",
            "LastDigitSquares.lean": "file",
            "ListAdvanced.lean": "file",
            "ListAppend.lean": "file",
            "ListFilter.lean": "file",
            "LongestStreak.lean": "file",
            "MajorityElement.lean": "file",
            "MaxSubarray.lean": "file",
            "MergeSorted.lean": "file",
            "NatArithCombined.lean": "file",
            "NatDivisibility.lean": "file",
            "NatInductionHard.lean": "file",
            "NatInequalities.lean": "file",
            "PartitionEvensOdds.lean": "file",
            "PrimeFactorExists.lean": "file",
            "PropLogicBasics.lean": "file",
            "PropLogicBiconditional.lean": "file",
            "PropLogicNegation.lean": "file",
            "PythagoreanDiv3.lean": "file",
            "RedBlackInvariant.lean": "file",
            "RegexDerivative.lean": "file",
            "Sqrt2Irrational.lean": "file",
            "Sqrt3Irrational.lean": "file",
            "SquaresModArith.lean": "file",
            "StockProfit.lean": "file",
            "TwoSum.lean": "file",
            "WellFoundedOrder.lean": "file",
            "formalize_basic_logic_desc.txt": "file",
            "formalize_function_composition_desc.txt": "file",
            "formalize_inequality_desc.txt": "file",
            "formalize_list_property_desc.txt": "file",
            "formalize_nat_property_desc.txt": "file",
        },
    },
    "env-c2rust": {
        "repo": "c-to-rust",
        "branch": "master",
        "entries": {
            "csc_col_norm": "dir",
            "csc_filter": "dir",
            "csc_matvec": "dir",
            "csc_nnz": "dir",
            "csparse_cumsum": "dir",
            "csparse_dfs": "dir",
            "csparse_gaxpy": "dir",
            "csparse_ipvec": "dir",
            "csparse_lsolve": "dir",
            "csparse_lu": "dir",
            "csparse_multiply": "dir",
            "csparse_norm": "dir",
            "csparse_pvec": "dir",
            "csparse_reach": "dir",
            "csparse_scatter": "dir",
            "csparse_spsolve": "dir",
            "csparse_symperm": "dir",
            "csparse_transpose": "dir",
            "csparse_usolve": "dir",
            "dense_to_csc": "dir",
            "mat_diag": "dir",
            "vec_add": "dir",
            "vec_dot": "dir",
            "vec_max": "dir",
            "vec_scale": "dir",
            "verus_cumsum_proof": "dir",
            "verus_perm_proof": "dir",
            "verus_vec_add_proof": "dir",
        },
    },
    "env-cedar": {
        "repo": "cedar-policy-verification",
        "branch": "main",
        "entries": {
            "adversarial_policy_audit": "dir",
            "debug_healthcare_records": "dir",
            "debug_multi_tenant_authorization": "dir",
            "debug_recursive_hierarchy_access": "dir",
            "find_authorization_bypass": "dir",
            "fix_action_group_conflicts": "dir",
            "fix_ip_time_geo_policies": "dir",
            "fix_photo_sharing_bugs": "dir",
            "fix_schema_type_errors": "dir",
            "fix_scope_and_condition_bugs": "dir",
            "fix_template_instantiation_bugs": "dir",
            "fix_unsafe_attribute_access": "dir",
            "full_hospital_authorization_system": "dir",
            "implement_and_verify_refactoring": "dir",
            "policy_equivalence_analysis": "dir",
            "prove_emergency_override_safety": "dir",
            "prove_forbid_overrides_permit": "dir",
            "prove_policy_slicing_soundness": "dir",
            "prove_schema_validation_soundness": "dir",
            "schema_evolution_migration": "dir",
        },
    },
    "env-consensus": {
        "repo": "distributed-consensus",
        "branch": "main",
        # Files are under student_data/consensus/
        "subdir": "consensus",
        "entries": {
            "BroadcastOrder.lean": "file",
            "ConsensusValidity.lean": "file",
            "LeaderElection.lean": "file",
            "QuorumProperties.lean": "file",
            "adaptive_detector.go": "file",
            "anti_entropy.go": "file",
            "bft_kv_store.go": "file",
            "chain_replication.go": "file",
            "circuit_breaker.go": "file",
            "consensus_membership.go": "file",
            "consistent_broadcast.go": "file",
            "crdt_map.go": "file",
            "crdt_raft.go": "file",
            "distributed_lock.dfy": "file",
            "distributed_lock.go": "file",
            "distributed_snapshot.go": "file",
            "epidemic_broadcast.go": "file",
            "go.mod": "file",
            "gossip_store.go": "file",
            "hash_replication.go": "file",
            "hybrid_clock.go": "file",
            "leader_lease.go": "file",
            "lease_coordinator.go": "file",
            "log_compaction.dfy": "file",
            "lsm_compaction.go": "file",
            "paxos_lean_translation.lean": "file",
            "paxos_liveness.dfy": "file",
            "paxos_prepare.go": "file",
            "paxos_prepare_test.go": "file",
            "paxos_refinement.dfy": "file",
            "paxos_voting.dfy": "file",
            "pbft.go": "file",
            "raft_election.dfy": "file",
            "raft_log.go": "file",
            "raft_log_consistency.dfy": "file",
            "raft_safety.go": "file",
            "raft_snapshot_crdt.go": "file",
            "read_repair.go": "file",
            "replicated_kv_store.dfy": "file",
            "shard_migration.go": "file",
            "snapshot_replication.go": "file",
            "swim.go": "file",
            "two_phase_commit.dfy": "file",
            "twopc.go": "file",
            "txn_coordinator.go": "file",
            "txn_coordinator_test.go": "file",
            "virtual_nodes.go": "file",
        },
    },
    "env-congestion": {
        "repo": "congestion-control",
        "branch": "master",
        "entries": {
            "delay_based_cca.py": "file",
            "fix_aimd_cca.py": "file",
            "fix_competing_flows.py": "file",
            "fix_cubic_slow_start.py": "file",
            "fix_cubic_units.py": "file",
            "fix_fairness_under_competition.py": "file",
            "fix_recovery_deadlock.py": "file",
            "fix_slow_convergence.py": "file",
            "fix_stale_ssthresh.py": "file",
            "fix_three_bugs.py": "file",
            "fix_timeout_handling.py": "file",
            "implement_bbr.py": "file",
            "implement_compound.py": "file",
            "implement_cubic.py": "file",
            "implement_fast_recovery.py": "file",
            "implement_ledbat.py": "file",
            "implement_loss_differentiated.py": "file",
            "implement_mult_decrease.py": "file",
            "implement_pcc.py": "file",
            "implement_rtt_based_growth.py": "file",
            "implement_vegas.py": "file",
            "implement_westwood.py": "file",
            "tune_high_bdp.py": "file",
            "verify_aimd_safety.dfy": "file",
            "verify_flow_fairness.dfy": "file",
            "verify_sliding_window.dfy": "file",
        },
    },
    "env-hwcbmc": {
        "repo": "hw-cbmc",
        "branch": "master",
        "entries": {
            "FixArbLock.sv": "file",
            "FixArbiterFair.sv": "file",
            "FixBoothMul.sv": "file",
            "FixBranchPred.sv": "file",
            "FixCacheCtrl.sv": "file",
            "FixDmaEngine.sv": "file",
            "FixFifoAsync.sv": "file",
            "FixFifoCredit.sv": "file",
            "FixFifoPtrs.sv": "file",
            "FixHazardCtrl.sv": "file",
            "FixI2cCtrl.sv": "file",
            "FixLFSR.sv": "file",
            "FixMemCtrl.sv": "file",
            "FixPipelineAlu.sv": "file",
            "FixPipelineMac.sv": "file",
            "FixRegfileFwd.sv": "file",
            "FixRestoringDiv.sv": "file",
            "FixScoreboardBypass.sv": "file",
            "FixSpiSlave.sv": "file",
            "FixTimerIrq.sv": "file",
            "FixTlbCtrl.sv": "file",
            "FixUartRx.sv": "file",
            "ImplementArb3.sv": "file",
            "ImplementAxiHandshake.sv": "file",
            "WriteAssertionsIrqCtrl.sv": "file",
            "WriteAssertionsLivenessArbiter.sv": "file",
            "WriteAssertionsLivenessDma.sv": "file",
            "WriteAssertionsLivenessFifo.sv": "file",
            "WriteAssertionsTaskSched.sv": "file",
            "WriteAssertionsTxnMon.sv": "file",
            "WriteAssertionsWdogTimer.sv": "file",
            "fix-smv-ring3.smv": "file",
        },
    },
    "env-protein": {
        "repo": "computational-biology",
        "branch": "main",
        "entries": {
            "binding_proof.lean": "file",
            "circuit_optogenetics.py": "file",
            "connectomics.py": "file",
            "cre_pde.py": "file",
            "credit_assignment.py": "file",
            "dopamine_rnn.py": "file",
            "drug_binding.py": "file",
            "gene_regulatory.py": "file",
            "graph_proof.lean": "file",
            "hdp_hmm.py": "file",
            "hill_proof.lean": "file",
            "hodgkin_huxley.py": "file",
            "logic_gates.py": "file",
            "mapk_cascade.py": "file",
            "mapk_proof.lean": "file",
            "md_analysis.py": "file",
            "metabolic_signaling.py": "file",
            "molecular_tools.py": "file",
            "motif_classification.py": "file",
            "native_structure.pdb": "file",
            "optogenetics.py": "file",
            "protein_energy.py": "file",
            "stdp_plasticity.py": "file",
            "systems_biology.py": "file",
            "wf_proof.lean": "file",
            "wright_fisher.py": "file",
        },
    },
}


# ── Explicit slug → filename mappings for hard-to-match cases ─────────────

EXPLICIT_MAPPINGS: dict[str, dict[str, str]] = {
    "env-consensus": {
        # fix_* slugs → .go files (the slug prefix matches the action, suffix matches file)
        "fix_consistent_hash_replication": "hash_replication.go",
        "fix_distributed_lock": "distributed_lock.go",
        "fix_distributed_snapshot": "distributed_snapshot.go",
        "fix_raft_safety": "raft_safety.go",
        "fix_raft_snapshot_crdt": "raft_snapshot_crdt.go",
        "fix_snapshot_replication": "snapshot_replication.go",
        "fix_txn_coordinator": "txn_coordinator.go",
        # implement_* slugs → .go files
        "implement_bft_kv_store": "bft_kv_store.go",
        "implement_chain_replication": "chain_replication.go",
        "implement_consistent_broadcast": "consistent_broadcast.go",
        "implement_crdt_raft": "crdt_raft.go",
        "implement_epidemic_broadcast": "epidemic_broadcast.go",
        "implement_lsm_compaction": "lsm_compaction.go",
        "implement_pbft": "pbft.go",
        "implement_raft_log": "raft_log.go",
        "implement_read_repair": "read_repair.go",
        "implement_shard_migration": "shard_migration.go",
        # Other slugs
        "swim_protocol": "swim.go",
        "twopc_crash": "twopc.go",
        # verify_* slugs → .dfy files
        "verify_distributed_lock": "distributed_lock.dfy",
        "verify_log_compaction": "log_compaction.dfy",
        "verify_replicated_kv": "replicated_kv_store.dfy",
        "verify_two_phase_commit": "two_phase_commit.dfy",
    },
    "env-protein": {
        "action-credit-assignment": "credit_assignment.py",
        "behavioral-motif-classification": "motif_classification.py",
        "closed-loop-behavioral-optogenetics": "circuit_optogenetics.py",
        "connectomics-graph-analysis": "connectomics.py",
        "connectomics-graph-analysis-with-proof": "graph_proof.lean",
        "cre-dog-recombination": "cre_pde.py",
        "dopaminergic-credit-assignment-rnn": "dopamine_rnn.py",
        "drug-binding-scoring": "drug_binding.py",
        "drug-binding-scoring-with-proof": "binding_proof.lean",
        "gene-regulatory-stability": "gene_regulatory.py",
        "gene-regulatory-stability-with-proof": "hill_proof.lean",
        "hierarchical-psychological-structure-inference": "hdp_hmm.py",
        "hodgkin-huxley-circuit": "hodgkin_huxley.py",
        "mapk-signal-transduction": "mapk_cascade.py",
        "mapk-signal-transduction-with-proof": "mapk_proof.lean",
        "md-trajectory-analysis": "md_analysis.py",
        "metabolic-signaling-integration": "metabolic_signaling.py",
        "nanobody-conditional-stability": "molecular_tools.py",
        "nanobody-multiplexed-logic-gates": "logic_gates.py",
        "optogenetic-circuit-control": "optogenetics.py",
        "protein-energy-landscape": "protein_energy.py",
        "spatiotemporal-cre-recombination-pde": "systems_biology.py",
        "stdp-synaptic-plasticity": "stdp_plasticity.py",
        "wright-fisher-dynamics": "wright_fisher.py",
        "wright-fisher-dynamics-with-proof": "wf_proof.lean",
    },
}


def slug_to_filename(slug: str, env_id: str) -> str | None:
    """Map a task slug to the actual filename in student_data.

    Strategy:
    1. Check explicit mappings first
    2. Try exact match (slug == filename stem with underscores)
    3. Try converting slug hyphens to underscores or CamelCase
    4. Try matching case-insensitively
    5. Try prefix matching
    """
    # 0. Check explicit mappings first
    if env_id in EXPLICIT_MAPPINGS and slug in EXPLICIT_MAPPINGS[env_id]:
        return EXPLICIT_MAPPINGS[env_id][slug]

    config = REPOS[env_id]
    entries = config["entries"]

    # Build lookup maps
    name_lower_map: dict[str, str] = {}  # lowercase name (no ext) -> actual name
    name_exact_map: dict[str, str] = {}  # exact name (no ext) -> actual name
    for name in entries:
        stem = name.rsplit(".", 1)[0] if "." in name else name
        name_exact_map[stem] = name
        name_lower_map[stem.lower()] = name

    # 1. Direct match: slug == stem (with underscores)
    slug_underscore = slug.replace("-", "_")
    if slug_underscore in name_exact_map:
        return name_exact_map[slug_underscore]

    # 2. Direct match with hyphens
    if slug in name_exact_map:
        return name_exact_map[slug]

    # 3. Case-insensitive match
    if slug_underscore.lower() in name_lower_map:
        return name_lower_map[slug_underscore.lower()]
    if slug.lower() in name_lower_map:
        return name_lower_map[slug.lower()]

    # 4. Convert slug to CamelCase and try
    # e.g., "ackermann-level3" -> "AckermannLevel3"
    camel = "".join(word.capitalize() for word in slug.replace("_", "-").split("-"))
    if camel in name_exact_map:
        return name_exact_map[camel]
    if camel.lower() in name_lower_map:
        return name_lower_map[camel.lower()]

    # 5. Special handling for specific patterns
    # Some slugs might have slightly different names
    # e.g., "fix_aimd" -> "fix_aimd_cca.py"
    for stem, name in name_exact_map.items():
        stem_lower = stem.lower()
        slug_lower = slug_underscore.lower()
        # Check if slug is a prefix of the filename
        if stem_lower.startswith(slug_lower + "_") or stem_lower.startswith(slug_lower):
            return name

    return None


def build_url(env_id: str, filename: str) -> str:
    """Build the correct GitHub URL for a student_data file."""
    config = REPOS[env_id]
    repo = config["repo"]
    branch = config["branch"]
    entry_type = config["entries"].get(filename, "file")
    subdir = config.get("subdir", "")

    # Use 'blob' for files, 'tree' for directories
    url_type = "blob" if entry_type == "file" else "tree"

    if subdir:
        return f"https://github.com/athanor-ai/{repo}/{url_type}/{branch}/student_data/{subdir}/{filename}"
    else:
        return f"https://github.com/athanor-ai/{repo}/{url_type}/{branch}/student_data/{filename}"


def main():
    tasks_path = "src/data/tasks.ts"

    with open(tasks_path, "r") as f:
        content = f.read()

    # Parse each task block and extract slug + environment_id + github_url
    # Pattern: find github_url lines and replace them

    # We'll work through the file finding task blocks
    # Each task has environment_id, slug, and github_url

    # Strategy: find all (environment_id, slug) pairs with their github_url positions
    # Then replace github_url values

    lines = content.split("\n")
    current_env = None
    current_slug = None
    changes = 0
    unmatched = []
    matched = []

    i = 0
    while i < len(lines):
        line = lines[i]

        # Track environment_id
        env_match = re.search(r'environment_id:\s*"(env-\w+)"', line)
        if env_match:
            current_env = env_match.group(1)

        # Track slug
        slug_match = re.search(r'slug:\s*"([^"]+)"', line)
        if slug_match:
            current_slug = slug_match.group(1)

        # Find github_url lines
        if "github_url:" in line and current_env and current_slug:
            # github_url might span 1 or 2 lines
            # Pattern 1: github_url: "https://..."
            # Pattern 2: github_url:\n      "https://..."
            url_match = re.search(r'github_url:\s*$', line)
            if url_match:
                # URL is on the next line
                url_line_idx = i + 1
                url_line = lines[url_line_idx]
            else:
                url_line_idx = i
                url_line = line

            if current_env not in REPOS:
                print(f"  SKIP: Unknown env {current_env} for slug {current_slug}")
                i += 1
                continue

            filename = slug_to_filename(current_slug, current_env)
            if filename:
                new_url = build_url(current_env, filename)
                # Replace the URL in the line
                old_url_match = re.search(r'"(https://[^"]+)"', lines[url_line_idx])
                if old_url_match:
                    old_url = old_url_match.group(1)
                    if old_url != new_url:
                        lines[url_line_idx] = lines[url_line_idx].replace(old_url, new_url)
                        changes += 1
                        matched.append((current_env, current_slug, filename, new_url))
                    else:
                        matched.append((current_env, current_slug, filename, new_url))
            else:
                unmatched.append((current_env, current_slug))

        i += 1

    new_content = "\n".join(lines)

    with open(tasks_path, "w") as f:
        f.write(new_content)

    print(f"\n=== Results ===")
    print(f"URLs changed: {changes}")
    print(f"Tasks matched: {len(matched)}")
    print(f"Tasks unmatched: {len(unmatched)}")

    if unmatched:
        print(f"\n=== Unmatched tasks ===")
        for env, slug in unmatched:
            print(f"  {env}: {slug}")

    # Print sample URLs per environment
    print(f"\n=== Sample URLs ===")
    env_samples: dict[str, list] = {}
    for env, slug, filename, url in matched:
        env_samples.setdefault(env, []).append((slug, url))
    for env, samples in sorted(env_samples.items()):
        print(f"\n  {env}:")
        for slug, url in samples[:3]:
            print(f"    {slug} -> {url}")


if __name__ == "__main__":
    main()
