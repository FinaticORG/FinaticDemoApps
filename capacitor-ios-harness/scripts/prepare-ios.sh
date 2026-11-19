#!/usr/bin/env bash
# Generate the Capacitor iOS project (SPM) and apply the harness overlay.
# Requires macOS for the Ruby xcodeproj step; the rest also runs on Linux.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build
if [ ! -d ios/App/App.xcodeproj ]; then
  npx cap add ios --packagemanager SPM
fi
npx cap sync ios

cp ios-overlay/App/HarnessBridgeViewController.swift ios/App/App/
mkdir -p ios/App/AppUITests
cp ios-overlay/AppUITests/Info.plist ios/App/AppUITests/
cp ios-overlay/AppUITests/HarnessUITests.swift ios/App/AppUITests/

# Use the harness bridge VC (registers HarnessLog) instead of the stock one.
sed -i.bak 's/CAPBridgeViewController()/HarnessBridgeViewController()/' ios/App/App/SceneDelegate.swift
sed -i.bak 's/customClass="CAPBridgeViewController" customModule="Capacitor"/customClass="HarnessBridgeViewController" customModule="App" customModuleProvider="target"/' ios/App/App/Base.lproj/Main.storyboard
rm -f ios/App/App/SceneDelegate.swift.bak ios/App/App/Base.lproj/Main.storyboard.bak
grep -q 'HarnessBridgeViewController()' ios/App/App/SceneDelegate.swift || grep -q HarnessBridgeViewController ios/App/App/Base.lproj/Main.storyboard \
  || { echo "could not install HarnessBridgeViewController" >&2; exit 1; }

# Allow the web layer to reach the runner-local collector on 127.0.0.1.
if command -v /usr/libexec/PlistBuddy >/dev/null; then
  /usr/libexec/PlistBuddy -c 'Delete :NSAppTransportSecurity' ios/App/App/Info.plist 2>/dev/null || true
  /usr/libexec/PlistBuddy -c 'Add :NSAppTransportSecurity dict' ios/App/App/Info.plist
  /usr/libexec/PlistBuddy -c 'Add :NSAppTransportSecurity:NSAllowsLocalNetworking bool true' ios/App/App/Info.plist
fi

if command -v ruby >/dev/null && [ "$(uname)" = "Darwin" ]; then
  ruby scripts/add-harness-targets.rb ios/App/App.xcodeproj
else
  echo "skip: xcodeproj target wiring needs macOS ruby" >&2
fi
