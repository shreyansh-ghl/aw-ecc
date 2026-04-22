#!/usr/bin/env python3
"""
aggregate-benchmark.py — Aggregates ADK eval results into benchmark.json

Usage:
    python skills/aw-adk/scripts/aggregate-benchmark.py <workspace>/iteration-N --artifact-name <name>

Reads grading.json and timing.json from each eval directory,
produces benchmark.json and benchmark.md with aggregate statistics.

Adapted from skill-creator's aggregate_benchmark.py for CASRE context.
"""

import argparse
import json
import os
import sys
from pathlib import Path
from statistics import mean, stdev


def load_json(path: str) -> dict:
    """Load a JSON file, returning empty dict if not found."""
    try:
        with open(path, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def collect_runs(iteration_dir: str) -> list[dict]:
    """Collect all grading results from an iteration directory."""
    runs = []
    iteration_path = Path(iteration_dir)

    for eval_dir in sorted(iteration_path.iterdir()):
        if not eval_dir.is_dir():
            continue

        for config_dir in sorted(eval_dir.iterdir()):
            if not config_dir.is_dir():
                continue

            grading_path = config_dir / "grading.json"
            timing_path = config_dir / "timing.json"
            metadata_path = eval_dir / "eval_metadata.json"

            grading = load_json(str(grading_path))
            timing = load_json(str(timing_path))
            metadata = load_json(str(metadata_path))

            if not grading:
                continue

            summary = grading.get("summary", {})
            run = {
                "eval_id": metadata.get("eval_id", eval_dir.name),
                "eval_name": metadata.get("eval_name", eval_dir.name),
                "configuration": config_dir.name,
                "run_number": 1,
                "result": {
                    "pass_rate": summary.get("pass_rate", 0),
                    "passed": summary.get("passed", 0),
                    "failed": summary.get("failed", 0),
                    "total": summary.get("total", 0),
                    "time_seconds": timing.get("total_duration_seconds", 0),
                    "tokens": timing.get("total_tokens", 0),
                    "errors": grading.get("execution_metrics", {}).get("errors_encountered", 0),
                },
                "expectations": grading.get("expectations", []),
            }
            runs.append(run)

    return runs


def compute_summary(runs: list[dict]) -> dict:
    """Compute aggregate statistics per configuration."""
    configs: dict[str, list[dict]] = {}
    for run in runs:
        config = run["configuration"]
        configs.setdefault(config, []).append(run)

    summary = {}
    for config, config_runs in configs.items():
        pass_rates = [r["result"]["pass_rate"] for r in config_runs]
        times = [r["result"]["time_seconds"] for r in config_runs if r["result"]["time_seconds"] > 0]
        tokens = [r["result"]["tokens"] for r in config_runs if r["result"]["tokens"] > 0]

        summary[config] = {
            "pass_rate": {
                "mean": round(mean(pass_rates), 3) if pass_rates else 0,
                "stddev": round(stdev(pass_rates), 3) if len(pass_rates) > 1 else 0,
                "min": round(min(pass_rates), 3) if pass_rates else 0,
                "max": round(max(pass_rates), 3) if pass_rates else 0,
            },
            "time_seconds": {
                "mean": round(mean(times), 1) if times else 0,
                "stddev": round(stdev(times), 1) if len(times) > 1 else 0,
            },
            "tokens": {
                "mean": round(mean(tokens)) if tokens else 0,
                "stddev": round(stdev(tokens)) if len(tokens) > 1 else 0,
            },
        }

    # Compute delta between with_artifact and without_artifact (or with_skill/without_skill)
    with_key = next((k for k in summary if "with" in k), None)
    without_key = next((k for k in summary if "without" in k or "old" in k), None)

    if with_key and without_key:
        summary["delta"] = {
            "pass_rate": f"+{summary[with_key]['pass_rate']['mean'] - summary[without_key]['pass_rate']['mean']:.3f}",
            "time_seconds": f"+{summary[with_key]['time_seconds']['mean'] - summary[without_key]['time_seconds']['mean']:.1f}",
            "tokens": f"+{summary[with_key]['tokens']['mean'] - summary[without_key]['tokens']['mean']:.0f}",
        }

    return summary


def generate_markdown(benchmark: dict) -> str:
    """Generate a human-readable benchmark.md summary."""
    lines = [f"# Benchmark: {benchmark['metadata']['artifact_name']}", ""]

    summary = benchmark.get("run_summary", {})
    for config, stats in summary.items():
        if config == "delta":
            continue
        lines.append(f"## {config}")
        pr = stats.get("pass_rate", {})
        lines.append(f"- Pass rate: {pr.get('mean', 0):.1%} ± {pr.get('stddev', 0):.1%}")
        ts = stats.get("time_seconds", {})
        lines.append(f"- Time: {ts.get('mean', 0):.1f}s ± {ts.get('stddev', 0):.1f}s")
        tk = stats.get("tokens", {})
        lines.append(f"- Tokens: {tk.get('mean', 0):.0f} ± {tk.get('stddev', 0):.0f}")
        lines.append("")

    if "delta" in summary:
        d = summary["delta"]
        lines.append("## Delta")
        lines.append(f"- Pass rate: {d['pass_rate']}")
        lines.append(f"- Time: {d['time_seconds']}s")
        lines.append(f"- Tokens: {d['tokens']}")
        lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Aggregate ADK eval results into benchmark")
    parser.add_argument("iteration_dir", help="Path to iteration directory")
    parser.add_argument("--artifact-name", required=True, help="Name of the artifact being benchmarked")
    args = parser.parse_args()

    if not os.path.isdir(args.iteration_dir):
        print(f"Error: {args.iteration_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    runs = collect_runs(args.iteration_dir)

    if not runs:
        print(f"Warning: No grading results found in {args.iteration_dir}", file=sys.stderr)

    benchmark = {
        "metadata": {
            "artifact_name": args.artifact_name,
            "iteration_dir": args.iteration_dir,
            "evals_run": list({r["eval_name"] for r in runs}),
            "total_runs": len(runs),
        },
        "runs": runs,
        "run_summary": compute_summary(runs),
        "notes": [],
    }

    # Write benchmark.json
    output_path = os.path.join(args.iteration_dir, "benchmark.json")
    with open(output_path, "w") as f:
        json.dump(benchmark, f, indent=2)
    print(f"Wrote {output_path}")

    # Write benchmark.md
    md_path = os.path.join(args.iteration_dir, "benchmark.md")
    with open(md_path, "w") as f:
        f.write(generate_markdown(benchmark))
    print(f"Wrote {md_path}")


if __name__ == "__main__":
    main()
