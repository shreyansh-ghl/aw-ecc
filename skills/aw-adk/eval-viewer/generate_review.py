#!/usr/bin/env python3
"""
generate_review.py — Generates side-by-side review UI for ADK eval outputs

Usage:
    python skills/aw-adk/eval-viewer/generate_review.py <workspace>/iteration-N \\
        --artifact-name "my-agent" \\
        [--benchmark <workspace>/iteration-N/benchmark.json] \\
        [--previous-workspace <workspace>/iteration-<N-1>] \\
        [--static <output_path>]

Opens an HTML review interface showing:
- Outputs tab: per-case review with feedback textbox
- Benchmark tab: quantitative stats comparison

If --static is provided, writes standalone HTML instead of starting a server.

Adapted from skill-creator's eval-viewer/generate_review.py for CASRE context.
"""

import argparse
import http.server
import json
import os
import sys
import threading
import webbrowser
from pathlib import Path


def load_json(path: str) -> dict:
    try:
        with open(path, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def collect_review_data(iteration_dir: str, previous_dir: str = None) -> list[dict]:
    """Collect all eval outputs for review."""
    reviews = []
    iteration_path = Path(iteration_dir)

    for eval_dir in sorted(iteration_path.iterdir()):
        if not eval_dir.is_dir():
            continue

        metadata = load_json(str(eval_dir / "eval_metadata.json"))
        eval_name = metadata.get("eval_name", eval_dir.name)
        prompt = metadata.get("prompt", "")

        for config_dir in sorted(eval_dir.iterdir()):
            if not config_dir.is_dir():
                continue

            # Read outputs
            outputs_dir = config_dir / "outputs"
            output_files = {}
            if outputs_dir.exists():
                for f in sorted(outputs_dir.iterdir()):
                    if f.is_file():
                        try:
                            output_files[f.name] = f.read_text()
                        except UnicodeDecodeError:
                            output_files[f.name] = f"[Binary file: {f.name}]"

            # Read grading
            grading = load_json(str(config_dir / "grading.json"))

            # Read previous output if available
            previous_output = None
            if previous_dir:
                prev_config = Path(previous_dir) / eval_dir.name / config_dir.name / "outputs"
                if prev_config.exists():
                    previous_output = {}
                    for f in sorted(prev_config.iterdir()):
                        if f.is_file():
                            try:
                                previous_output[f.name] = f.read_text()
                            except UnicodeDecodeError:
                                previous_output[f.name] = f"[Binary file: {f.name}]"

            # Read previous feedback
            previous_feedback = None
            if previous_dir:
                prev_feedback_path = Path(previous_dir) / "feedback.json"
                prev_feedback = load_json(str(prev_feedback_path))
                run_id = f"{eval_dir.name}-{config_dir.name}"
                for review in prev_feedback.get("reviews", []):
                    if review.get("run_id") == run_id:
                        previous_feedback = review.get("feedback", "")

            reviews.append({
                "run_id": f"{eval_dir.name}-{config_dir.name}",
                "eval_name": eval_name,
                "configuration": config_dir.name,
                "prompt": prompt,
                "outputs": output_files,
                "grading": grading,
                "previous_output": previous_output,
                "previous_feedback": previous_feedback,
            })

    return reviews


def generate_html(reviews: list[dict], benchmark: dict = None, artifact_name: str = "artifact") -> str:
    """Generate the review HTML page."""
    template_path = Path(__file__).parent / "viewer.html"

    if template_path.exists():
        html = template_path.read_text()
        html = html.replace("__REVIEW_DATA_PLACEHOLDER__", json.dumps(reviews))
        html = html.replace("__BENCHMARK_DATA_PLACEHOLDER__", json.dumps(benchmark or {}))
        html = html.replace("__ARTIFACT_NAME_PLACEHOLDER__", artifact_name)
        return html

    # Fallback: minimal HTML
    return f"""<!DOCTYPE html>
<html>
<head><title>ADK Review: {artifact_name}</title></head>
<body>
<h1>ADK Eval Review: {artifact_name}</h1>
<p>{len(reviews)} test cases loaded. See console for data.</p>
<script>
const reviewData = {json.dumps(reviews, indent=2)};
const benchmarkData = {json.dumps(benchmark or {}, indent=2)};
console.log('Review data:', reviewData);
console.log('Benchmark data:', benchmarkData);
</script>
</body>
</html>"""


def main():
    parser = argparse.ArgumentParser(description="Generate ADK eval review UI")
    parser.add_argument("iteration_dir", help="Path to iteration directory")
    parser.add_argument("--artifact-name", default="artifact", help="Name of the artifact being reviewed")
    parser.add_argument("--benchmark", help="Path to benchmark.json")
    parser.add_argument("--previous-workspace", help="Path to previous iteration directory")
    parser.add_argument("--static", help="Write standalone HTML to this path instead of starting server")
    args = parser.parse_args()

    reviews = collect_review_data(args.iteration_dir, args.previous_workspace)
    benchmark = load_json(args.benchmark) if args.benchmark else None

    html = generate_html(reviews, benchmark, args.artifact_name)

    if args.static:
        with open(args.static, "w") as f:
            f.write(html)
        print(f"Wrote static review to {args.static}")
    else:
        # Write temp file and open in browser
        import tempfile
        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False, prefix="adk-review-")
        tmp.write(html)
        tmp.close()
        print(f"Opening review in browser: {tmp.name}")
        webbrowser.open(f"file://{tmp.name}")


if __name__ == "__main__":
    main()
