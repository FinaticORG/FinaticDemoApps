import Capacitor
import Foundation
import os
import UIKit

/// Bridge view controller that registers the in-app HarnessLog plugin.
/// Swapped in for CAPBridgeViewController by scripts/prepare-ios.sh.
class HarnessBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(HarnessLogPlugin())
    }
}

/// Writes sanitized harness JSON lines (already sanitized in the web layer) to
/// the unified device log under subsystem dev.finatic.harness so they can be
/// exported with `log show` after the run.
@objc(HarnessLogPlugin)
public class HarnessLogPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HarnessLogPlugin"
    public let jsName = "HarnessLog"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "log", returnType: CAPPluginReturnPromise),
    ]
    private let logger = Logger(subsystem: "dev.finatic.harness", category: "events")

    @objc func log(_ call: CAPPluginCall) {
        let line = call.getString("line") ?? "{}"
        logger.log("HARNESS_EVT \(line, privacy: .public)")
        call.resolve()
    }
}
