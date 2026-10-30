#!/usr/bin/env bash

set -uo pipefail

status=0

vitest run || status=1
PLAYWRIGHT_TRACE_MODE="${PLAYWRIGHT_TRACE_MODE:-on}" bash scripts/run-playwright-with-history.sh || status=1
bash scripts/show-last-playwright-video.sh || true

exit "${status}"
