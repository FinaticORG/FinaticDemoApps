#!/usr/bin/env ruby
# Adds the harness native files to the generated Capacitor App target and an
# AppUITests UI-testing target + shared "App" scheme. Run after `cap add ios`.
require 'xcodeproj'

project_path = ARGV.fetch(0)
project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |t| t.name == 'App' } or abort('App target not found')

app_group = project.main_group.children.find { |g| g.respond_to?(:path) && g.path == 'App' } or abort('App group not found')
unless app_group.files.any? { |f| f.path == 'HarnessBridgeViewController.swift' }
  ref = app_group.new_reference('HarnessBridgeViewController.swift')
  app.add_file_references([ref])
end

deployment = app.build_configurations.first.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] || '15.0'

ui = project.targets.find { |t| t.name == 'AppUITests' }
unless ui
  ui = project.new_target(:ui_test_bundle, 'AppUITests', :ios, deployment)
  ui.add_dependency(app)
  group = project.main_group.new_group('AppUITests', 'AppUITests')
  ui.add_file_references([group.new_reference('HarnessUITests.swift')])
  group.new_reference('Info.plist')
  ui.build_configurations.each do |config|
    s = config.build_settings
    s['TEST_TARGET_NAME'] = 'App'
    s['PRODUCT_BUNDLE_IDENTIFIER'] = 'dev.finatic.harness618.uitests'
    s['PRODUCT_NAME'] = '$(TARGET_NAME)'
    s['SWIFT_VERSION'] = '5.0'
    s['GENERATE_INFOPLIST_FILE'] = 'YES'
    s['INFOPLIST_FILE'] = 'AppUITests/Info.plist'
    s['IPHONEOS_DEPLOYMENT_TARGET'] = deployment
    s['TARGETED_DEVICE_FAMILY'] = '1,2'
    s['CODE_SIGN_STYLE'] = 'Automatic'
  end
  attrs = project.root_object.attributes['TargetAttributes'] ||= {}
  attrs[ui.uuid] = { 'CreatedOnToolsVersion' => '16.0', 'TestTargetID' => app.uuid }
end

project.save

scheme = Xcodeproj::XCScheme.new
scheme.configure_with_targets(app, ui, launch_target: true)
scheme.test_action.code_coverage_enabled = false
scheme.save_as(project_path, 'App', true)
puts "harness targets ready: #{project.targets.map(&:name).join(', ')}"
