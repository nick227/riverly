import { execSync } from 'child_process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

// Apply the committed migrations to a clean test database once per run — the same
// `migrate deploy` path production uses, so tests also validate the migration history.
export default function setup() {
  const url = process.env.DATABASE_URL ?? ''
  if (!/_test(\?|$)/.test(url)) throw new Error(`Refusing to reset a non-test database: ${url}`)
  const dbDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../packages/db')
  execSync('npx prisma migrate reset --force --skip-seed --skip-generate', { cwd: dbDir, stdio: 'pipe', env: process.env })
}
