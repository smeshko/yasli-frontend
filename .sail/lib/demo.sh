#!/usr/bin/env bash
# Starts the fixture backend on scenario <scenario> and the dev server, each on a free port, runs one command with
# $API_URL and $APP_URL set, and stops both whatever happens.
# Usage: .sail/lib/demo.sh <scenario> <command> [args…]
set -euo pipefail
scenario=${1:?usage: demo.sh <scenario> <command> [args…]}
shift
free_port() { python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])'; }
api=$(free_port)
web=$(free_port)
export API_URL="http://127.0.0.1:$api" APP_URL="http://127.0.0.1:$web"
logs=$(mktemp -d)
set -m
FIXTURE_SCENARIO=$scenario FIXTURE_PORT=$api node scripts/fixture-server.mjs >"$logs/api.log" 2>&1 &
api_pid=$!
PUBLIC_YASLI_API_BASE_URL=$API_URL npx astro dev --host 127.0.0.1 --port "$web" >"$logs/web.log" 2>&1 &
web_pid=$!
set +m
stop() {
  kill -TERM -- "-$api_pid" "-$web_pid" 2>/dev/null || true
  rm -rf "$logs"
}
trap stop EXIT
for _ in $(seq 1 120); do
  if curl -fs -o /dev/null "$APP_URL/"; then break; fi
  sleep 0.5
done
curl -fs -o /dev/null "$APP_URL/" || { echo 'demo: the dev server did not start' >&2; cat "$logs/web.log" >&2; exit 2; }
"$@"
