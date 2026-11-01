#!/usr/bin/env bash
# The repository's gate, what CI runs: lint, types, tests, build. The build only needs a URL to bake into an artifact
# nothing keeps.
set -euo pipefail
npm run lint
npm run check
npm run test
PUBLIC_YASLI_API_BASE_URL=http://localhost:8000 npm run build
