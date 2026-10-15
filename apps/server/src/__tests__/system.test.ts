import { describe, it } from 'vitest'
import { call, useApp } from './helpers'

const t = useApp()

describe('getHealth', () => {
  it('reports database status without auth', async () => {
    await call(t.app, 'getHealth', { method: 'GET', url: '/health' }, 200)
  })
})
