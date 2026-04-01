#!/usr/bin/env bash

set -euo pipefail

artifacts_root="${PLAYWRIGHT_RUNS_ROOT:-playwright-artifacts}"
trace_port="${PLAYWRIGHT_TRACE_PORT:-9324}"

if [ ! -d "${artifacts_root}" ]; then
  echo "No Playwright artifacts found under ${artifacts_root}."
  exit 1
fi

last_trace="$(
  find "${artifacts_root}" -path "*/test-results/*/trace.zip" -printf '%T@ %p\n' \
    | sort -nr \
    | head -n1 \
    | cut -d' ' -f2-
)"

if [ -z "${last_trace}" ]; then
  echo "No Playwright trace found under ${artifacts_root}."
  exit 1
fi

playwright show-trace --host 0.0.0.0 --port "${trace_port}" "${last_trace}"
