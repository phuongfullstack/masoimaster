// Post-build copy: move static assets + public into the standalone output.
// Cross-OS (Windows uses xcopy; others use cp -r). Docker build uses Linux.
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const standalone = join(root, '.next', 'standalone')

function copyDir(src, dest) {
  if (!existsSync(src)) { console.log(`[post-build] skip (missing): ${src}`); return }
  const parent = dest.split(/[\\/]/).slice(0, -1).join('/')
  if (parent && !existsSync(parent)) mkdirSync(parent, { recursive: true })
  cpSync(src, dest, { recursive: true })
  console.log(`[post-build] copied ${src} → ${dest}`)
}

copyDir(join(root, '.next', 'static'), join(standalone, '.next', 'static'))
copyDir(join(root, 'public'), join(standalone, 'public'))
console.log('[post-build] done')
