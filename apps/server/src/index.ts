import { db } from '@project/db'
import { buildApp } from './app'
import { config } from './lib/config'
import { startWorker, stopWorker } from './email/worker'

async function main() {
  const app = await buildApp()
  await app.listen({ port: config.PORT, host: '0.0.0.0' })
  if (config.workerEnabled) {
    startWorker(app.log)
    app.log.info('email worker running in-process')
  }
  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'shutting down')
    stopWorker()
    await app.close()
    await db.$disconnect()
    process.exit(0)
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
