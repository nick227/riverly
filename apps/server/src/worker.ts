// Standalone worker process (optional): run with WORKER_ENABLED=false on the API service and
// `pnpm --filter server worker` as a separate Railway service using the same image.
import { db } from '@project/db'
import { startWorker, stopWorker } from './email/worker'

startWorker({ info: (o, m) => console.log(m, o), error: (o, m) => console.error(m, o) })
console.log('email worker started')
const stop = async () => {
  stopWorker()
  await db.$disconnect()
  process.exit(0)
}
process.on('SIGTERM', () => void stop())
process.on('SIGINT', () => void stop())
setInterval(() => {}, 1 << 30)
