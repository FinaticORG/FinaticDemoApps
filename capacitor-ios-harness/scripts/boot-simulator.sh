#!/usr/bin/env bash
# Create and boot a named iOS Simulator on the newest available iOS runtime.
# Exports SIM_* values to $GITHUB_ENV when present.
set -euo pipefail
SIM_NAME="${SIM_NAME:-FIN13157-Harness}"
PREFERRED="${DEVICE_TYPE:-}"

read -r RUNTIME_ID RUNTIME_VERSION RUNTIME_BUILD DEVTYPE_ID DEVTYPE_NAME < <(
  xcrun simctl list runtimes -j | PREFERRED="$PREFERRED" node -e '
    const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
    const runtimes = data.runtimes
      .filter((r) => r.platform === "iOS" && r.isAvailable)
      .sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
    const rt = runtimes.at(-1);
    if (!rt) throw new Error("no available iOS runtime");
    const phones = (rt.supportedDeviceTypes || []).filter((d) => d.productFamily === "iPhone");
    const preferred = process.env.PREFERRED;
    const plain = phones
      .filter((d) => /^iPhone \d+$/.test(d.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const pick = phones.find((d) => d.name === preferred) || plain.at(-1) || phones.at(-1);
    if (!pick) throw new Error("no iPhone device type for runtime " + rt.identifier);
    console.log([rt.identifier, rt.version, rt.buildversion, pick.identifier, pick.name.replace(/ /g, "_")].join(" "));
  '
)
DEVTYPE_NAME="${DEVTYPE_NAME//_/ }"

xcrun simctl delete "$SIM_NAME" >/dev/null 2>&1 || true
UDID="$(xcrun simctl create "$SIM_NAME" "$DEVTYPE_ID" "$RUNTIME_ID")"
xcrun simctl bootstatus "$UDID" -b

echo "simulator: $SIM_NAME $UDID ($DEVTYPE_NAME, iOS $RUNTIME_VERSION $RUNTIME_BUILD)"
if [ -n "${GITHUB_ENV:-}" ]; then
  {
    echo "SIM_NAME=$SIM_NAME"
    echo "SIM_UDID=$UDID"
    echo "SIM_RUNTIME=$RUNTIME_ID"
    echo "SIM_RUNTIME_VERSION=$RUNTIME_VERSION"
    echo "SIM_RUNTIME_BUILD=$RUNTIME_BUILD"
    echo "SIM_DEVICE_TYPE=$DEVTYPE_NAME"
  } >> "$GITHUB_ENV"
fi
