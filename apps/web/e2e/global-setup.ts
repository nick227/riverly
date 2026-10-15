import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

// Fresh, deterministic demo data (and empty rate-limit buckets) for every run.
// Set E2E_SKIP_SEED=1 when pointing at an environment you must not reset.
export default function globalSetup() {
  if (process.env.E2E_SKIP_SEED) return
  execSync('pnpm db:seed -- --reset', { cwd: fileURLToPath(new URL('../../..', import.meta.url)), stdio: 'inherit' })
}
