#!/usr/bin/env node
'use strict';
/**
 * Runs Vitest across script extensions in the workspace.
 */
const { existsSync, readdirSync } = require('fs');
const { execSync } = require('child_process');

const hasExtensions =
  existsSync('extensions') &&
  readdirSync('extensions').some((name) => existsSync(`extensions/${name}/package.json`));

const hasReleaseTools = existsSync('tools/release/package.json');

let exitCode = 0;

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    exitCode = e.status ?? 1;
  }
}

if (hasExtensions || hasReleaseTools) {
  run('vitest run');
}

process.exit(exitCode);
