#!/usr/bin/env bash

set -uo pipefail

artifacts_root="${PLAYWRIGHT_RUNS_ROOT:-playwright-artifacts}"
keep_runs="${PLAYWRIGHT_KEEP_RUNS:-5}"
timestamp="$(date +%Y%m%d-%H%M%S)"
run_dir="${artifacts_root}/${timestamp}"

mkdir -p "${run_dir}"

export PLAYWRIGHT_OUTPUT_DIR="${run_dir}/test-results"
export PLAYWRIGHT_REPORT_DIR="${run_dir}/playwright-report"

status=0
playwright test "$@" || status=$?

mapfile -t existing_runs < <(
  find "${artifacts_root}" -mindepth 1 -maxdepth 1 -type d -printf "%f\n" | sort -r
)

if [ "${#existing_runs[@]}" -gt "${keep_runs}" ]; then
  for old_run in "${existing_runs[@]:keep_runs}"; do
    rm -rf "${artifacts_root}/${old_run}"
  done
fi

exit "${status}"
