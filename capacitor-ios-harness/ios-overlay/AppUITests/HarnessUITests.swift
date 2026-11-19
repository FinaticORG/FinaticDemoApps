import Foundation
import XCTest

/// XCUITest driver for the FinaticConnect#618 Capacitor iOS harness.
///
/// The tests drive real taps (portal X, SFSafariViewController Done, host close)
/// and record observations to the runner-local collector. Product behavior is
/// recorded as expectations (met/unmet) rather than hard assertions so the run
/// produces evidence even when the reported bug reproduces; only harness
/// failures (missing harness UI) fail the test.
final class HarnessUITests: XCTestCase {
    private var app: XCUIApplication!
    private var mode = "unset"
    private var cycle = 0
    private var testLabel = "unknown"

    private static let collector = URL(string: "http://127.0.0.1:8787")!
    private static let syntheticEmail = "fin13157-harness@example.com"
    private static let syntheticOtp = "123456"
    private let portalMarkers = [
        "Connect your accounts", "Your accounts", "Enter your code", "One moment",
        "Choose what", "Connect to ", "Something went wrong",
    ]

    // MARK: - Lifecycle

    override func setUpWithError() throws {
        continueAfterFailure = true
        testLabel = name
            .replacingOccurrences(of: "-[HarnessUITests ", with: "")
            .replacingOccurrences(of: "]", with: "")
        app = XCUIApplication()
        app.launch()
        post(["evt": "ui_test_start"])
        let ready = waitUntil(60) { self.stateValue("ready") == "1" }
        XCTAssertTrue(ready, "harness web layer never reported ready=1 (HSTATE: \(stateText()))")
        if !ready { shot("not-ready") }
    }

    override func tearDownWithError() throws {
        shot("teardown")
        let status: String
        if let run = testRun {
            status = run.hasSucceeded ? (run.hasBeenSkipped ? "skipped" : "passed") : "failed"
        } else {
            status = "unknown"
        }
        post(["evt": "ui_test_result", "status": status, "detail": stateText()])
        app.terminate()
    }

    // MARK: - Embedded (portal in the Capacitor WKWebView via SDK openPortal)

    func test01_Embedded_PortalXClose() throws {
        try selectMode("embedded")
        guard try openPortal() else { return }
        let before = counts()
        tapPortalX()
        _ = waitUntil(10) { self.counts().onClose > before.onClose }
        Thread.sleep(forTimeInterval: 3)
        let after = counts()
        expect("embedded_portal_x_raw_portal_close_once", after.rawClose == before.rawClose + 1,
               "rawClose \(before.rawClose)->\(after.rawClose)")
        expect("embedded_portal_x_onClose_once", after.onClose == before.onClose + 1,
               "onClose \(before.onClose)->\(after.onClose)")
        expect("embedded_portal_dismissed_after_x", !portalVisible(), "portal markers still visible")
        shot("after-portal-x")
    }

    func test02_Embedded_HostClose() throws {
        try selectMode("embedded")
        let before = counts()
        guard try openPortal(hostCloseAfter8s: true) else { return }
        post(["evt": "ui_host_close_pending", "close_kind": "host"])
        _ = waitUntil(20) { self.counts().onClose > before.onClose }
        Thread.sleep(forTimeInterval: 2)
        let after = counts()
        expect("embedded_host_close_onClose_once", after.onClose == before.onClose + 1,
               "onClose \(before.onClose)->\(after.onClose)")
        expect("embedded_host_close_no_raw_portal_close", after.rawClose == before.rawClose,
               "rawClose \(before.rawClose)->\(after.rawClose)")
        expect("embedded_portal_dismissed_after_host_close", !portalVisible(), "portal markers still visible")
        shot("after-host-close")
    }

    func test03_Embedded_ThreeCloseReopenCycles() throws {
        try selectMode("embedded")
        let start = counts()
        for i in 1...3 {
            guard try openPortal() else { return }
            let before = counts()
            tapPortalX()
            _ = waitUntil(10) { self.counts().onClose > before.onClose }
            Thread.sleep(forTimeInterval: 2)
            let after = counts()
            expect("embedded_cycle\(i)_onClose_once", after.onClose == before.onClose + 1,
                   "onClose \(before.onClose)->\(after.onClose) rawClose \(before.rawClose)->\(after.rawClose)")
        }
        let end = counts()
        expect("embedded_three_cycles_onClose_total_3", end.onClose - start.onClose == 3,
               "onClose total \(end.onClose - start.onClose), rawClose total \(end.rawClose - start.rawClose)")
    }

    func test04_Embedded_BrokerAuth() throws {
        try selectMode("embedded")
        guard try openPortal() else { return }
        runBrokerAuth()
        let bcc = waitUntil(30) { self.counts().bcc > 0 }
        expect("embedded_broker_connection_created_event", bcc, "bcc=\(counts().bcc)")
        if app.buttons["Close"].exists { tapPortalX() }
        shot("embedded-broker-auth-end")
    }

    // MARK: - Browser (getPortalUrl -> @capacitor/browser SFSafariViewController)

    func test05_Browser_PortalXAndDone() throws {
        try selectMode("browser")
        guard try openPortal() else { return }
        let xPresent = app.buttons["Close"].waitForExistence(timeout: 10)
        post(["evt": "ui_portal_x_presence", "present": xPresent])
        if xPresent {
            tapPortalX()
            Thread.sleep(forTimeInterval: 3)
            post(["evt": "ui_after_portal_x_in_browser", "present": safariDoneButton().exists])
            shot("browser-after-portal-x")
        }
        let before = counts()
        tapSafariDone()
        _ = waitUntil(15) { self.counts().browserFinished > before.browserFinished }
        _ = waitUntil(20) { self.stateValue("last") == "backend_refresh" || self.counts().refreshOk > before.refreshOk }
        let after = counts()
        expect("browser_done_browserFinished_once", after.browserFinished == before.browserFinished + 1,
               "browserFinished \(before.browserFinished)->\(after.browserFinished)")
        expect("browser_done_backend_refresh_ok", after.refreshOk > before.refreshOk,
               "refreshOk \(before.refreshOk)->\(after.refreshOk)")
    }

    func test06_Browser_HostClose() throws {
        try selectMode("browser")
        let before = counts()
        guard try openPortal(hostCloseAfter8s: true) else { return }
        post(["evt": "ui_host_close_pending", "close_kind": "host"])
        let dismissed = waitUntil(25) { !self.safariDoneButton().exists }
        Thread.sleep(forTimeInterval: 3)
        let after = counts()
        expect("browser_host_close_dismissed_sfvc", dismissed, "Done button still present")
        post(["evt": "ui_observation", "detail": "browserFinished after host close \(before.browserFinished)->\(after.browserFinished)"])
        shot("browser-after-host-close")
    }

    func test07_Browser_ThreeCloseReopenCycles() throws {
        try selectMode("browser")
        let start = counts()
        for i in 1...3 {
            guard try openPortal() else { return }
            let before = counts()
            tapSafariDone()
            _ = waitUntil(15) { self.counts().browserFinished > before.browserFinished }
            Thread.sleep(forTimeInterval: 2)
            let after = counts()
            expect("browser_cycle\(i)_browserFinished_once", after.browserFinished == before.browserFinished + 1,
                   "browserFinished \(before.browserFinished)->\(after.browserFinished)")
        }
        let end = counts()
        expect("browser_three_cycles_browserFinished_total_3", end.browserFinished - start.browserFinished == 3,
               "browserFinished total \(end.browserFinished - start.browserFinished)")
    }

    func test08_Browser_BrokerAuth() throws {
        try selectMode("browser")
        guard try openPortal() else { return }
        runBrokerAuth()
        let before = counts()
        tapSafariDone()
        _ = waitUntil(20) { self.counts().refreshOk > before.refreshOk || self.stateValue("last") == "backend_refresh" }
        post(["evt": "ui_observation", "detail": "browser mode cannot observe portal lifecycle events; see backend_refresh account_count"])
        shot("browser-broker-auth-end")
    }

    // MARK: - Broker auth (staging sandbox broker, synthetic identity)

    private func runBrokerAuth() {
        // 1. Email (sandbox: any email, nothing is sent).
        let email = app.textFields.firstMatch
        guard step("email_field", email.waitForExistence(timeout: 20)) else { return }
        email.tap()
        email.typeText(Self.syntheticEmail)
        tapFirst(["Send code", "Continue"])
        shot("auth-email-submitted")

        // 2. OTP (sandbox: any 6-digit code).
        guard step("otp_screen", waitForText("Enter your code", 30)) else { return }
        let otp = app.textFields.firstMatch
        if otp.waitForExistence(timeout: 10) {
            otp.tap()
            otp.typeText(Self.syntheticOtp)
        }
        tapFirst(["Verify"])
        shot("auth-otp-submitted")

        // 3. Institution / broker page.
        let broker = ProcessInfo.processInfo.environment["HARNESS_OAUTH_BROKER"] ?? ""
        let continueWith = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Continue with'")).firstMatch
        if !continueWith.waitForExistence(timeout: 20) {
            if !broker.isEmpty {
                let pick = app.descendants(matching: .any)
                    .matching(NSPredicate(format: "label CONTAINS[c] %@", broker.replacingOccurrences(of: "_", with: " ")))
                    .firstMatch
                if pick.exists { pick.tap() }
            }
        }
        guard step("broker_continue_button", continueWith.waitForExistence(timeout: 20)) else {
            post(["evt": "ui_gap", "reason": "no OAuth broker page reached; set HARNESS_OAUTH_BROKER to a staging sandbox OAuth broker"])
            return
        }
        let sandboxCallout = waitForText("Sandbox: Continue opens a mock sign-in", 5)
        post(["evt": "ui_sandbox_oauth_callout", "present": sandboxCallout])
        shot("broker-page")
        continueWith.tap()
        post(["evt": "ui_oauth_launch_tapped"])

        // 4. Observe where the mock OAuth page renders (host-observable surface).
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        var surface = "none_observed"
        var oauthApp: XCUIApplication = app
        _ = waitUntil(20) {
            if safari.state == .runningForeground {
                surface = "external_safari"
                oauthApp = safari
                return true
            }
            if self.app.buttons["Authorize"].exists {
                surface = self.mode == "browser" ? "same_sfsafariviewcontroller" : "in_app_webview"
                return true
            }
            return false
        }
        post(["evt": "ui_oauth_surface", "surface": surface, "app_state": String(describing: app.state.rawValue)])
        shot("oauth-surface-\(surface)")
        guard step("mock_oauth_authorize_button", surface != "none_observed") else { return }
        let authorize = oauthApp.buttons["Authorize"]
        if authorize.waitForExistence(timeout: 15) { authorize.tap() }
        post(["evt": "ui_mock_oauth_authorized"])
        Thread.sleep(forTimeInterval: 4)
        shot("after-authorize")
        if surface == "external_safari" {
            post(["evt": "ui_observation", "detail": "OAuth completed outside the app; reactivating host app"])
            app.activate()
        }

        // 5. Consent route render (timestamped here; broker_connection_created is
        //    compared against it in summary.json).
        if step("consent_route_rendered", waitForText("Choose what", 45)) {
            post(["evt": "ui_consent_route_rendered"])
            shot("consent-route")
        }
    }

    // MARK: - Helpers

    private struct Counts {
        var onClose = 0, rawClose = 0, browserFinished = 0, bcc = 0, refreshOk = 0, open = 0
    }

    private func counts() -> Counts {
        func int(_ k: String) -> Int { Int(stateValue(k) ?? "") ?? 0 }
        return Counts(onClose: int("onClose"), rawClose: int("rawClose"), browserFinished: int("browserFinished"),
                      bcc: int("bcc"), refreshOk: int("refreshOk"), open: int("open"))
    }

    private func stateElement() -> XCUIElement {
        app.descendants(matching: .staticText).matching(NSPredicate(format: "label BEGINSWITH 'HSTATE'")).firstMatch
    }

    private func stateText() -> String {
        let el = stateElement()
        return el.exists ? el.label : ""
    }

    private func stateValue(_ key: String) -> String? {
        for token in stateText().split(separator: " ") {
            let parts = token.split(separator: "=", maxSplits: 1)
            if parts.count == 2, parts[0] == key { return String(parts[1]) }
        }
        return nil
    }

    private func selectMode(_ m: String) throws {
        mode = m
        let label = m == "browser" ? "Mode Browser" : "Mode Embedded"
        let b = app.buttons[label]
        XCTAssertTrue(b.waitForExistence(timeout: 20), "harness button \(label) missing")
        b.tap()
        XCTAssertTrue(waitUntil(10) { self.stateValue("mode") == m }, "mode did not switch to \(m)")
        post(["evt": "ui_mode_selected"])
    }

    /// Returns true when the portal is visible; throws XCTSkip when gated.
    private func openPortal(hostCloseAfter8s: Bool = false) throws -> Bool {
        cycle += 1
        let label = hostCloseAfter8s ? "Open portal host close 8s" : "Open portal"
        let b = app.buttons[label]
        XCTAssertTrue(b.waitForExistence(timeout: 20), "harness button \(label) missing")
        post(["evt": "ui_open_tap", "phase": label])
        b.tap()
        var visible = false
        var gate = "none"
        var failed = false
        _ = waitUntil(45) {
            if let g = self.stateValue("gate"), g != "none" { gate = g; return true }
            if self.stateValue("last") == "open_failed" { failed = true; return true }
            if self.portalVisible() { visible = true; return true }
            return false
        }
        if gate != "none" {
            post(["evt": "ui_gated", "gate": gate, "secret": "FINATIC_STAGING_SANDBOX_API_KEY"])
            shot("gated-\(mode)")
            throw XCTSkip("GATED: \(gate). Connect staging portal token needs Actions secret FINATIC_STAGING_SANDBOX_API_KEY.")
        }
        post(["evt": visible ? "ui_portal_visible" : "ui_portal_not_visible", "detail": failed ? "open_failed" : ""])
        shot("open-\(mode)-c\(cycle)")
        XCTAssertTrue(visible, "portal did not become visible (open_failed=\(failed), HSTATE: \(stateText()))")
        return visible
    }

    private func portalVisible() -> Bool {
        if mode == "browser" && safariDoneButton().exists { return true }
        if app.buttons["Close"].exists { return true }
        for marker in portalMarkers {
            let q = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", marker)).firstMatch
            if q.exists { return true }
        }
        return false
    }

    private func safariDoneButton() -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label IN %@", ["Done", "Close Safari", "Dismiss"])).firstMatch
    }

    private func tapPortalX() {
        let x = app.buttons["Close"]
        if x.waitForExistence(timeout: 15) {
            post(["evt": "ui_portal_x_tapped", "close_kind": "portal_x"])
            x.tap()
        } else {
            post(["evt": "ui_portal_x_missing", "close_kind": "portal_x"])
            shot("portal-x-missing")
        }
    }

    private func tapSafariDone() {
        let done = safariDoneButton()
        if done.waitForExistence(timeout: 15) {
            post(["evt": "ui_sfvc_done_tapped", "close_kind": "sfvc_done"])
            done.tap()
        } else {
            post(["evt": "ui_sfvc_done_missing", "close_kind": "sfvc_done"])
            shot("sfvc-done-missing")
        }
    }

    private func tapFirst(_ labels: [String]) {
        for l in labels {
            let b = app.buttons[l]
            if b.waitForExistence(timeout: 5) && b.isHittable {
                b.tap()
                return
            }
        }
    }

    private func waitForText(_ text: String, _ timeout: TimeInterval) -> Bool {
        waitUntil(timeout) {
            self.app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch.exists
        }
    }

    @discardableResult
    private func step(_ name: String, _ ok: Bool) -> Bool {
        post(["evt": "ui_step", "step": name, "status": ok ? "reached" : "not_reached"])
        if !ok { shot("step-missing-\(name)") }
        return ok
    }

    private func expect(_ name: String, _ met: Bool, _ detail: String) {
        post(["evt": "ui_expectation", "step": name, "status": met ? "met" : "unmet", "detail": detail])
    }

    private func waitUntil(_ timeout: TimeInterval, _ condition: () -> Bool) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            if condition() { return true }
            Thread.sleep(forTimeInterval: 0.5)
        } while Date() < deadline
        return condition()
    }

    private func post(_ fields: [String: Any]) {
        var body = fields
        body["schema"] = "fin13157.harness.v1"
        body["source"] = "xcuitest"
        body["test"] = testLabel
        body["mode"] = mode
        body["cycle"] = cycle
        body["wall_ms"] = Int(Date().timeIntervalSince1970 * 1000)
        var req = URLRequest(url: Self.collector.appendingPathComponent("events"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        let done = DispatchSemaphore(value: 0)
        URLSession.shared.dataTask(with: req) { _, _, _ in done.signal() }.resume()
        _ = done.wait(timeout: .now() + 5)
    }

    private func shot(_ label: String) {
        let png = XCUIScreen.main.screenshot().pngRepresentation
        let attachment = XCTAttachment(data: png, uniformTypeIdentifier: "public.png")
        attachment.name = label
        attachment.lifetime = .keepAlways
        add(attachment)
        var comps = URLComponents(url: Self.collector.appendingPathComponent("screenshot"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "name", value: "\(testLabel)-\(label)")]
        var req = URLRequest(url: comps.url!)
        req.httpMethod = "POST"
        req.httpBody = png
        let done = DispatchSemaphore(value: 0)
        URLSession.shared.dataTask(with: req) { _, _, _ in done.signal() }.resume()
        _ = done.wait(timeout: .now() + 10)
    }
}
