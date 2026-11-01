#!/usr/bin/env bash
# Prepares a fresh worktree: the dependencies CI installs.
set -euo pipefail
npm ci --no-audit --no-fund
