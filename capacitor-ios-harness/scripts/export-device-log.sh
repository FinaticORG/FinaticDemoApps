#!/usr/bin/env bash
# Export the harness subsystem from the simulator's unified log and extract the
# HARNESS_EVT JSON lines (already sanitized by the web layer).
set -uo pipefail
OUT="${HARNESS_OUT:?}"
UDID="${SIM_UDID:?}"
xcrun simctl spawn "$UDID" log show --style ndjson --last 2h \
  --predicate 'subsystem == "dev.finatic.harness"' > "$OUT/device-log.ndjson" 2> "$OUT/device-log.err" || true
node -e '
  const fs = require("fs");
  const out = [];
  for (const line of fs.readFileSync(process.argv[1], "utf8").split("\n")) {
    if (!line.trim()) continue;
    let rec; try { rec = JSON.parse(line); } catch { continue; }
    const msg = String(rec.eventMessage || "");
    const i = msg.indexOf("HARNESS_EVT ");
    if (i >= 0) out.push(msg.slice(i + 12));
  }
  fs.writeFileSync(process.argv[2], out.join("\n") + (out.length ? "\n" : ""));
  console.log("device-log harness events: " + out.length);
' "$OUT/device-log.ndjson" "$OUT/device-events.jsonl"
