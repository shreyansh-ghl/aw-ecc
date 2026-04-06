# Performance Checklist

Use when `performance-optimization`, `benchmark`, `aw-test`, or performance-sensitive review work applies.

## Start With The Right Metric

- browser UX: LCP, INP, CLS, startup, interaction latency
- API/backend: latency percentiles, throughput, error rate, retry load
- data layer: query time, rows scanned, index use, cache hit rate
- batch/worker: end-to-end completion time, queue delay, concurrency cost

## Baseline Before Changes

- capture the current number before optimizing
- note the environment and dataset used for the measurement
- prefer realistic workload or representative fixture size
- keep the baseline close to the code change so review can verify it

## Localize The Bottleneck

- rendering and layout
- bundle weight and startup
- network waterfalls
- repeated computation
- query inefficiency
- chatty service calls

## Fix Strategy

- optimize the dominant cost first
- prefer deleting waste over adding clever abstraction
- keep the change isolated enough that before/after comparison stays obvious
- protect correctness and readability while optimizing

## Re-Measure

- rerun the same measurement after the change
- confirm the target metric improved
- check for regressions in adjacent metrics
- record whether the improvement is material or marginal

## Guardrails

- avoid speculative micro-optimizations with no measured value
- avoid broad rewrites under the label of performance work
- add monitoring or benchmarks when the path is likely to regress again
