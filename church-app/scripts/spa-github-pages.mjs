import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/** GitHub Pages віддає 404.html для невідомих шляхів — потрібно для React Router */
const dist = resolve(import.meta.dirname, '../dist')
const index = resolve(dist, 'index.html')
const notFound = resolve(dist, '404.html')

if (!existsSync(index)) {
  console.error('dist/index.html not found')
  process.exit(1)
}

copyFileSync(index, notFound)
console.log('Created dist/404.html for GitHub Pages SPA routes')
