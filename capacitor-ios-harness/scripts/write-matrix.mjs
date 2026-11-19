#!/usr/bin/env node
// Record the exact run matrix (toolchain, simulator, package and target SHAs).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.argv[2] || process.env.HARNESS_OUT || 'harness-out';
const env = process.env;
const sh = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8' }).trim();
  } catch {
    return 'unavailable';
  }
};
const pkg = (name) => {
  try {
    return JSON.parse(readFileSync(join('node_modules', name, 'package.json'), 'utf8')).version;
  } catch {
    return 'missing';
  }
};
const xcode = sh('xcodebuild', ['-version']).split('\n');

const matrix = {
  run_url: env.GITHUB_SERVER_URL && env.GITHUB_RUN_ID
    ? env.GITHUB_SERVER_URL + '/' + env.GITHUB_REPOSITORY + '/actions/runs/' + env.GITHUB_RUN_ID + '/attempts/' + (env.GITHUB_RUN_ATTEMPT || '1')
    : 'local',
  event: env.GITHUB_EVENT_NAME || 'local',
  app_commit_sha: env.APP_COMMIT_SHA || env.GITHUB_SHA || sh('git', ['rev-parse', 'HEAD']),
  app_ref: env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME || 'local',
  runner_image: (env.ImageOS || 'unknown') + ' ' + (env.ImageVersion || ''),
  macos: sh('sw_vers', ['-productVersion']),
  xcode: xcode[0] || 'unavailable',
  xcode_build: xcode[1] || 'unavailable',
  ios_runtime: (env.SIM_RUNTIME_VERSION || 'unknown') + ' (' + (env.SIM_RUNTIME_BUILD || '?') + ')',
  ios_runtime_id: env.SIM_RUNTIME || 'unknown',
  device: env.SIM_DEVICE_TYPE || 'unknown',
  simulator_name: env.SIM_NAME || 'unknown',
  capacitor_core: pkg('@capacitor/core'),
  capacitor_ios: pkg('@capacitor/ios'),
  capacitor_cli: pkg('@capacitor/cli'),
  capacitor_browser: pkg('@capacitor/browser'),
  finatic_client: pkg('@finatic/client'),
  connect_target: 'Connect staging',
  connect_staging_sha: env.CONNECT_STAGING_SHA || 'unknown',
  connect_staging_sha_source: env.CONNECT_STAGING_SHA_SOURCE || 'workflow input',
  api_host: (() => {
    try {
      return new URL(env.FINATIC_API_URL || '').host;
    } catch {
      return 'unknown';
    }
  })(),
  api_environment: env.FINATIC_API_ENVIRONMENT || 'sandbox',
  oauth_broker: env.HARNESS_OAUTH_BROKER || 'unset (first institution)',
  staging_secret_present: Boolean(env.FINATIC_STAGING_SANDBOX_API_KEY),
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'matrix.json'), JSON.stringify(matrix, null, 2) + '\n');
process.stdout.write(JSON.stringify(matrix, null, 2) + '\n');
