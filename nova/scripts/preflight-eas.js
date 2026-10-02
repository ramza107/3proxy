#!/usr/bin/env node
/**
 * Fail fast before EAS if local Expo config / ship invariants are broken.
 *
 * Catches the regressions that already burned TestFlight:
 * - cream/soft icon instead of bold teal W
 * - widget layout closing over module-level color consts → black card
 * - missing expo-widgets release RedBox patch
 * - missing App Group entitlements (widget stays empty)
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { spawnSync } = require('child_process')

const root = path.join(__dirname, '..')
const TEAL = { r: 15, g: 110, b: 102 } // #0F6E66
const CREAM = { r: 247, g: 244, b: 238 } // #F7F4EE — banned brand bg

function fail(msg) {
  console.error(`\npreflight:eas FAILED — ${msg}\n`)
  process.exit(1)
}

function near(a, b, tol = 18) {
  return (
    Math.abs(a.r - b.r) <= tol &&
    Math.abs(a.g - b.g) <= tol &&
    Math.abs(a.b - b.b) <= tol
  )
}

/** Read RGB of pixel (x,y) from a non-interlaced 8-bit RGB/RGBA PNG. */
function pngPixel(filePath, x, y) {
  const buf = fs.readFileSync(filePath)
  if (buf.toString('ascii', 1, 4) !== 'PNG') fail(`${filePath}: not a PNG`)

  let ihdr = null
  const idats = []
  let offset = 8
  while (offset + 8 <= buf.length) {
    const len = buf.readUInt32BE(offset)
    const type = buf.toString('ascii', offset + 4, offset + 8)
    const data = buf.subarray(offset + 8, offset + 8 + len)
    if (type === 'IHDR') ihdr = data
    if (type === 'IDAT') idats.push(data)
    if (type === 'IEND') break
    offset += 12 + len
  }
  if (!ihdr || !idats.length) fail(`${filePath}: missing IHDR/IDAT`)

  const width = ihdr.readUInt32BE(0)
  const height = ihdr.readUInt32BE(4)
  const bitDepth = ihdr[8]
  const colorType = ihdr[9]
  const interlace = ihdr[12]
  if (bitDepth !== 8 || interlace !== 0) {
    fail(
      `${filePath}: need 8-bit non-interlaced PNG (got depth=${bitDepth} interlace=${interlace})`,
    )
  }
  // 2=RGB, 6=RGBA
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 0
  if (!bpp) fail(`${filePath}: unsupported PNG color type ${colorType}`)

  const raw = zlib.inflateSync(Buffer.concat(idats))
  const stride = width * bpp
  const out = Buffer.alloc(height * stride)
  let inPos = 0
  let prev = Buffer.alloc(stride)

  const paeth = (a, b, c) => {
    const p = a + b - c
    const pa = Math.abs(p - a)
    const pb = Math.abs(p - b)
    const pc = Math.abs(p - c)
    if (pa <= pb && pa <= pc) return a
    if (pb <= pc) return b
    return c
  }

  for (let row = 0; row < height; row++) {
    const filter = raw[inPos++]
    const cur = Buffer.alloc(stride)
    for (let i = 0; i < stride; i++) {
      const x = raw[inPos++]
      const a = i >= bpp ? cur[i - bpp] : 0
      const b = prev[i]
      const c = i >= bpp ? prev[i - bpp] : 0
      let val
      switch (filter) {
        case 0:
          val = x
          break
        case 1:
          val = (x + a) & 255
          break
        case 2:
          val = (x + b) & 255
          break
        case 3:
          val = (x + ((a + b) >> 1)) & 255
          break
        case 4:
          val = (x + paeth(a, b, c)) & 255
          break
        default:
          fail(`${filePath}: unknown PNG filter ${filter}`)
      }
      cur[i] = val
    }
    cur.copy(out, row * stride)
    prev = cur
  }

  if (x < 0 || y < 0 || x >= width || y >= height) {
    fail(`${filePath}: pixel (${x},${y}) out of bounds ${width}x${height}`)
  }
  const i = y * stride + x * bpp
  return { r: out[i], g: out[i + 1], b: out[i + 2], width, height }
}

function assertTealBrandAsset(rel) {
  const filePath = path.join(root, rel)
  if (!fs.existsSync(filePath)) fail(`missing ${rel}`)
  const size = fs.statSync(filePath).size
  // Old cream mark was ~430KB; teal W is ~14–25KB.
  if (size > 80_000) {
    fail(
      `${rel} is ${size} bytes — looks like the old cream icon. ` +
        `Restore the bold teal W (corner #0F6E66).`,
    )
  }
  if (size < 1_000) fail(`${rel} is suspiciously small (${size} bytes)`)

  const corner = pngPixel(filePath, 10, 10)
  if (near(corner, CREAM)) {
    fail(`${rel} corner is cream #F7F4EE — wrong icon. Need teal W (#0F6E66).`)
  }
  if (!near(corner, TEAL)) {
    fail(
      `${rel} corner RGB(${corner.r},${corner.g},${corner.b}) is not teal #0F6E66. ` +
        `Do not ship without the current brand mark.`,
    )
  }
}

// --- packages ---
const required = ['expo-widgets', '@expo/ui', 'expo', 'patch-package']
const missing = required.filter(
  (pkg) => !fs.existsSync(path.join(root, 'node_modules', pkg, 'package.json')),
)
if (missing.length) {
  fail(`Missing packages: ${missing.join(', ')}\nRun from nova/:  npm install`)
}

// --- brand icons (the build-32 regression) ---
for (const rel of [
  'assets/icon.png',
  'assets/splash-icon.png',
  'assets/adaptive-icon.png',
]) {
  assertTealBrandAsset(rel)
}

// --- widget layout invariants (the black-card regression) ---
const widgetPath = path.join(root, 'widgets/WahrlyToday.tsx')
if (!fs.existsSync(widgetPath)) fail('widgets/WahrlyToday.tsx missing')
const widgetSrc = fs.readFileSync(widgetPath, 'utf8')

const importBlock = widgetSrc.match(
  /import\s*\{([^}]+)\}\s*from\s*['"]@expo\/ui\/swift-ui['"]/,
)
if (importBlock) {
  const names = importBlock[1].split(',').map((s) => s.trim().split(/\s+/)[0])
  for (const name of ['Image', 'HStack', 'Spacer']) {
    if (names.includes(name)) {
      fail(
        `WahrlyToday imports ${name} — keep the widget Text-only (release blanks on failure).`,
      )
    }
  }
}
if (/symbolEffect\s*\(/.test(widgetSrc)) {
  fail('WahrlyToday uses symbolEffect — not safe on all iOS versions for widgets.')
}

// Module-level color consts close over → ReferenceError in extension JSC.
const moduleColorConst =
  /^(?:export\s+)?const\s+[A-Z][A-Z0-9_]*\s*=\s*['"]#[0-9A-Fa-f]{3,8}['"]/m
if (moduleColorConst.test(widgetSrc)) {
  fail(
    'WahrlyToday has module-level color consts. ' +
      'Inline hex literals inside the widget function (bare JSC has no module scope).',
  )
}
if (!widgetSrc.includes("'widget'") && !widgetSrc.includes('"widget"')) {
  fail(`WahrlyToday missing 'widget' directive`)
}
if (!/containerBackground\(\s*['"]#[0-9A-Fa-f]{6}['"]/.test(widgetSrc)) {
  fail('WahrlyToday must use an inline hex containerBackground (not a module const).')
}

// --- patch-package for expo-widgets RedBox in release ---
const patchFile = path.join(root, 'patches/expo-widgets+57.0.20.patch')
if (!fs.existsSync(patchFile)) {
  fail(
    'patches/expo-widgets+57.0.20.patch missing — release widgets hide errors as black EmptyView',
  )
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
if (!pkg.scripts?.postinstall?.includes('patch-package')) {
  fail('package.json postinstall must run patch-package')
}
const dynamicView = path.join(
  root,
  'node_modules/expo-widgets/ios/Widgets/DynamicView.swift',
)
if (fs.existsSync(dynamicView)) {
  const swift = fs.readFileSync(dynamicView, 'utf8')
  if (!swift.includes('Always render RedBox')) {
    fail(
      'expo-widgets RedBox patch not applied. Run from nova/: npx patch-package',
    )
  }
}

// --- expo config ---
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

let config
try {
  config = JSON.parse(result.stdout)
} catch {
  fail('`expo config --json` printed invalid JSON (check for console.log in app.config.js).')
}

const splashBg = config?.splash?.backgroundColor?.toUpperCase?.()
if (splashBg !== '#0F6E66') {
  fail(`splash.backgroundColor must be #0F6E66 (got ${splashBg || 'missing'})`)
}
const androidBg = config?.android?.adaptiveIcon?.backgroundColor?.toUpperCase?.()
if (androidBg !== '#0F6E66') {
  fail(`android.adaptiveIcon.backgroundColor must be #0F6E66 (got ${androidBg || 'missing'})`)
}

const groups =
  config?.ios?.entitlements?.['com.apple.security.application-groups'] || []
if (!groups.includes('group.com.wahrly.assistant')) {
  fail('ios.entitlements missing App Group group.com.wahrly.assistant')
}
const infoGroup = config?.ios?.infoPlist?.ExpoWidgetsAppGroupIdentifier
if (infoGroup !== 'group.com.wahrly.assistant') {
  fail('ios.infoPlist.ExpoWidgetsAppGroupIdentifier must be group.com.wahrly.assistant')
}

console.log('Expo config OK — brand icon teal, widget guards OK, patch OK — starting EAS…')
