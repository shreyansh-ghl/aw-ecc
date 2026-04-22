#!/usr/bin/env python3
"""
trigger-eval.py — Tests skill/agent description triggering accuracy

Usage:
    python skills/aw-adk/scripts/trigger-eval.py \\
        --eval-set <path-to-eval-set.json> \\
        --skill-path <path-to-skill> \\
        [--model <model-id>] \\
        [--max-iterations 5] \\
        [--verbose]

Evaluates whether a skill's description causes it to trigger correctly:
- should_trigger queries should activate the skill
- should_not_trigger queries should NOT activate the skill

Uses `claude -p` to test each query and checks if the skill was consulted.

Adapted from skill-creator's run_eval.py + run_loop.py for CASRE context.
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def load_eval_set(path: str) -> list[dict]:
    """Load eval set from JSON file."""
    with open(path, "r") as f:
        return json.load(f)


def read_skill_description(skill_path: str) -> str:
    """Extract the description from a skill's SKILL.md frontmatter."""
    skill_md = os.path.join(skill_path, "SKILL.md")
    if not os.path.exists(skill_md):
        # Maybe it's a single .md file (agent)
        skill_md = skill_path

    with open(skill_md, "r") as f:
        content = f.read()

    # Parse frontmatter
    if content.startswith("---"):
        end = content.index("---", 3)
        frontmatter = content[3:end]
        for line in frontmatter.split("\n"):
            if line.strip().startswith("description:"):
                return line.split("description:", 1)[1].strip().strip('"').strip("'")

    return ""


def test_trigger(query: str, skill_path: str, model: str) -> bool:
    """Test if a query triggers the skill using claude -p.

    Returns True if the skill was consulted (triggered).
    """
    try:
        result = subprocess.run(
            [
                "claude",
                "-p",
                query,
                "--skill",
                skill_path,
                "--model",
                model,
                "--max-turns",
                "1",
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )
        # Check if the skill name appears in the output (indicating it was loaded)
        output = result.stdout + result.stderr
        skill_name = os.path.basename(skill_path.rstrip("/"))
        return skill_name.lower() in output.lower()
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        print(f"  Warning: claude -p failed: {e}", file=sys.stderr)
        return False


def evaluate(eval_set: list[dict], skill_path: str, model: str, verbose: bool = False) -> dict:
    """Run all eval queries and compute accuracy."""
    results = []
    correct = 0
    total = len(eval_set)

    for i, item in enumerate(eval_set):
        query = item["query"]
        should_trigger = item["should_trigger"]

        if verbose:
            print(f"  [{i + 1}/{total}] Testing: {query[:60]}...", file=sys.stderr)

        triggered = test_trigger(query, skill_path, model)
        is_correct = triggered == should_trigger

        if is_correct:
            correct += 1

        results.append(
            {
                "query": query,
                "should_trigger": should_trigger,
                "triggered": triggered,
                "correct": is_correct,
            }
        )

        if verbose:
            status = "PASS" if is_correct else "FAIL"
            print(f"         {status} (should_trigger={should_trigger}, triggered={triggered})", file=sys.stderr)

    accuracy = correct / total if total > 0 else 0

    return {
        "accuracy": round(accuracy, 3),
        "correct": correct,
        "total": total,
        "results": results,
        "false_positives": [r for r in results if not r["should_trigger"] and r["triggered"]],
        "false_negatives": [r for r in results if r["should_trigger"] and not r["triggered"]],
    }


def main():
    parser = argparse.ArgumentParser(description="Test skill/agent description triggering accuracy")
    parser.add_argument("--eval-set", required=True, help="Path to eval set JSON")
    parser.add_argument("--skill-path", required=True, help="Path to skill directory or agent file")
    parser.add_argument("--model", default="claude-sonnet-4-6", help="Model ID for testing")
    parser.add_argument("--max-iterations", type=int, default=1, help="Number of evaluation iterations")
    parser.add_argument("--verbose", action="store_true", help="Print progress")
    args = parser.parse_args()

    eval_set = load_eval_set(args.eval_set)
    print(f"Loaded {len(eval_set)} eval queries ({sum(1 for e in eval_set if e['should_trigger'])} should-trigger, {sum(1 for e in eval_set if not e['should_trigger'])} should-not-trigger)")

    description = read_skill_description(args.skill_path)
    if description:
        print(f"Current description: {description[:100]}...")

    for iteration in range(1, args.max_iterations + 1):
        print(f"\n--- Iteration {iteration} ---")
        result = evaluate(eval_set, args.skill_path, args.model, args.verbose)

        print(f"Accuracy: {result['accuracy']:.1%} ({result['correct']}/{result['total']})")
        if result["false_positives"]:
            print(f"False positives ({len(result['false_positives'])}):")
            for fp in result["false_positives"]:
                print(f"  - {fp['query'][:80]}")
        if result["false_negatives"]:
            print(f"False negatives ({len(result['false_negatives'])}):")
            for fn in result["false_negatives"]:
                print(f"  - {fn['query'][:80]}")

    # Write results
    output_path = os.path.join(os.path.dirname(args.eval_set), "trigger-eval-results.json")
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nResults saved to {output_path}")


if __name__ == "__main__":
    main()
