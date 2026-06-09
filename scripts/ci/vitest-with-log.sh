#!/usr/bin/env bash
#
# Run vitest, mirror its console output to a log file (artifacts/tests/vitest.log,
# consumed by scripts/test-observability-summary.ts), AND propagate vitest's real
# exit code.
#
# WHY THIS EXISTS — exit-code masking bug class:
#   The previous `test:results` script was:
#     vitest run ... 2>&1 | tee artifacts/tests/vitest.log
#   A pipeline's exit code is its LAST command's. `tee` almost always exits 0, so
#   vitest's non-zero exit (failing tests) was swallowed → the "CI" workflow's
#   "Test" step reported success even when tests failed. Only "CI Deep
#   Verification" (which runs `test:coverage` WITHOUT a pipe) caught failures.
#   That gap let 19 genuine test failures + a time-bomb fixture reach `main` on
#   2026-06-09 unnoticed by the "CI" gate.
#
#   pnpm runs package.json scripts via `sh` (dash on Ubuntu runners), which does
#   NOT support `set -o pipefail`. This bash wrapper does — so the pipeline now
#   returns vitest's exit code while still writing the log that the observability
#   summary reads.
#
# Usage: bash scripts/ci/vitest-with-log.sh [extra vitest args...]
set -euo pipefail

mkdir -p artifacts/tests

# `set -o pipefail` makes this pipeline exit non-zero when vitest fails, even
# though `tee` exits 0. `tee` still writes the full log (it streams stdout as it
# arrives), so artifacts/tests/vitest.log is populated on pass AND fail.
vitest run \
  --reporter=default \
  --reporter=json \
  --outputFile=artifacts/tests/results.json \
  "$@" 2>&1 | tee artifacts/tests/vitest.log
