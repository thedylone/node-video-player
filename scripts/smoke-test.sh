#!/usr/bin/env bash
# starts the built production server against a temporary videos folder and
# checks that it serves the client and the API.
# run after `npm run build && npm run build:server`, from the repo root.
set -euo pipefail

port="${PORT:-3123}"
url="http://localhost:$port"
tmp="$(mktemp -d)"
mkdir -p "$tmp/videos/source/title"
touch "$tmp/videos/source/title/1.mp4"

# empty ffmpeg paths, so a local .env can't make it try the empty video
DIRECTORY="$tmp/videos" DB_FILE="$tmp/db.json" PORT="$port" \
    FFMPEG_PATH="" FFPROBE_PATH="" \
    node dist-server/main.js > "$tmp/server.log" 2>&1 &
server=$!

finish() {
    status=$?
    { kill "$server" && wait "$server"; } 2> /dev/null || true
    if [ "$status" -ne 0 ]; then
        echo "server log:"
        cat "$tmp/server.log"
    fi
    rm -rf "$tmp"
}
trap finish EXIT

# passes if GET <path> returns 200 and a body containing <text>
expect_body() {
    local body
    body="$(curl -sf "$url$1" || true)"
    if [[ "$body" != *"$2"* ]]; then
        echo "FAIL: GET $1 doesn't contain $2"
        return 1
    fi
    echo "ok: GET $1"
}

# passes if GET <path> returns <status>
expect_status() {
    local status
    status="$(curl -s -o /dev/null -w '%{http_code}' "$url$1" || true)"
    if [ "$status" != "$2" ]; then
        echo "FAIL: GET $1 returned $status, not $2"
        return 1
    fi
    echo "ok: GET $1 is $2"
}

# wait for the server to start and finish its first scan
for _ in $(seq 1 30); do
    expect_body /api/videos '"title":"title"' > /dev/null && break
    sleep 1
done

expect_body /api/videos '"title":"title"'
expect_body / '<div id="root">'
# P1-06: client routes are served index.html
expect_body '/watch/abc?index=1' '<div id="root">'
expect_status /api/nope 404
test -f "$tmp/db.json" || { echo "FAIL: database not saved"; exit 1; }
echo "smoke test passed"
