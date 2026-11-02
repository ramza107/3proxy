#!/usr/bin/env node
/**
 * Generate a Supabase Apple OAuth client secret (JWT, max 6 months).
 *
 * Usage:
 *   node scripts/apple-client-secret.mjs \
 *     --team 7TLP9FNRJB \
 *     --key-id YOUR_KEY_ID \
 *     --client-id com.wahrly.assistant.web \
 *     --p8 ./AuthKey_XXXXX.p8
 *
 * Paste the printed JWT into Supabase → Auth → Providers → Apple → Secret Key.
 * Client IDs should include: com.wahrly.assistant,com.wahrly.assistant.web
 */
import fs from 'fs'
import crypto from 'crypto'

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}

const teamId = arg('team', '7TLP9FNRJB')
const keyId = arg('key-id')
const clientId = arg('client-id', 'com.wahrly.assistant.web')
const p8Path = arg('p8')

if (!keyId || !p8Path) {
  console.error('Need --key-id and --p8')
  process.exit(1)
}

const privateKey = fs.readFileSync(p8Path, 'utf8')
const now = Math.floor(Date.now() / 1000)
const header = { alg: 'ES256', kid: keyId }
const payload = {
  iss: teamId,
  iat: now,
  exp: now + 86400 * 180, // ~6 months
  aud: 'https://appleid.apple.com',
  sub: clientId,
}

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

const encHeader = b64url(JSON.stringify(header))
const encPayload = b64url(JSON.stringify(payload))
const data = `${encHeader}.${encPayload}`
const sig = crypto.sign('SHA256', Buffer.from(data), {
  key: privateKey,
  dsaEncoding: 'ieee-p1363',
})
const token = `${data}.${sig.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`

console.log(token)
console.error('\nPaste into Supabase Apple → Secret Key.')
console.error(`Client IDs: com.wahrly.assistant,${clientId}`)
console.error(`Expires ~${new Date((now + 86400 * 180) * 1000).toISOString().slice(0, 10)}`)
