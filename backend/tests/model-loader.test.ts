import { describe, it, expect, vi } from 'vitest'
import { registerCrudRoutesForModel } from '../src/controllers/dynamicController'


describe('registerCrudRoutesForModel', () => {
  it('mounts routes under /api', () => {
    const app = { use: vi.fn() } as any
    const def = { name: 'TestModel', fields: [{ name: 'title', type: 'string' }], rbac: { Admin: ['all'] } }
    registerCrudRoutesForModel(app as any, def)
    expect(app.use).toHaveBeenCalled()
    const firstCall = (app.use as any).mock.calls[0]
    expect(firstCall[0]).toBe('/api')
  })
})
