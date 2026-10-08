#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/validate-source.py
python3 -m unittest discover -s tests -p 'test_*.py' -v
node tests/test_health_refresh_vm.mjs
