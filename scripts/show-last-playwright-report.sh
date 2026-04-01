#!/usr/bin/env bash

set -euo pipefail

artifacts_root="${PLAYWRIGHT_RUNS_ROOT:-playwright-artifacts}"
report_port="${PLAYWRIGHT_REPORT_PORT:-9323}"

if [ ! -d "${artifacts_root}" ]; then
  echo "No Playwright artifacts found under ${artifacts_root}."
  exit 1
fi

last_report_dir="$(
  find "${artifacts_root}" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' \
    | sort -r \
    | head -n1
)"

if [ -z "${last_report_dir}" ]; then
  echo "No Playwright report found under ${artifacts_root}."
  exit 1
fi

report_dir="${artifacts_root}/${last_report_dir}/playwright-report"

if [ ! -d "${report_dir}" ]; then
  echo "Missing report directory: ${report_dir}"
  exit 1
fi

playwright show-report --host 0.0.0.0 --port "${report_port}" "${report_dir}"
