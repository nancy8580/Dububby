import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import path from 'path'
import fs from 'fs'
import { rbacMiddlewareFactory } from '../src/middleware/rbac'

function mockReq(method: string, role: string){
  const req: any = { method, user: { role } }
  return req
}
function mockRes(){
  const res: any = { statusCode: 200, body: null,
    status(code: number){ this.statusCode = code; return this },
    json(obj: any){ this.body = obj; return this },
  }
  return res
}

describe('rbacMiddlewareFactory', () => {
  const modelsDir = path.join(__dirname, '..', 'src', 'models-definitions')
  const modelName = 'RBAC_Test'
  const filePath = path.join(modelsDir, `${modelName}.json`)

  beforeAll(()=>{
    fs.mkdirSync(modelsDir, { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify({
      name: modelName,
      fields: [{ name: 'title', type: 'string' }],
      rbac: {
        Admin: ['all'],
        Manager: ['create','read','update'],
        Viewer: ['read']
      }
    }, null, 2))
  })
  
  afterAll(()=>{
    try { fs.unlinkSync(filePath) } catch {}
  })

  it('allows Admin for all ops', () => {
    for (const method of ['GET','POST','PUT','DELETE']){
      const req = mockReq(method, 'Admin')
      const res = mockRes()
      const next = vi.fn()
      rbacMiddlewareFactory(modelsDir, modelName)(req as any, res as any, next)
      expect(next).toHaveBeenCalled()
    }
  })

  it('blocks Manager from delete', () => {
    const req = mockReq('DELETE', 'Manager')
    const res = mockRes()
    const next = vi.fn()
    rbacMiddlewareFactory(modelsDir, modelName)(req as any, res as any, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(403)
  })

  it('allows Viewer to read only', () => {
    const ok = mockRes(); const nextOk = vi.fn()
    rbacMiddlewareFactory(modelsDir, modelName)(mockReq('GET','Viewer') as any, ok as any, nextOk)
    expect(nextOk).toHaveBeenCalled()

    const bad = mockRes(); const nextBad = vi.fn()
    rbacMiddlewareFactory(modelsDir, modelName)(mockReq('POST','Viewer') as any, bad as any, nextBad)
    expect(nextBad).not.toHaveBeenCalled()
    expect(bad.statusCode).toBe(403)
  })
})
