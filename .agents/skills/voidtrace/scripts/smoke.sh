#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
node "${script_dir}/evaluate-slice.ts" --check-golden
node "${script_dir}/run-comparison.ts" --check-golden
node "${script_dir}/run-patch-comparison.ts" --check-golden
node "${script_dir}/run-sweep.ts" --check-golden
exec node "${script_dir}/apply-scenario-patch.ts" --evaluate --check-golden
