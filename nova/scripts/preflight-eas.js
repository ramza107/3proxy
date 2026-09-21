#!/usr/bin/env node
/**
 * Fail fast before EAS if local Expo config cannot evaluate
 * (usually: forgot `npm install` after pulling expo-widgets).
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const root = path.join(__dirname, '..')
const required = ['expo-widgets', '@expo/ui', 'expo']

const missing = required.filter(
  (pkg) => !fs.existsSync(path.join(root, 'node_modules', pkg, 'package.json')),
)

if (missing.length) {
  console.error(
    `\nMissing packages: ${missing.join(', ')}\n` +
      `Run from nova/:  npm install\n` +
      `Then retry:      npm run build:ios:testflight\n`,
  )
  process.exit(1)
}

const result = spawnSync('npx', ['expo', 'config', '--json'], {
  cwd: root,
  encoding: 'utf8',
  shell: process.platform === 'win32',
  env: { ...process.env, EXPO_NO_DOTENV: '0' },
})

if (result.status !== 0) {
  const err = (result.stderr || result.stdout || '').trim()
  console.error('\n`npx expo config --json` failed — EAS cannot start until this works.\n')
  if (err) console.error(err)
  console.error('\nTypical fix after pull: npm install\n')
  process.exit(result.status || 1)
}

try {
  JSON.parse(result.stdout)
} catch {
  console.error('\n`expo config --json` printed invalid JSON (check for console.log in app.config.js).\n')
  process.exit(1)
}

console.log('Expo config OK — starting EAS…')
