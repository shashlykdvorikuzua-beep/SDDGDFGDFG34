#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const isWindows = os.platform() === 'win32';
const ALLOWED_COMMANDS = new Set(['vercel', 'npm', 'pnpm', 'yarn']);
function log(msg) { console.error(msg); }
function commandExists(cmd) {
  if (!ALLOWED_COMMANDS.has(cmd)) throw new Error(`Command not in whitelist: ${cmd}`);
  try {
    if (isWindows) return spawnSync('where', [cmd], { stdio: 'ignore' }).status === 0;
    else return spawnSync('sh', ['-c', `command -v "$1"`, '--', cmd], { stdio: 'ignore' }).status === 0;
  } catch { return false; }
}
function getCommandOutput(cmd, args) {
  try {
    const result = spawnSync(cmd, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], shell: isWindows });
    return result.status === 0 ? (result.stdout || '').trim() : null;
  } catch { return null; }
}
function parseArgs(args) {
  const result = { projectPath: '.', prod: true, yes: false, skipBuild: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--prod') result.prod = true;
    else if (arg === '--yes' || arg === '-y') result.yes = true;
    else if (arg === '--skip-build') result.skipBuild = true;
    else if (!arg.startsWith('-')) result.projectPath = arg;
    else { log(`Unknown option: ${arg}`); process.exit(1); }
  }
  return result;
}
function checkVercelInstalled() {
  if (!commandExists('vercel')) { log('Error: Vercel CLI is not installed'); process.exit(1); }
  log(`Vercel CLI version: ${getCommandOutput('vercel', ['--version']) || 'unknown'}`);
}
function checkLoginStatus() {
  log('Checking login status...');
  try {
    const result = spawnSync('vercel', ['whoami'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], shell: isWindows });
    const output = (result.stdout || '').trim();
    if (result.status === 0 && output && !output.includes('Error') && !output.includes('not logged in')) {
      log(`Logged in as: ${output}`);
      return true;
    }
  } catch {}
  return false;
}
function checkProject(projectPath) {
  const absPath = path.resolve(projectPath);
  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) {
    log(`Error: Project directory does not exist: ${absPath}`);
    process.exit(1);
  }
  log(`Project path: ${absPath}`);
  return absPath;
}
function doDeploy(projectPath, options) {
  log('\nStarting deployment...\n');
  const cmdParts = ['vercel'];
  if (options.yes) cmdParts.push('--yes');
  if (options.prod) { cmdParts.push('--prod'); log('Deployment environment: Production'); }
  const cmd = cmdParts.join(' ');
  log(`Executing command: ${cmd}\n`);
  log('========================================\n');
  try {
    const args = cmdParts.slice(1);
    const result = spawnSync('vercel', args, {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe'],
      timeout: 300000,
      shell: isWindows
    });
    const output = (result.stdout || '') + (result.stderr || '');
    log(output);
    if (result.status !== 0) throw new Error('Deployment command failed');
    const aliasedMatch = output.match(/Aliased:\s*(https:\/\/[a-zA-Z0-9.-]+\.vercel\.app)/i);
    const productionUrl = aliasedMatch ? aliasedMatch[1] : null;
    const deploymentMatch = output.match(/Production:\s*(https:\/\/[a-zA-Z0-9.-]+\.vercel\.app)/i);
    const deploymentUrl = deploymentMatch ? deploymentMatch[1] : null;
    const finalUrl = productionUrl || deploymentUrl;
    log('\n========================================');
    log('Deployment successful!');
    log('========================================\n');
    if (finalUrl) {
      log(`Your site is live! Visit: ${finalUrl}\n`);
      console.log(JSON.stringify({ status: 'success', url: finalUrl }));
    } else {
      console.log(JSON.stringify({ status: 'success', message: 'Deployment successful' }));
    }
  } catch (error) {
    log(error.message || '');
    log('\nDeployment failed');
    process.exit(1);
  }
}
function main() {
  log('========================================');
  log('Vercel CLI Project Deployment');
  log('========================================\n');
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  checkVercelInstalled();
  log('');
  if (!checkLoginStatus()) { log('\nError: Not logged in'); process.exit(1); }
  log('');
  const projectPath = checkProject(options.projectPath);
  doDeploy(projectPath, options);
}
main();
